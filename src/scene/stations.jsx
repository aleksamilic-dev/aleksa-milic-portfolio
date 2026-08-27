import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Float } from '@react-three/drei';
import { MACHINES, PALETTE } from '../data.js';
import { useFactory } from '../store.js';
import { Beam, Node, Panel, Pipe, Strut } from './primitives.jsx';

// Every machine here runs at roughly half the animation speed and half the
// emissive punch of the original "tour" version — it's ambient backdrop now,
// sitting behind a scrim, not the subject.

// ---------------------------------------------------------------------------
// 01 — Ingestion Dock : an intake manifold that gathers scattered feeds
// ---------------------------------------------------------------------------
function IngestionDock() {
  const ring = useRef();
  const intake = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.y = t * 0.34;
    if (intake.current)
      intake.current.material.emissiveIntensity = 0.85 + Math.sin(t * 1.6) * 0.32;
  });

  const feeders = useMemo(
    () => [
      [-5.5, 3.6, 3.2],
      [-6.2, 2.1, 4.4],
      [-4.6, 4.4, 2.1],
      [-6.4, 0.9, 3.6],
      [-3.9, 3.0, 4.8],
    ],
    [],
  );

  return (
    <group>
      <pointLight position={[1.7, 2.3, 2.6]} intensity={4.6} distance={10} color={PALETTE.amberBright} />

      {/* collector drum */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.92, 0.98, 2.1, 32]} />
          <meshStandardMaterial color={PALETTE.steel} metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh ref={ring} position={[0, 2.05, 0]}>
          <torusGeometry args={[0.96, 0.06, 12, 40]} />
          <meshStandardMaterial
            color={PALETTE.blue}
            emissive={PALETTE.blue}
            emissiveIntensity={0.95}
            toneMapped={false}
          />
        </mesh>
        {/* hopper */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.55, 0.95, 0.7, 32, 1, true]} />
          <meshStandardMaterial
            color={PALETTE.steelLight}
            metalness={0.7}
            roughness={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* intake slot */}
        <mesh ref={intake} position={[0, 1.05, 0.95]}>
          <boxGeometry args={[0.7, 0.14, 0.04]} />
          <meshStandardMaterial
            color={PALETTE.amber}
            emissive={PALETTE.amber}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.62, 0.9, 28]} />
          <meshStandardMaterial color={PALETTE.steelDark} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* feeder pipes reaching out to the sources */}
      {feeders.map((from, i) => (
        <group key={i}>
          <Pipe
            points={[from, [from[0] * 0.45, 1.9 + i * 0.05, 1.4], [0, 1.7, 0.6]]}
            radius={0.05}
            color={i % 2 ? PALETTE.amber : PALETTE.blue}
            emissive={0.25}
          />
          <Node position={from} r={0.09} color={i % 2 ? PALETTE.amber : PALETTE.blue} />
        </group>
      ))}

      {/* outfeed to the spine */}
      <Pipe
        points={[[0, 0.1, -0.4], [0, 0.3, -1.6], [0, 0.34, -4]]}
        radius={0.09}
        color={PALETTE.amber}
        emissive={0.3}
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
    if (drum.current) drum.current.rotation.x = t * 0.46;
    if (core.current) core.current.material.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.7;
    if (seam.current) seam.current.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
  });

  return (
    <group position={[0, 1.15, 0]}>
      {/* cradle */}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, -0.9, 0]}>
          <boxGeometry args={[0.5, 1.5, 2.6]} />
          <meshStandardMaterial color={PALETTE.steelDark} metalness={0.5} roughness={0.55} />
        </mesh>
      ))}

      {/* rotating reactor — spins on its own (X) axis */}
      <group ref={drum}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.15, 1.15, 3.4, 40, 1, true]} />
          <meshStandardMaterial
            color={PALETTE.steel}
            metalness={0.55}
            roughness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* segment ribs, threaded along the drum */}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} rotation={[0, Math.PI / 2, 0]} position={[-1.5 + i * 0.375, 0, 0]}>
            <torusGeometry args={[1.17, 0.035, 8, 24]} />
            <meshStandardMaterial color={PALETTE.steelLight} metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* glowing core */}
      <mesh ref={core} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 3.2, 24]} />
        <meshStandardMaterial
          color={PALETTE.amberBright}
          emissive={PALETTE.amber}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} color={PALETTE.amber} intensity={4.5} distance={7} />

      {/* end caps: raw (amber) vs refined (blue) */}
      <mesh position={[-1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 40]} />
        <meshStandardMaterial color={PALETTE.amberDeep} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[1.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 40]} />
        <meshStandardMaterial color={PALETTE.blueDeep} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* transformation seam — a ring around the middle */}
      <mesh ref={seam} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.24, 0.05, 10, 40]} />
        <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
      </mesh>
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
      if (c) c.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(t * 0.7 + i * 0.7)) * 1.7;
    });
  });

  const tiers = [
    { y: 0.2, color: '#a06a3d', label: 'BRONZE' },
    { y: 1.35, color: '#9aa4ac', label: 'SILVER' },
    { y: 2.5, color: '#d8ab53', label: 'GOLD' },
  ];

  return (
    <group position={[-1.4, -0.4, 0]}>
      <pointLight position={[2.4, 2.6, 2.2]} intensity={3.4} distance={9} color="#cfe0ee" />

      {/* backing wall */}
      <mesh position={[-0.6, 1.5, 0]}>
        <boxGeometry args={[0.4, 3.8, 3.4]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.5} roughness={0.6} />
      </mesh>

      {tiers.map((tier, ti) => (
        <group key={tier.label} position={[0, tier.y, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 0.78, 3.1]} />
            <meshStandardMaterial color={tier.color} metalness={0.65} roughness={0.35} />
          </mesh>
          {/* cell lights along the face */}
          {Array.from({ length: 6 }, (_, ci) => (
            <mesh
              key={ci}
              ref={(el) => (cells.current[ti * 6 + ci] = el)}
              position={[0.78, 0, -1.25 + ci * 0.5]}
            >
              <boxGeometry args={[0.05, 0.4, 0.28]} />
              <meshStandardMaterial
                color={ti === 2 ? PALETTE.amber : PALETTE.blue}
                emissive={ti === 2 ? PALETTE.amber : PALETTE.blue}
                emissiveIntensity={0.9}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* sorter rail + shuttle */}
      <mesh position={[1.5, 1.5, 0]}>
        <boxGeometry args={[0.1, 3.4, 0.1]} />
        <meshStandardMaterial color={PALETTE.steelLight} metalness={0.8} roughness={0.3} />
      </mesh>
      <Shuttle />
    </group>
  );
}

function Shuttle() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 0.45) * 1.15;
  });
  return (
    <mesh ref={ref} position={[1.5, 1.5, 0]}>
      <boxGeometry args={[0.28, 0.28, 0.5]} />
      <meshStandardMaterial
        color={PALETTE.amber}
        emissive={PALETTE.amber}
        emissiveIntensity={1}
        toneMapped={false}
      />
    </mesh>
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

  const waveGeo = useMemo(() => new THREE.PlaneGeometry(1.9, 0.6, 48, 1), []);

  return (
    <group position={[0, 1.35, 0.2]}>
      {/* curved monitor bank */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[7.6, 3.4, 0.3]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* left: bar chart */}
      <group position={[-2.5, 0.1, 0.05]}>
        <Panel w={2.15} h={2.1} color={PALETTE.blueDeep} intensity={0.75} />
        {Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => (bars.current[i] = el)}
            position={[-0.8 + i * 0.4, -0.55, 0.03]}
          >
            <boxGeometry args={[0.24, 1, 0.02]} />
            <meshBasicMaterial
              color={i === 3 ? PALETTE.amber : PALETTE.green}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* centre: big readout */}
      <group position={[0, 0.1, 0.05]}>
        <Panel w={2.15} h={2.1} color="#0c2f45" intensity={0.65} />
        <Panel w={1.4} h={0.5} position={[0, 0.3, 0.03]} color={PALETTE.blueBright} intensity={1} />
        <Panel w={1.4} h={0.14} position={[0, -0.15, 0.03]} color={PALETTE.inkFaint} intensity={0.3} />
        <Panel w={1.0} h={0.1} position={[-0.2, -0.4, 0.03]} color={PALETTE.inkFaint} intensity={0.25} />
      </group>

      {/* right: waveform */}
      <group position={[2.5, 0.1, 0.05]}>
        <Panel w={2.15} h={2.1} color={PALETTE.blueDeep} intensity={0.75} />
        <mesh ref={wave} geometry={waveGeo} position={[0, 0.1, 0.03]}>
          <meshBasicMaterial color={PALETTE.green} wireframe toneMapped={false} />
        </mesh>
      </group>

      {/* console */}
      <mesh position={[0, -2.1, 1.4]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[5.2, 0.12, 1.1]} />
        <meshStandardMaterial color={PALETTE.steel} metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1.8, -0.9, 0, 0.9, 1.8].map((x, i) => (
        <Node key={x} position={[x, -1.95, 1.7]} r={0.045} color={i === 2 ? PALETTE.amber : PALETTE.green} />
      ))}
      <pointLight position={[0, 0.5, 2]} color={PALETTE.blue} intensity={3} distance={8} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 05 — Shipping Dock : refined data crated and sent through the gate
// ---------------------------------------------------------------------------
function ShippingDock() {
  const crate = useRef();
  const gate = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (crate.current) {
      const p = (t * 0.13) % 1;
      crate.current.position.z = 1.6 - p * 5.2;
      crate.current.material.opacity = p > 0.75 ? 1 - (p - 0.75) * 4 : 1;
    }
    if (gate.current) gate.current.material.emissiveIntensity = 1 + Math.sin(t * 1) * 0.3;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* loading platform */}
      <mesh position={[0, -1.2, -1.5]}>
        <boxGeometry args={[3.4, 0.3, 6]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.5} roughness={0.55} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <Beam key={x} position={[x, -1.0, -1.5]} length={6} size={0.12} color={PALETTE.blue} />
      ))}

      {/* dispatch gate at the far end */}
      <group position={[0, 0.4, -4.6]}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[3.4, 0.3, 0.5]} />
          <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.4} />
        </mesh>
        {[-1.6, 1.6].map((x) => (
          <Strut key={x} height={3.4} position={[x, 0, 0]} />
        ))}
        <mesh ref={gate} position={[0, 0.2, -0.1]}>
          <planeGeometry args={[2.9, 3]} />
          <meshStandardMaterial
            color={PALETTE.blueBright}
            emissive={PALETTE.blue}
            emissiveIntensity={1}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 0.5, 1.4]} color={PALETTE.blueBright} intensity={5.5} distance={10} />
      </group>

      {/* staged crates */}
      {[[-1.1, 0.9], [1.0, 1.7], [1.2, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.55, z]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#7c5a3c" roughness={0.85} metalness={0.1} />
        </mesh>
      ))}

      {/* the crate in transit */}
      <mesh ref={crate} position={[0, -0.55, 1.6]}>
        <boxGeometry args={[0.85, 0.85, 0.85]} />
        <meshStandardMaterial color="#8a6543" roughness={0.8} transparent />
      </mesh>
      <mesh position={[0, 0.05, 1.6]}>
        <boxGeometry args={[0.5, 0.16, 0.02]} />
        <meshBasicMaterial color={PALETTE.blueBright} toneMapped={false} />
      </mesh>
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
