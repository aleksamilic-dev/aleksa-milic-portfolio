import { useLayoutEffect, useMemo, useRef } from 'react';
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

const smooth = THREE.MathUtils.smoothstep;

// Data on the belt, read left to right as "raw in, value out".
//
// Everything rides the belt at one speed (flow.belt), in batches of three, so
// nothing overtakes anything else the way it would on a real line. A packet
// starts raw: an amber shard, tumbling, a little off-centre. It goes into the
// processing drum and comes out refined: a flat blue block, square to the
// belt and on its centreline. Past the control room it takes a green cast,
// checked. Both shapes are instanced and every packet has one of each; the
// drum is where one scales out and the other in.
export function SpineFlow({ tier = 'full' }) {
  const batches = tier === 'full' ? 16 : 10;
  const n = batches * BATCH;
  const pitch = LENGTH / batches;
  const raw = useRef();
  const refined = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const packets = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        offset: Math.floor(i / BATCH) * pitch + (i % BATCH) * IN_BATCH,
        lane: (Math.random() - 0.5) * 0.24,
        lift: (Math.random() - 0.5) * 0.05,
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
        spin: 0.7 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
      })),
    [n, pitch],
  );

  // colours before the first frame, so nothing flashes white. And the gap
  // between batches, for the machines that react as one goes through
  // (batchPulse in flow.jsx).
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) {
      raw.current.setColorAt(i, RAW);
      refined.current.setColorAt(i, REFINED);
    }
    raw.current.instanceColor.needsUpdate = true;
    refined.current.instanceColor.needsUpdate = true;
    flow.pitch = pitch;
  }, [n, pitch]);

  useFrame(() => {
    if (!raw.current || !refined.current) return;
    for (let i = 0; i < n; i++) {
      const p = packets[i];
      const d = (p.offset + flow.belt) % LENGTH; // from the head of the belt
      const z = SPINE.startZ - d;
      // grow in at the head of the belt, shrink out at its far end
      const life = smooth(d, 0, 2.5) * (1 - smooth(d, LENGTH - 3, LENGTH));
      const k = smooth(-z, REFINE[0], REFINE[1]);
      const loose = 1 - k;
      const x = p.lane * loose;
      const y = SPINE.y + 0.22 + loose * (p.lift + Math.sin(flow.t * 1.7 + p.phase) * 0.02);

      dummy.position.set(x, y, z);
      dummy.quaternion.setFromAxisAngle(p.axis, flow.t * p.spin);
      dummy.scale.setScalar(RAW_SIZE * life * loose + 1e-5);
      dummy.updateMatrix();
      raw.current.setMatrixAt(i, dummy.matrix);

      dummy.quaternion.identity();
      dummy.scale.setScalar(REFINED_SIZE * life * k + 1e-5);
      dummy.updateMatrix();
      refined.current.setMatrixAt(i, dummy.matrix);

      color.copy(REFINED).lerp(CHECKED, smooth(-z, CHECK[0], CHECK[1]) * 0.75);
      refined.current.setColorAt(i, color);
    }
    raw.current.instanceMatrix.needsUpdate = true;
    refined.current.instanceMatrix.needsUpdate = true;
    refined.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={raw} args={[undefined, undefined, n]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={refined} args={[undefined, undefined, n]} frustumCulled={false}>
        {/* a flat block, a little longer than it is wide */}
        <boxGeometry args={[1, 0.42, 1.25]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
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

function useDashTexture(length) {
  return useMemo(() => {
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
    tex.repeat.set(1, length / DASH);
    tex.needsUpdate = true;
    return tex;
  }, [length]);
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
  // one dash texture per stretch, each repeating over its own length
  const raw = useDashTexture(STAGES[0].length);
  const refined = useDashTexture(STAGES[1].length);
  const checked = useDashTexture(STAGES[2].length);
  const dashes = [raw, refined, checked];

  // Each stretch is laid flat with its texture's v running down the corridor
  // (-z) from its near end, so a falling offset carries the dashes the way
  // the belt goes. Each is shifted by how far its near end is from the head
  // of the belt, so the dashes run on unbroken from one colour to the next.
  useFrame(() => {
    const travel = flow.belt / DASH;
    STAGES.forEach((s, i) => {
      dashes[i].offset.y = -((travel - (SPINE.startZ - s.near) / DASH) % 1);
    });
  });

  return (
    <group>
      <mesh position={[0, SPINE.y - 0.12, midZ]}>
        <boxGeometry args={[0.6, 0.16, length]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
      </mesh>
      {STAGES.map((s, i) => (
        <mesh key={i} position={[0, SPINE.y - 0.012, s.near - s.length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, s.length]} />
          <meshStandardMaterial
            color={s.color}
            emissive={s.glow}
            emissiveMap={dashes[i]}
            emissiveIntensity={s.intensity}
          />
        </mesh>
      ))}
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
