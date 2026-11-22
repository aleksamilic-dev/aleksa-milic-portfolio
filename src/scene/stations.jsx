import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Float } from '@react-three/drei';
import { MACHINES, PALETTE, SPINE, STATION_GAP, ZONE_COLORS } from '../data.js';
import { useFactory } from '../store.js';
import { batchPulse, flow } from './flow.jsx';
import { LIVE, StaticBatch } from './batch.jsx';
import { Band, BoltRing, Gear, HazardStripes, Node, Pipe, SAFETY, Screen, cast, steel } from './primitives.jsx';
import { DUCT, TAPS } from './services.js';
import { SUNLIT } from './daylight.js';
import { PULSE, setPulse } from './pulse.js';

// Where machine i sits along the belt, as distance from its head: what
// batchPulse takes. Each machine reacts as a batch goes through it: the
// silo's discharge light flashes, the drum's core surges, the vault's cells
// light up as it's written, and the control room's light goes green as it
// passes the checks.
const onBelt = (i) => SPINE.startZ + i * STATION_GAP;
// the quality checks run just past the control room (CHECK in DataFlow.jsx)
const CHECKS = onBelt(3) + 2.25;
const PASSED = new THREE.Color(PALETTE.green);
const WATCHING = new THREE.Color(PALETTE.blueBright);

// The parts whose only animation is their glow are merged into their
// machine's batch and given a glow channel (pulse.js), which each machine
// sets every frame below: the glow's colour times how strong it is now.
const AMBER = new THREE.Color(PALETTE.amber);
const BLUE_BRIGHT = new THREE.Color(PALETTE.blueBright);
const washGlow = new THREE.Color();

// the hall's cable sheathing (hall.jsx), for cables on the machines
const CABLE = { color: '#1c2229', metalness: 0.15, roughness: 0.75 };

// Every machine here runs at roughly half the animation speed and half the
// emissive punch of the original "tour" version — it's ambient backdrop now,
// sitting behind a scrim, not the subject.

// ---------------------------------------------------------------------------
// 01 — Ingestion Dock : an intake silo. Raw data is drawn in through the rotary
// head and the hooded front port, accumulates in the silo, and funnels down the
// hopper into the spine. Raw in, one stream out.
// ---------------------------------------------------------------------------
const GAUGE_H = 1.4; // level-gauge travel, shared by the render + fill animation
const GAUGE_FOOT = -0.8;
const HEAD_Y = 4.02; // the rotary intake head, which the intake duct drops into

export function IngestionDock() {
  const rotor = useRef();
  const fill = useRef();
  useFrame(() => {
    const t = flow.t;
    if (rotor.current) rotor.current.rotation.y = t * 0.3;
    setPulse(PULSE.siloGrille, AMBER, 0.7 + Math.sin(t * 1.6) * 0.3);
    if (fill.current) {
      // accumulated data settles up over ~28s, then drains and refills
      const k = 0.12 + (0.5 - Math.cos(t * 0.22) * 0.5) * 0.8;
      fill.current.scale.y = k;
      fill.current.position.y = GAUGE_FOOT + (k * GAUGE_H) / 2;
    }
    // flashes as each batch is let out onto the belt below
    setPulse(PULSE.siloValve, AMBER, 0.3 + 1.4 * batchPulse(onBelt(0)));
  });

  return (
    <group>

      {/* base pad */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[1.2, 1.36, 0.42, 24]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <BoltRing count={12} radius={1.12} r={0.045} position={[0, -0.16, 0]} />

      {/* four splayed legs + a ring beam, holding the hopper clear of the pad,
          each leg on an anchor plate where it meets the pad */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        return (
          <group key={a} rotation={[0, -a, 0]}>
            <mesh position={[0.9, 0, 0]} rotation={[0, 0, 0.42]}>
              <boxGeometry args={[0.15, 1.02, 0.15]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
            <mesh position={[0.985, -0.175, 0]}>
              <boxGeometry args={[0.26, 0.03, 0.24]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
          </group>
        );
      })}
      <Band radius={0.74} tube={0.05} position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} />

      {/* conical hopper — the accumulated data funnels to one discharge */}
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.9, 0.15, 1.22, 28, 1, true]} />
        <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[0.36, 0.32, 0.36]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <mesh userData={{ pulse: PULSE.siloValve }} position={[0, 0.33, 0.19]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
      <BoltRing count={8} radius={0.19} r={0.022} position={[0, 0.5, 0]} />

      {/* cylindrical body — plate courses, weld strakes, an inspection hatch */}
      <mesh position={[0, 2.54, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 2.06, 36, 1, true]} />
        <meshStandardMaterial {...steel('steel', { roughness: 0.3 })} side={THREE.DoubleSide} />
      </mesh>
      <Band radius={0.95} position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* the courses are bolted together through the heavy bands at the
          shell's foot and head */}
      <BoltRing count={24} radius={0.95} r={0.02} position={[0, 1.6, 0]} />
      <BoltRing count={24} radius={0.96} r={0.018} position={[0, 3.615, 0]} />
      {[2.0, 2.68, 3.36].map((y) => (
        <Band key={y} radius={0.95} tube={0.036} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
      {[0.5, 2.4, 4.2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.925, 2.54, Math.sin(a) * 0.925]} rotation={[0, Math.PI / 2 - a, 0]}>
          <boxGeometry args={[0.045, 1.9, 0.03]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
      ))}
      <group position={[0.5, 2.0, 0.78]} rotation={[0, 0.58, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.6, 0.09]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.36, 0.44, 0.04]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.62 })} />
        </mesh>
        <mesh position={[0.12, 0, 0.09]}>
          <boxGeometry args={[0.05, 0.13, 0.06]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
      </group>

      {/* torispherical top head + a platform railing round its base */}
      <mesh position={[0, 3.57, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.92, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...steel('steel', { roughness: 0.32 })} />
      </mesh>
      <Band radius={0.96} tube={0.03} position={[0, 3.58, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <Band radius={0.96} tube={0.016} position={[0, 3.88, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={a} position={[Math.cos(a) * 0.96, 3.73, Math.sin(a) * 0.96]}>
            <boxGeometry args={[0.025, 0.32, 0.025]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        );
      })}

      <DomeFittings />

      {/* rotary intake head — pulls the gathered feeds in; the rotor spins */}
      <group position={[0, HEAD_Y, 0]}>
        <mesh>
          <cylinderGeometry args={[0.46, 0.46, 0.32, 24]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
        </mesh>
        <Band radius={0.47} tube={0.028} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* the collar the intake duct drops into from the roof (DUCT in
            services.js, the duct in hall.jsx) */}
        <mesh position={[0, DUCT.collar.y - HEAD_Y + DUCT.collar.height / 2, 0]}>
          <cylinderGeometry args={[DUCT.collar.radius, DUCT.collar.radius + 0.04, DUCT.collar.height, 20]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.44 })} />
        </mesh>
        <Band
          radius={DUCT.collar.radius + 0.01}
          tube={0.025}
          position={[0, DUCT.collar.y - HEAD_Y + DUCT.collar.height, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        {/* it turns as one piece, so its blades batch together */}
        <group userData={LIVE} ref={rotor} position={[0, 0.04, 0]}>
          <StaticBatch>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <mesh key={a} position={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]} rotation={[0, Math.PI / 2 - a, 0]}>
                  <boxGeometry args={[0.045, 0.16, 0.3]} />
                  <meshStandardMaterial color={PALETTE.blueDeep} emissive={PALETTE.blueDeep} emissiveIntensity={0.5} toneMapped={false} />
                </mesh>
              );
            })}
            <mesh>
              <cylinderGeometry args={[0.13, 0.13, 0.22, 12]} />
              <meshStandardMaterial {...steel('dark')} />
            </mesh>
          </StaticBatch>
        </group>
      </group>

      {/* hooded intake port on the front — lit throat behind crossbars */}
      <group position={[0, 2.74, 0.92]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.92, 0.66, 0.12]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        <mesh position={[0, 0.4, 0.14]} rotation={[-0.55, 0, 0]}>
          <boxGeometry args={[1.0, 0.05, 0.36]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        {[-0.46, 0.46].map((x) => (
          <mesh key={x} position={[x, 0, 0.12]}>
            <boxGeometry args={[0.06, 0.66, 0.28]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
        ))}
        <mesh userData={{ pulse: PULSE.siloGrille }} position={[0, -0.02, 0.05]}>
          <planeGeometry args={[0.78, 0.46]} />
          <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        {[-0.15, 0, 0.15].map((y) => (
          <mesh key={y} position={[0, y - 0.02, 0.09]}>
            <boxGeometry args={[0.78, 0.035, 0.03]} />
            <meshStandardMaterial {...steel('dark')} />
          </mesh>
        ))}
      </group>

      {/* level gauge — accumulated data creeping up, then draining */}
      <group position={[0.8, 2.5, 0.46]} rotation={[0, 1.05, 0]}>
        <mesh>
          <boxGeometry args={[0.12, 1.66, 0.08]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
        </mesh>
        <mesh userData={LIVE} ref={fill} position={[0, 0, 0.04]}>
          <boxGeometry args={[0.06, GAUGE_H, 0.03]} />
          <meshStandardMaterial color={PALETTE.green} emissive={PALETTE.green} emissiveIntensity={1} toneMapped={false} />
        </mesh>
        {[-0.5, 0, 0.5].map((y) => (
          <mesh key={y} position={[0, y, 0.06]}>
            <boxGeometry args={[0.16, 0.014, 0.02]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        ))}
      </group>

      {/* fill standpipe up the side — capped head, elbow into the base, clamped
          to the shell */}
      <group position={[-1.0, 2.42, 0.12]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 2.4, 20]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.32 })} />
        </mesh>
        <mesh position={[0, 1.24, 0]}>
          <cylinderGeometry args={[0.145, 0.145, 0.1, 20]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.42 })} />
        </mesh>
        <mesh position={[0.34, -1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.34 })} />
        </mesh>
        {[-0.7, 0.75].map((y) => (
          <mesh key={y} position={[0.14, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.07, 12]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
          </mesh>
        ))}
        {/* a pressure gauge on a short stem, turned toward the walkway */}
        <group position={[0, 0.42, 0]} rotation={[0, -0.25, 0]}>
          <mesh position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.1, 8]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
          </mesh>
          <mesh position={[0, 0, 0.235]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.04, 20]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
          <mesh position={[0, 0, 0.256]}>
            <circleGeometry args={[0.075, 20]} />
            <meshStandardMaterial color="#c9d3db" emissive="#c9d3db" emissiveIntensity={0.18} metalness={0} roughness={0.5} />
          </mesh>
          <mesh position={[0.012, 0.018, 0.259]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.008, 0.06, 0.003]} />
            <meshBasicMaterial color={PALETTE.amberDeep} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* access ladder + safety cage up the front-left */}
      <Ladder position={[-0.52, 0, 0.78]} rotation={[0, -0.6, 0]} y0={0.5} y1={3.55} />

      {/* the one outfeed — stream down out of the hopper to the spine */}
      <Pipe
        points={[[0, 0.14, -0.14], [0, 0.3, -1.9], [0, 0.34, -4]]}
        radius={0.09}
        color={PALETTE.amber}
        emissive={0.28}
        flanges
      />
    </group>
  );
}

// What sits on the silo's domed head round the intake: a breather vent
// with a rain cap at the back, a bolted manway at the front, and a level
// sensor at the side. Each stands square to the dome where it sits (the
// dome is the top half of a sphere 0.92 across, squashed to half height).
const DOME = { y: 3.57, r: 0.92, h: 0.46 };
const UP = new THREE.Vector3(0, 1, 0);

// the point on the dome above (x, z), and the dome's normal there
function onDome(x, z) {
  const k = Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (DOME.r * DOME.r)));
  const at = new THREE.Vector3(x, DOME.y + DOME.h * k, z);
  const normal = new THREE.Vector3(x / DOME.r ** 2, (DOME.h * k) / DOME.h ** 2, z / DOME.r ** 2).normalize();
  return { at, turn: new THREE.Quaternion().setFromUnitVectors(UP, normal) };
}

function DomeFittings() {
  const vent = useMemo(() => onDome(0.52, -0.44), []);
  const manway = useMemo(() => onDome(-0.48, 0.48), []);
  const sensor = useMemo(() => onDome(0.66, 0.2), []);
  return (
    <group>
      {/* the vent stands upright, as vents do, on a collar on the dome */}
      <group position={vent.at}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.34, 10]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.075, 0.09, 0.06, 12]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <coneGeometry args={[0.11, 0.08, 12]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
        </mesh>
      </group>
      <group position={manway.at} quaternion={manway.turn}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.15, 0.16, 0.08, 20]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        <mesh position={[0, 0.095, 0]}>
          <cylinderGeometry args={[0.175, 0.175, 0.03, 20]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} />
        </mesh>
        <BoltRing count={8} radius={0.15} r={0.014} position={[0, 0.115, 0]} />
        <mesh position={[0, 0.125, 0]}>
          <boxGeometry args={[0.14, 0.025, 0.025]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
      </group>
      <group position={sensor.at} quaternion={sensor.turn}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.1, 0.12]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
        <mesh position={[0.045, 0.07, 0.061]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// A vertical caged ladder. Rungs are instanced (one draw call); the cage is a
// handful of hoops bulging out for climbing clearance.
function Ladder({ position = [0, 0, 0], rotation = [0, 0, 0], y0 = 0, y1 = 3, rungs = 12 }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    // Math.max(…, 1): the only current call site never overrides `rungs`
    // (always the default 12), but a single-rung ladder would divide by
    // (rungs - 1) = 0 and place every rung at NaN.
    const step = (y1 - y0 - 0.4) / Math.max(rungs - 1, 1);
    for (let i = 0; i < rungs; i++) {
      m.position.set(0, y0 + 0.2 + step * i, 0);
      m.updateMatrix();
      ref.current.setMatrixAt(i, m.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [rungs, y0, y1]);

  const hoops = [];
  for (let y = y0 + (y1 - y0) * 0.4; y < y1 - 0.1; y += 0.46) hoops.push(y);

  return (
    <group position={position} rotation={rotation}>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, (y0 + y1) / 2, 0]}>
          <boxGeometry args={[0.03, y1 - y0, 0.03]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, rungs]}>
        <boxGeometry args={[0.32, 0.024, 0.024]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
      </instancedMesh>
      {hoops.map((y) => (
        <mesh key={y} position={[0, y, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.016, 6, 18]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 02 — Processing Hall : a rotary reactor drum. Raw data drops into the heavy
// intake end, tumbles through the glowing core, and leaves the tapered outlet
// refined. A gear-motor turns the drum on its trunnion rollers.
// ---------------------------------------------------------------------------
export function ProcessingHall() {
  const drum = useRef();
  useFrame(() => {
    const t = flow.t;
    if (drum.current) drum.current.rotation.x = t * 0.42;
    // a steady churn, and a surge while a batch is inside being refined
    const pulse = 1.15 + Math.sin(t * 3) * 0.45 + 1.1 * batchPulse(onBelt(1));
    setPulse(PULSE.drumRaw, AMBER, pulse * 0.78);
    setPulse(PULSE.drumRefined, BLUE_BRIGHT, pulse * 1.2);
  });

  return (
    <group position={[0, 1.15, 0]}>
      {/* cradle — a floor beam + a stand with two trunnion rollers each side,
          the beam's face striped where the drum turns over it */}
      <mesh position={[0, -1.62, 0]}>
        <boxGeometry args={[3.8, 0.3, 1.5]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <HazardStripes w={3.4} h={0.2} position={[0, -1.62, 0.75]} />
      {/* the trunnion rollers' grease feed: a lubricator on the near stand,
          a line down to its roller, and one along the top of the beam and
          up to the far stand's */}
      <mesh position={[-1.5, -0.8, 0.73]}>
        <boxGeometry args={[0.18, 0.13, 0.06]} />
        <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
      </mesh>
      <mesh position={[-1.44, -0.71, 0.765]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 10]} />
        <meshStandardMaterial color={PALETTE.amberDeep} metalness={0.3} roughness={0.5} />
      </mesh>
      {[
        // [x, from y, to y]
        [-1.42, -0.87, -1.2],
        [-1.56, -0.87, -1.44],
        [1.44, -1.44, -1.2],
      ].map(([x, y0, y1]) => (
        <mesh key={`${x}:${y1}`} position={[x, (y0 + y1) / 2, 0.72]}>
          <cylinderGeometry args={[0.012, 0.012, Math.abs(y0 - y1), 6]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
      ))}
      <mesh position={[(-1.56 + 1.44) / 2, -1.44, 0.72]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 3.0, 6]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -1.05, 0]}>
            <boxGeometry args={[0.44, 1.0, 1.4]} />
            <meshStandardMaterial {...cast('dark')} />
          </mesh>
          {[-0.5, 0.5].map((z) => (
            <mesh key={z} position={[0, -1.24, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.34, 16]} />
              <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
            </mesh>
          ))}
          <BoltRing count={4} radius={0.32} r={0.03} position={[0, -1.55, 0]} />
        </group>
      ))}

      {/* rotating reactor shell — turns on its X axis, riding the trunnions.
          Faintly translucent so the two-tone core reads through the wall;
          front-face only (the hero camera never sees the far wall). */}
      <group userData={LIVE} ref={drum}>
        {/* the shell and everything on it turn together: one batch */}
        <StaticBatch>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.14, 1.14, 3.3, 28, 1, true]} />
            <meshStandardMaterial
              {...steel('light', { roughness: 0.32 })}
              transparent
              opacity={0.86}
            />
          </mesh>
          {/* light rib rings between two heavier end stiffeners */}
          {Array.from({ length: 9 }, (_, i) => {
            const heavy = i === 0 || i === 8;
            return (
              <mesh key={i} rotation={[0, Math.PI / 2, 0]} position={[-1.5 + i * 0.375, 0, 0]}>
                <torusGeometry args={[1.17, heavy ? 0.07 : 0.035, 8, 24]} />
                <meshStandardMaterial {...steel(heavy ? 'steel' : 'light', { roughness: 0.32 })} />
              </mesh>
            );
          })}
          {/* longitudinal tie-rods */}
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
            <mesh key={a} position={[0, Math.cos(a) * 1.16, Math.sin(a) * 1.16]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 3.1, 6]} />
              <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
            </mesh>
          ))}
          {/* bolted inspection hatch, lying flat on the front-upper shell */}
          <group position={[0.35, Math.cos(0.6) * 1.16, Math.sin(0.6) * 1.16]} rotation={[0.6 - Math.PI / 2, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.58, 0.5, 0.06]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <boxGeometry args={[0.4, 0.32, 0.05]} />
              <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} />
            </mesh>
          </group>
          {/* girth (bull) gear — the drive ring, heavier than the ribs */}
          <Gear
            radius={1.24}
            teeth={34}
            thickness={0.2}
            hub={false}
            position={[-1.12, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          />
        </StaticBatch>
      </group>

      {/* two-tone core: a short raw (amber) intake zone, then most of the length
          runs refined (blue) — the change happens early as it tumbles through */}
      <mesh userData={{ pulse: PULSE.drumRaw }} rotation={[0, 0, Math.PI / 2]} position={[-1.06, 0, 0]}>
        <cylinderGeometry args={[0.56, 0.64, 1.7, 24]} />
        <meshStandardMaterial color={PALETTE.amberBright} emissive={PALETTE.amber} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <mesh userData={{ pulse: PULSE.drumRefined }} rotation={[0, 0, Math.PI / 2]} position={[0.72, 0, 0]}>
        <cylinderGeometry args={[0.64, 0.46, 2.5, 24]} />
        <meshStandardMaterial color={PALETTE.blueBright} emissive={PALETTE.blueBright} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* intake end (−X): a heavy flanged hub with a raw-feed hopper dropping in */}
      <group position={[-1.7, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.06, 0.18, 12, 32]} />
          <meshStandardMaterial {...steel(PALETTE.amberDeep, { roughness: 0.44 })} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.16, 0.1, 2.05]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.16, 2.05, 0.1]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.3, 16]} />
          <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
        <BoltRing count={14} radius={1.06} r={0.034} axis="x" />
        {/* raw-feed hopper — a chute dropping in over the intake hub */}
        <mesh position={[0.08, 1.0, 0.58]} rotation={[0.44, 0, 0.16]}>
          <cylinderGeometry args={[0.44, 0.15, 0.8, 8, 1, true]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} side={THREE.DoubleSide} />
        </mesh>
        <Band radius={0.44} tube={0.03} position={[0.14, 1.32, 0.42]} rotation={[Math.PI / 2 + 0.44, 0, 0.16]} />
      </group>

      {/* outlet end (+X): a tapered reducer to a slim, precise refined spool */}
      <group position={[1.7, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.98, 0.11, 12, 32]} />
          <meshStandardMaterial {...steel(PALETTE.blueDeep, { roughness: 0.32 })} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.92, 0.6, 24, 1, true]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.26 })} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.66, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.34, 20]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.28 })} />
        </mesh>
        <Band radius={0.3} tube={0.04} position={[0.82, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        <BoltRing count={12} radius={0.98} r={0.026} axis="x" position={[0.115, 0, 0]} />
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.16, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 20]} />
          <meshStandardMaterial color={PALETTE.blueBright} emissive={PALETTE.blueBright} emissiveIntensity={0.55} toneMapped={false} />
        </mesh>
      </group>

      {/* gear-motor driving the girth gear — pinion guard, motor barrel, and a
          bracket back to the near cradle; sits in the drum's front-lower curve */}
      <group position={[-1.12, -0.72, 0.82]}>
        <mesh>
          <boxGeometry args={[0.5, 0.56, 0.56]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
        <mesh position={[0, -0.04, 0.34]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.17, 0.17, 0.42, 16]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
        </mesh>
        {/* cooling fins round the motor, and its terminal box with the
            supply's gland on top */}
        {[-0.15, -0.075, 0, 0.075, 0.15].map((x) => (
          <mesh key={x} position={[x, -0.04, 0.34]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.172, 0.014, 6, 20]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.42 })} />
          </mesh>
        ))}
        <mesh position={[0.02, 0.17, 0.34]}>
          <boxGeometry args={[0.16, 0.08, 0.14]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
        </mesh>
        <mesh position={[0.02, 0.225, 0.34]}>
          <cylinderGeometry args={[0.025, 0.03, 0.035, 8]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
        <mesh position={[0, -0.04, 0.57]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.13, 12]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
        </mesh>
        <mesh position={[-0.36, -0.16, -0.5]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.5, 0.11, 0.16]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      </group>

      {/* plumbed into the spine: raw feed up into the amber end, refined down out of the blue end */}
      <Pipe points={[[-1.9, -1.4, -0.9], [-1.95, -0.4, -0.3], [-1.9, 0, 0]]} radius={0.1} color={PALETTE.amber} emissive={0.3} flanges />
      <Pipe points={[[1.9, 0, 0], [1.95, -0.6, -0.4], [1.9, -1.5, -1.0]]} radius={0.1} color={PALETTE.blue} emissive={0.3} flanges />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 03 — Storage Vault : a medallion rack, bronze / silver / gold tiers
// ---------------------------------------------------------------------------
// the medallion colour is an edge/label accent, not the whole module —
// modules are dark steel, the tier reads from the trim. Each tier also
// carries its data-lifecycle character: bronze = raw (bolted, sparse LEDs),
// silver = refined (standard, pulled out for a read), gold = curated (a lit
// crown, a full LED bank).
const VAULT_TIERS = [
  { y: 0.0, trim: '#a4693c', led: PALETTE.blueDeep, bolts: true },
  { y: 1.2, trim: '#aeb7bf', led: PALETTE.blueBright, out: 0.35 },
  { y: 2.4, trim: '#d8ab53', led: PALETTE.amber, crown: true },
];
const CELLS = 7; // status LEDs across each module's face

// How bright a lit cell's own colour reads on top of its glow, for the
// glow's dimmest moments: what the scene's light used to add when each cell
// was a lit surface of its own.
const CELL_LIT = 0.25;

// The modules' status LEDs, all 21 in one instanced mesh, each its tier's
// colour times how brightly it's lit. They used to be 21 meshes, each
// animating a material of its own, so 21 draw calls.
function VaultCells() {
  const ref = useRef();
  const leds = useMemo(() => VAULT_TIERS.flatMap((tier) => Array.from({ length: CELLS }, () => new THREE.Color(tier.led))), []);
  const color = useMemo(() => new THREE.Color(), []);
  const paint = (mesh) => {
    const t = flow.t;
    // every cell lights up together as a batch is written
    const write = 1.1 * batchPulse(onBelt(2));
    leds.forEach((led, i) => {
      const glow = 0.2 + Math.abs(Math.sin(t * 0.8 + i * 1.3)) * 1.3 + write;
      mesh.setColorAt(i, color.copy(led).multiplyScalar(glow + CELL_LIT));
    });
    mesh.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Matrix4();
    VAULT_TIERS.forEach((tier, ti) => {
      for (let c = 0; c < CELLS; c++) {
        mesh.setMatrixAt(ti * CELLS + c, m.makeTranslation(-0.78 + c * 0.26, tier.y + 0.62 - 0.06, (tier.out || 0) + 0.65));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    // colours before the first frame, so the shader is built for them
    paint(mesh);
  }, []);
  useFrame(() => ref.current && paint(ref.current));
  return (
    <instancedMesh userData={LIVE} ref={ref} args={[undefined, undefined, leds.length]}>
      <boxGeometry args={[0.13, 0.08, 0.03]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export function StorageVault() {
  const tiers = VAULT_TIERS;
  return (
    // a compact cabinet in the left lane, face (+Z) turned back up the
    // corridor so the camera reads it head-on as it descends past
    <group position={[-1.75, -0.35, -0.4]}>
      {/* rack frame: side uprights, shelves, plinth */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.55, -0.1]}>
          <boxGeometry args={[0.22, 4.0, 1.7]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, -0.72]}>
        <boxGeometry args={[2.4, 3.9, 0.3]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      {[-0.55, 0.6, 1.8, 3.0].map((y) => (
        <mesh key={y} position={[0, y, -0.05]}>
          <boxGeometry args={[2.25, 0.1, 1.55]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
      ))}
      <mesh position={[0, -0.62, -0.1]}>
        <boxGeometry args={[2.7, 0.3, 1.9]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>

      {/* three storage modules, faces on +Z */}
      {tiers.map((tier, ti) => (
        <group key={ti} position={[0, tier.y + 0.62, tier.out || 0]}>
          <mesh>
            <boxGeometry args={[2.15, 0.98, 1.2]} />
            <meshStandardMaterial {...steel('steel', { roughness: 0.44 })} />
          </mesh>
          {/* machined tier trim, top & bottom of the face */}
          {[0.44, -0.44].map((y) => (
            <mesh key={y} position={[0, y, 0.6]}>
              <boxGeometry args={[2.19, 0.14, 0.16]} />
              <meshStandardMaterial color={tier.trim} metalness={1} roughness={0.18} envMapIntensity={2.6} />
            </mesh>
          ))}
          {/* curated tier gets a lit crown along the top edge */}
          {tier.crown && (
            <mesh position={[0, 0.53, 0.6]}>
              <boxGeometry args={[2.0, 0.05, 0.05]} />
              <meshBasicMaterial color={PALETTE.amberBright} toneMapped={false} />
            </mesh>
          )}
          {/* tier light bar — the medallion colour as glow */}
          <mesh position={[0, 0.3, 0.63]}>
            <boxGeometry args={[2.0, 0.06, 0.03]} />
            <meshStandardMaterial color={tier.trim} emissive={tier.trim} emissiveIntensity={tier.crown ? 1.5 : 1} toneMapped={false} />
          </mesh>
          {/* recessed bay panel + inset frame */}
          <mesh position={[0, -0.06, 0.585]}>
            <boxGeometry args={[1.98, 0.6, 0.04]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
          <mesh position={[0, -0.06, 0.6]}>
            <boxGeometry args={[1.9, 0.52, 0.06]} />
            <meshStandardMaterial {...cast('dark', { roughness: 0.62 })} />
          </mesh>
          {/* raw tier is bolted shut — a row of heads across the face */}
          {tier.bolts &&
            [-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
              <mesh key={x} position={[x, 0.3, 0.64]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.05, 6]} />
                <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
              </mesh>
            ))}
          {/* status LEDs — full amber bank on gold, sparser blues below:
              VaultCells, below */}
          {/* handle */}
          <mesh position={[0, 0.34, 0.66]}>
            <boxGeometry args={[0.8, 0.06, 0.12]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        </group>
      ))}

      {/* a loom of cables up the left upright's outside, clamped every so
          often, into an entry box at the top under the junction box */}
      {[-0.26, -0.22, -0.18, -0.14].map((z, i) => (
        <mesh key={z} position={[-1.33 - (i % 2) * 0.012, 1.5, z]}>
          <cylinderGeometry args={[0.017, 0.017, 3.95, 6]} />
          <meshStandardMaterial {...CABLE} />
        </mesh>
      ))}
      {[0.1, 0.9, 1.7, 2.5, 3.2].map((y) => (
        <mesh key={y} position={[-1.335, y, -0.2]}>
          <boxGeometry args={[0.06, 0.03, 0.2]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
      ))}
      <mesh position={[-1.34, 3.47, -0.2]}>
        <boxGeometry args={[0.07, 0.12, 0.22]} />
        <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
      </mesh>

      {/* facility conduit up the left side, branching into each tier */}
      <mesh position={[-1.36, 1.4, 0.12]}>
        <cylinderGeometry args={[0.075, 0.075, 3.5, 12]} />
        <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} />
      </mesh>
      {[0.0, 1.2, 2.4].map((y) => (
        <mesh key={y} position={[-1.24, y + 0.62, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.36, 10]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.42 })} />
        </mesh>
      ))}

      {/* vents down the left upright's face, top and bottom (the shuttle
          runs down the right one) */}
      {[0.05, 0.15, 0.25, 0.35, 0.45, 2.45, 2.55, 2.65, 2.75, 2.85].map((y) => (
        <mesh key={y} position={[-1.2, y, 0.762]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.15, 0.018, 0.03]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.4 })} />
        </mesh>
      ))}

      {/* the fire-suppression line across the top, on a post on each
          upright, with three sprinkler heads over the modules */}
      <mesh position={[0, 3.72, 0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.5, 10]} />
        <meshStandardMaterial color={PALETTE.amberDeep} metalness={0.3} roughness={0.5} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 3.615, 0.42]}>
          <boxGeometry args={[0.05, 0.13, 0.05]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      ))}
      {[-0.7, 0, 0.7].map((x) => (
        <group key={x} position={[x, 3.68, 0.42]}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
          </mesh>
          <mesh position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.008, 10]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
          </mesh>
        </group>
      ))}

      {/* retrieval shuttle on a vertical rail down the face */}
      <mesh position={[1.18, 1.6, 0.62]}>
        <boxGeometry args={[0.1, 3.4, 0.1]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
      </mesh>
      <Shuttle />
      <VaultCells />
    </group>
  );
}

function Shuttle() {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.position.y = 1.7 + Math.sin(flow.t * 0.4) * 1.3;
  });
  return (
    <group userData={LIVE} ref={ref} position={[1.18, 1.7, 0.62]}>
      <mesh>
        <boxGeometry args={[0.32, 0.3, 0.34]} />
        <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
      </mesh>
      <mesh position={[0, 0, 0.19]}>
        <boxGeometry args={[0.14, 0.14, 0.06]} />
        <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 04 — Control Room : a video wall of live monitors over a manned console
// ---------------------------------------------------------------------------

// The left wing's two bar charts, all twelve bars in one instanced mesh: the
// top chart green with one amber bar, the bottom one blue, each bar rising
// and falling on its own beat. `y` is each chart's screen (Wing, below).
const CHARTS = [
  { y: 0.52, speed: 1.25, color: (i) => (i === 4 ? PALETTE.amber : PALETTE.green) },
  { y: -0.42, speed: 0.8, color: () => PALETTE.blueBright },
];
const BARS = 6;

function ChartBars() {
  const ref = useRef();
  const m = useMemo(() => new THREE.Matrix4(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  const size = useMemo(() => new THREE.Vector3(), []);
  const still = useMemo(() => new THREE.Quaternion(), []);
  const grow = (mesh) => {
    const t = flow.t;
    CHARTS.forEach((chart, c) => {
      for (let i = 0; i < BARS; i++) {
        const h = 0.16 + Math.abs(Math.sin(t * chart.speed + i * 0.9)) * 0.5;
        m.compose(at.set(-0.62 + i * 0.25, chart.y - 0.36 + h / 2, 0.02), still, size.set(1, h, 1));
        mesh.setMatrixAt(c * BARS + i, m);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const mesh = ref.current;
    const color = new THREE.Color();
    CHARTS.forEach((chart, c) => {
      for (let i = 0; i < BARS; i++) mesh.setColorAt(c * BARS + i, color.set(chart.color(i)));
    });
    mesh.instanceColor.needsUpdate = true;
    grow(mesh);
    mesh.computeBoundingSphere();
  }, []);
  useFrame(() => ref.current && grow(ref.current));
  return (
    <instancedMesh userData={LIVE} ref={ref} args={[undefined, undefined, CHARTS.length * BARS]}>
      <boxGeometry args={[0.16, 1, 0.02]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// A loudspeaker on the front of each of the video wall's side posts, angled
// down at the desk, and a security camera under the valance's right end
// watching it. In the control room's own frame (ControlRoom).
function RoomFittings() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 3.55, 1.05, 0.36]} rotation={[0.22, -s * 0.25, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.34, 0.14]} />
            <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
          </mesh>
          {[
            [-0.05, 0.075],
            [0.1, 0.03],
          ].map(([y, r]) => (
            <mesh key={y} position={[0, y, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[r, r, 0.01, 16]} />
              <meshStandardMaterial color="#0d1116" metalness={0.2} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[3.25, 1.62, 0.22]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.05, 0.12, 0.05]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        <group rotation={[0.45, 0.5, 0]}>
          <mesh position={[0, -0.04, 0.08]}>
            <boxGeometry args={[0.12, 0.09, 0.26]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
          </mesh>
          <mesh position={[0, -0.04, 0.215]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            <meshStandardMaterial color="#0d1116" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0.045, 0.005, 0.2]}>
            <sphereGeometry args={[0.008, 6, 4]} />
            <meshBasicMaterial color={PALETTE.amber} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// The console's switch panel between the keyboards: three rows of keys, a
// few of them lit. In the desk top's own tilted frame (ControlRoom).
const KEY_ROWS = 3;
const KEY_COLS = 7;
const LIT_KEYS = { 1: PALETTE.green, 9: PALETTE.amber, 12: PALETTE.green, 17: PALETTE.blueBright };
const DESK_KEYS = Array.from({ length: KEY_ROWS * KEY_COLS }, (_, i) => ({
  i,
  x: -0.36 + (i % KEY_COLS) * 0.12,
  z: -0.1 + Math.floor(i / KEY_COLS) * 0.12,
}));
const PLAIN_KEYS = DESK_KEYS.filter((k) => !LIT_KEYS[k.i]);
const KEY_Y = 0.077; // on the desk top's surface

function DeskKeys() {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    PLAIN_KEYS.forEach((k, j) => ref.current.setMatrixAt(j, m.makeTranslation(k.x, KEY_Y, k.z)));
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, PLAIN_KEYS.length]}>
        <boxGeometry args={[0.07, 0.014, 0.07]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.4 })} />
      </instancedMesh>
      {DESK_KEYS.filter((k) => LIT_KEYS[k.i]).map((k) => (
        <mesh key={k.i} position={[k.x, KEY_Y, k.z]}>
          <boxGeometry args={[0.07, 0.014, 0.07]} />
          <meshBasicMaterial color={LIT_KEYS[k.i]} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// a stacked pair of wall monitors, toed in by the parent group
function Wing({ top, bottom }) {
  return (
    <>
      <Screen w={1.72} h={0.82} color="#0f3350" intensity={0.55} position={[0, 0.52, 0]}>
        {top}
      </Screen>
      <Screen w={1.72} h={0.82} color="#123a58" intensity={0.5} position={[0, -0.42, 0]}>
        {bottom}
      </Screen>
    </>
  );
}

export function ControlRoom() {
  const wave = useRef();
  const ticker = useRef();
  const blip = useRef();
  useFrame(() => {
    const t = flow.t;
    // the light under the valance turns green as each batch passes the checks
    const ok = batchPulse(CHECKS);
    setPulse(PULSE.controlWash, washGlow.copy(WATCHING).lerp(PASSED, ok), 0.65 + 1.3 * ok);
    if (wave.current) {
      const pos = wave.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, Math.sin(x * 4 + t * 2) * 0.07 + Math.sin(x * 9 - t) * 0.03);
      }
      pos.needsUpdate = true;
    }
    if (ticker.current) ticker.current.position.x = 0.6 - ((t * 0.35) % 1.7);
    if (blip.current) blip.current.material.opacity = 0.35 + Math.abs(Math.sin(t * 1.6)) * 0.55;
  });

  const waveGeo = useMemo(() => new THREE.PlaneGeometry(1.5, 0.5, 40, 1), []);

  return (
    <group position={[0, 1.35, 0.2]}>
      {/* housing: back wall, top valance, side posts */}
      <mesh position={[0, 0.1, -0.36]}>
        <boxGeometry args={[7.3, 3.2, 0.4]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <mesh position={[0, 1.82, -0.12]}>
        <boxGeometry args={[7.7, 0.3, 0.82]} />
        <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
      </mesh>
      {[-3.55, 3.55].map((x) => (
        <mesh key={x} position={[x, -0.55, -0.08]}>
          <boxGeometry args={[0.28, 4.5, 0.72]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      ))}
      <RoomFittings />

      {/* under-valance light wash, a little deeper so its flash carries */}
      <mesh userData={{ pulse: PULSE.controlWash }} position={[0, 1.6, 0.26]}>
        <boxGeometry args={[6.7, 0.07, 0.05]} />
        <meshStandardMaterial color={PALETTE.blueBright} emissive={PALETTE.blueBright} emissiveIntensity={0.65} toneMapped={false} />
      </mesh>

      {/* centre: primary readout — big figure, sparkline, scrolling ticker */}
      <group position={[0, 0.4, 0.16]}>
        <Screen w={2.5} h={1.66} color="#0c2f45" intensity={0.62}>
          {/* big segmented figure, top-left */}
          <mesh position={[-0.28, 0.42, 0.015]}>
            <planeGeometry args={[1.55, 0.5]} />
            <meshBasicMaterial color="#0a2536" toneMapped={false} />
          </mesh>
          {[-0.86, -0.5, -0.06, 0.42].map((x, i) => (
            <mesh key={x} position={[x, 0.42, 0.025]}>
              <planeGeometry args={[0.24, i === 1 ? 0.24 : 0.38]} />
              <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0.78, 0.42, 0.02]}>
            <planeGeometry args={[0.32, 0.32]} />
            <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
          </mesh>
          {/* sparkline — a connected-looking run of steps */}
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[-0.74 + i * 0.13, -0.04 + Math.sin(i * 0.8) * 0.13, 0.02]}>
              <boxGeometry args={[0.13, 0.035, 0.01]} />
              <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
            </mesh>
          ))}
          {/* ticker track + moving cell */}
          <mesh position={[0, -0.5, 0.015]}>
            <planeGeometry args={[2.2, 0.16]} />
            <meshBasicMaterial color="#0a2233" toneMapped={false} />
          </mesh>
          <mesh userData={LIVE} ref={ticker} position={[0, -0.5, 0.025]}>
            <planeGeometry args={[0.5, 0.1]} />
            <meshBasicMaterial color={PALETTE.amber} toneMapped={false} />
          </mesh>
        </Screen>
      </group>

      {/* left wing: two stacked bar charts, toed in */}
      <group position={[-2.34, 0.4, 0.08]} rotation={[0, 0.2, 0]}>
        <Wing />
        <ChartBars />
      </group>

      {/* right wing: waveform over a status grid, toed in */}
      <group position={[2.34, 0.4, 0.08]} rotation={[0, -0.2, 0]}>
        <Wing
          top={
            <mesh userData={LIVE} ref={wave} geometry={waveGeo} position={[0, 0, 0.02]}>
              <meshBasicMaterial color={PALETTE.green} wireframe toneMapped={false} />
            </mesh>
          }
          bottom={Array.from({ length: 18 }, (_, i) => (
            <mesh key={i} position={[-0.66 + (i % 6) * 0.26, 0.2 - Math.floor(i / 6) * 0.22, 0.02]}>
              <planeGeometry args={[0.19, 0.15]} />
              <meshBasicMaterial color={i % 5 === 0 ? PALETTE.amber : PALETTE.blueDeep} toneMapped={false} />
            </mesh>
          ))}
        />
      </group>

      {/* console desk */}
      <group position={[0, -1.85, 1.45]}>
        <mesh rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[5.0, 0.14, 1.2]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.4 })} />
        </mesh>
        <mesh position={[0, -0.42, -0.16]}>
          <boxGeometry args={[4.6, 0.8, 0.6]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>

        {/* two operator monitors on stands, canted toward the seat */}
        {[-0.9, 0.9].map((x, i) => (
          <group key={x} position={[x, 0.44, -0.12]} rotation={[0.14, i ? -0.2 : 0.2, 0]}>
            <mesh position={[0, -0.32, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 0.52, 10]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
            </mesh>
            <mesh position={[0, -0.58, 0]}>
              <boxGeometry args={[0.36, 0.03, 0.26]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
            </mesh>
            <Screen w={0.92} h={0.56} color="#154060" intensity={0.7} />
          </group>
        ))}

        {/* keyboards + a couple of console blips */}
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} position={[x, 0.12, 0.34]} rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[0.62, 0.03, 0.24]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
        ))}
        <group rotation={[-0.32, 0, 0]}>
          <DeskKeys />
        </group>
        {[-1.9, -1.55, 1.6, 1.95].map((x, i) => (
          <Node key={x} position={[x, 0.16, 0.3]} r={0.032} color={i === 1 ? PALETTE.amber : PALETTE.green} socket />
        ))}

        {/* task lamp on the right */}
        <group position={[2.05, 0.1, 0.1]}>
          <mesh><cylinderGeometry args={[0.12, 0.14, 0.04, 14]} /><meshStandardMaterial {...steel('dark')} /></mesh>
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.02, 0.02, 0.62, 8]} /><meshStandardMaterial {...steel('dark')} /></mesh>
          <mesh position={[0.12, 0.58, 0.12]} rotation={[0.7, 0, -0.6]}><cylinderGeometry args={[0.02, 0.02, 0.5, 8]} /><meshStandardMaterial {...steel('dark')} /></mesh>
          <mesh position={[0.26, 0.74, 0.26]} rotation={[1.1, 0, 0]}>
            <coneGeometry args={[0.1, 0.16, 12, 1, true]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} side={THREE.DoubleSide} />
          </mesh>
          <mesh userData={LIVE} ref={blip} position={[0.28, 0.68, 0.3]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={PALETTE.amberBright} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* operator chair, seen from behind */}
      <group position={[0.15, -1.9, 2.2]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.66, 0.16, 0.6]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.7 })} />
        </mesh>
        <mesh position={[0, 0.56, -0.28]} rotation={[-0.16, 0, 0]}>
          <boxGeometry args={[0.62, 1.0, 0.12]} />
          <meshStandardMaterial {...cast('dark', { roughness: 0.7 })} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 10]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={a} position={[Math.cos(a) * 0.3, -0.76, Math.sin(a) * 0.3]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.34, 0.05, 0.07]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
          );
        })}
      </group>

      {/* cable run from the desk back to the wall */}
      <Pipe
        points={[[-1.4, -2.0, 1.7], [-1.6, -2.35, 0.9], [-1.5, -1.9, 0.1]]}
        radius={0.05}
        color={PALETTE.steelDark}
        emissive={0}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 05 — Shipping Dock : refined data packed into containers and run out the gate
// ---------------------------------------------------------------------------

// A freight container: railed body, corner posts, a door end, a placard.
function Crate({ size = 0.8, w = size * 1.1, h = size, d = size * 1.35, lit = false, ...props }) {
  const accent = lit ? PALETTE.blueBright : PALETTE.blueDeep;
  return (
    <group {...props}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#39434f" metalness={0.5} roughness={0.58} envMapIntensity={1.2} />
      </mesh>
      {/* top & bottom rails */}
      {[h / 2 - 0.02, -h / 2 + 0.02].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[w * 1.03, 0.055, d * 1.03]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      ))}
      {/* corner posts */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[(sx * w) / 2, 0, (sz * d) / 2]}>
          <boxGeometry args={[0.07, h * 1.04, 0.07]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.34 })} />
        </mesh>
      ))}
      {/* door end (+Z): two leaves + lock bars */}
      {[-0.25, 0.25].map((x) => (
        <group key={x}>
          <mesh position={[x * w, 0, d / 2 + 0.012]}>
            <boxGeometry args={[w * 0.44, h * 0.88, 0.03]} />
            <meshStandardMaterial color="#333c47" metalness={0.5} roughness={0.52} />
          </mesh>
          <mesh position={[x * w, 0, d / 2 + 0.035]}>
            <boxGeometry args={[0.04, h * 0.78, 0.04]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        </group>
      ))}
      {/* placard on the +X side */}
      <mesh position={[w / 2 + 0.012, h * 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d * 0.4, h * 0.26]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

// The gate's roller shutter. The line runs out through the bottom of the
// doorway, so the door can only come down to just above it: at rest it's
// part-raised, with daylight showing underneath round the belt. When the
// visitor reaches Contact it rolls all the way up into the lintel
// (flow.gate) and the daylight floods in. Measured in the portal's own
// space: the opening runs from -1.31 to 1.31.
const OPENING_TOP = 1.31;
const OPENING_HALF = 1.25; // half its width
const SHUTTER_REST = 0.45; // the bottom edge at rest, clear of the packets
const SHUTTER_Z = 0.06; // it runs in the middle of the frame's depth
const SLAT = 0.13;
const DAYLIGHT = new THREE.Color('#ffe7c4');
// where the portal sits in the dock, and the dock down the hall
const PORTAL = [0, 0.35, -4.5];
const DOCK_Z = MACHINES[MACHINES.length - 1].z;
// The daylight that comes in through the gap under the shutter, across the
// platform and the floor in front of it (daylight.js): its strength at rest,
// and once the door's open. Picked from side-by-side screenshots: stronger,
// the platform washed out to white.
const SUN_REST = 3.5;
const SUN_OPEN = 8;

// Horizontal slats for the shutter: a lit top edge, a shadowed groove under
// it. Repeated up the panel, one texel row per eighth of a slat.
function useSlatTexture() {
  return useMemo(() => {
    const rows = [0.6, 0.95, 0.85, 0.78, 0.72, 0.66, 0.5, 0.22];
    const data = new Uint8Array(rows.length * 4);
    rows.forEach((v, i) => data.set([v * 255, v * 255, v * 255, 255], (rows.length - 1 - i) * 4));
    const tex = new THREE.DataTexture(data, 1, rows.length);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// A bollard guarding a corner of the loading platform: a post in safety
// paint on a base plate, a dark band round it and a domed cap. `position` is
// its foot, on the floor.
function Bollard(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 12]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.8, 14]} />
        <meshStandardMaterial {...SAFETY} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 0.1, 14]} />
        <meshStandardMaterial color="#1a1f24" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.085, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...SAFETY} />
      </mesh>
    </group>
  );
}

// A forklift parked at the loading platform's front corner, forks down: it
// brings the containers up to the belt. In profile from the Contact stop,
// where its mast and overhead guard read. `position` is the floor under its
// middle. It faces +x, forks first.
const TYRE = { color: '#15181c', metalness: 0.1, roughness: 0.9 };

function Forklift(props) {
  const guard = steel('dark', { roughness: 0.45 });
  return (
    <group {...props}>
      {/* body, and the counterweight at the back */}
      <mesh position={[-0.05, 0.42, 0]}>
        <boxGeometry args={[1.5, 0.5, 1.0]} />
        <meshStandardMaterial {...SAFETY} />
      </mesh>
      <mesh position={[-0.82, 0.5, 0]}>
        <boxGeometry args={[0.36, 0.66, 1.04]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      {/* drive wheels under the mast, steer wheels under the weight, each
          with its hub */}
      {[
        [0.45, 0.24],
        [-0.55, 0.2],
      ].flatMap(([x, r]) =>
        [-1, 1].map((s) => (
          <group key={`${x}:${s}`} position={[x, r, s * 0.43]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[r, r, 0.2, 16]} />
              <meshStandardMaterial {...TYRE} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[r * 0.45, r * 0.45, 0.21, 10]} />
              <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
            </mesh>
          </group>
        )),
      )}
      {/* seat, and the steering column with its wheel */}
      <mesh position={[-0.38, 0.75, 0]}>
        <boxGeometry args={[0.42, 0.12, 0.46]} />
        <meshStandardMaterial {...cast('dark', { roughness: 0.7 })} />
      </mesh>
      <mesh position={[-0.58, 0.98, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.08, 0.42, 0.44]} />
        <meshStandardMaterial {...cast('dark', { roughness: 0.7 })} />
      </mesh>
      <group position={[0.12, 0.86, 0]} rotation={[0, 0, 0.5]}>
        <mesh>
          <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
          <meshStandardMaterial {...guard} />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.018, 6, 20]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
      </group>
      {/* overhead guard: four posts and a slatted roof, a beacon at its back */}
      {[0.42, -0.62].flatMap((x) =>
        [-1, 1].map((s) => (
          <mesh key={`${x}:${s}`} position={[x, 1.32, s * 0.44]}>
            <boxGeometry args={[0.05, 1.3, 0.05]} />
            <meshStandardMaterial {...guard} />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.1, 1.98, s * 0.44]}>
          <boxGeometry args={[1.12, 0.05, 0.05]} />
          <meshStandardMaterial {...guard} />
        </mesh>
      ))}
      {[-0.6, -0.35, -0.1, 0.15, 0.4].map((x) => (
        <mesh key={x} position={[x, 1.98, 0]}>
          <boxGeometry args={[0.05, 0.04, 0.92]} />
          <meshStandardMaterial {...guard} />
        </mesh>
      ))}
      <mesh position={[-0.5, 2.0, 0]}>
        <sphereGeometry args={[0.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={PALETTE.amber} toneMapped={false} />
      </mesh>
      {/* the mast, its tilt rams, the carriage with its load backrest, and
          the forks, lowered to the floor */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0.8, 1.07, s * 0.3]}>
            <boxGeometry args={[0.07, 2.1, 0.08]} />
            <meshStandardMaterial {...guard} />
          </mesh>
          <mesh position={[0.69, 0.8, s * 0.38]} rotation={[0, 0, -0.42]}>
            <cylinderGeometry args={[0.03, 0.03, 0.45, 8]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
          <mesh position={[0.9, 0.22, s * 0.25]}>
            <boxGeometry args={[0.05, 0.4, 0.1]} />
            <meshStandardMaterial {...steel('steel', { roughness: 0.4 })} />
          </mesh>
          <mesh position={[1.38, 0.03, s * 0.25]}>
            <boxGeometry args={[1.0, 0.04, 0.1]} />
            <meshStandardMaterial {...steel('steel', { roughness: 0.4 })} />
          </mesh>
        </group>
      ))}
      {[2.12, 0.25].map((y) => (
        <mesh key={y} position={[0.8, y, 0]}>
          <boxGeometry args={[0.07, 0.07, 0.68]} />
          <meshStandardMaterial {...guard} />
        </mesh>
      ))}
      <mesh position={[0.86, 0.36, 0]}>
        <boxGeometry args={[0.05, 0.42, 0.84]} />
        <meshStandardMaterial {...guard} />
      </mesh>
      {[-0.3, 0, 0.3].map((z) => (
        <mesh key={z} position={[0.87, 0.8, z]}>
          <boxGeometry args={[0.03, 0.5, 0.03]} />
          <meshStandardMaterial {...guard} />
        </mesh>
      ))}
      <mesh position={[0.87, 1.05, 0]}>
        <boxGeometry args={[0.03, 0.03, 0.84]} />
        <meshStandardMaterial {...guard} />
      </mesh>
    </group>
  );
}

// An empty pallet: deck boards across three runners. `position` is its foot.
const WOOD = { color: '#4a3a28', metalness: 0, roughness: 0.9 };

function Pallet(props) {
  return (
    <group {...props}>
      {[-0.45, 0, 0.45].map((z) => (
        <mesh key={z} position={[0, 0.045, z]}>
          <boxGeometry args={[1.2, 0.09, 0.1]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
      ))}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.105, 0]}>
          <boxGeometry args={[0.14, 0.03, 1.0]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
      ))}
    </group>
  );
}

export function ShippingDock() {
  const crate = useRef();
  const shutter = useRef();
  const rail = useRef();
  const belt = useRef();
  const drive = useRef();
  const slats = useSlatTexture();
  // The container in transit fades in at the head of its run and out as it
  // reaches the gate, before it starts again. Its materials are see-through
  // from the start: three builds a material's shader once, and one built
  // opaque ignores its opacity for good. (Set see-through at the first frame,
  // as they used to be, they never faded at all.)
  useLayoutEffect(() => {
    crate.current.traverse((c) => {
      if (c.material) c.material.transparent = true;
    });
  }, []);
  useFrame(() => {
    const t = flow.t;
    if (crate.current) {
      const p = (t * 0.12) % 1;
      crate.current.position.z = 1.5 - p * 5.3;
      const o = Math.min(1, p / 0.06) * (1 - THREE.MathUtils.smoothstep(p, 0.82, 1));
      crate.current.traverse((c) => {
        if (c.material) c.material.opacity = o;
      });
    }
    if (belt.current) belt.current.position.z = -4.1 - ((t * 0.5) % 0.5);
    if (drive.current) drive.current.rotation.x = -t * 2.2;

    // The shutter keeps its top in the lintel and gives up height from the
    // bottom, so it reads as coiling up out of sight. The slats are pinned
    // to the bottom edge and ride up with it.
    const open = flow.gate;
    const bottom = SHUTTER_REST + (OPENING_TOP - SHUTTER_REST) * open;
    const h = OPENING_TOP - bottom;
    if (shutter.current) {
      shutter.current.visible = h > 0.01;
      shutter.current.scale.y = Math.max(h, 1e-3);
      shutter.current.position.y = bottom + h / 2;
      slats.repeat.y = h / SLAT;
    }
    if (rail.current) rail.current.position.y = bottom;
    // the daylight comes in through the gap from the sill up to the
    // shutter's bottom edge, and strengthens as the door opens. In the
    // world's coordinates, which the dock's shaders work in.
    SUNLIT.uniforms.dayGap.value.set(
      OPENING_HALF,
      PORTAL[1] - OPENING_TOP,
      PORTAL[1] + bottom,
      DOCK_Z + PORTAL[2] + SHUTTER_Z,
    );
    SUNLIT.uniforms.dayColor.value.copy(DAYLIGHT).multiplyScalar(SUN_REST + (SUN_OPEN - SUN_REST) * open);
    // brighter as the door clears it: more of the sky in view. Past 1 it
    // stays white and the extra goes into the glow round the doorway, which
    // is what carries through the scrim over the scene.
    setPulse(PULSE.gateDaylight, DAYLIGHT, 0.9 + 2.1 * open);
    // the beacon pulses while the door is on its way up or down, most of all
    // halfway, and glows steady once it's open
    const moving = 4 * open * (1 - open);
    setPulse(PULSE.gateBeacon, AMBER, 0.25 + 0.9 * open + 2.2 * moving * (0.5 + 0.5 * Math.sin(t * 7)));
  });

  return (
    <group>
      {/* loading platform, standing on the floor, with its front edge
          striped, a bollard at each front corner, and kerb rails */}
      <mesh position={[0, -1.275, -1.5]}>
        <boxGeometry args={[3.6, 0.45, 6.2]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <HazardStripes w={3.4} h={0.26} position={[0, -1.275, 1.6]} />
      {[-2.05, 2.05].map((x) => (
        <Bollard key={x} position={[x, -1.5, 1.85]} />
      ))}

      {/* the forklift that loads the platform, parked beside it with its
          forks turned a little toward the hall, and a stack of empty pallets
          off to its left (from the Contact stop, behind it they read as a
          load on its roof) */}
      <Forklift position={[-4.4, -1.5, 0.5]} rotation={[0, -0.3, 0]} />
      {[0, 0.12, 0.24].map((y, i) => (
        <Pallet key={y} position={[-6.4, -1.5 + y, -1.2]} rotation={[0, (i - 1) * 0.05, 0]} />
      ))}
      {[-1.72, 1.72].map((x) => (
        <mesh key={x} position={[x, -1.0, -1.5]}>
          <boxGeometry args={[0.16, 0.18, 6.2]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.4 })} />
        </mesh>
      ))}

      {/* belt conveyor down the centre line, feeding the gate */}
      <group position={[0, 0.22, 0]}>
        {/* side frames */}
        {[-0.92, 0.92].map((x) => (
          <mesh key={x} position={[x, -0.95, -1.6]}>
            <boxGeometry args={[0.13, 0.22, 5.8]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.42 })} />
          </mesh>
        ))}
        {/* support legs down to the platform */}
        {[-4.0, -1.9, 0.3].map((z) =>
          [-0.82, 0.82].map((x) => (
            <mesh key={`${z}:${x}`} position={[x, -1.28, z]}>
              <boxGeometry args={[0.1, 0.72, 0.1]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
          )),
        )}
        {/* rollers under the belt */}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[0, -0.96, 0.7 - i * 0.66]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 1.66, 10]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.34 })} />
          </mesh>
        ))}
        {/* belt deck */}
        <mesh position={[0, -0.86, -1.6]}>
          <boxGeometry args={[1.62, 0.05, 5.8]} />
          <meshStandardMaterial color="#20272f" metalness={0.3} roughness={0.8} />
        </mesh>
        {/* travelling belt cleats — the group slides one slot then wraps */}
        <group userData={LIVE} ref={belt} position={[0, -0.82, -4.1]}>
          <StaticBatch extend={SUNLIT}>
            {Array.from({ length: 13 }, (_, i) => (
              <mesh key={i} position={[0, 0, i * 0.5]}>
                <boxGeometry args={[1.5, 0.03, 0.06]} />
                <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
              </mesh>
            ))}
          </StaticBatch>
        </group>
        {/* head/drive drum at the gate end */}
        <mesh userData={LIVE} ref={drive} position={[0, -0.9, -4.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.19, 0.19, 1.72, 18]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.34 })} />
        </mesh>
        {/* drive motor + sprocket beside it */}
        <mesh position={[1.15, -0.9, -4.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.42, 14]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
        <Gear radius={0.22} teeth={12} thickness={0.08} position={[0.86, -0.9, -4.35]} rotation={[0, Math.PI / 2, 0]} />
      </group>
      {/* centre lane light */}
      <mesh position={[0, -1.03, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, 5.2]} />
        <meshBasicMaterial color={PALETTE.blueDeep} toneMapped={false} transparent opacity={0.55} />
      </mesh>

      {/* dispatch gate at the far end: a framed doorway out to daylight,
          with a roller shutter */}
      <group position={PORTAL}>
        {/* backing slab, set behind the opening */}
        <mesh position={[0, 0, -0.36]}>
          <boxGeometry args={[3.9, 4.0, 0.4]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
        {/* frame — four bars around the opening */}
        {[
          [0, 1.66, 3.9, 0.7],
          [0, -1.66, 3.9, 0.7],
          [-1.6, 0, 0.7, 2.62],
          [1.6, 0, 0.7, 2.62],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, h, 0.62]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
        ))}
        {/* the daylight outside, filling the doorway */}
        <mesh userData={{ pulse: PULSE.gateDaylight }} position={[0, 0, -0.1]}>
          <planeGeometry args={[2 * OPENING_HALF, 2 * OPENING_TOP]} />
          <meshStandardMaterial color="#000000" emissive={DAYLIGHT} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        {/* the roller shutter, its edges run in the jambs, and its weighted
            bottom rail */}
        <mesh userData={LIVE} ref={shutter} position={[0, 0.88, SHUTTER_Z]}>
          <planeGeometry args={[2.6, 1]} />
          <meshStandardMaterial color="#5a6672" map={slats} metalness={0.55} roughness={0.5} />
        </mesh>
        <mesh userData={LIVE} ref={rail} position={[0, SHUTTER_REST, SHUTTER_Z]}>
          <boxGeometry args={[2.6, 0.07, 0.09]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
        </mesh>
        {/* hazard stripes on the lintel. Half the band is amber, so the
            stripes glow twice as bright as the solid band before them did,
            and the band as a whole as much as it did. */}
        <HazardStripes w={3.9} h={0.22} glow={0.5} position={[0, 1.8, 0.31]} />
        <BoltRing count={4} radius={1.7} r={0.05} axis="z" position={[0, 0, 0.32]} />

        {/* the shutter's coil box over the opening, on a bracket each end,
            its drive motor on the right, and the beacon on top that warns
            while the door moves */}
        <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 3.1, 20]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.45 })} />
        </mesh>
        {[-1.575, 1.575].map((x) => (
          <mesh key={x} position={[x, 2.24, 0]}>
            <boxGeometry args={[0.05, 0.46, 0.54]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
        ))}
        <mesh position={[1.72, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.24, 14]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
        <mesh position={[1.32, 2.515, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.05, 12]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        <mesh userData={{ pulse: PULSE.gateBeacon }} position={[1.32, 2.54, 0]}>
          <sphereGeometry args={[0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.25} toneMapped={false} />
        </mesh>

        {/* a dock light on a swing arm from the right jamb, its lamp turned
            down onto the head of the belt */}
        <group position={[1.75, 0.65, 0.31]}>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.14, 0.22, 0.04]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
          <group rotation={[0, -0.75, 0]}>
            <mesh position={[0, 0, 0.3]}>
              <boxGeometry args={[0.05, 0.05, 0.56]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
            </mesh>
            <group position={[0, -0.02, 0.6]} rotation={[0.9, 0, 0]}>
              {/* closed, so it shares the batch's one-sided finish: an open
                  shell would need a two-sided one, and a draw call of its own */}
              <mesh>
                <cylinderGeometry args={[0.07, 0.1, 0.14, 14]} />
                <meshStandardMaterial {...steel('steel', { roughness: 0.4 })} />
              </mesh>
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.085, 0.085, 0.01, 14]} />
                <meshBasicMaterial color={PALETTE.amberBright} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>

        {/* the door's push-button station on the right jamb */}
        <group position={[1.6, -0.2, 0.31]}>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.18, 0.26, 0.1]} />
            <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
          </mesh>
          {[
            [0.055, PALETTE.green],
            [-0.055, PALETTE.amber],
          ].map(([y, color]) => (
            <mesh key={y} position={[0, y, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.02, 10]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* staged containers on the platform, either side of the belt */}
      <Crate position={[-1.3, -0.62, -0.3]} size={0.84} rotation={[0, 0.12, 0]} />
      <Crate position={[-1.26, 0.14, -0.34]} size={0.66} rotation={[0, -0.1, 0]} />
      <Crate position={[1.32, -0.64, -1.5]} size={0.8} rotation={[0, -0.16, 0]} />
      <Crate position={[1.28, -0.68, -2.9]} size={0.72} rotation={[0, 0.24, 0]} />

      {/* container in transit down the belt toward the gate, batched with
          materials of its own, which its fade changes */}
      <group userData={LIVE} ref={crate} position={[0, -0.18, 1.5]}>
        <StaticBatch own extend={SUNLIT}>
          <Crate size={0.82} lit />
        </StaticBatch>
      </group>
    </group>
  );
}

// Ordered to match MACHINES / the corridor. Kept unexported (the machines are
// exported individually, for the dev Inspector) so React Fast Refresh still
// sees this as a components-only module.
const MACHINE_PARTS = [
  IngestionDock,
  ProcessingHall,
  StorageVault,
  ControlRoom,
  ShippingDock,
];

// the shipping dock, last down the hall and built into its end wall
const BUILT_IN = MACHINE_PARTS.length - 1;

// Where the control room's wiring lands on a machine (TAPS in services.js;
// the tray and the cables are in hall.jsx): a junction box with a gland on
// top for the cable and a light in the control room's green. It's part of
// the machine, so it floats with it, and the gland is wide enough round the
// cable to hide that. `z` is the machine's place down the hall: the tap is
// in world coordinates, the box goes in the machine's own.
function JunctionBox({ tap, z }) {
  const [w, h, d] = tap.size;
  const glands = tap.riser ? [-0.12, 0, 0.12] : [0];
  return (
    <group position={[tap.box[0], tap.box[1], tap.box[2] - z]} rotation={[0, tap.yaw, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.006]}>
        <boxGeometry args={[w - 0.05, h - 0.05, 0.012]} />
        <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
      </mesh>
      {glands.map((gx) => (
        <mesh key={gx} position={[gx, h / 2 + 0.03, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.06, 10]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
      ))}
      <mesh position={[w / 2 - 0.06, h / 2 - 0.06, d / 2 + 0.016]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Each machine's element, built once. Stations re-renders whenever the machine
// in focus changes, and handing React the very same element each time lets it
// skip the machine's whole tree (60 to 80 parts) instead of diffing it. The
// machines animate whether or not they're on screen: it's a few property
// writes a frame, and it means one never jumps when it comes back into view.
// The shipping dock's batch takes the daylight from its gate (daylight.js).
const MACHINE_ELEMENTS = MACHINE_PARTS.map((Machine, i) => (
  <StaticBatch key={i} extend={i === BUILT_IN ? SUNLIT : undefined}>
    <Machine />
    <JunctionBox tap={TAPS[i]} z={MACHINES[i].z} />
  </StaticBatch>
));

// The light from a zone's ceiling strips, pooled on the floor round its
// machine: a soft round falloff, added on top of the floor in the zone's
// colour (ZONE_COLORS in data.js). Big and soft, so it still reads through
// the scrim behind the copy where fine detail doesn't. With it, the station
// marker: a thin ring in the same colour. Each is one instanced mesh across
// the five machines, so the pair costs two draw calls in all.
const POOL_SIZE = [10, 12]; // across, along the hall
const POOL_OPACITY = 0.5;

// lays one flat instance at each machine, in its zone's colour
function useZoneInstances(ref, y) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Matrix4();
    const flat = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const color = new THREE.Color();
    MACHINES.forEach((machine, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(0, y, machine.z).multiply(flat));
      mesh.setColorAt(i, color.set(ZONE_COLORS[i]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, y]);
}

function ZoneFloor() {
  const pools = useRef();
  const rings = useRef();
  const falloff = usePoolTexture();
  useZoneInstances(pools, -1.465);
  useZoneInstances(rings, -1.46);
  return (
    <>
      <instancedMesh ref={pools} args={[undefined, undefined, MACHINES.length]}>
        <planeGeometry args={POOL_SIZE} />
        <meshBasicMaterial
          map={falloff}
          transparent
          opacity={POOL_OPACITY}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={rings} args={[undefined, undefined, MACHINES.length]}>
        <ringGeometry args={[1.7, 1.78, 48]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.3} />
      </instancedMesh>
    </>
  );
}

function usePoolTexture() {
  return useMemo(() => {
    const n = 64;
    const data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2;
        const v = Math.round(Math.max(0, 1 - r) ** 1.6 * 255);
        data.set([v, v, v, 255], (y * n + x) * 4);
      }
    }
    const tex = new THREE.DataTexture(data, n, n);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// Each frame three works out where every object in the scene is, hidden or
// not, from the top down. A hidden machine is left out of that until it
// shows again (a ref callback, so it's set on the group once). Then its own
// transform is worked out afresh, as every frame, and that brings every part
// below it up to date in the same pass, including any an animation turned
// meanwhile.
function skipWhileHidden(group) {
  if (!group || Object.prototype.hasOwnProperty.call(group, 'updateMatrixWorld')) return;
  group.updateMatrixWorld = function (force) {
    if (this.visible) THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };
}

export function Stations() {
  // All five machines mount once, at load (with Warmup in Scene.jsx compiling
  // their shaders then) — building one mid-scroll cost a ~400ms frame. Only the
  // focused machine and its neighbours are drawn (`visible`); the rest sit
  // hidden, which costs nothing to render, and nothing to place either
  // (skipWhileHidden). Only the machine in focus floats,
  // and never the shipping dock: it's built into the hall's end wall
  // (scene/hall.jsx), and swaying, its gate frame shifted against the wall.
  const focus = useFactory((s) => Math.round(s.beat));
  return (
    <>
      <ZoneFloor />
      {MACHINES.map((machine, i) => {
        const dist = Math.abs(i - focus);
        return (
          <group key={machine.id} ref={skipWhileHidden} position={[0, 0, machine.z]} visible={dist <= 1}>
            <Float
              enabled={dist === 0 && i !== BUILT_IN}
              speed={0.7}
              rotationIntensity={0.04}
              floatIntensity={0.09}
              floatingRange={[-0.03, 0.03]}
            >
              {MACHINE_ELEMENTS[i]}
            </Float>
          </group>
        );
      })}
    </>
  );
}
