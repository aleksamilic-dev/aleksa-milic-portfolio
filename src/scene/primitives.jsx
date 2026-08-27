import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../data.js';

// Shared building blocks for the facility. Kept deliberately low-poly —
// the mood comes from emissive accents + bloom, not from geometry density.

export function Beam({ length = 1, size = 0.16, color = PALETTE.steel, ...props }) {
  return (
    <mesh {...props}>
      <boxGeometry args={[size, size, length]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.4} />
    </mesh>
  );
}

export function Strut({ height = 3, ...props }) {
  return (
    <mesh {...props}>
      <boxGeometry args={[0.18, height, 0.18]} />
      <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.5} />
    </mesh>
  );
}

// A glowing panel — used for screens, status strips, indicator lights.
export function Panel({ w = 1, h = 1, color = PALETTE.blue, intensity = 1.4, ...props }) {
  return (
    <mesh {...props}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// A small emissive marker. No light attached — bloom does the glow, and a
// scene full of these should not mean a scene full of point lights.
export function Node({ r = 0.06, color = PALETTE.amber, ...props }) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[r, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

// A smooth tube through a list of [x,y,z] points.
export function Pipe({ points, radius = 0.07, color = PALETTE.blue, emissive = 0.25 }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, Math.max(16, points.length * 6), radius, 10, false);
  }, [points, radius]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissive}
        metalness={0.75}
        roughness={0.35}
      />
    </mesh>
  );
}

