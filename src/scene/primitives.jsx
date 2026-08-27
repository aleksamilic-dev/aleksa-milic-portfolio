import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../data.js';

// Shared building blocks for the facility. Still deliberately low-poly — the
// mood comes from emissive accents + bloom — but with a small material
// vocabulary and greeble helpers so the machines read as built objects
// rather than blockout primitives.

// --- materials -------------------------------------------------------------
// Spread into <meshStandardMaterial {...steel('dark')} />. High metalness +
// envMapIntensity so the baked StudioEnv actually shows on the surfaces;
// roughness carries the "finish" (machined vs cast vs painted).
const TONES = {
  void: PALETTE.void,
  dark: PALETTE.steelDark,
  steel: PALETTE.steel,
  light: PALETTE.steelLight,
};

export const steel = (tone = 'steel', over = {}) => ({
  color: TONES[tone] ?? tone,
  metalness: 0.92,
  roughness: 0.34,
  envMapIntensity: 1.5,
  ...over,
});

// A rougher, cast / painted finish for bases, cradles, housings.
export const cast = (tone = 'dark', over = {}) => ({
  color: TONES[tone] ?? tone,
  metalness: 0.5,
  roughness: 0.72,
  envMapIntensity: 0.9,
  ...over,
});

// --- greebles -------------------------------------------------------------
// A ring of bolt heads around `axis` (default 'y'). One instanced draw call
// regardless of count — cheap enough to sprinkle on every flange.
export function BoltRing({ count = 8, radius = 1, r = 0.035, axis = 'y', ...props }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const c = Math.cos(a) * radius;
      const s = Math.sin(a) * radius;
      if (axis === 'x') {
        m.position.set(0, c, s);
        m.rotation.set(0, 0, Math.PI / 2);
      } else if (axis === 'z') {
        m.position.set(c, s, 0);
        m.rotation.set(Math.PI / 2, 0, 0);
      } else {
        m.position.set(c, 0, s);
        m.rotation.set(0, 0, 0);
      }
      m.updateMatrix();
      ref.current.setMatrixAt(i, m.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [count, radius, axis]);

  return (
    <group {...props}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[r, r, 0.05, 6]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.28 })} />
      </instancedMesh>
    </group>
  );
}

// A raised rib / band around a cylindrical body.
export function Band({ radius = 1, tube = 0.045, seg = 40, tone = 'light', ...props }) {
  return (
    <mesh {...props}>
      <torusGeometry args={[radius, tube, 8, seg]} />
      <meshStandardMaterial {...steel(tone, { roughness: 0.3 })} />
    </mesh>
  );
}

export function Beam({ length = 1, size = 0.16, color = PALETTE.steel, ...props }) {
  return (
    <mesh {...props}>
      <boxGeometry args={[size, size, length]} />
      <meshStandardMaterial {...steel(color, { roughness: 0.4 })} />
    </mesh>
  );
}

export function Strut({ height = 3, ...props }) {
  return (
    <mesh {...props}>
      <boxGeometry args={[0.18, height, 0.18]} />
      <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
    </mesh>
  );
}

// A recessed screen: a dark bezel box with a glowing face set slightly back,
// so monitors have depth and a rim instead of being flat decals.
export function Screen({ w = 1, h = 1, color = PALETTE.blueDeep, intensity = 0.8, depth = 0.08, children, ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[w + 0.09, h + 0.09, depth]} />
        <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
      </mesh>
      {children}
    </group>
  );
}

// A small emissive marker. No light attached — bloom does the glow, and a
// scene full of these should not mean a scene full of point lights. `socket`
// seats it in a tiny dark housing so it isn't a bare floating ball.
export function Node({ r = 0.06, color = PALETTE.amber, socket = false, ...props }) {
  return (
    <group {...props}>
      {socket && (
        <mesh>
          <cylinderGeometry args={[r * 1.45, r * 1.7, r * 0.9, 8]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[r, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

// A smooth tube through a list of [x,y,z] points, optionally flanged at the
// ends so it looks bolted on rather than growing out of the surface.
export function Pipe({ points, radius = 0.07, color = PALETTE.blue, emissive = 0.25, flanges = false }) {
  const { geometry, ends } = useMemo(() => {
    const vecs = points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(vecs);
    const geo = new THREE.TubeGeometry(curve, Math.max(20, points.length * 8), radius, 12, false);
    const tan0 = curve.getTangentAt(0);
    const tan1 = curve.getTangentAt(1);
    return {
      geometry: geo,
      ends: [
        { pos: vecs[0].toArray(), quat: quatFromDir(tan0) },
        { pos: vecs[vecs.length - 1].toArray(), quat: quatFromDir(tan1) },
      ],
    };
  }, [points, radius]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          {...steel('steel', { roughness: 0.32 })}
          color={color}
          emissive={color}
          emissiveIntensity={emissive}
        />
      </mesh>
      {flanges &&
        ends.map((e, i) => (
          <mesh key={i} position={e.pos} quaternion={e.quat}>
            <cylinderGeometry args={[radius * 1.9, radius * 1.9, radius * 1.1, 12]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
          </mesh>
        ))}
    </group>
  );
}

// tube geometry is built along +Y for cylinderGeometry; align that to `dir`
function quatFromDir(dir) {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return q;
}
