import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, SPINE, STATION_GAP } from '../data.js';

const RAW = new THREE.Color(PALETTE.amber);
const REFINED = new THREE.Color(PALETTE.blue);
const GOLD = new THREE.Color(PALETTE.green);

// Packets travelling the length of the spine. They start "raw" (amber),
// turn "refined" (blue) as they clear the Processing Hall, and pick up a
// golden cast once they pass Storage — a legible left-to-right narrative.
// `from`/`to` bound the z-range travelled; default is the whole corridor, the
// mobile hero passes a short stub (HERO_SPINE).
export function SpineFlow({ count = 46, tier = 'full', from = SPINE.startZ, to = SPINE.endZ }) {
  const n = tier === 'full' ? count : Math.round(count * 0.6);
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Color(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        phase: i / n + Math.random() * 0.01,
        speed: 0.014 + Math.random() * 0.009,
        lane: (Math.random() - 0.5) * 0.32,
        bob: Math.random() * Math.PI * 2,
      })),
    [n],
  );

  // seed colours + a frame-0 layout so nothing flashes white
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) mesh.current.setColorAt(i, RAW);
    mesh.current.instanceColor.needsUpdate = true;
  }, [n]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    const span = to - from;
    const colorTick = Math.floor(t * 12) % 2 === 0; // recolour every other frame
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      const p = (s.phase + t * s.speed) % 1;
      const z = from + p * span;
      const pop = Math.sin(p * Math.PI);
      dummy.position.set(
        s.lane,
        SPINE.y + 0.22 + Math.sin(t * 1.6 + s.bob) * 0.025,
        z,
      );
      dummy.scale.setScalar(0.04 + pop * 0.055);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);

      if (colorTick) {
        const afterProcess = THREE.MathUtils.smoothstep(-z, STATION_GAP - 3, STATION_GAP + 3);
        const afterStorage = THREE.MathUtils.smoothstep(-z, STATION_GAP * 3.4 - 4, STATION_GAP * 3.4 + 4);
        scratch.copy(RAW).lerp(REFINED, afterProcess).lerp(GOLD, afterStorage * 0.7);
        mesh.current.setColorAt(i, scratch);
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (colorTick) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// The physical spine: a slim rail with a glowing top edge, on regular legs.
// `from`/`to` bound the z-span; default is the whole corridor.
export function Spine({ from = SPINE.startZ, to = SPINE.endZ }) {
  const legs = useMemo(() => {
    const out = [];
    for (let z = from - 2; z > to; z -= 4) out.push(z);
    return out;
  }, [from, to]);
  const length = from - to;
  const midZ = (from + to) / 2;

  return (
    <group>
      <mesh position={[0, SPINE.y - 0.12, midZ]}>
        <boxGeometry args={[0.6, 0.16, length]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, SPINE.y - 0.02, midZ]}>
        <boxGeometry args={[0.5, 0.015, length]} />
        <meshStandardMaterial
          color={PALETTE.blueDeep}
          emissive={PALETTE.blueDeep}
          emissiveIntensity={0.5}
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
