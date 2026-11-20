// The hall's services: the duct the raw data comes in by, and the control
// room's wiring out to every machine. The hall runs them (scene/hall.jsx),
// the machines carry the ends they land in (scene/stations.jsx), and both
// read the places from here so the two always meet. World coordinates.

// The intake duct. It comes in through the wall over the entrance, under a
// weather hood on the outside, runs down the middle of the roof clear of the
// trusses, and drops into the collar on top of the silo's rotary head. The
// duct stops inside the collar rather than at its rim: the machine in focus
// floats a little (Float in stations.jsx), and the collar's spare room hides
// that. Both camera paths keep at least 2.5 units from all of it.
export const DUCT = {
  radius: 0.2,
  y: 6.0, // the horizontal run, between the trusses (5.17) and the roof (6.4)
  wall: 14, // the entrance wall (HALL.front in hall.jsx)
  bend: 0.45, // the elbow over the silo
  foot: 4.34, // where it ends, inside the collar
  collar: { y: 4.18, height: 0.3, radius: 0.27 }, // on the silo's head
};

// The control room's cable tray: a ladder tray hung under the roof trusses,
// left of the hall's middle, clear of the light strips under the trusses and
// of the signs hanging in the doorways. It runs from over the silo to the end
// wall, and the control room's cables go up into it.
export const TRAY = { x: -2.75, y: 4.7, width: 0.4, from: 2, to: -69 };

// Where the wiring meets each machine: a junction box, with a green light,
// the control room's colour. `box` is the box's centre, `yaw` which way it
// faces, `size` across, up, deep. A cable drops from the tray to the top of
// each one. The control room's own box sits on its valance, and its cables
// rise from it into the tray instead. The tray end of a drop is straight
// above the box's z, unless `leave` says otherwise.
export const TAPS = [
  // silo: on the left of the shell, toward the back, between the standpipe
  // and a weld strake, its light turned to the camera going past
  { box: [-0.9, 3.0, -0.42], yaw: -2.01, size: [0.26, 0.32, 0.14], leave: -0.6 },
  // drum: on top of the intake end's ring, which doesn't turn
  { box: [-1.7, 2.45, -16.3], yaw: 0, size: [0.26, 0.22, 0.2] },
  // vault: on top of the rack's left upright, right under the tray
  { box: [-2.945, 3.36, -32.6], yaw: 0, size: [0.22, 0.3, 0.2] },
  // control room: a gland box on the valance, its cables going up
  { box: [-2.75, 3.41, -47.92], yaw: 0, size: [0.5, 0.18, 0.4], riser: true },
  // dock: on top of the gate's lintel
  { box: [-1.5, 2.51, -68.55], yaw: 0, size: [0.3, 0.3, 0.2], leave: -68.75 },
];
