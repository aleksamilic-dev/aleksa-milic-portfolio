import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { PALETTE } from '../data.js';
import {
  ControlRoom,
  IngestionDock,
  ProcessingHall,
  ShippingDock,
  StorageVault,
} from './stations.jsx';

const MACHINE_PARTS = [
  IngestionDock,
  ProcessingHall,
  StorageVault,
  ControlRoom,
  ShippingDock,
];

// Dev-only: a single machine on a lit turntable, no fog / scrim / HUD. Mounted
// by App when the URL has ?inspect=<0-4>. Handy for working on one machine's
// model in isolation; not part of the shipped site. `&spin=<rad/s>` overrides
// the turntable speed (0 to hold still and orbit by hand).

const SPIN = (() => {
  const v = new URLSearchParams(window.location.search).get('spin');
  return v == null ? 0.2 : Number(v) || 0;
})();

function Turntable({ children }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * SPIN;
  });
  return <group ref={ref}>{children}</group>;
}

export default function Inspector({ index = 0 }) {
  const Machine = MACHINE_PARTS[index] ?? MACHINE_PARTS[0];
  return (
    <Canvas
      camera={{ position: [5, 3.4, 7], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: false, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={['#0b0f15']} />
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.6} color="#3a5064" groundColor="#06090d" />
      <directionalLight position={[-6, 9, 4]} intensity={1.3} color="#dbe8f5" />
      <directionalLight position={[7, 4, -6]} intensity={0.5} color={PALETTE.blue} />
      <pointLight position={[2, 4, 4]} intensity={3} distance={16} color={PALETTE.amberBright} />

      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#0a0f16']} />
        <Lightformer intensity={2.2} color="#dcecfa" position={[0, 8, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
        <Lightformer intensity={1.6} color={PALETTE.amberBright} position={[-6, 2, 6]} scale={[3, 8, 1]} />
        <Lightformer intensity={1.2} color={PALETTE.blueBright} position={[6, 3, -8]} scale={[5, 10, 1]} />
      </Environment>

      <Grid
        position={[0, -1.5, 0]}
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1b2732"
        sectionSize={5}
        sectionThickness={1}
        sectionColor={PALETTE.blueDeep}
        fadeDistance={30}
        infiniteGrid
      />

      <Suspense fallback={null}>
        <Turntable>
          <Machine />
        </Turntable>
      </Suspense>

      <OrbitControls target={[0, 1.5, 0]} enablePan minDistance={3} maxDistance={22} />

      <EffectComposer disableNormalPass multisampling={4} stencilBuffer={false}>
        <Bloom mipmapBlur intensity={0.4} luminanceThreshold={0.4} luminanceSmoothing={0.3} radius={0.6} height={300} />
        <Vignette offset={0.35} darkness={0.5} eskil={false} />
      </EffectComposer>
    </Canvas>
  );
}
