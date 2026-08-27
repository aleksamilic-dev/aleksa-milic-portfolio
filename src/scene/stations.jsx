import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Float } from '@react-three/drei';
import { MACHINES, PALETTE } from '../data.js';
import { useFactory } from '../store.js';
import { Band, BoltRing, Node, Pipe, Screen, cast, steel } from './primitives.jsx';

// Every machine here runs at roughly half the animation speed and half the
// emissive punch of the original "tour" version — it's ambient backdrop now,
// sitting behind a scrim, not the subject.

// ---------------------------------------------------------------------------
// 01 — Ingestion Dock : an intake manifold that gathers scattered feeds
// ---------------------------------------------------------------------------
function IngestionDock() {
  const cowl = useRef();
  const grille = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cowl.current) cowl.current.rotation.y = t * 0.3;
    if (grille.current)
      grille.current.material.emissiveIntensity = 0.6 + Math.sin(t * 1.6) * 0.3;
  });

  // each feeder: a source point out to the left, and where it plugs into the
  // manifold collar. Bundled and roughly parallel — a gathered intake, not a
  // splay of tentacles.
  const feeders = useMemo(
    () => [
      { from: [-5.0, 2.9, 2.2], to: [-0.9, 1.75, 0.2] },
      { from: [-5.4, 1.8, 2.9], to: [-0.9, 1.25, 0.2] },
      { from: [-4.6, 3.5, 1.5], to: [-0.7, 2.15, 0.55] },
      { from: [-4.8, 0.9, 2.0], to: [-0.75, 0.8, 0.4] },
    ],
    [],
  );

  return (
    <group>
      <pointLight position={[1.4, 2.2, 2.4]} intensity={4} distance={9} color={PALETTE.amberBright} />

      {/* plinth */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[1.16, 1.28, 0.5, 24]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      <BoltRing count={10} radius={1.05} r={0.045} position={[0, -0.09, 0]} />

      {/* collector tank */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.9, 0.95, 2.2, 32]} />
          <meshStandardMaterial {...steel('steel')} />
        </mesh>
        <Band radius={0.93} position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Band radius={0.93} position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]} />

        {/* bolted top flange */}
        <mesh position={[0, 2.06, 0]}>
          <cylinderGeometry args={[1.0, 1.0, 0.12, 32]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.42 })} />
        </mesh>
        <BoltRing count={12} radius={0.87} position={[0, 2.13, 0]} />

        {/* rotating collector head — a closed drum with radial intake slots */}
        <group ref={cowl} position={[0, 2.42, 0]}>
          <mesh>
            <cylinderGeometry args={[0.86, 0.86, 0.44, 32]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.32 })} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.5, 0.86, 0.16, 32]} />
            <meshStandardMaterial {...steel('steel', { roughness: 0.36 })} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.87, 0, Math.sin(a) * 0.87]} rotation={[0, -a, 0]}>
                <boxGeometry args={[0.04, 0.24, 0.16]} />
                <meshStandardMaterial color={PALETTE.blueDeep} emissive={PALETTE.blueDeep} emissiveIntensity={0.5} toneMapped={false} />
              </mesh>
            );
          })}
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 12]} />
            <meshStandardMaterial {...steel('dark')} />
          </mesh>
        </group>

        {/* lit intake port on the front */}
        <group position={[0, 1.12, 0.86]}>
          {/* raised bezel */}
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[1.04, 0.7, 0.12]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
          </mesh>
          {/* glowing throat, set into the bezel */}
          <mesh ref={grille} position={[0, 0, 0.09]}>
            <planeGeometry args={[0.82, 0.48]} />
            <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={1.05} toneMapped={false} />
          </mesh>
          {/* two divider bars across it */}
          {[-0.14, 0.14].map((y) => (
            <mesh key={y} position={[0, y, 0.1]}>
              <boxGeometry args={[0.82, 0.04, 0.03]} />
              <meshStandardMaterial {...steel('dark')} />
            </mesh>
          ))}
        </group>

        {/* manifold collar the feeders plug into — hugs the tank */}
        <mesh position={[-0.72, 1.45, 0.32]} rotation={[0, 0.55, 0]}>
          <boxGeometry args={[0.34, 2.1, 0.5]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.46 })} />
        </mesh>
      </group>

      {/* feeder pipes — bundled, converging from the left */}
      {feeders.map(({ from, to }, i) => {
        const mid = [
          (from[0] + to[0]) / 2 - 0.25,
          from[1] * 0.45 + to[1] * 0.55,
          (from[2] + to[2]) / 2 + 0.35,
        ];
        const color = i % 2 ? PALETTE.amber : PALETTE.blue;
        return (
          <group key={i}>
            <Pipe points={[from, mid, to]} radius={0.055} color={color} emissive={0.2} flanges />
            <Node position={from} r={0.07} color={color} socket />
          </group>
        );
      })}

      {/* outfeed to the spine */}
      <Pipe
        points={[[0, 0.0, -0.5], [0, 0.28, -1.9], [0, 0.34, -4]]}
        radius={0.09}
        color={PALETTE.amber}
        emissive={0.28}
        flanges
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 02 — Processing Hall : a reactor drum, raw in one end, refined out the other
// ---------------------------------------------------------------------------
function ProcessingHall() {
  const drum = useRef();
  const core = useRef();
  const seam = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (drum.current) drum.current.rotation.x = t * 0.42;
    if (core.current) core.current.material.emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.6;
    if (seam.current) seam.current.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
  });

  return (
    <group position={[0, 1.15, 0]}>
      {/* cradle — a stand + curved saddle each side, on a floor beam */}
      <mesh position={[0, -1.62, 0]}>
        <boxGeometry args={[3.8, 0.3, 1.4]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, -1.05, 0]}>
            <boxGeometry args={[0.42, 1.0, 1.3]} />
            <meshStandardMaterial {...cast('dark')} />
          </mesh>
          <mesh position={[0, -0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.34, 1.34, 0.42, 24, 1, true, Math.PI * 0.16, Math.PI * 0.68]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} side={THREE.DoubleSide} />
          </mesh>
          <BoltRing count={4} radius={0.3} r={0.03} position={[0, -1.56, 0]} />
        </group>
      ))}

      {/* rotating reactor shell — spins on its own (X) axis */}
      <group ref={drum}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.14, 1.14, 3.3, 40, 1, true]} />
          <meshStandardMaterial {...steel('steel', { roughness: 0.3 })} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} rotation={[0, Math.PI / 2, 0]} position={[-1.5 + i * 0.375, 0, 0]}>
            <torusGeometry args={[1.17, 0.04, 8, 24]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        ))}
        {/* longitudinal tie-rods */}
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
          <mesh key={a} position={[0, Math.cos(a) * 1.16, Math.sin(a) * 1.16]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 3.1, 6]} />
            <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
          </mesh>
        ))}
      </group>

      {/* glowing core, visible through the open hub ends and rib gaps */}
      <mesh ref={core} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 3.5, 24]} />
        <meshStandardMaterial color={PALETTE.amberBright} emissive={PALETTE.amber} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 0]} color={PALETTE.amber} intensity={4.2} distance={7} />

      {/* end hubs: raw (amber) in, refined (blue) out — open rings so the
          core throat glows through, with a spoked centre */}
      {[
        { x: -1.7, c: PALETTE.amberDeep, e: PALETTE.amber, glow: 0.45 },
        { x: 1.7, c: PALETTE.blueDeep, e: PALETTE.blueBright, glow: 0.6 },
      ].map(({ x, c, e, glow }) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[1.06, 0.15, 12, 32]} />
            <meshStandardMaterial {...steel(c, { roughness: 0.4 })} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 0.08, 2.05]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 2.05, 0.08]} />
            <meshStandardMaterial {...steel('dark', { roughness: 0.45 })} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.26, 16]} />
            <meshStandardMaterial color={e} emissive={e} emissiveIntensity={glow} toneMapped={false} />
          </mesh>
          <BoltRing count={12} radius={1.06} r={0.032} axis="x" />
        </group>
      ))}

      {/* transformation seam — pulsing ring where amber turns blue */}
      <mesh ref={seam} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.24, 0.055, 10, 40]} />
        <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
      </mesh>

      {/* plumbed into the spine: raw feed up into the amber end, refined down out of the blue end */}
      <Pipe points={[[-1.9, -1.4, -0.9], [-1.95, -0.4, -0.3], [-1.9, 0, 0]]} radius={0.1} color={PALETTE.amber} emissive={0.3} flanges />
      <Pipe points={[[1.9, 0, 0], [1.95, -0.6, -0.4], [1.9, -1.5, -1.0]]} radius={0.1} color={PALETTE.blue} emissive={0.3} flanges />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 03 — Storage Vault : a medallion rack, bronze / silver / gold tiers
// ---------------------------------------------------------------------------
function StorageVault() {
  const cells = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    cells.current.forEach((c, i) => {
      if (c) c.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 0.8 + i * 1.3)) * 1.3;
    });
  });

  // the medallion colour is an edge/label accent, not the whole module —
  // modules are dark steel, the tier reads from the trim.
  const tiers = [
    { y: 0.05, trim: '#a4693c', out: 0 }, // bronze
    { y: 1.2, trim: '#aeb7bf', out: 0.3 }, // silver — pulled out, being read
    { y: 2.35, trim: '#d8ab53', out: 0 }, // gold
  ];

  let idx = 0;
  return (
    <group position={[-1.2, -0.35, 0]}>
      <pointLight position={[2.2, 2.6, 2.0]} intensity={2.8} distance={9} color="#cfe0ee" />

      {/* rack frame + plinth */}
      <mesh position={[-0.35, 1.5, 0]}>
        <boxGeometry args={[0.35, 3.9, 3.5]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>
      {[-1.7, 1.7].map((z) => (
        <mesh key={z} position={[0.3, 1.55, z]}>
          <boxGeometry args={[1.7, 4.0, 0.16]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
      ))}
      {[-0.5, 0.65, 1.8, 2.95].map((y) => (
        <mesh key={y} position={[0.45, y, 0]}>
          <boxGeometry args={[1.5, 0.1, 3.5]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
      ))}
      <mesh position={[0.2, -0.62, 0]}>
        <boxGeometry args={[2.1, 0.3, 3.7]} />
        <meshStandardMaterial {...cast('dark')} />
      </mesh>

      {/* three storage modules */}
      {tiers.map((tier, ti) => (
        <group key={ti} position={[0.45 + tier.out, tier.y + 0.62, 0]}>
          <mesh>
            <boxGeometry args={[1.4, 0.98, 3.3]} />
            <meshStandardMaterial {...steel('steel', { roughness: 0.44 })} />
          </mesh>
          {/* machined tier trim wrapping the leading edge */}
          <mesh position={[0.7, 0.44, 0]}>
            <boxGeometry args={[0.16, 0.14, 3.34]} />
            <meshStandardMaterial color={tier.trim} metalness={1} roughness={0.18} envMapIntensity={2.6} />
          </mesh>
          <mesh position={[0.7, -0.44, 0]}>
            <boxGeometry args={[0.16, 0.14, 3.34]} />
            <meshStandardMaterial color={tier.trim} metalness={1} roughness={0.18} envMapIntensity={2.6} />
          </mesh>
          {/* tier light bar — the medallion colour as glow */}
          <mesh position={[0.74, 0.3, 0]}>
            <boxGeometry args={[0.03, 0.06, 3.1]} />
            <meshStandardMaterial color={tier.trim} emissive={tier.trim} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          {/* recessed bay panel on the +X face */}
          <mesh position={[0.7, -0.06, 0]}>
            <boxGeometry args={[0.06, 0.52, 3.0]} />
            <meshStandardMaterial {...cast('dark', { roughness: 0.62 })} />
          </mesh>
          {/* status LEDs */}
          {Array.from({ length: 7 }, (_, c) => {
            const my = idx++;
            return (
              <mesh key={c} ref={(el) => (cells.current[my] = el)} position={[0.75, -0.06, -1.25 + c * 0.42]}>
                <boxGeometry args={[0.03, 0.08, 0.14]} />
                <meshStandardMaterial
                  color={ti === 2 ? PALETTE.amber : PALETTE.blueBright}
                  emissive={ti === 2 ? PALETTE.amber : PALETTE.blueBright}
                  emissiveIntensity={0.5}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* retrieval shuttle on a vertical rail, corridor side */}
      <mesh position={[1.4, 1.5, 1.7]}>
        <boxGeometry args={[0.12, 3.7, 0.12]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.3 })} />
      </mesh>
      <Shuttle />
    </group>
  );
}

function Shuttle() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 0.4) * 1.4;
  });
  return (
    <group ref={ref} position={[1.4, 1.6, 1.7]}>
      <mesh>
        <boxGeometry args={[0.34, 0.3, 0.34]} />
        <meshStandardMaterial {...steel('dark', { roughness: 0.4 })} />
      </mesh>
      <mesh position={[-0.16, 0, 0]}>
        <boxGeometry args={[0.06, 0.14, 0.14]} />
        <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 04 — Control Room : a wall of live monitors above a console
// ---------------------------------------------------------------------------
function ControlRoom() {
  const bars = useRef([]);
  const wave = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bars.current.forEach((b, i) => {
      if (b) {
        const h = 0.3 + Math.abs(Math.sin(t * 0.8 + i * 0.9)) * 1.0;
        b.scale.y = h;
        b.position.y = -0.55 + h * 0.25;
      }
    });
    if (wave.current) {
      const pos = wave.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, Math.sin(x * 3 + t * 2) * 0.1 + Math.sin(x * 7 - t * 1) * 0.04);
      }
      pos.needsUpdate = true;
    }
  });

  const waveGeo = useMemo(() => new THREE.PlaneGeometry(1.8, 0.55, 44, 1), []);

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

      {/* left: bar chart, toed in */}
      <group position={[-2.45, 0.18, 0.12]} rotation={[0, 0.15, 0]}>
        <Screen w={2.0} h={1.9} color="#0f3350" intensity={0.6}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} ref={(el) => (bars.current[i] = el)} position={[-0.72 + i * 0.36, -0.5, 0.02]}>
              <boxGeometry args={[0.22, 1, 0.02]} />
              <meshBasicMaterial color={i === 3 ? PALETTE.amber : PALETTE.green} toneMapped={false} />
            </mesh>
          ))}
        </Screen>
      </group>

      {/* centre: big readout */}
      <group position={[0, 0.18, 0.18]}>
        <Screen w={2.0} h={1.9} color="#0c2f45" intensity={0.6}>
          <mesh position={[0, 0.3, 0.02]}>
            <planeGeometry args={[1.3, 0.46]} />
            <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.15, 0.02]}>
            <planeGeometry args={[1.3, 0.12]} />
            <meshBasicMaterial color={PALETTE.inkFaint} toneMapped={false} />
          </mesh>
          <mesh position={[-0.2, -0.37, 0.02]}>
            <planeGeometry args={[0.9, 0.09]} />
            <meshBasicMaterial color={PALETTE.inkFaint} toneMapped={false} />
          </mesh>
        </Screen>
      </group>

      {/* right: waveform, toed in */}
      <group position={[2.45, 0.18, 0.12]} rotation={[0, -0.15, 0]}>
        <Screen w={2.0} h={1.9} color="#0f3350" intensity={0.6}>
          <mesh ref={wave} geometry={waveGeo} position={[0, 0.05, 0.02]}>
            <meshBasicMaterial color={PALETTE.green} wireframe toneMapped={false} />
          </mesh>
        </Screen>
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
        <mesh position={[0, 0.13, 0.1]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[2.3, 0.04, 0.52]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        {[-1.8, -0.9, 0, 0.9, 1.8].map((x, i) => (
          <Node key={x} position={[x, 0.17, 0.34]} r={0.038} color={i === 2 ? PALETTE.amber : PALETTE.green} socket />
        ))}
      </group>

      <pointLight position={[0, 0.3, 1.9]} color={PALETTE.blue} intensity={2.6} distance={7} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 05 — Shipping Dock : refined data crated and sent through the gate
// ---------------------------------------------------------------------------
function Crate({ size = 0.8, lit = false, ...props }) {
  const accent = lit ? PALETTE.blueBright : PALETTE.blueDeep;
  return (
    <group {...props}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#39434f" metalness={0.55} roughness={0.55} envMapIntensity={1.2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * size * 0.3, 0, 0]}>
          <boxGeometry args={[0.035, size * 1.02, size * 1.02]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
        </mesh>
      ))}
      <mesh position={[0, 0, size / 2 + 0.006]}>
        <planeGeometry args={[size * 0.42, size * 0.16]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ShippingDock() {
  const crate = useRef();
  const gate = useRef();
  const scan = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (crate.current) {
      const p = (t * 0.13) % 1;
      crate.current.position.z = 1.6 - p * 5.4;
      const o = p > 0.78 ? Math.max(0, 1 - (p - 0.78) * 4.5) : 1;
      crate.current.traverse((c) => {
        if (c.material) {
          c.material.transparent = true;
          c.material.opacity = o;
        }
      });
    }
    if (gate.current) gate.current.material.emissiveIntensity = 0.62 + Math.sin(t) * 0.14;
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
      {/* centre lane light */}
      <mesh position={[0, -1.03, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, 5.2]} />
        <meshBasicMaterial color={PALETTE.blueDeep} toneMapped={false} transparent opacity={0.55} />
      </mesh>
      {/* conveyor rollers feeding the gate */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, -0.92, 0.7 - i * 0.72]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 1.7, 10]} />
          <meshStandardMaterial {...steel('light', { roughness: 0.34 })} />
        </mesh>
      ))}

      {/* dispatch portal at the far end */}
      <group position={[0, 0.35, -4.5]}>
        <mesh>
          <boxGeometry args={[3.9, 4.0, 0.7]} />
          <meshStandardMaterial {...cast('dark')} />
        </mesh>
        <mesh position={[0, 0, 0.16]}>
          <boxGeometry args={[2.9, 3.0, 0.5]} />
          <meshStandardMaterial {...steel('dark', { roughness: 0.5 })} />
        </mesh>
        {/* glowing field, recessed */}
        <mesh ref={gate} position={[0, 0, -0.12]}>
          <planeGeometry args={[2.7, 2.8]} />
          <meshStandardMaterial color={PALETTE.blueDeep} emissive={PALETTE.blueBright} emissiveIntensity={0.85} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[1.4, 1.5]} />
          <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} transparent opacity={0.5} />
        </mesh>
        {/* travelling scan bar */}
        <mesh ref={scan} position={[0, 0, 0.0]}>
          <boxGeometry args={[2.66, 0.09, 0.02]} />
          <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
        </mesh>
        {/* hazard stripe on the lintel */}
        <mesh position={[0, 1.78, 0.37]}>
          <boxGeometry args={[3.9, 0.22, 0.04]} />
          <meshStandardMaterial color={PALETTE.amber} emissive={PALETTE.amber} emissiveIntensity={0.22} roughness={0.5} />
        </mesh>
        <BoltRing count={4} radius={1.72} r={0.05} axis="z" position={[0, 0, 0.38]} />
        <pointLight position={[0, 0, 1.7]} color={PALETTE.blueBright} intensity={4.2} distance={9} />
      </group>

      {/* staged crates, seated on the platform (top at y = -1.05) */}
      <Crate position={[-0.85, -0.66, -0.2]} size={0.78} />
      <Crate position={[0.9, -0.6, -1.9]} size={0.9} />
      <Crate position={[0.82, 0.11, -1.9]} size={0.62} />
      <Crate position={[-0.8, -0.7, -2.8]} size={0.7} />

      {/* crate in transit toward the gate */}
      <group ref={crate} position={[0, -0.58, 1.6]}>
        <Crate size={0.88} lit />
      </group>
    </group>
  );
}

const MACHINE_PARTS = [
  IngestionDock,
  ProcessingHall,
  StorageVault,
  ControlRoom,
  ShippingDock,
];

export function Stations() {
  // The camera glides down the corridor as you scroll, so mount the machine
  // it's near plus its neighbours; the rest stay bare floor markers. The
  // selector returns an int, so this only re-renders ~5 times per scroll.
  const focus = useFactory((s) => Math.round(s.progress * (MACHINES.length - 1)));
  return (
    <>
      {MACHINES.map((machine, i) => {
        const Machine = MACHINE_PARTS[i];
        const inFrame = Math.abs(i - focus) <= 1;
        return (
          <group key={machine.id} position={[0, 0, machine.z]}>
            {inFrame && (
              <Float
                speed={0.7}
                rotationIntensity={0.04}
                floatIntensity={0.09}
                floatingRange={[-0.03, 0.03]}
              >
                <Machine />
              </Float>
            )}
            {/* station marker on the floor — cheap, always on */}
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
