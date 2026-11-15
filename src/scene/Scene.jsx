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
import {
  CAMERA_KEYFRAMES,
  CAMERA_KEYFRAMES_PORTRAIT,
  CAMERA_VIAS,
  CAMERA_VIAS_PORTRAIT,
  CAMERA_WIDE,
  CAMERA_WIDE_PORTRAIT,
  MACHINES,
  PALETTE,
  SPINE,
  STATION_GAP,
} from '../data.js';
import { useFactory } from '../store.js';
import { usePointer } from '../hooks.js';
import { StudioEnv } from './env.jsx';
import { Beam, Strut } from './primitives.jsx';
import { Spine, SpineFlow } from './DataFlow.jsx';
import { FlowClock } from './flow.jsx';
import { StaticBatch } from './batch.jsx';
import { Stations } from './stations.jsx';

const FACILITY_LENGTH = SPINE.startZ - SPINE.endZ + 12;
const FACILITY_MID = (SPINE.startZ + SPINE.endZ) / 2;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// The camera's route: a smooth curve through every keyframe and, between
// them, the via points that take it round the machines (see CAMERA_VIAS in
// data.js). `at(i, f, out)` writes the point `f` (0..1) of the way from
// keyframe i to keyframe i+1 into `out`, measured by distance along the
// route, so the vias don't make the camera speed up and slow down.
function useRoute(keyframes, vias) {
  return useMemo(() => {
    const points = [];
    const beat = []; // index of each keyframe in `points`
    keyframes.forEach((k, i) => {
      beat.push(points.length);
      points.push(new THREE.Vector3(...k.pos));
      (vias[i] || []).forEach((v) => points.push(new THREE.Vector3(...v)));
    });
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const last = points.length - 1;
    // chord lengths of the pieces between each pair of keyframes
    const pieces = beat.slice(0, -1).map((a, i) => {
      const lengths = [];
      for (let p = a; p < beat[i + 1]; p++) lengths.push(points[p].distanceTo(points[p + 1]));
      return { a, lengths, total: lengths.reduce((x, y) => x + y, 0) };
    });
    return {
      at(i, f, out) {
        const { a, lengths, total } = pieces[i];
        let s = f * total;
        let p = 0;
        while (p < lengths.length - 1 && s > lengths[p]) s -= lengths[p++];
        const index = a + p + Math.min(1, s / (lengths[p] || 1));
        return curve.getPoint(index / last, out);
      },
    };
  }, [keyframes, vias]);
}

// --- camera: push-in on load, then a slow glide down the corridor --------
// On mount the camera eases `wide` -> keyframe 0 (~2.4s). After that it tracks
// `progress` along `keyframes`, heavily damped, so each machine drifts past as
// you scroll. Languid, dim, not a tour. Portrait phones pass the centreline
// path (see data.js) instead of the landscape one.
function CameraRig({ pointer, keyframes, vias, wide }) {
  const look = useRef(new THREE.Vector3(...wide.look));
  const intro = useRef(0);
  const route = useRoute(keyframes, vias);
  const onRoute = useMemo(() => new THREE.Vector3(), []);

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

    // where on the route scroll progress puts the camera. The ease within
    // each stretch makes it settle at every keyframe.
    const seg = progress * (keyframes.length - 1);
    const i = Math.min(Math.floor(seg), keyframes.length - 2);
    const f = smooth(seg - i);
    const a = keyframes[i];
    const b = keyframes[i + 1];
    const at = route.at(i, f, onRoute).toArray();

    // blend the intro (wide -> keyframe 0) into the travel target. The look
    // target runs straight from one keyframe's to the next: it never needs
    // to go round anything.
    const tp = (k) => mix(wide.pos[k], at[k], fi);
    const tl = (k) => mix(wide.look[k], mix(a.look[k], b.look[k], f), fi);

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

// The render loop. The canvas runs on demand and this asks it for a frame at
// most 60 times a second. On a 60Hz screen that's every frame, as before. On
// the 90 and 120Hz screens most phones have now, the browser runs its frame
// callbacks 90 or 120 times a second, and the scene was drawing every one:
// up to twice the GPU work and heat for a slow ambient backdrop that looks
// no different at 60. The page itself still scrolls at the screen's full rate.
//
// It also freezes the loop, and the clock, while the tab is in the
// background, so animations pick up where they left off instead of lurching.
const FRAME_MS = 1000 / 60;

function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    let raf = 0;
    let next = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      // 1.5ms of slack, so a 60Hz screen's jitter never skips a frame
      if (t < next - 1.5) return;
      // on time: the next slot is one frame on. Fallen behind (a stall, a
      // return from the background): start counting again from now.
      next = t - next > FRAME_MS ? t + FRAME_MS : next + FRAME_MS;
      invalidate();
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) {
        clock.stop(); // holds elapsedTime where it is
      } else {
        // resume without THREE.Clock.start() — that would zero elapsedTime and
        // snap every time-based animation back to its start. Just clear the
        // stale delta so the first frame back isn't a giant time step.
        clock.running = true;
        clock.oldTime = performance.now();
        next = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    if (!document.hidden) raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [invalidate, clock]);
  return null;
}

// How far PerformanceMonitor may take the resolution down before it gives up
// the glow passes instead.
const DPR_FLOOR = 0.7;

export default function Scene({ tier, portrait = false }) {
  const pointer = usePointer();
  // start optimistic, let PerformanceMonitor walk quality down if the GPU
  // can't keep up — smoother than shipping a permanently heavy scene.
  // The canvas is a dim backdrop behind a scrim, fog, vignette and grain — it
  // renders at CSS resolution (dpr 1) even on HiDPI. PerformanceMonitor can
  // still walk it down further on weak GPUs.
  const [dpr, setDpr] = useState(1);
  const dprNow = useRef(1);
  const [fx, setFx] = useState(true);

  const wide = portrait ? CAMERA_WIDE_PORTRAIT : CAMERA_WIDE;
  const keyframes = portrait ? CAMERA_KEYFRAMES_PORTRAIT : CAMERA_KEYFRAMES;
  const vias = portrait ? CAMERA_VIAS_PORTRAIT : CAMERA_VIAS;

  return (
    <Canvas
      dpr={dpr}
      frameloop="demand"
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.1,
        stencil: false,
      }}
      // portrait sees a much narrower horizontal slice — widen the lens and
      // hold the far plane closer in (the corridor is only ~80 deep)
      camera={{
        position: wide.pos,
        fov: portrait ? 62 : 54,
        near: 0.1,
        far: portrait ? 90 : 130,
      }}
    >
      {/* first, so the factory clock has advanced before anything reads it */}
      <FlowClock />
      <FrameDriver />
      {/* If a device can't hold its frame rate, give up resolution first, in
          small steps: the canvas sits behind scrims, vignette and grain, so a
          softer image barely shows. The glow is what makes the machines read,
          so it only goes once the resolution is at its floor and the frame
          rate still isn't there. (It used to go on the first slow patch.) */}
      <PerformanceMonitor
        onDecline={() => {
          if (dprNow.current > DPR_FLOOR) {
            dprNow.current = Math.max(DPR_FLOOR, +(dprNow.current - 0.15).toFixed(2));
            setDpr(dprNow.current);
          } else {
            setFx(false);
          }
        }}
      />

      <color attach="background" args={[PALETTE.void]} />
      {/* portrait rides further back down the centreline — pull the haze in so
          the focused machine still separates and the far corridor stays dim */}
      <fog attach="fog" args={[PALETTE.void, portrait ? 9 : 7, portrait ? 40 : 36]} />

      {/* portrait shows the machines more head-on and with less scrim in front
          — lift the fill a little so they read as objects, not silhouettes */}
      <ambientLight intensity={portrait ? 0.42 : 0.3} />
      <hemisphereLight intensity={portrait ? 0.8 : 0.62} color="#3a5064" groundColor="#06090d" />
      <directionalLight position={[-6, 9, 4]} intensity={1.2} color="#dbe8f5" />
      <directionalLight position={[7, 4, -6]} intensity={0.45} color={PALETTE.blue} />
      <CameraFill />
      <EntranceKey />
      <StationLights />

      <StudioEnv />

      {/* the corridor never moves: trusses, struts, rails and the spine's
          legs merge into a handful of draw calls (see scene/batch.jsx) */}
      <StaticBatch>
        <Facility />
      </StaticBatch>
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

      <CameraRig pointer={pointer} keyframes={keyframes} vias={vias} wide={wide} />
      {fx && <Effects full={tier === 'full'} />}

      {/* compile every machine's shaders/geometry during the initial load so
          none of it stalls a frame when it scrolls into view */}
      <Preload all />
    </Canvas>
  );
}
