import * as THREE from 'three';

// --- glow that animates, inside a batch --------------------------------------
// A part whose only animation is its glow (a light pulsing, the gate's
// daylight brightening) used to need a material of its own, and so a draw
// call of its own every frame. Given a channel instead (`userData.pulse`),
// it merges into its machine's batch like any other part (batch.jsx), and
// the batch's shader takes its glow from the channel, which its machine sets
// every frame (setPulse).
export const PULSE = {
  siloValve: 0,
  siloGrille: 1,
  drumRaw: 2,
  drumRefined: 3,
  controlWash: 4,
  gateDaylight: 5,
  gateBeacon: 6,
};
export const PULSE_CHANNELS = 8;

// each channel's glow: its colour times its strength, in three's linear
// working space, as a material's emissive is
export const pulseGlow = { value: Array.from({ length: PULSE_CHANNELS }, () => new THREE.Vector3()) };

export function setPulse(channel, color, strength) {
  pulseGlow.value[channel].set(color.r * strength, color.g * strength, color.b * strength);
}
