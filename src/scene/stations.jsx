import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Float } from '@react-three/drei';
import { MACHINES, PALETTE } from '../data.js';
import { useFactory } from '../store.js';
import { Band, BoltRing, Gear, Node, Pipe, Screen, cast, steel } from './primitives.jsx';

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

export function IngestionDock({ active = true }) {
  const rotor = useRef();
  const grille = useRef();
  const fill = useRef();
  const valve = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    if (rotor.current) rotor.current.rotation.y = t * 0.3;
    if (grille.current)
      grille.current.material.emissiveIntensity = 0.7 + Math.sin(t * 1.6) * 0.3;
    if (fill.current) {
      // accumulated data settles up over ~28s, then drains and refills
      const k = 0.12 + (0.5 - Math.cos(t * 0.22) * 0.5) * 0.8;
      fill.current.scale.y = k;
      fill.current.position.y = GAUGE_FOOT + (k * GAUGE_H) / 2;
    }
    if (valve.current)
      valve.current.material.emissiveIntensity = Math.sin(t * 3) > 0.4 ? 1.2 : 0.3;
  });

  return (
    <group>

      {/* base pad */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[1.2, 1.36, 0.42, 24]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <BoltRing count={12} radius={1.12} r={0.045} position={[0, -0.16, 0]} />

      {/* four splayed legs + a ring beam, holding the hopper clear of the pad */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        return (
          <group key={a} rotation={[0, -a, 0]}>
            <mesh position={[0.9, 0, 0]} rotation={[0, 0, 0.42]}>
              <boxGeometry args={[0.15, 1.02, 0.15]} />
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
      <mesh ref={valve} position={[0, 0.33, 0.19]}>
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

      {/* rotary intake head — pulls the gathered feeds in; the rotor spins */}
      <group position={[0, 4.02, 0]}>
        <mesh>
          <cylinderGeometry args={[0.46, 0.46, 0.32, 24]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
        </mesh>
        <Band radius={0.47} tube={0.028} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh position={[-0.16, 0.28, 0.12]} rotation={[0.5, -0.5, 0]}>
          <boxGeometry args={[0.42, 0.34, 0.34]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.44 })} />
        </mesh>
        <group ref={rotor} position={[0, 0.04, 0]}>
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
        <mesh ref={grille} position={[0, -0.02, 0.05]}>
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
        <mesh ref={fill} position={[0, 0, 0.04]}>
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
export function ProcessingHall({ active = true }) {
  const drum = useRef();
  const coreA = useRef();
  const coreB = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    if (drum.current) drum.current.rotation.x = t * 0.42;
    const pulse = 1.15 + Math.sin(t * 3) * 0.45;
    if (coreA.current) coreA.current.material.emissiveIntensity = pulse * 0.78;
    if (coreB.current) coreB.current.material.emissiveIntensity = pulse * 1.2;
  });

  return (
    <group position={[0, 1.15, 0]}>
      {/* cradle — a floor beam + a stand with two trunnion rollers each side */}
      <mesh position={[0, -1.62, 0]}>
        <boxGeometry args={[3.8, 0.3, 1.5]} />
        <meshStandardMaterial {...cast('dark')} />
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
      <group ref={drum}>
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
      </group>

      {/* two-tone core: a short raw (amber) intake zone, then most of the length
          runs refined (blue) — the change happens early as it tumbles through */}
      <mesh ref={coreA} rotation={[0, 0, Math.PI / 2]} position={[-1.06, 0, 0]}>
        <cylinderGeometry args={[0.56, 0.64, 1.7, 24]} />
        <meshStandardMaterial color={PALETTE.amberBright} emissive={PALETTE.amber} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={coreB} rotation={[0, 0, Math.PI / 2]} position={[0.72, 0, 0]}>
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
export function StorageVault({ active = true }) {
  const cells = useRef([]);
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    cells.current.forEach((c, i) => {
      if (c) c.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 0.8 + i * 1.3)) * 1.3;
    });
  });

  // the medallion colour is an edge/label accent, not the whole module —
  // modules are dark steel, the tier reads from the trim. Each tier also
  // carries its data-lifecycle character: bronze = raw (bolted, sparse LEDs),
  // silver = refined (standard, pulled out for a read), gold = curated (a lit
  // crown, a full LED bank).
  const tiers = [
    { y: 0.0, trim: '#a4693c', led: PALETTE.blueDeep, bolts: true },
    { y: 1.2, trim: '#aeb7bf', led: PALETTE.blueBright, out: 0.35 },
    { y: 2.4, trim: '#d8ab53', led: PALETTE.amber, crown: true },
  ];

  let idx = 0;
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
          {/* status LEDs — full amber bank on gold, sparser blues below */}
          {Array.from({ length: 7 }, (_, c) => {
            const my = idx++;
            return (
              <mesh key={c} ref={(el) => (cells.current[my] = el)} position={[-0.78 + c * 0.26, -0.06, 0.65]}>
                <boxGeometry args={[0.13, 0.08, 0.03]} />
                <meshStandardMaterial color={tier.led} emissive={tier.led} emissiveIntensity={0.55} toneMapped={false} />
              </mesh>
            );
          })}
          {/* handle */}
          <mesh position={[0, 0.34, 0.66]}>
            <boxGeometry args={[0.8, 0.06, 0.12]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        </group>
      ))}

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

      {/* retrieval shuttle on a vertical rail down the face */}
      <mesh position={[1.18, 1.6, 0.62]}>
        <boxGeometry args={[0.1, 3.4, 0.1]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
      </mesh>
      <Shuttle />
    </group>
  );
}

function Shuttle() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.7 + Math.sin(clock.elapsedTime * 0.4) * 1.3;
  });
  return (
    <group ref={ref} position={[1.18, 1.7, 0.62]}>
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

export function ControlRoom({ active = true }) {
  const bars = useRef([]);
  const bars2 = useRef([]);
  const wave = useRef();
  const ticker = useRef();
  const blip = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    const grow = (arr, sp) =>
      arr.forEach((b, i) => {
        if (!b) return;
        const h = 0.16 + Math.abs(Math.sin(t * sp + i * 0.9)) * 0.5;
        b.scale.y = h;
        b.position.y = -0.36 + h / 2;
      });
    grow(bars.current, 0.8);
    grow(bars2.current, 1.25);
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
      {/* under-valance light wash */}
      <mesh position={[0, 1.6, 0.26]}>
        <boxGeometry args={[6.7, 0.04, 0.05]} />
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
          <mesh ref={ticker} position={[0, -0.5, 0.025]}>
            <planeGeometry args={[0.5, 0.1]} />
            <meshBasicMaterial color={PALETTE.amber} toneMapped={false} />
          </mesh>
        </Screen>
      </group>

      {/* left wing: two stacked bar charts, toed in */}
      <group position={[-2.34, 0.4, 0.08]} rotation={[0, 0.2, 0]}>
        <Wing
          top={Array.from({ length: 6 }, (_, i) => (
            <mesh key={`t${i}`} ref={(el) => (bars2.current[i] = el)} position={[-0.62 + i * 0.25, -0.31, 0.02]}>
              <boxGeometry args={[0.16, 1, 0.02]} />
              <meshBasicMaterial color={i === 4 ? PALETTE.amber : PALETTE.green} toneMapped={false} />
            </mesh>
          ))}
          bottom={Array.from({ length: 6 }, (_, i) => (
            <mesh key={`b${i}`} ref={(el) => (bars.current[i] = el)} position={[-0.62 + i * 0.25, -0.31, 0.02]}>
              <boxGeometry args={[0.16, 1, 0.02]} />
              <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
            </mesh>
          ))}
        />
      </group>

      {/* right wing: waveform over a status grid, toed in */}
      <group position={[2.34, 0.4, 0.08]} rotation={[0, -0.2, 0]}>
        <Wing
          top={
            <mesh ref={wave} geometry={waveGeo} position={[0, 0, 0.02]}>
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
          <mesh ref={blip} position={[0.28, 0.68, 0.3]}>
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

export function ShippingDock({ active = true }) {
  const crate = useRef();
  const gate = useRef();
  const scan = useRef();
  const belt = useRef();
  const drive = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    if (crate.current) {
      const p = (t * 0.12) % 1;
      crate.current.position.z = 1.5 - p * 5.3;
      const o = p > 0.82 ? Math.max(0, 1 - (p - 0.82) * 4) : 1;
      crate.current.traverse((c) => {
        if (c.material) {
          c.material.transparent = true;
          c.material.opacity = o;
        }
      });
    }
    if (belt.current) belt.current.position.z = -4.1 - ((t * 0.5) % 0.5);
    if (drive.current) drive.current.rotation.x = -t * 2.2;
    if (gate.current) gate.current.material.emissiveIntensity = 0.66 + Math.sin(t) * 0.16;
    if (scan.current) scan.current.position.y = Math.sin(t * 0.55) * 1.25;
  });

  return (
    <group>
      {/* loading platform + kerb rails */}
      <mesh position={[0, -1.2, -1.5]}>
        <boxGeometry args={[3.6, 0.3, 6.2]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
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
        <group ref={belt} position={[0, -0.82, -4.1]}>
          {Array.from({ length: 13 }, (_, i) => (
            <mesh key={i} position={[0, 0, i * 0.5]}>
              <boxGeometry args={[1.5, 0.03, 0.06]} />
              <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
            </mesh>
          ))}
        </group>
        {/* head/drive drum at the gate end */}
        <mesh ref={drive} position={[0, -0.9, -4.35]} rotation={[0, 0, Math.PI / 2]}>
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

      {/* dispatch portal at the far end — a framed opening with a lit field */}
      <group position={[0, 0.35, -4.5]}>
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
        {/* recessed field: dim back panel, glow wash, vertical data streams,
            a bright travelling scan bar */}
        <mesh position={[0, 0, -0.16]}>
          <planeGeometry args={[2.5, 2.62]} />
          <meshBasicMaterial color="#08243a" toneMapped={false} />
        </mesh>
        <mesh ref={gate} position={[0, 0, -0.1]}>
          <planeGeometry args={[2.5, 2.62]} />
          <meshStandardMaterial color={PALETTE.blueDeep} emissive={PALETTE.blue} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
        {[-0.75, -0.25, 0.3, 0.8].map((x, i) => (
          <mesh key={x} position={[x, 0, -0.05]}>
            <planeGeometry args={[0.09, 2.5]} />
            <meshBasicMaterial
              color={PALETTE.blueBright}
              toneMapped={false}
              transparent
              opacity={i % 2 ? 0.3 : 0.5}
            />
          </mesh>
        ))}
        {/* travelling scan bar */}
        <mesh ref={scan} position={[0, 0, 0.0]}>
          <boxGeometry args={[2.48, 0.13, 0.02]} />
          <meshBasicMaterial color="#eaf7ff" toneMapped={false} />
        </mesh>
        {/* hazard stripe on the lintel */}
        <mesh position={[0, 1.8, 0.34]}>
          <boxGeometry args={[3.9, 0.22, 0.04]} />
          <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.25} roughness={0.5} />
        </mesh>
        <BoltRing count={4} radius={1.7} r={0.05} axis="z" position={[0, 0, 0.32]} />
      </group>

      {/* staged containers on the platform, either side of the belt */}
      <Crate position={[-1.3, -0.62, -0.3]} size={0.84} rotation={[0, 0.12, 0]} />
      <Crate position={[-1.26, 0.14, -0.34]} size={0.66} rotation={[0, -0.1, 0]} />
      <Crate position={[1.32, -0.64, -1.5]} size={0.8} rotation={[0, -0.16, 0]} />
      <Crate position={[1.28, -0.68, -2.9]} size={0.72} rotation={[0, 0.24, 0]} />

      {/* container in transit down the belt toward the gate */}
      <group ref={crate} position={[0, -0.18, 1.5]}>
        <Crate size={0.82} lit />
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

export function Stations() {
  // All five machines mount once, at load (with <Preload> compiling their
  // shaders then) — building one mid-scroll cost a ~400ms frame. Only the
  // focused machine and its neighbours are drawn (`visible`); the rest sit
  // hidden and static, which costs nothing per frame. Only the machine in
  // focus floats + animates.
  const focus = useFactory((s) => Math.round(s.progress * (MACHINES.length - 1)));
  return (
    <>
      {MACHINES.map((machine, i) => {
        const Machine = MACHINE_PARTS[i];
        const dist = Math.abs(i - focus);
        return (
          <group key={machine.id} position={[0, 0, machine.z]}>
            <group visible={dist <= 1}>
              <Float
                enabled={dist === 0}
                speed={0.7}
                rotationIntensity={0.04}
                floatIntensity={0.09}
                floatingRange={[-0.03, 0.03]}
              >
                <Machine active={dist <= 1} />
              </Float>
            </group>
            {/* station marker on the floor */}
            <mesh position={[0, -1.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.7, 1.78, 48]} />
              <meshBasicMaterial color={PALETTE.blueDeep} toneMapped={false} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
