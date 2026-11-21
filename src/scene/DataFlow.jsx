import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, SPINE, STATION_GAP } from '../data.js';
import { flow } from './flow.jsx';

// The packets' colours are pushed past full brightness, so the bloom picks
// them up and they glow on the belt: behind the scrim, plain-coloured
// packets read as specks.
const GLOW = 1.5;
const RAW = new THREE.Color(PALETTE.amber).multiplyScalar(GLOW);
const REFINED = new THREE.Color(PALETTE.blue).multiplyScalar(GLOW);
const CHECKED = new THREE.Color(PALETTE.green).multiplyScalar(GLOW);

// Their sizes: a raw shard's radius, and a refined block's width.
const RAW_SIZE = 0.11;
const REFINED_SIZE = 0.17;

const LENGTH = SPINE.startZ - SPINE.endZ;
const BATCH = 3; // packets per batch
const IN_BATCH = 0.42; // their spacing inside a batch (batchPulse in flow.jsx assumes it)

// Where a packet changes, as distance down the corridor (-z).
// Inside the processing drum: its shell is 1.14 in radius and sits 1.15 up, so
// at packet height it covers about ±0.97 of the corridor around its station.
// The change happens where the shell hides it.
const REFINE = [STATION_GAP - 0.85, STATION_GAP + 0.85];
// Past the control room, where the data-quality checks run: the batch has
// passed them.
const CHECK = [STATION_GAP * 3 + 1, STATION_GAP * 3 + 3.5];


// Data on the belt, read left to right as "raw in, value out".
//
// Everything rides the belt at one speed (flow.belt), in batches of three, so
// nothing overtakes anything else the way it would on a real line. A packet
// starts raw: an amber shard, tumbling, a little off-centre. It goes into the
// processing drum and comes out refined: a flat blue block, square to the
// belt and on its centreline. Past the control room it takes a green cast,
// checked. Both shapes are instanced and every packet has one of each; the
// drum is where one scales out and the other in.
//
// Where each packet is, how it's turned and how big it is are worked out in
// the vertex shader (packetShader) from its fixed traits and the belt's
// travel. They used to be worked out here, in script, for all 48 packets
// every frame, and their matrices and colours sent to the GPU again each
// time. Now a frame sets two numbers.
const PACKET_UNIFORMS = {
  uBelt: { value: 0 },
  uTime: { value: 0 },
  uRaw: { value: new THREE.Vector3(RAW.r, RAW.g, RAW.b) },
  uRefined: { value: new THREE.Vector3(REFINED.r, REFINED.g, REFINED.b) },
  uChecked: { value: new THREE.Vector3(CHECKED.r, CHECKED.g, CHECKED.b) },
};

// The motion above, in GLSL, for the shards (`refined` false) or the blocks.
// Each packet's traits ride on its instance: `aOffset` its place on the belt,
// `aTraits` its lane, lift, spin and phase, `aAxis` the axis it tumbles on.
function packetShader(refined) {
  const f = (x) => x.toFixed(4);
  return (shader) => {
    Object.assign(shader.uniforms, PACKET_UNIFORMS);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aOffset;
attribute vec4 aTraits;
attribute vec3 aAxis;
uniform float uBelt;
uniform float uTime;
uniform vec3 uRaw;
uniform vec3 uRefined;
uniform vec3 uChecked;
varying vec3 vPacket;`,
      )
      .replace(
        '#include <begin_vertex>',
        `float d = mod(aOffset + uBelt, ${f(LENGTH)});
float z = ${f(SPINE.startZ)} - d;
// grow in at the head of the belt, shrink out at its far end
float life = smoothstep(0.0, 2.5, d) * (1.0 - smoothstep(${f(LENGTH - 3)}, ${f(LENGTH)}, d));
float k = smoothstep(${f(REFINE[0])}, ${f(REFINE[1])}, -z);
float loose = 1.0 - k;
vec3 at = vec3(aTraits.x * loose, ${f(SPINE.y + 0.22)} + loose * (aTraits.y + sin(uTime * 1.7 + aTraits.w) * 0.02), z);
${
  refined
    ? `vec3 transformed = position * (${f(REFINED_SIZE)} * life * k + 1e-5) + at;
vPacket = mix(uRefined, uChecked, smoothstep(${f(CHECK[0])}, ${f(CHECK[1])}, -z) * 0.75);`
    : `float angle = uTime * aTraits.z;
float c = cos(angle);
float s = sin(angle);
vec3 turned = position * c + cross(aAxis, position) * s + aAxis * dot(aAxis, position) * (1.0 - c);
vec3 transformed = turned * (${f(RAW_SIZE)} * life * loose + 1e-5) + at;
vPacket = uRaw;`
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPacket;')
      .replace('#include <color_fragment>', 'diffuseColor.rgb *= vPacket;');
  };
}

export function SpineFlow({ tier = 'full' }) {
  const batches = tier === 'full' ? 16 : 10;
  const n = batches * BATCH;
  const pitch = LENGTH / batches;

  // each packet's fixed traits, as per-instance attributes shared by both
  // shapes
  const traits = useMemo(() => {
    const offset = new Float32Array(n);
    const loose = new Float32Array(n * 4);
    const axis = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      offset[i] = Math.floor(i / BATCH) * pitch + (i % BATCH) * IN_BATCH;
      loose.set(
        [
          (Math.random() - 0.5) * 0.24, // lane
          (Math.random() - 0.5) * 0.05, // lift
          0.7 + Math.random() * 0.9, // spin
          Math.random() * Math.PI * 2, // phase
        ],
        i * 4,
      );
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      axis.set([v.x, v.y, v.z], i * 3);
    }
    return {
      aOffset: new THREE.InstancedBufferAttribute(offset, 1),
      aTraits: new THREE.InstancedBufferAttribute(loose, 4),
      aAxis: new THREE.InstancedBufferAttribute(axis, 3),
    };
  }, [n, pitch]);

  const shapes = useMemo(() => {
    const make = (geometry, refined) => {
      Object.entries(traits).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
      const material = new THREE.MeshBasicMaterial({ toneMapped: false });
      material.onBeforeCompile = packetShader(refined);
      material.customProgramCacheKey = () => (refined ? 'packets-refined' : 'packets-raw');
      return { geometry, material };
    };
    return [
      make(new THREE.OctahedronGeometry(1, 0), false),
      // a flat block, a little longer than it is wide
      make(new THREE.BoxGeometry(1, 0.42, 1.25), true),
    ];
  }, [traits]);

  useEffect(
    () => () =>
      shapes.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [shapes],
  );

  // the gap between batches, for the machines that react as one goes
  // through (batchPulse in flow.jsx)
  useLayoutEffect(() => {
    flow.pitch = pitch;
  }, [pitch]);

  useFrame(() => {
    PACKET_UNIFORMS.uBelt.value = flow.belt % LENGTH;
    PACKET_UNIFORMS.uTime.value = flow.t;
  });

  return shapes.map(({ geometry, material }, i) => (
    <instancedMesh key={i} args={[geometry, material, n]} frustumCulled={false} />
  ));
}

// The rail's lit top carries a run of soft dashes that travel with the belt,
// so the line reads as moving even where no packet is in view. One texel wide,
// 16 long: a bright dash with soft ends, then a dim gap.
const DASH = 1.2; // world units from one dash to the next
const DASH_PROFILE = [0.55, 1, 1, 0.55];
const DASH_FLOOR = 0.2;

// The lit top takes the colour of the data riding it: amber while it's raw,
// blue once the drum has refined it, green once it has passed the checks.
// So the line reads raw, refined, checked from end to end, even where no
// packet is in view. Each change sits where the packets change (REFINE and
// CHECK above), hidden inside the drum and behind the control room's back
// wall. `to` is where each stretch ends, as distance down the corridor.
const STAGES = [
  { to: STATION_GAP, color: PALETTE.amberDeep, glow: PALETTE.amber, intensity: 0.6 },
  { to: (CHECK[0] + CHECK[1]) / 2, color: PALETTE.blueDeep, glow: PALETTE.blue, intensity: 0.85 },
  { to: -SPINE.endZ, color: '#1d5a3f', glow: PALETTE.green, intensity: 0.6 },
].map((s, i, all) => {
  const from = i === 0 ? -SPINE.startZ : all[i - 1].to;
  return { ...s, near: -from, length: s.to - from };
});

function makeDashTexture() {
  const texels = 16;
  const data = new Uint8Array(4 * texels);
  for (let i = 0; i < texels; i++) {
    const v = Math.round((DASH_PROFILE[i] ?? DASH_FLOOR) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, 1, texels);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  // mipmapped, or the dashes shimmer where the rail runs off into the distance
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// The lit top's three stretches as one mesh, so one draw call where it was
// three: each stretch's quad carries its colour and its glow at its
// vertices, and one dash texture runs along all three. The texture's v is
// measured in dashes from the head of the belt, so a falling offset carries
// the dashes the way the belt goes, unbroken from one colour to the next.
// Each stretch used to have a texture and a material of its own, its offset
// shifted to line its dashes up with the last.
function useLitTop() {
  return useMemo(() => {
    const texture = makeDashTexture();
    const y = SPINE.y - 0.012;
    const position = [];
    const uv = [];
    const color = [];
    const glow = [];
    const index = [];
    const c = new THREE.Color();
    STAGES.forEach((s, i) => {
      const near = s.near;
      const far = s.near - s.length;
      const base = c.set(s.color);
      const [r, g, b] = [base.r, base.g, base.b];
      const lit = new THREE.Color(s.glow).multiplyScalar(s.intensity);
      for (const [x, z] of [
        [-0.25, near],
        [0.25, near],
        [0.25, far],
        [-0.25, far],
      ]) {
        position.push(x, y, z);
        uv.push(x + 0.5, (SPINE.startZ - z) / DASH);
        color.push(r, g, b);
        glow.push(lit.r, lit.g, lit.b);
      }
      const k = i * 4;
      index.push(k, k + 1, k + 2, k, k + 2, k + 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(position.map((_, j) => (j % 3 === 1 ? 1 : 0)), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    geometry.setAttribute('glow', new THREE.Float32BufferAttribute(glow, 3));
    geometry.setIndex(index);

    // the stretches' standard finish, its glow the vertex's times the dash
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, emissiveMap: texture });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 glow;\nvarying vec3 vGlow;')
        .replace('#include <color_vertex>', '#include <color_vertex>\nvGlow = glow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
        .replace(
          '#include <emissivemap_fragment>',
          'totalEmissiveRadiance = vGlow * texture2D(emissiveMap, vEmissiveMapUv).rgb;',
        );
    };
    material.customProgramCacheKey = () => 'lit-top';
    return { geometry, material, texture };
  }, []);
}

// The tail end's drum sits a little below the rail's top, and its stand
// runs from the floor (y -1.5) up to the bottom of the bearing plates.
// Heights are in the tail group's own space.
const TAIL_Y = SPINE.y - 0.1;
const TAIL_FLOOR = -1.5 - TAIL_Y;
const TAIL_PLATE_BOTTOM = -0.15;

// The physical spine: a slim rail with a lit top, on regular legs.
export function Spine() {
  const legs = useMemo(() => {
    const out = [];
    for (let z = SPINE.startZ - 2; z > SPINE.endZ; z -= 4) out.push(z);
    return out;
  }, []);
  const length = SPINE.startZ - SPINE.endZ;
  const midZ = (SPINE.startZ + SPINE.endZ) / 2;
  const litTop = useLitTop();
  useEffect(
    () => () => {
      litTop.geometry.dispose();
      litTop.material.dispose();
      litTop.texture.dispose();
    },
    [litTop],
  );

  // the dashes ride the belt (useLitTop)
  useFrame(() => {
    litTop.texture.offset.y = -((flow.belt / DASH) % 1);
  });

  return (
    <group>
      <mesh position={[0, SPINE.y - 0.12, midZ]}>
        <boxGeometry args={[0.6, 0.16, length]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh geometry={litTop.geometry} material={litTop.material} />
      {/* the legs, each on a foot plate on the floor */}
      {legs.map((z) => (
        <group key={z}>
          <mesh position={[0, -0.7, z]}>
            <boxGeometry args={[0.12, 1.6, 0.12]} />
            <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, -1.485, z]}>
            <boxGeometry args={[0.26, 0.03, 0.22]} />
            <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* The tail end, where the line starts: a tail drum between two
          bearing plates, on an end stand of its own. The phone hero looks
          straight at it, and a rail just stopping past its last leg read as
          unfinished. */}
      <group position={[0, TAIL_Y, SPINE.startZ]}>
        {/* in the rail's own steel, so it merges into the rail's draw call */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.66, 16]} />
          <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.36, 0, 0]}>
              <boxGeometry args={[0.06, 0.3, 0.34]} />
              <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* stand legs from the floor up to the bearing plates */}
            <mesh position={[s * 0.36, (TAIL_FLOOR + TAIL_PLATE_BOTTOM) / 2, -0.05]}>
              <boxGeometry args={[0.1, TAIL_PLATE_BOTTOM - TAIL_FLOOR, 0.1]} />
              <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[s * 0.36, TAIL_FLOOR + 0.015, -0.05]}>
              <boxGeometry args={[0.22, 0.03, 0.2]} />
              <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
            </mesh>
          </group>
        ))}
        {/* a tie between the legs, low down */}
        <mesh position={[0, TAIL_FLOOR + 0.35, -0.05]}>
          <boxGeometry args={[0.72, 0.06, 0.06]} />
          <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
