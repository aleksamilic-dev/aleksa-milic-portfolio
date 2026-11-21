import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PULSE_CHANNELS, pulseGlow } from './pulse.js';

// Marks a part as moving: an animation changes its transform or its material.
// <StaticBatch> leaves it, and everything inside it, alone. Every element in
// the machines that holds a ref for an animation carries this. A moving part
// whose own pieces never move against each other (the drum, the silo's
// rotor) can hold a <StaticBatch> of its own.
export const LIVE = Object.freeze({ live: true });

// The draw order (renderOrder) of the big surfaces behind everything else:
// the floor, the walls, the roof. Drawn after the machines and the hall's
// frame, the parts of them those hide are never shaded. Drawn first, they
// were shaded in full, and then the machines drawn over them.
export const LATE = 1;

// Only plain lit or unlit surfaces are merged. Anything with its own shader
// (the floor) stays as it is.
const MERGEABLE = new Set(['MeshStandardMaterial', 'MeshBasicMaterial']);
const ownShader = (m) => m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile;

// --- one shader for many surfaces --------------------------------------------
// Merging used to need two surfaces' materials to match in every setting, and
// the machines are painted in dozens of slightly different finishes: steel at
// roughness 0.3, 0.32, 0.34..., lit trims in five colours. So a machine still
// came out at 30 to 45 draw calls, and every one of them had its own material
// for three to set up. On a phone that setup was most of a frame's main-thread
// time, more than the drawing itself.
//
// Now surfaces only have to agree on what their shader depends on (lit or
// unlit, which faces, tone mapped or not, fogged or not). Their colour, glow,
// roughness, metalness and how strongly they reflect the room go along with
// each vertex instead (`surfaceAttributes`), and one material reads them
// (`batchedMaterial`), shared by every batch in the scene. A machine is then
// three or four draw calls in all, and consecutive draws with the same
// material cost three almost nothing to set up.
//
// Textured or see-through surfaces keep their own materials, and merge only
// with surfaces whose materials match theirs exactly, as before.
const TEXTURES = [
  'map',
  'emissiveMap',
  'alphaMap',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'lightMap',
  'envMap',
  'displacementMap',
];
const paintable = (m) =>
  !m.transparent && !m.vertexColors && !m.wireframe && m.alphaTest === 0 && TEXTURES.every((k) => !m[k]);

// what a surface's shader depends on
function shaderKey(m) {
  return [m.type, m.side, m.toneMapped, m.depthWrite, m.depthTest, m.fog, m.flatShading, m.blending, m.colorWrite].join(
    '|',
  );
}

// everything that changes how a surface renders, for the ones that keep
// their own materials
function materialKey(m) {
  const hex = (c) => (c ? c.getHexString() : '-');
  return [
    m.type,
    hex(m.color),
    hex(m.emissive),
    m.emissiveIntensity,
    m.metalness,
    m.roughness,
    m.envMapIntensity,
    m.transparent,
    m.opacity,
    m.side,
    m.toneMapped,
    m.depthWrite,
    m.fog,
    m.map?.uuid,
    m.emissiveMap?.uuid,
    m.flatShading,
    m.vertexColors,
  ].join('|');
}

// MeshStandardMaterial with its roughness, metalness, reflection strength
// and glow read from each vertex (`surface`: roughness, metalness,
// envMapIntensity; `glow`: emissive times its intensity) instead of from the
// material. Its colour is three's own vertex colour. A part with a glow
// channel (`pulse`, pulse.js) takes its glow from the channel instead, set
// every frame.
function readsSurface(shader) {
  shader.uniforms.pulseGlow = pulseGlow;
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
attribute vec3 surface;
attribute vec3 glow;
attribute float pulse;
uniform vec3 pulseGlow[${PULSE_CHANNELS}];
varying vec3 vSurface;
varying vec3 vGlow;`,
    )
    .replace(
      '#include <color_vertex>',
      '#include <color_vertex>\nvSurface = surface;\nvGlow = pulse < 0.0 ? glow : pulseGlow[int(pulse)];',
    );
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSurface;\nvarying vec3 vGlow;')
    .replace(
      '#include <envmap_common_pars_fragment>',
      THREE.ShaderChunk.envmap_common_pars_fragment.replace(
        'uniform float envMapIntensity;',
        '#define envMapIntensity vSurface.z',
      ),
    )
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurface.x;')
    .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurface.y;')
    .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vGlow;');
}

// One per kind of shader, shared by every batch. A batch whose materials an
// animation changes (`own`, the container fading out at the gate) gets its
// own instead. `extend` is a further change to the lit shader for the
// batches that ask for it ({ key, patch(shader) }, the daylight at the gate
// in daylight.js), shared between those.
const SHARED = new Map();

function batchedMaterial(m, own, extend) {
  const key = `${shaderKey(m)}|${extend?.key ?? ''}`;
  if (!own && SHARED.has(key)) return SHARED.get(key);
  const params = {
    vertexColors: true,
    side: m.side,
    toneMapped: m.toneMapped,
    depthWrite: m.depthWrite,
    depthTest: m.depthTest,
    fog: m.fog,
    blending: m.blending,
    colorWrite: m.colorWrite,
  };
  let out;
  if (m.isMeshStandardMaterial) {
    out = new THREE.MeshStandardMaterial({ ...params, flatShading: m.flatShading });
    out.onBeforeCompile = extend
      ? (shader) => {
          readsSurface(shader);
          extend.patch(shader);
        }
      : readsSurface;
    out.customProgramCacheKey = () => (extend ? `batched+${extend.key}` : 'batched');
  } else {
    out = new THREE.MeshBasicMaterial(params);
  }
  out.name = 'batched';
  if (!own) SHARED.set(key, out);
  return out;
}

function isLive(object, root) {
  for (let o = object; o && o !== root; o = o.parent) if (o.userData.live) return true;
  return false;
}

// A copy of `geometry` moved by `matrix`, cut down to the attributes every
// primitive here has (position, normal, and uv where `uv`) and indexed, so
// any two can merge.
function prepared(geometry, matrix, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geometry.attributes.position.clone());
  if (geometry.attributes.normal) g.setAttribute('normal', geometry.attributes.normal.clone());
  else g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (uv) {
    g.setAttribute(
      'uv',
      geometry.attributes.uv ? geometry.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(n * 2), 2),
    );
  }
  const index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: n }, (_, i) => i);
  // a mirrored transform turns triangles inside out; flip them back
  if (matrix.determinant() < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
  }
  g.setIndex(index);
  g.applyMatrix4(matrix);
  return g;
}

// the same value at every vertex
function constant(n, values) {
  const a = new Float32Array(n * values.length);
  for (let i = 0; i < a.length; i++) a[i] = values[i % values.length];
  return new THREE.BufferAttribute(a, values.length);
}

// A prepared copy carrying its material's colour (and for a lit surface its
// roughness, metalness, reflection strength, glow and glow channel, -1 for
// none) at every vertex, for batchedMaterial. Colours are in three's linear
// working space, as the material holds them.
function surfaceAttributes(geometry, matrix, m, pulse) {
  const g = prepared(geometry, matrix, false);
  const n = g.attributes.position.count;
  g.setAttribute('color', constant(n, [m.color.r, m.color.g, m.color.b]));
  if (m.isMeshStandardMaterial) {
    const e = m.emissiveIntensity;
    g.setAttribute('surface', constant(n, [m.roughness, m.metalness, m.envMapIntensity]));
    g.setAttribute('glow', constant(n, [m.emissive.r * e, m.emissive.g * e, m.emissive.b * e]));
    g.setAttribute('pulse', constant(n, [pulse]));
  }
  return g;
}

// Merges the parts of `children` that never move into a few meshes.
//
// The machines are built from a few hundred small meshes, and each one cost a
// draw call every frame. That per-call overhead is CPU work, which is what a
// phone runs out of first. Once, at mount, this finds every mesh (and every
// instanced mesh's instances) that isn't marked LIVE, bakes its transform
// relative to this group into a copy of its geometry, and merges the copies
// that can share a shader into a single mesh (see above).
//
// The originals are then taken out of the scene graph altogether, along with
// any group they leave empty. Hidden but still attached, they were more than
// half the scene's objects, and three still visited every one of them each
// frame to recompute its matrix, and again in every pass over the scene at
// startup. React still owns them, so the cleanup puts each one back where it
// was. The merged meshes never move against this group, so their matrices
// are set once.
//
// A part's draw order (renderOrder) carries over to its merged mesh, and
// only parts with the same one merge.
//
// Nothing renders differently: same finishes, same positions. The children's
// own layout effects (instance matrices in BoltRing, Gear, Ladder) run before
// this one, so they are already in place when it reads them.
//
// `own` gives the batch materials of its own, for an animation to change.
// `extend` changes the shader of its lit surfaces (see batchedMaterial).
export function StaticBatch({ own = false, extend, children }) {
  const ref = useRef();

  useLayoutEffect(() => {
    const root = ref.current;
    root.updateWorldMatrix(true, true);
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const relative = new THREE.Matrix4();
    const instance = new THREE.Matrix4();
    const buckets = new Map();

    root.traverse((o) => {
      if (!o.isMesh || !o.visible || o.isSkinnedMesh) return;
      const mat = o.material;
      if (!mat || Array.isArray(mat) || !MERGEABLE.has(mat.type) || ownShader(mat)) return;
      if (o.isInstancedMesh && o.instanceColor) return;
      if (isLive(o, root)) return;

      const painted = paintable(mat);
      const key = `${painted ? `s:${shaderKey(mat)}` : `m:${materialKey(mat)}`}|${o.renderOrder}`;
      if (!buckets.has(key)) buckets.set(key, { painted, material: mat, order: o.renderOrder, sources: [], parts: [] });
      const b = buckets.get(key);

      relative.multiplyMatrices(toRoot, o.matrixWorld);
      const pulse = o.userData.pulse ?? -1;
      const copy = (matrix) =>
        painted ? surfaceAttributes(o.geometry, matrix, mat, pulse) : prepared(o.geometry, matrix, true);
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, instance);
          b.parts.push(copy(instance.premultiply(relative)));
        }
      } else {
        b.parts.push(copy(relative));
      }
      b.sources.push(o);
    });

    const merged = [];
    const owned = [];
    // everything taken out of the graph, in order, with where it came from
    const detached = [];
    const detach = (o) => {
      detached.push({ object: o, parent: o.parent });
      o.parent.remove(o);
    };

    for (const b of buckets.values()) {
      // A mesh with a material of its own is one draw call already. Even on
      // its own, a painted one goes over to the shared material: draws in a
      // row with one material are the cheap ones.
      if (!b.painted && b.sources.length < 2) {
        b.parts.forEach((g) => g.dispose());
        continue;
      }
      const geometry = mergeGeometries(b.parts, false);
      b.parts.forEach((g) => g.dispose());
      if (!geometry) continue;
      const material = b.painted ? batchedMaterial(b.material, own, extend) : b.material;
      if (b.painted && own) owned.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'static-batch';
      mesh.renderOrder = b.order;
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
      b.sources.forEach(detach);
      merged.push(mesh);
    }

    // then the plain groups that are left with nothing in them, innermost
    // first so a group emptied by its children going is caught too
    const emptied = [];
    root.traverse((o) => {
      const container = o.type === 'Group' || o.type === 'Object3D';
      if (o !== root && container && !o.userData.live) emptied.push(o);
    });
    for (let i = emptied.length - 1; i >= 0; i--) {
      const o = emptied[i];
      if (o.children.length === 0 && o.parent) detach(o);
    }

    // this group carries no transform of its own (see the JSX below)
    root.matrixAutoUpdate = false;
    root.updateMatrix();

    return () => {
      // back in reverse, so each group is in place before its children
      for (let i = detached.length - 1; i >= 0; i--) {
        const { object, parent } = detached[i];
        parent.add(object);
      }
      merged.forEach((mesh) => {
        root.remove(mesh);
        mesh.geometry.dispose();
      });
      owned.forEach((m) => m.dispose());
      root.matrixAutoUpdate = true;
    };
  }, [own, extend]);

  return <group ref={ref}>{children}</group>;
}
