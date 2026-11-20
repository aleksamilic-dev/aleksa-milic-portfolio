import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PerformanceMonitor, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { easing } from 'maath';
import {
  CAMERA_KEYFRAMES,
  CAMERA_KEYFRAMES_PORTRAIT,
  CAMERA_LEAD_IN,
  CAMERA_LEAD_IN_PORTRAIT,
  CAMERA_VIAS,
  CAMERA_VIAS_PORTRAIT,
  CAMERA_WIDE,
  CAMERA_WIDE_PORTRAIT,
  PALETTE,
  SPINE,
  STATION_GAP,
  ZONE_COLORS,
} from '../data.js';
import { DRIFT } from '../beats.js';
import { useFactory } from '../store.js';
import { usePointer } from '../hooks.js';
import { StudioEnv } from './env.jsx';
import { Beam } from './primitives.jsx';
import { Hall } from './hall.jsx';
import { Spine, SpineFlow } from './DataFlow.jsx';
import { FlowClock, flow } from './flow.jsx';
import { LATE, StaticBatch } from './batch.jsx';
import { SUNLIT } from './daylight.js';
import { Stations } from './stations.jsx';

const FACILITY_LENGTH = SPINE.startZ - SPINE.endZ + 12;
const FACILITY_MID = (SPINE.startZ + SPINE.endZ) / 2;
const FACILITY_FRONT = FACILITY_MID + FACILITY_LENGTH / 2; // the entrance
const APRON = 14;

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
// `beat` along `keyframes`, heavily damped, so each machine drifts past as
// you scroll. Languid, dim, not a tour. Portrait screens take their own path
// down the other side of the belt (see data.js) instead of the landscape one.
//
// What's damped is how far along the route the camera is, not where it is.
// Damped in space, it cut the route's corners at any normal scrolling speed.
// A trip between machines takes under a screen of scroll, a second or less,
// and the camera, lagging behind, flew past the via points instead of round
// them, close by the machines they're there to clear: 1.5 units from the
// drum on an unhurried scroll, 0.3 on a jump from the nav, and on a phone
// half the frame within 2.5 units of it. Damped along the route, it rides the
// route itself at every speed, and just as unhurried.
//
// The push-in only plays when the scene mounts near the top of the page. It
// runs in a straight line from outside the entrance to wherever the scroll
// puts the camera, and from much further in than this (motion switched back
// on in the topbar mid-page, say) that line would cut straight through the
// machines. So past it the camera starts on its route instead, and while it
// plays the camera goes no further along the route than this, however far
// the page scrolls. "This" is where the route puts the camera at this beat
// without the walk in (`lead`), which reaches it sooner. Up to here the line
// stays at least 1.7 units clear of everything, on both paths.
const PUSH_IN_UNTIL = 0.25; // as `beat`: a quarter of the way to the drum

// How far along the route `beat` puts the camera: whole at each machine (1
// at the second, and so on), and eased between them, so it settles at every
// one. With a `lead` (CAMERA_LEAD_IN in data.js), the first machine's hold,
// beat 0 to DRIFT over the hero and the first project, is a walk instead:
// the camera goes that far along the first stretch, quickest at the very
// first scroll and settling as the first project ends, then eases the rest
// of the way as the page reaches the second machine.
function routeGoal(beat, stops, lead = 0) {
  const seg = Math.min(beat, stops - 1);
  const i = Math.min(Math.floor(seg), stops - 2);
  const f = seg - i;
  if (i > 0 || lead <= 0) return i + smooth(f);
  if (f > DRIFT) return lead + (1 - lead) * smooth((f - DRIFT) / (1 - DRIFT));
  const t = f / DRIFT;
  return lead * t * (2 - t);
}

// With the system's reduced-motion setting on (`still`), the camera doesn't
// fly. It holds at the machine the scroll has reached, and once the scroll
// is well on its way to the next one it fades out, moves there and fades
// back in ([data-veil] on .canvas-wrap, styles.css). No push-in, no pointer
// parallax, no drift while it holds. The factory itself keeps running: the
// topbar toggle is what stops everything (`calm`, App.jsx).
const STILL_SWITCH = 0.6; // as `beat`: how far past a machine before it fades
const STILL_FADE = 0.4; // s: long enough for the CSS fade out (0.35s) to finish

function CameraRig({ pointer, keyframes, vias, wide, still, lead }) {
  const route = useRoute(keyframes, vias);
  const gl = useThree((s) => s.gl);
  // Set up on the first frame: `u` is how far along the route the camera is,
  // `pos` and `aim` how far the push-in has brought its position and its look
  // from `wide` onto the route (1 once it's done), `intro` the push-in's clock.
  // When `still`: `stop` is the machine it holds at, `fade` how far into the
  // fade out it is (-1 when there's none).
  const ride = useRef(null);
  const sway = useMemo(() => new THREE.Vector3(), []); // pointer parallax and drift
  const aimSway = useMemo(() => new THREE.Vector3(), []);
  // where it was, relative to its route, when the route changed under it
  const carry = useMemo(() => new THREE.Vector3(), []);
  const aimCarry = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  // the fade's mark comes off with the scene, like FadeIn's
  useEffect(() => () => gl.domElement.closest('.canvas-wrap')?.removeAttribute('data-veil'), [gl]);

  useFrame((state, delta) => {
    // The first frame can come long after the clock started (it waits for
    // the shaders, see Warmup), so its delta can be longer than the whole
    // push-in, which then played out in that one frame and never showed.
    // Capped, the push-in always runs over frames the visitor actually sees.
    const dt = Math.min(delta, 1 / 20);
    const { beat } = useFactory.getState();
    const stops = keyframes.length;
    const goal = routeGoal(beat, stops, lead);
    const pushInGoal = routeGoal(PUSH_IN_UNTIL, stops);
    const nearest = Math.min(stops - 1, Math.max(0, Math.round(beat)));
    if (!ride.current) {
      // past PUSH_IN_UNTIL there's no push-in: straight onto the route
      const push = !still && goal <= pushInGoal;
      ride.current = {
        intro: push ? 0 : 1,
        pos: push ? 0 : 1,
        aim: push ? 0 : 1,
        u: push ? Math.min(goal, pushInGoal) : goal,
        stop: nearest,
        fade: -1,
        route,
        look: new THREE.Vector3(), // last frame's, for `aimCarry`
      };
    }
    const r = ride.current;
    const veil = (on) => gl.domElement.closest('.canvas-wrap')?.toggleAttribute('data-veil', on);
    if (still) {
      if (r.fade < 0 && nearest !== r.stop && Math.abs(beat - r.stop) > STILL_SWITCH) {
        r.fade = 0;
        veil(true);
      }
      if (r.fade >= 0) {
        r.fade += dt;
        // faded out: move to wherever the scroll is now (back where it was,
        // even, if the visitor turned round), and fade back in
        if (r.fade >= STILL_FADE) {
          r.stop = nearest;
          r.fade = -1;
          veil(false);
        }
      }
      r.u = r.stop;
      r.intro = r.pos = r.aim = 1;
    } else {
      if (r.fade >= 0) {
        // the setting went off mid-fade
        r.fade = -1;
        veil(false);
      }
      r.intro = Math.min(1, r.intro + dt / 2.4);
      const fi = smooth(r.intro);
      easing.damp(r, 'pos', fi, 0.75, dt);
      easing.damp(r, 'aim', fi, 0.85, dt);
      easing.damp(r, 'u', r.pos < 1 ? Math.min(goal, pushInGoal) : goal, 0.75, dt);
    }

    // ease the pointer toward its latest target here, in the render loop, so
    // the parallax smoothing pauses with everything else when the tab hides
    const ptr = pointer.current;
    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ptr.y += (ptr.ty - ptr.y) * 0.08;
    const t = state.clock.elapsedTime;
    if (still) {
      sway.set(0, 0, 0);
      aimSway.set(0, 0, 0);
    } else {
      easing.damp3(
        sway,
        [ptr.x * 0.24 + Math.sin(t * 0.24) * 0.03, -ptr.y * 0.16 + Math.sin(t * 0.19) * 0.025, 0],
        0.75,
        dt,
      );
      easing.damp3(aimSway, [ptr.x * 0.13, -ptr.y * 0.1, 0], 0.85, dt);
    }

    // the point on the route, blended in from `wide` by the push-in. The look
    // target runs straight from one keyframe's to the next: it never needs
    // to go round anything.
    const i = Math.min(Math.floor(r.u), stops - 2);
    const f = r.u - i;
    route.at(i, f, pos);
    pos.set(mix(wide.pos[0], pos.x, r.pos), mix(wide.pos[1], pos.y, r.pos), mix(wide.pos[2], pos.z, r.pos));
    const a = keyframes[i].look;
    const b = keyframes[i + 1].look;
    look.set(
      mix(wide.look[0], mix(a[0], b[0], f), r.aim),
      mix(wide.look[1], mix(a[1], b[1], f), r.aim),
      mix(wide.look[2], mix(a[2], b[2], f), r.aim),
    );

    // the route changed under it (a resize across portrait and landscape):
    // glide over from where it was rather than jump. Held still, it just
    // goes there.
    if (r.route !== route) {
      if (still) {
        carry.set(0, 0, 0);
        aimCarry.set(0, 0, 0);
      } else {
        carry.copy(state.camera.position).sub(sway).sub(pos);
        aimCarry.subVectors(r.look, look);
      }
      r.route = route;
    }
    easing.damp3(carry, 0, 0.75, dt);
    easing.damp3(aimCarry, 0, 0.85, dt);
    look.add(aimCarry);
    r.look.copy(look);

    state.camera.position.copy(pos).add(carry).add(sway);
    state.camera.lookAt(look.add(aimSway));
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

// Per-station key light: a world offset from the station origin, plus colour
// and reach. Rendered as a *fixed* pool of three lights (below) that follow the
// nearest machines — a constant light count means materials never recompile
// their shaders mid-scroll (a machine-owned light popping in cost a ~400ms
// frame). Values carried over from the old per-machine point lights.
//
// The silo's also stands in for the warm key that used to hang near the
// entrance, a second light of the same colour a metre and a half from it.
// Every lit pixel on screen pays for every light in the scene, wherever it
// is, and that one lit nothing past the first machine. One light placed
// between the two, closer to the silo's, lights the silo, the floor round it
// and the entrance within a few percent of what the pair did.
const STATION_LIGHTS = [
  { off: [1.2, 3.3, 2.8], color: new THREE.Color(PALETTE.amberBright), intensity: 7, distance: 15 },
  { off: [-1.1, 1.25, 0.4], color: new THREE.Color(PALETTE.amberBright), intensity: 3.4, distance: 7 },
  { off: [-0.55, 2.25, 2.4], color: new THREE.Color('#cfe0ee'), intensity: 4, distance: 9 },
  { off: [0, 1.55, 2.1], color: new THREE.Color(PALETTE.blue), intensity: 3, distance: 8 },
  // the dock: daylight through the gate, which floods in as it rolls up
  { off: [0, 0.35, -2.8], color: new THREE.Color('#ffe7c4'), intensity: 4.4, distance: 10, gate: true },
];

// How much brighter and further the dock's daylight reaches with the gate
// fully open than with it part-raised.
const GATE_FLOOD = 1.3;
const GATE_REACH = 0.5;

// How strongly a machine is lit, by how far `beat` is from it: full while
// it's the one framed, easing to 45% a stop away, and out to nothing a stop
// and a half away. That last point is where the pool of three below moves a
// light from the machine falling behind to the one coming up, so the move
// happens with the light at zero and never shows. (The lights used to
// switch between full and 45% in a single frame halfway between stops, in
// plain view of the camera.)
const stationLit = (d) => (d <= 1 ? 1 - 0.55 * smooth(d) : 0.45 * (1 - smooth((d - 1) * 2)));

function StationLights() {
  const a = useRef();
  const b = useRef();
  const c = useRef();
  useFrame(() => {
    const refs = [a.current, b.current, c.current];
    const { beat } = useFactory.getState();
    const focus = Math.round(beat);
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
      const flood = cfg.gate ? flow.gate : 0;
      light.position.set(cfg.off[0], cfg.off[1], z + cfg.off[2]);
      light.color.copy(cfg.color);
      light.distance = cfg.distance * (1 + GATE_REACH * flood);
      light.intensity = cfg.intensity * stationLit(Math.abs(beat - si)) * (1 + GATE_FLOOD * flood);
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

// --- zones ----------------------------------------------------------------
// Each machine's stretch of the hall has its own light (ZONE_COLORS in
// data.js). Two parts to it. The fixtures in a zone carry its colour, fixed
// in place: the strips under the roof trusses and along the doorways
// (hall.jsx), and the pool on the floor at each machine (stations.jsx). So
// the next zone glows its own colour down the hall before you reach it. And
// the haze and the sky light take the colour of the zone the camera is in,
// eased so the change follows the camera rather than leading it. The haze
// and sky only change uniforms: no new lights and no shader recompiles
// mid-scroll.
const ZONES = ZONE_COLORS.map((c) => new THREE.Color(c));
const VOID = new THREE.Color(PALETTE.void);
const SKY = new THREE.Color('#3a5064');
const HAZE_TINT = 0.07;
const SKY_TINT = 0.35;

// For the haze and the sky light, every zone colour is brought to the same
// brightness first. Otherwise the bright ones (gold, green, daylight) flood
// the hall and the blue barely shows.
const MOOD_LUMA = 0.33;
const MOODS = ZONES.map((c) => {
  const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return c.clone().multiplyScalar(MOOD_LUMA / luma);
});

function Zones({ skyIntensity }) {
  const hemi = useRef();
  const scene = useThree((s) => s.scene);
  const zone = useMemo(() => new THREE.Color(), []);
  const target = useMemo(() => new THREE.Color(), []);
  const started = useRef(false);

  useFrame((_, dt) => {
    const { beat } = useFactory.getState();
    const i = Math.min(Math.floor(beat), MOODS.length - 2);
    target.copy(MOODS[i]).lerp(MOODS[i + 1], smooth(beat - i));
    if (started.current) {
      easing.dampC(zone, target, 0.6, dt);
    } else {
      zone.copy(target);
      started.current = true;
    }
    if (scene.fog) {
      scene.fog.color.copy(VOID).lerp(zone, HAZE_TINT);
      // the background is what the haze fades into, so they move together
      if (scene.background?.isColor) scene.background.copy(scene.fog.color);
    }
    if (hemi.current) hemi.current.color.copy(SKY).lerp(zone, SKY_TINT);
  });

  return <hemisphereLight ref={hemi} intensity={skyIntensity} color="#3a5064" groundColor="#06090d" />;
}

// --- the floor ------------------------------------------------------------
// The slab, its apron out in front of the entrance where the camera starts,
// and the grid painted on it, as one surface. The grid used to be a second,
// see-through floor laid over the slab (drei's <Grid>), so half the screen
// was shaded twice, once for the slab and again for the grid blended over
// it. Now the slab's own shader draws the lines, to the same pattern and
// with the same fade away from the camera.
//
// The lines mix into the slab the way the grid's blending did. Where two
// lines cross their weight goes over 1, which brightens the crossing: the
// glow passes' half-float buffer, which the grid was blended into, doesn't
// clamp it. It's drawn LATE (batch.jsx), after the machines.
const SLAB = { color: '#090d12', metalness: 0.35, roughness: 0.75 };
const GRID = {
  cell: 1,
  cellThickness: 0.5,
  cellColor: '#1b2732',
  section: 5,
  sectionThickness: 1,
  sectionColor: PALETTE.blueDeep,
  fade: 30, // along the floor from under the camera to where the lines are gone
  fadeStrength: 2,
};
const FLOOR_BACK = FACILITY_MID - FACILITY_LENGTH / 2;
const FLOOR_FRONT = FACILITY_FRONT + APRON;

function useFloorMaterial() {
  return useMemo(() => {
    const m = new THREE.MeshStandardMaterial(SLAB);
    const uniforms = {
      // the lines run through the middle of the hall, as the grid's did
      gridOrigin: { value: new THREE.Vector2(0, FACILITY_MID) },
      cellColor: { value: new THREE.Color(GRID.cellColor) },
      sectionColor: { value: new THREE.Color(GRID.sectionColor) },
    };
    const f = (x) => x.toFixed(3);
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvFloor = (modelMatrix * vec4(transformed, 1.0)).xz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec2 vFloor;
uniform vec2 gridOrigin;
uniform vec3 cellColor;
uniform vec3 sectionColor;
// 1 on a line of a grid this size, falling to 0 within a pixel of it
float gridLine(vec2 at, float size, float thickness) {
  vec2 r = at / size;
  vec2 g = abs(fract(r - 0.5) - 0.5) / fwidth(r);
  return 1.0 - min(min(g.x, g.y) + 1.0 - thickness, 1.0);
}`,
        )
        .replace(
          '#include <fog_fragment>',
          `#include <fog_fragment>
{
  vec2 at = vFloor - gridOrigin;
  float cell = gridLine(at, ${f(GRID.cell)}, ${f(GRID.cellThickness)});
  float section = gridLine(at, ${f(GRID.section)}, ${f(GRID.sectionThickness)});
  float near = 1.0 - min(distance(vFloor, cameraPosition.xz) / ${f(GRID.fade)}, 1.0);
  float a = (cell + section) * pow(near, ${f(GRID.fadeStrength)});
  a = mix(0.75 * a, a, section);
  vec3 line = mix(cellColor, sectionColor, min(1.0, ${f(GRID.sectionThickness)} * section));
  gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - a) + line * a;
}`,
        );
      // and the daylight from the shipping gate falls on it (daylight.js)
      SUNLIT.patch(shader);
    };
    m.customProgramCacheKey = () => 'floor-grid+sunlit';
    return m;
  }, []);
}

function Floor() {
  const material = useFloorMaterial();
  const length = FLOOR_FRONT - FLOOR_BACK;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, FLOOR_FRONT - length / 2]}
      material={material}
      renderOrder={LATE}
    >
      <planeGeometry args={[46, length]} />
    </mesh>
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
      <Floor />

      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.4, FACILITY_MID]} renderOrder={LATE}>
        <planeGeometry args={[26, FACILITY_LENGTH]} />
        <meshStandardMaterial color="#0b1015" side={THREE.BackSide} metalness={0.1} roughness={1} />
      </mesh>

      {/* long side rails */}
      {[-8.5, 8.5].map((x) => (
        <Beam key={x} position={[x, 5, FACILITY_MID]} length={FACILITY_LENGTH} size={0.22} />
      ))}

      {/* cross trusses. The columns that carry them, and the light strips
          under them, are in Hall. */}
      {trusses.map((z) => (
        <mesh key={z} position={[0, 5.1, z]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.13, 0.13, 17]} />
          <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}

      <Hall trusses={trusses} />
      <Spine />
    </group>
  );
}

// The glow blurs a copy of the bright parts by halving it again and again
// and adding the halves back up. postprocessing halves it 8 times by
// default, 16 passes a frame. The last three halvings, a canvas a 64th to a
// 256th of the screen across, added nothing that showed in side-by-side
// screenshots at desktop or phone size, and each pass costs the main thread
// as much as a big one. Five halvings, 10 passes.
const GLOW_LEVELS = 5;

function Effects({ full }) {
  // multisampling handles edge AA and, importantly, sidesteps the
  // depth-blit warning postprocessing throws at multisampling={0}. 2x is
  // plenty for a soft, dim backdrop — 4x was pure cost here.
  return (
    <EffectComposer disableNormalPass multisampling={2} stencilBuffer={false}>
      <Bloom
        mipmapBlur
        levels={GLOW_LEVELS}
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

// The render loop. The canvas runs on demand and this draws a frame at most
// 60 times a second. On a 60Hz screen that's every frame. On the 90 and 120Hz
// screens most phones have now, the browser runs its frame callbacks 90 or
// 120 times a second, and the scene was drawing every one: up to twice the
// GPU work and heat for a slow ambient backdrop that looks no different at
// 60. The page itself still scrolls at the screen's full rate.
//
// It draws the frame itself (the root's `advance`), here in this callback.
// Asking the canvas for one (`invalidate`) only starts the canvas's own loop
// on the browser's next frame, and the request made on that frame was used up
// by the draw already queued for it. So it drew every other frame: 30 on a
// 60Hz screen, which PerformanceMonitor then took for a slow device and cut
// the resolution.
//
// It also freezes the loop, and the clock, while the tab is in the
// background, so animations pick up where they left off instead of lurching.
//
// And while nobody scrolls, points or types for IDLE_AFTER, it draws 30 times
// a second instead of 60. That's most of a visit (someone reading), and the
// scene is slow and ambient enough to look the same at 30: the belt, the
// drum, the blinking lights. It halves the work meanwhile, which is battery
// on a phone and fan noise on a laptop. Any input brings 60 back at once.
const FRAME_MS = 1000 / 60;
const IDLE_FRAME_MS = 1000 / 30;
const IDLE_AFTER = 2500;
const INPUTS = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];

// When the last frame was drawn at the idle pace. PerformanceMonitor would
// read those 30 fps as a device that can't keep up and start cutting quality,
// so Quality ignores what it reports for a while after (see IDLE_BLIND_MS).
const pace = { lastIdleFrame: -Infinity };

function FrameDriver() {
  const get = useThree((s) => s.get);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    let raf = 0;
    let next = 0;
    let lastInput = performance.now();
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const frameMs = t - lastInput > IDLE_AFTER ? IDLE_FRAME_MS : FRAME_MS;
      // 1.5ms of slack, so a 60Hz screen's jitter never skips a frame
      if (t < next - 1.5) return;
      // on time: the next slot is one frame on. Fallen behind (a stall, a
      // return from the background): start counting again from now.
      next = t - next > frameMs ? t + frameMs : next + frameMs;
      const state = get();
      // 'never' while nothing may be drawn: Warmup, or Quality's hold
      if (state.frameloop === 'never') return;
      if (frameMs === IDLE_FRAME_MS) pace.lastIdleFrame = t;
      state.advance(t);
    };
    // input clears the slot too, so the first frame back isn't held to the
    // idle pace
    const onInput = () => {
      if (performance.now() - lastInput > IDLE_AFTER) next = 0;
      lastInput = performance.now();
    };
    const listen = { passive: true, capture: true };
    INPUTS.forEach((type) => window.addEventListener(type, onInput, listen));
    // the page scrolls inside .viewport, and scroll doesn't bubble, so it's
    // caught on the way down
    document.addEventListener('scroll', onInput, listen);
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
      INPUTS.forEach((type) => window.removeEventListener(type, onInput, listen));
      document.removeEventListener('scroll', onInput, listen);
    };
  }, [get, clock]);
  return null;
}

// --- warm-up ------------------------------------------------------------
// Every shader the scene uses is compiled before the first frame is drawn,
// and without holding up the page while the GPU does it. The canvas draws
// nothing until then (the `frameloop` gate in Scene), because the first draw
// with a shader that's still compiling waits for it, page and all.
//
// This replaces drei's <Preload all>, which compiled everything in one go on
// the main thread and then drew the whole scene six times over into a cube
// camera to warm it up: on a mid-range phone, a freeze of four to six
// seconds a few seconds into the load.
//
// The scene is drawn into the glow passes' offscreen buffer, and three builds
// a different variant of each shader for an offscreen buffer than for the
// screen (no tone mapping, linear colour). So it compiles with an offscreen
// target bound: any one gives the same variant. The screen variants are only
// needed if the glow is ever turned off, so they're compiled then (Quality,
// below). A compile that never reports back still lets the scene start after
// WARMUP_LIMIT, so the canvas can't stay blank.
const WARMUP_LIMIT = 8000;

// Compiles every shader the scene uses, for drawing into an offscreen buffer
// (`offscreen`) or straight to the screen, and resolves when they're all
// ready. Setting a shader up still takes the main thread a little while
// (three builds its source and gathers its settings), so it goes one part of
// the scene at a time, a machine say, with a pause after each for the page
// to answer input. Each compile starts synchronously, so the bound target
// only has to be in place for the call itself.
const breather = () => new Promise((r) => setTimeout(r, 0));

async function compileScene(gl, scene, camera, offscreen) {
  const target = offscreen ? new THREE.WebGLRenderTarget(1, 1) : null;
  const pending = [];
  try {
    for (const part of [...scene.children]) {
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      try {
        // the part's materials, lit and fogged as the whole scene is
        pending.push(gl.compileAsync(part, camera, scene));
      } finally {
        gl.setRenderTarget(previous);
      }
      await breather();
    }
    await Promise.all(pending);
  } finally {
    target?.dispose();
  }
}

// Fades the canvas in once its first frame is drawn (styles.css, .canvas-wrap
// [data-shown]), instead of the whole scene appearing at once at full
// brightness, which on a phone happens seconds after the page itself. The
// mark comes off again with the scene, so motion switched back on in the
// topbar fades in too.
function FadeIn() {
  const gl = useThree((s) => s.gl);
  const shown = useRef(false);
  useEffect(() => {
    const wrap = gl.domElement.closest('.canvas-wrap');
    return () => wrap?.removeAttribute('data-shown');
  }, [gl]);
  useFrame(() => {
    if (shown.current) return;
    shown.current = true;
    gl.domElement.closest('.canvas-wrap')?.setAttribute('data-shown', '');
  });
  return null;
}

// The bulk of the scene, the hall and the machines, takes React a second or
// more to build on a mid-range phone: some 750 objects, each with its
// geometry and material. Built in the canvas's first render, that was one
// unbroken task. Mounted from a transition instead, after that first render,
// React builds it in short slices and lets the page answer input between
// them. Nothing is drawn until Warmup is done anyway.
function Deferred({ children }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    startTransition(() => setShow(true));
  }, []);
  return show ? children : null;
}

// `offscreen`: compile the variants for the glow passes' buffer (the start,
// with the glow on) or the screen's (back from a lost context without it)
function Warmup({ onReady, offscreen = true }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let live = true;
    let done = false;
    const finish = () => {
      if (done || !live) return;
      done = true;
      onReady();
    };
    compileScene(gl, scene, camera, offscreen).then(finish, finish);
    const limit = setTimeout(finish, WARMUP_LIMIT);
    return () => {
      live = false;
      clearTimeout(limit);
    };
  }, [gl, scene, camera, onReady, offscreen]);

  return null;
}

// --- after a lost context ---------------------------------------------------
// A phone can take the GPU back from a page left in the background, and
// everything the page had on it goes. three uploads geometry and textures
// again by itself when the context comes back, but two things here were
// made on the GPU once, at the start, and stayed lost: the reflections
// (StudioEnv, baked into a cube map on its first frame) and the compiled
// shaders. The scene came back with its metals near black, and its first
// frame compiled every shader at once. So when the context comes back, the
// reflections are baked again and drawing is held, as at the start, until
// the shaders are compiled (Warmup).
function ContextRestore({ onRestore }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextrestored', onRestore);
    return () => canvas.removeEventListener('webglcontextrestored', onRestore);
  }, [gl, onRestore]);
  return null;
}

// If a device can't hold its frame rate, give up resolution first, in small
// steps: the canvas sits behind scrims, vignette and grain, so a softer image
// barely shows. The glow is what makes the machines read, so it only goes
// once the resolution is at its floor and the frame rate still isn't there.
// (It used to go on the first slow patch.)
//
// Without the glow the scene draws straight to the screen, which takes the
// other variant of every shader, and those can't be compiled ahead: while
// the glow passes are mounted they switch the renderer's tone mapping off
// (@react-three/postprocessing), and it only comes back when they go. So
// drawing is held (`held`, the same gate as Warmup), the glow goes, and the
// screen variants compile in the background with the tone mapping back.
// Then drawing resumes. The canvas keeps its last frame meanwhile. Compiled
// at the first draw instead, they froze the page for over a second on a
// mid-range phone, which is just the device that gets here.
//
// DPR_FLOOR is how far the resolution may go down before the glow goes.
const DPR_FLOOR = 0.7;

// PerformanceMonitor judges about 2.5 s of frames at a time (ten 250 ms
// samples, drei's defaults). A judgement that took in any frames drawn at the
// idle pace (FrameDriver) says nothing about the device, so it's ignored.
const IDLE_BLIND_MS = 3000;

function Quality({ fx, setFx, setDpr, held, setHeld }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const dprNow = useRef(1);

  // the glow has gone (its passes' cleanup has put the tone mapping back by
  // now: passive cleanups all run before any new effect): compile, resume
  useEffect(() => {
    if (fx || !held) return undefined;
    let live = true;
    const resume = () => live && setHeld(false);
    compileScene(gl, scene, camera, false).then(resume, resume);
    const limit = setTimeout(resume, WARMUP_LIMIT);
    return () => {
      live = false;
      clearTimeout(limit);
    };
  }, [fx, held, gl, scene, camera, setHeld]);

  return (
    <PerformanceMonitor
      onDecline={() => {
        if (performance.now() - pace.lastIdleFrame < IDLE_BLIND_MS) return;
        if (dprNow.current > DPR_FLOOR) {
          dprNow.current = Math.max(DPR_FLOOR, +(dprNow.current - 0.15).toFixed(2));
          setDpr(dprNow.current);
        } else if (fx && !held) {
          setHeld(true);
          setFx(false);
        }
      }}
    />
  );
}

export default function Scene({ tier, portrait = false, still = false }) {
  const pointer = usePointer();
  // start optimistic, let PerformanceMonitor walk quality down if the GPU
  // can't keep up — smoother than shipping a permanently heavy scene.
  // The canvas is a dim backdrop behind a scrim, fog, vignette and grain — it
  // renders at CSS resolution (dpr 1) even on HiDPI. PerformanceMonitor can
  // still walk it down further on weak GPUs.
  const [dpr, setDpr] = useState(1);
  const [fx, setFx] = useState(true);
  // nothing is drawn until every shader is compiled (Warmup), or while the
  // screen variants compile when the glow goes (Quality)
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  // how many times the context has come back (ContextRestore)
  const [restored, setRestored] = useState(0);
  const onRestore = useCallback(() => {
    setReady(false);
    setRestored((n) => n + 1);
  }, []);

  const wide = portrait ? CAMERA_WIDE_PORTRAIT : CAMERA_WIDE;
  const keyframes = portrait ? CAMERA_KEYFRAMES_PORTRAIT : CAMERA_KEYFRAMES;
  const vias = portrait ? CAMERA_VIAS_PORTRAIT : CAMERA_VIAS;

  // The hall and the machines take nothing from the state above, yet each
  // change to it (drawing starting, a resolution step, the glow going)
  // re-rendered all of them, some 750 elements, the first time just as the
  // first frame was due. Kept as one unchanging element, React skips them.
  const world = useMemo(
    () => (
      <Deferred>
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

        {/* last, so everything above is in the scene (and the batches are
            merged) when it compiles */}
        <Warmup onReady={markReady} />
      </Deferred>
    ),
    [tier, markReady],
  );

  return (
    <Canvas
      dpr={dpr}
      frameloop={ready && !held ? 'demand' : 'never'}
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
      <Quality fx={fx} setFx={setFx} setDpr={setDpr} held={held} setHeld={setHeld} />

      <color attach="background" args={[PALETTE.void]} />
      {/* portrait sees less of the hall's width, so its haze starts a little
          further out: the machine in view stays clear and the far hall still
          fades */}
      <fog attach="fog" args={[PALETTE.void, portrait ? 9 : 7, portrait ? 40 : 36]} />

      {/* portrait shows the machines more head-on and with less scrim in front
          — lift the fill a little so they read as objects, not silhouettes */}
      <ambientLight intensity={portrait ? 0.42 : 0.3} />
      {/* the sky light, tinted by the zone the camera is in, along with the haze */}
      <Zones skyIntensity={portrait ? 0.8 : 0.62} />
      <directionalLight position={[-6, 9, 4]} intensity={1.2} color="#dbe8f5" />
      <directionalLight position={[7, 4, -6]} intensity={0.45} color={PALETTE.blue} />
      <CameraFill />
      <StationLights />

      {/* baked again each time the context comes back */}
      <StudioEnv key={restored} />
      <ContextRestore onRestore={onRestore} />

      <CameraRig
        pointer={pointer}
        keyframes={keyframes}
        vias={vias}
        wide={wide}
        still={still}
        lead={portrait ? CAMERA_LEAD_IN_PORTRAIT : CAMERA_LEAD_IN}
      />
      {fx && <Effects full={tier === 'full'} />}
      <FadeIn />

      {world}
      {/* after the world, like the first, so it compiles all of it */}
      {restored > 0 && <Warmup key={restored} onReady={markReady} offscreen={fx} />}
    </Canvas>
  );
}
