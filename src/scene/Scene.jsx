import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Grid,
  PerformanceMonitor,
  Preload,
  Sparkles,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { easing } from 'maath';
import { CAMERA_KEYFRAMES, CAMERA_WIDE, MACHINES, PALETTE, SPINE, STATION_GAP } from '../data.js';
import { useFactory } from '../store.js';
import { usePointer } from '../hooks.js';
import { StudioEnv } from './env.jsx';
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

    // ease the pointer toward its latest target here, in the render loop, so
    // the parallax smoothing pauses with everything else when the tab hides
    const ptr = pointer.current;
    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ptr.y += (ptr.ty - ptr.y) * 0.08;
    const px = ptr.x;
    const py = ptr.y;
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

// Per-station key light: a world offset from the station origin, plus colour
// and reach. Rendered as a *fixed* pool of three lights (below) that follow the
// nearest machines — a constant light count means materials never recompile
// their shaders mid-scroll (a machine-owned light popping in cost a ~400ms
// frame). Values carried over from the old per-machine point lights.
const STATION_LIGHTS = [
  { off: [1.4, 3.2, 2.4], color: new THREE.Color(PALETTE.amberBright), intensity: 4, distance: 11 },
  { off: [-1.1, 1.25, 0.4], color: new THREE.Color(PALETTE.amberBright), intensity: 3.4, distance: 7 },
  { off: [-0.55, 2.25, 2.4], color: new THREE.Color('#cfe0ee'), intensity: 4, distance: 9 },
  { off: [0, 1.55, 2.1], color: new THREE.Color(PALETTE.blue), intensity: 3, distance: 8 },
  { off: [0, 0.35, -2.8], color: new THREE.Color(PALETTE.blueBright), intensity: 4.4, distance: 10 },
];

function StationLights() {
  const a = useRef();
  const b = useRef();
  const c = useRef();
  useFrame(() => {
    const refs = [a.current, b.current, c.current];
    const { progress } = useFactory.getState();
    const focus = Math.round(progress * (MACHINES.length - 1));
    for (let k = 0; k < 3; k++) {
      const light = refs[k];
      if (!light) continue;
      const si = focus - 1 + k; // the three machines that can be on screen
      const cfg = STATION_LIGHTS[si];
      if (!cfg) {
        light.intensity = 0;
        continue;
      }
      const z = -si * STATION_GAP;
      light.position.set(cfg.off[0], cfg.off[1], z + cfg.off[2]);
      light.color.copy(cfg.color);
      light.distance = cfg.distance;
      light.intensity = cfg.intensity * (si === focus ? 1 : 0.45);
    }
  });
  return (
    <>
      <pointLight ref={a} intensity={0} />
      <pointLight ref={b} intensity={0} />
      <pointLight ref={c} intensity={0} />
    </>
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

function Effects({ full }) {
  // multisampling handles edge AA and, importantly, sidesteps the
  // depth-blit warning postprocessing throws at multisampling={0}. 2x is
  // plenty for a soft, dim backdrop — 4x was pure cost here.
  return (
    <EffectComposer disableNormalPass multisampling={2} stencilBuffer={false}>
      <Bloom
        mipmapBlur
        intensity={full ? 0.42 : 0.3}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.3}
        radius={0.62}
        height={full ? 240 : 200}
      />
      <Vignette offset={0.3} darkness={0.55} eskil={false} />
    </EffectComposer>
  );
}

// Freeze the render loop (and the clock, so animations resume where they left
// off instead of lurching) while the tab is in the background.
function PauseWhenHidden({ setFrameloop }) {
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        clock.stop(); // holds elapsedTime where it is
        setFrameloop('never');
      } else {
        // resume without THREE.Clock.start() — that would zero elapsedTime and
        // snap every time-based animation back to its start. Just clear the
        // stale delta so the first frame back isn't a giant time step.
        clock.running = true;
        clock.oldTime = (typeof performance !== 'undefined' ? performance : Date).now();
        setFrameloop('always');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [clock, setFrameloop]);
  return null;
}

export default function Scene({ tier }) {
  const pointer = usePointer();
  // start optimistic, let PerformanceMonitor walk quality down if the GPU
  // can't keep up — smoother than shipping a permanently heavy scene.
  // The canvas is a dim backdrop behind a scrim, fog, vignette and grain — it
  // renders at CSS resolution (dpr 1) even on HiDPI. PerformanceMonitor can
  // still walk it down further on weak GPUs.
  const [dpr, setDpr] = useState(1);
  const [fx, setFx] = useState(true);
  const [frameloop, setFrameloop] = useState(() =>
    typeof document !== 'undefined' && document.hidden ? 'never' : 'always',
  );

  return (
    <Canvas
      dpr={dpr}
      frameloop={frameloop}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.1,
        stencil: false,
      }}
      camera={{ position: CAMERA_WIDE.pos, fov: 54, near: 0.1, far: 130 }}
    >
      <PauseWhenHidden setFrameloop={setFrameloop} />
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

      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.62} color="#3a5064" groundColor="#06090d" />
      <directionalLight position={[-6, 9, 4]} intensity={1.2} color="#dbe8f5" />
      <directionalLight position={[7, 4, -6]} intensity={0.45} color={PALETTE.blue} />
      <CameraFill />
      <EntranceKey />
      <StationLights />

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

      {/* compile every machine's shaders/geometry during the initial load so
          none of it stalls a frame when it scrolls into view */}
      <Preload all />
    </Canvas>
  );
}
