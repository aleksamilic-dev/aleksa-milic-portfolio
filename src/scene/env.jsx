import { Environment, Lightformer } from '@react-three/drei';
import { PALETTE } from '../data.js';

// The baked lighting environment shared by both scenes (the scrolling corridor
// and the mobile hero). This is what every metal surface reflects, so it
// carries a lot of the material read — keep it directional but not blown out.
// Baked once (`frames={1}`); cheap to keep mounted.
export function StudioEnv() {
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
