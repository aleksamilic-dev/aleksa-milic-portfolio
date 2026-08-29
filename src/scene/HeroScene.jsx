import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Float, Grid, PerformanceMonitor, Preload } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { easing } from 'maath';
import { CAMERA_HERO, CAMERA_HERO_WIDE, HERO_SPINE, PALETTE } from '../data.js';
import { StudioEnv } from './env.jsx';
import { Spine, SpineFlow } from './DataFlow.jsx';
import { IngestionDock } from './stations.jsx';

// The mobile "hero moment": machine 01 (the intake silo) framed for a portrait
// screen, sitting low with a stub of conveyor feeding it. Not a scrolling
// corridor — the camera pushes in once, then only breathes. When the hero
// scrolls away `heroInView` goes false and the whole loop freezes.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// WIDE -> HERO push-in on load (~2.6s), then a slow breathing drift. Damped so
// it settles softly and never snaps.
function HeroCameraRig() {
  const look = useRef(new THREE.Vector3(...CAMERA_HERO_WIDE.look));
  const intro = useRef(0);

  useFrame((state, dt) => {
    intro.current = Math.min(1, intro.current + dt / 2.2);
    const fi = smooth(intro.current);
    const t = state.clock.elapsedTime;

    // slow breathing orbit around the silo once settled
    const dx = Math.sin(t * 0.17) * 0.18 * fi;
    const dy = Math.sin(t * 0.23 + 1) * 0.1 * fi;

    const tp = (k) => mix(CAMERA_HERO_WIDE.pos[k], CAMERA_HERO.pos[k], fi);
    const tl = (k) => mix(CAMERA_HERO_WIDE.look[k], CAMERA_HERO.look[k], fi);

    easing.damp3(state.camera.position, [tp(0) + dx, tp(1) + dy, tp(2)], 0.6, dt);
    easing.damp3(look.current, [tl(0), tl(1), tl(2)], 0.7, dt);
    state.camera.lookAt(look.current);
  });

  return null;
}

// Gate the render loop: run only while the tab is visible AND the hero is on
// screen (`active`). R3F's `setFrameloop` zeroes `clock.elapsedTime`, so we
// stash it on freeze and restore on resume — the silo's animation continues
// where it left off instead of snapping back. `invalidate` is needed because
// the loop won't restart on its own on a never -> always switch.
function FrameloopGate({ active }) {
  const clock = useThree((s) => s.clock);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const elapsed = useRef(0);
  useEffect(() => {
    const now = () => (typeof performance !== 'undefined' ? performance : Date).now();
    const apply = () => {
      if (!document.hidden && active) {
        setFrameloop('always');
        clock.elapsedTime = elapsed.current;
        clock.oldTime = now();
        invalidate();
      } else {
        elapsed.current = clock.elapsedTime;
        setFrameloop('never');
      }
    };
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [active, clock, setFrameloop, invalidate]);
  return null;
}

// A short apron of facility under the silo: dark slab + grid + station ring, and
// a stub of the conveyor spine with packets flowing in toward the machine.
function HeroApron() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, -1]}>
        <planeGeometry args={[30, 34]} />
        <meshStandardMaterial color="#090d12" metalness={0.35} roughness={0.75} />
      </mesh>
      <Grid
        position={[0, -0.6, -1]}
        args={[30, 34]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1b2732"
        sectionSize={5}
        sectionThickness={1}
        sectionColor={PALETTE.blueDeep}
        fadeDistance={24}
        fadeStrength={2}
        followCamera={false}
        infiniteGrid
      />
      <mesh position={[0, -0.585, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.78, 48]} />
        <meshBasicMaterial color={PALETTE.blueDeep} toneMapped={false} transparent opacity={0.35} />
      </mesh>

      <Spine from={HERO_SPINE.from} to={HERO_SPINE.to} />
      <SpineFlow tier="lite" count={14} from={HERO_SPINE.from} to={HERO_SPINE.to} />
    </group>
  );
}

export default function HeroScene({ heroInView = true }) {
  const [dpr, setDpr] = useState(1);
  const [fx, setFx] = useState(true);

  return (
    <Canvas
      dpr={dpr}
      frameloop="always"
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.15,
        stencil: false,
      }}
      camera={{ position: CAMERA_HERO_WIDE.pos, fov: 50, near: 0.1, far: 40 }}
    >
      <FrameloopGate active={heroInView} />
      <PerformanceMonitor
        onDecline={() => {
          setFx(false);
          setDpr((d) => Math.max(0.6, d - 0.35));
        }}
        onFallback={() => {
          setFx(false);
          setDpr(0.6);
        }}
      />

      <color attach="background" args={[PALETTE.void]} />
      <fog attach="fog" args={[PALETTE.void, 11, 27]} />

      {/* Lit to be looked at — warmer and brighter than the corridor's
          behind-a-scrim rig. */}
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.75} color="#4a6076" groundColor="#0a0f14" />
      {/* warm key, front-right, up by the intake head */}
      <pointLight position={[3, 4.6, 4]} intensity={6} distance={20} color={PALETTE.amberBright} />
      {/* cool rim from behind-left so the silhouette lifts off the fog */}
      <pointLight position={[-3.6, 3, -3]} intensity={3.6} distance={15} color={PALETTE.blueBright} />
      {/* soft front fill — the near face never goes fully black */}
      <directionalLight position={[1, 3, 6]} intensity={0.85} color="#dbe8f5" />

      <StudioEnv />

      <HeroApron />
      <Float speed={0.7} rotationIntensity={0.05} floatIntensity={0.1} floatingRange={[-0.03, 0.03]}>
        <IngestionDock active />
      </Float>

      <HeroCameraRig />
      {fx && (
        <EffectComposer disableNormalPass multisampling={2} stencilBuffer={false}>
          <Bloom
            mipmapBlur
            intensity={0.34}
            luminanceThreshold={0.38}
            luminanceSmoothing={0.3}
            radius={0.5}
            height={180}
          />
        </EffectComposer>
      )}

      <Preload all />
    </Canvas>
  );
}
