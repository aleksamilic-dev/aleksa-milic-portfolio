import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Grid, Lightformer, PerformanceMonitor, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { easing } from 'maath';
import { CAMERA_KEYFRAMES, CAMERA_WIDE, PALETTE, SPINE } from '../data.js';
import { useFactory } from '../store.js';
import { Beam, Strut } from './primitives.jsx';
import { Spine, SpineFlow } from './DataFlow.jsx';
import { Stations } from './stations.jsx';

const FACILITY_LENGTH = SPINE.startZ - SPINE.endZ + 12;
const FACILITY_MID = (SPINE.startZ + SPINE.endZ) / 2;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// --- camera: push-in on load, then a slow glide down the corridor --------
// On mount the camera eases CAMERA_WIDE -> keyframe 0 (~2.4s). After that it
// tracks `progress` along CAMERA_KEYFRAMES, heavily damped, so each machine
// drifts past behind the copy as you scroll. Languid, dim, not a tour.
function CameraRig({ pointer }) {
  const look = useRef(new THREE.Vector3(...CAMERA_WIDE.look));
  const intro = useRef(0);

  useFrame((state, dt) => {
    intro.current = Math.min(1, intro.current + dt / 2.4);
    const fi = smooth(intro.current);
    const { progress } = useFactory.getState();
    const { x: px, y: py } = pointer.current;
    const t = state.clock.elapsedTime;

    // interpolate the keyframe path by scroll progress
    const seg = progress * (CAMERA_KEYFRAMES.length - 1);
    const i = Math.min(Math.floor(seg), CAMERA_KEYFRAMES.length - 2);
    const f = smooth(seg - i);
    const a = CAMERA_KEYFRAMES[i];
    const b = CAMERA_KEYFRAMES[i + 1];

    // blend the intro (WIDE -> keyframe 0) into the travel target
    const tp = (k) => mix(CAMERA_WIDE.pos[k], mix(a.pos[k], b.pos[k], f), fi);
    const tl = (k) => mix(CAMERA_WIDE.look[k], mix(a.look[k], b.look[k], f), fi);

    easing.damp3(
      state.camera.position,
      [
        tp(0) + px * 0.24 + Math.sin(t * 0.24) * 0.03,
        tp(1) - py * 0.16 + Math.sin(t * 0.19) * 0.025,
        tp(2),
      ],
      0.75,
      dt,
    );
    easing.damp3(
      look.current,
      [tl(0) + px * 0.13, tl(1) - py * 0.1, tl(2)],
      0.85,
      dt,
    );
    state.camera.lookAt(look.current);
  });

  return null;
}

// a soft fill pinned just behind the camera so machine fronts never go
// fully black as we pass them
function CameraFill() {
  const ref = useRef();
  useFrame((state) => {
    ref.current.position.copy(state.camera.position);
    ref.current.position.y += 0.5;
  });
  return <pointLight ref={ref} intensity={1.6} distance={12} color="#9fb8cc" />;
}

// a warm key near the entrance, where the camera now sits
function EntranceKey() {
  return (
    <pointLight position={[0.6, 3.6, 4]} intensity={4} distance={16} color={PALETTE.amberBright} />
  );
}

function Facility() {
  const trusses = useMemo(() => {
    const out = [];
    for (let z = SPINE.startZ; z > SPINE.endZ; z -= 6) out.push(z);
    return out;
  }, []);

  return (
    <group>
      {/* dark base slab beneath the grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, FACILITY_MID]}>
        <planeGeometry args={[46, FACILITY_LENGTH]} />
        <meshStandardMaterial color="#090d12" metalness={0.35} roughness={0.75} />
      </mesh>

      <Grid
        position={[0, -1.48, FACILITY_MID]}
        args={[46, FACILITY_LENGTH]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1b2732"
        sectionSize={5}
        sectionThickness={1}
        sectionColor={PALETTE.blueDeep}
        fadeDistance={30}
        fadeStrength={2}
        followCamera={false}
        infiniteGrid
      />

      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.4, FACILITY_MID]}>
        <planeGeometry args={[26, FACILITY_LENGTH]} />
        <meshStandardMaterial color="#0b1015" side={THREE.BackSide} metalness={0.1} roughness={1} />
      </mesh>

      {/* long side rails */}
      {[-8.5, 8.5].map((x) => (
        <Beam key={x} position={[x, 5, FACILITY_MID]} length={FACILITY_LENGTH} size={0.22} />
      ))}

      {/* cross trusses + light strips */}
      {trusses.map((z) => (
        <group key={z} position={[0, 5.1, z]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.13, 0.13, 17]} />
            <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.4} />
          </mesh>
          <Strut height={3.4} position={[-7.4, -1.7, 0]} />
          <Strut height={3.4} position={[7.4, -1.7, 0]} />
          <mesh position={[0, -0.16, 0]}>
            <boxGeometry args={[3.4, 0.05, 0.34]} />
            <meshBasicMaterial color="#3f5666" toneMapped={false} />
          </mesh>
        </group>
      ))}

      <Spine />
    </group>
  );
}

function StudioEnv() {
  // Baked once. This is what every metal surface reflects, so it carries a
  // lot of the material read — keep it directional but not blown out.
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={['#0a0f16']} />
      {/* broad overhead key */}
      <Lightformer intensity={2.2} color="#dcecfa" position={[0, 8, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
      {/* warm rim from the entrance side */}
      <Lightformer intensity={1.6} color={PALETTE.amberBright} position={[-6, 2, 6]} scale={[3, 8, 1]} />
      {/* cool fill from the far end */}
      <Lightformer intensity={1.2} color={PALETTE.blueBright} position={[6, 3, -8]} scale={[5, 10, 1]} />
      {/* low bounce */}
      <Lightformer intensity={0.7} color="#1a2530" position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[12, 12, 1]} />
    </Environment>
  );
}

function Effects({ full }) {
  // multisampling handles edge AA and, importantly, sidesteps the
  // depth-blit warning postprocessing throws at multisampling={0}.
  return (
    <EffectComposer disableNormalPass multisampling={full ? 4 : 2} stencilBuffer={false}>
      <Bloom
        mipmapBlur
        intensity={full ? 0.42 : 0.3}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.3}
        radius={0.62}
        height={full ? 300 : 220}
      />
      <Vignette offset={0.3} darkness={0.55} eskil={false} />
    </EffectComposer>
  );
}

export default function Scene({ tier, pointer }) {
  // start optimistic, let PerformanceMonitor walk quality down if the GPU
  // can't keep up — smoother than shipping a permanently heavy scene.
  const [dpr, setDpr] = useState(tier === 'full' ? 1.25 : 1);
  const [fx, setFx] = useState(true);

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.1,
      }}
      camera={{ position: CAMERA_WIDE.pos, fov: 54, near: 0.1, far: 130 }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr((d) => Math.max(0.75, d - 0.35));
          setFx(false);
        }}
        onFallback={() => {
          setDpr(0.75);
          setFx(false);
        }}
      />

      <color attach="background" args={[PALETTE.void]} />
      <fog attach="fog" args={[PALETTE.void, 7, 36]} />

      <ambientLight intensity={0.28} />
      <hemisphereLight intensity={0.6} color="#3a5064" groundColor="#06090d" />
      <directionalLight position={[-6, 9, 4]} intensity={1.2} color="#dbe8f5" />
      <directionalLight position={[7, 4, -6]} intensity={0.45} color={PALETTE.blue} />
      <CameraFill />
      <EntranceKey />
      <pointLight position={[0, 4, SPINE.endZ + 6]} intensity={4} distance={22} color={PALETTE.blue} />

      <StudioEnv />

      <Facility />
      <Stations />
      <SpineFlow tier={tier} />

      {tier === 'full' && (
        <Sparkles
          count={22}
          scale={[16, 7, FACILITY_LENGTH]}
          position={[0, 2.6, FACILITY_MID]}
          size={2}
          speed={0.16}
          opacity={0.28}
          color={PALETTE.blueBright}
        />
      )}

      <CameraRig pointer={pointer} />
      {fx && <Effects full={tier === 'full'} />}
    </Canvas>
  );
}
