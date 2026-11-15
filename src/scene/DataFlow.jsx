import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, SPINE, STATION_GAP } from '../data.js';
import { flow } from './flow.jsx';

const RAW = new THREE.Color(PALETTE.amber);
const REFINED = new THREE.Color(PALETTE.blue);
const CHECKED = new THREE.Color(PALETTE.green);

const LENGTH = SPINE.startZ - SPINE.endZ;
const BATCH = 3; // packets per batch
const IN_BATCH = 0.42; // their spacing inside a batch

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

  // colours before the first frame, so nothing flashes white
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) {
      raw.current.setColorAt(i, RAW);
      refined.current.setColorAt(i, REFINED);
    }
    raw.current.instanceColor.needsUpdate = true;
    refined.current.instanceColor.needsUpdate = true;
  }, [n]);

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
      dummy.scale.setScalar(0.082 * life * loose + 1e-5);
      dummy.updateMatrix();
      raw.current.setMatrixAt(i, dummy.matrix);

      dummy.quaternion.identity();
      dummy.scale.setScalar(0.13 * life * k + 1e-5);
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

// The physical spine: a slim rail with a lit top, on regular legs.
export function Spine() {
  const legs = useMemo(() => {
    const out = [];
    for (let z = SPINE.startZ - 2; z > SPINE.endZ; z -= 4) out.push(z);
    return out;
  }, []);
  const length = SPINE.startZ - SPINE.endZ;
  const midZ = (SPINE.startZ + SPINE.endZ) / 2;
  const dashes = useDashTexture(length);

  // The plane is laid flat with its texture's v running down the corridor
  // (-z), so a falling offset carries the dashes the way the belt goes.
  useFrame(() => {
    dashes.offset.y = -((flow.belt / DASH) % 1);
  });

  return (
    <group>
      <mesh position={[0, SPINE.y - 0.12, midZ]}>
        <boxGeometry args={[0.6, 0.16, length]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, SPINE.y - 0.012, midZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, length]} />
        <meshStandardMaterial
          color={PALETTE.blueDeep}
          emissive={PALETTE.blue}
          emissiveMap={dashes}
          emissiveIntensity={0.85}
        />
      </mesh>
      {legs.map((z) => (
        <mesh key={z} position={[0, -0.7, z]}>
          <boxGeometry args={[0.12, 1.6, 0.12]} />
          <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
