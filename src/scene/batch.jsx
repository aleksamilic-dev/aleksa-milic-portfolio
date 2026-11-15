import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Marks a part as moving: an animation changes its transform or its material.
// <StaticBatch> leaves it, and everything inside it, alone. Every element in
// the machines that holds a ref for an animation carries this.
export const LIVE = Object.freeze({ live: true });

// Only plain lit or unlit surfaces are merged. Anything with its own shader
// (the floor grid) stays as it is.
const MERGEABLE = new Set(['MeshStandardMaterial', 'MeshBasicMaterial']);

// Two meshes can share a draw call when their materials would render the
// same, so the key is everything that changes how one renders.
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

function isLive(object, root) {
  for (let o = object; o && o !== root; o = o.parent) if (o.userData.live) return true;
  return false;
}

// A copy of `geometry` moved by `matrix`, cut down to the attributes every
// primitive here has (position, normal, uv) and indexed, so any two can merge.
function prepared(geometry, matrix) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geometry.attributes.position.clone());
  if (geometry.attributes.normal) g.setAttribute('normal', geometry.attributes.normal.clone());
  else g.computeVertexNormals();
  const n = g.attributes.position.count;
  g.setAttribute(
    'uv',
    geometry.attributes.uv ? geometry.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(n * 2), 2),
  );
  const index = geometry.index
    ? Array.from(geometry.index.array)
    : Array.from({ length: n }, (_, i) => i);
  // a mirrored transform turns triangles inside out; flip them back
  if (matrix.determinant() < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
  }
  g.setIndex(index);
  g.applyMatrix4(matrix);
  return g;
}

// Merges the parts of `children` that never move into one mesh per material.
//
// The machines are built from a few hundred small meshes, and each one cost a
// draw call every frame. That per-call overhead is CPU work, which is what a
// phone runs out of first. Once, at mount, this finds every mesh (and every
// instanced mesh's instances) that isn't marked LIVE, bakes its transform
// relative to this group into a copy of its geometry, and merges the copies
// that share a material into a single mesh using that same material. The
// originals stay in the tree, hidden, so React still owns them and the
// cleanup can put them back.
//
// Nothing renders differently: same materials, same positions. The children's
// own layout effects (instance matrices in BoltRing, Gear, Ladder) run before
// this one, so they are already in place when it reads them.
export function StaticBatch({ children }) {
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
      if (!mat || Array.isArray(mat) || !MERGEABLE.has(mat.type)) return;
      if (o.isInstancedMesh && o.instanceColor) return;
      if (isLive(o, root)) return;

      relative.multiplyMatrices(toRoot, o.matrixWorld);
      const parts = [];
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, instance);
          parts.push(prepared(o.geometry, instance.premultiply(relative)));
        }
      } else {
        parts.push(prepared(o.geometry, relative));
      }

      const key = materialKey(mat);
      if (!buckets.has(key)) buckets.set(key, { material: mat, sources: [], parts: [] });
      const b = buckets.get(key);
      b.sources.push(o);
      b.parts.push(...parts);
    });

    const merged = [];
    for (const b of buckets.values()) {
      // one mesh on its own is already one draw call
      if (b.sources.length < 2) {
        b.parts.forEach((g) => g.dispose());
        continue;
      }
      const geometry = mergeGeometries(b.parts, false);
      b.parts.forEach((g) => g.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, b.material);
      mesh.name = 'static-batch';
      root.add(mesh);
      b.sources.forEach((s) => (s.visible = false));
      merged.push({ mesh, sources: b.sources });
    }

    return () => {
      merged.forEach(({ mesh, sources }) => {
        root.remove(mesh);
        mesh.geometry.dispose();
        sources.forEach((s) => (s.visible = true));
      });
    };
  }, []);

  return <group ref={ref}>{children}</group>;
}
