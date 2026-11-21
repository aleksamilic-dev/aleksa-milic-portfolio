import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE, STATION_GAP, ZONE_COLORS, ZONE_NAMES } from '../data.js';
import { LATE } from './batch.jsx';
import { SAFETY, cast, steel } from './primitives.jsx';
import { DUCT, TAPS, TRAY } from './services.js';

// The building round the line: clad walls with a band of high windows, an
// end wall the shipping gate sits in, columns on painted feet that carry the
// roof down to the floor, purlins along the roof, painted floor markings,
// and a doorway into each zone with its name over it. Then its services: the
// duct the raw data comes in by, the control room's cable tray out to every
// machine (services.js), and a pipe, a conduit, electrical panels and exit
// doors along the walls. All of it static, so it goes in with the rest of
// the facility under <StaticBatch> (scene/batch.jsx) and costs a handful of
// draw calls.
//
// The hall runs down -z from the entrance at HALL.front to the end wall at
// HALL.back, just behind the shipping gate. The roof trusses sit every BAY
// along it (Facility in scene/Scene.jsx), and the walls' window bays line
// up with them.
const HALL = { front: 14, back: -69.1, wall: 9.2, floor: -1.5, roof: 6.4 };
const BAY = 6;
const COLUMN_X = 8.5;

// One shared material for every column, brace, header, hanger and sign
// backing, the same one the roof struts used, so the batch merges them all
// into one draw call.
const frame = steel('dark', { roughness: 0.5 });

// --- walls --------------------------------------------------------------
// One bay of wall as a texture: dark, with a band of frosted windows high
// up, the panes a dim overcast blue as if there were daylight outside. Six
// units across, floor to roof.
//
// The walls are unlit, their colour painted straight into the texture. They
// cover a lot of the screen, and lit, they cost enough GPU time per frame to
// add a few dropped frames to every scroll down the page. They're dark and
// sit behind everything, so lighting them showed for next to nothing.
const WALL_H = HALL.roof - HALL.floor;
const BAND = [3.5, 4.8]; // the windows, in world height
const WALL_COLOR = '#10161d';

// Below the windows the walls are clad in sheets PANEL wide, their lapped
// edges a faint light line with a shadow beside it, on two girts: one under
// the windows, one halfway down. At the foot, a concrete upstand PLINTH
// high. All of it painted into the texture, so it costs nothing to draw.
const PANEL = 1;
const PLINTH = 1.1;
const GIRTS = [BAND[0] - 0.12, 1.2];
// how many times the texture repeats along a side wall: once a bay
const WALL_REPEAT = (HALL.front - (HALL.back - 0.9)) / BAY;
// A spot of plain wall in the texture, between the girts and in the middle
// of a sheet, for the end wall and the fascia, which are plain wall
// throughout (see Walls). In uv, before the side walls' repeat is applied.
const PLAIN_UV = [PANEL / 2 / BAY / WALL_REPEAT, (2.3 - HALL.floor) / WALL_H];

function useWindowTexture() {
  return useMemo(() => {
    const W = 192;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = WALL_COLOR;
    g.fillRect(0, 0, W, H);
    const px = W / BAY;
    const py = H / WALL_H;
    // the canvas row at a height in the world
    const row = (y) => Math.round((HALL.roof - y) * py);
    const plinth = row(HALL.floor + PLINTH);
    for (let x = 0; x < BAY; x += PANEL) {
      const cx = Math.round(x * px);
      g.fillStyle = '#161e27';
      g.fillRect(cx, 0, 1, plinth);
      g.fillStyle = '#0b1016';
      g.fillRect(cx + 1, 0, 1, plinth);
    }
    for (const y of GIRTS) {
      g.fillStyle = '#18202a';
      g.fillRect(0, row(y) - 1, W, 1);
      g.fillStyle = '#0a0e13';
      g.fillRect(0, row(y), W, 3);
    }
    g.fillStyle = '#151b21';
    g.fillRect(0, plinth, W, H - plinth);
    g.fillStyle = '#1d252e';
    g.fillRect(0, plinth, W, 2);
    const top = (HALL.roof - BAND[1]) * py;
    const bottom = (HALL.roof - BAND[0]) * py;
    // two windows a bay, each three lights across and two high
    for (const [x0, x1] of [
      [0.55, 2.8],
      [3.2, 5.45],
    ]) {
      const grad = g.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, '#4a5d6f');
      grad.addColorStop(1, '#2f3c48');
      g.fillStyle = grad;
      g.fillRect(x0 * px, top, (x1 - x0) * px, bottom - top);
      g.fillStyle = WALL_COLOR;
      for (let k = 1; k < 3; k++) g.fillRect((x0 + ((x1 - x0) * k) / 3) * px - 1.5, top, 3, bottom - top);
      g.fillRect(x0 * px, (top + bottom) / 2 - 1.5, (x1 - x0) * px, 3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    // the walls' u runs 0..1 over the full side wall (see Walls), so this
    // makes one repeat a bay
    tex.repeat.set(WALL_REPEAT, 1);
    return tex;
  }, []);
}

function Walls() {
  const windows = useWindowTexture();
  // the side walls run a little past the end wall, to a whole number of
  // bays from the entrance, so both of them line up with the trusses
  const length = HALL.front - (HALL.back - 0.9);
  const mid = HALL.front - length / 2;
  const y = HALL.floor + WALL_H / 2;

  // The end wall has no windows: at Contact the camera faces it close up,
  // and a row of them would sit right behind the heading. So the gate is the
  // only light in it. It still shares the side walls' material (one draw
  // call), with every uv pinned to a plain stretch of the texture.
  const endWall = useMemo(() => {
    const geo = new THREE.PlaneGeometry(HALL.wall * 2, WALL_H);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...PLAIN_UV);
    return geo;
  }, []);

  // Over the entrance, the front wall closes the gap between the doorway's
  // header and the roof. It faces out, toward the camera as it comes in, so
  // from inside the hall it isn't drawn at all.
  const fasciaBottom = HEADER_Y + 0.225;
  const fascia = useMemo(() => {
    const geo = new THREE.PlaneGeometry(HALL.wall * 2, HALL.roof - fasciaBottom);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...PLAIN_UV);
    return geo;
  }, [fasciaBottom]);

  // painted colours as they are, so not tone-mapped; the haze still applies
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: windows, toneMapped: false }),
    [windows],
  );

  // drawn LATE (batch.jsx), after the columns and machines in front of them
  return (
    <group>
      {/* left wall faces +x, its u running down the hall from the entrance */}
      <mesh position={[-HALL.wall, y, mid]} rotation={[0, Math.PI / 2, 0]} material={material} renderOrder={LATE}>
        <planeGeometry args={[length, WALL_H]} />
      </mesh>
      {/* right wall faces -x, its u running up the hall from the far end */}
      <mesh position={[HALL.wall, y, mid]} rotation={[0, -Math.PI / 2, 0]} material={material} renderOrder={LATE}>
        <planeGeometry args={[length, WALL_H]} />
      </mesh>
      <mesh position={[0, y, HALL.back]} geometry={endWall} material={material} renderOrder={LATE} />
      <mesh
        position={[0, (fasciaBottom + HALL.roof) / 2, HALL.front]}
        geometry={fascia}
        material={material}
        renderOrder={LATE}
      />
    </group>
  );
}

// --- columns ------------------------------------------------------------
// Under each truss, a column each side from the floor up to it, with a knee
// brace into the truss. They used to be short struts hanging from the
// trusses and stopping in mid-air.
function Columns({ trusses }) {
  const h = 5.1 - HALL.floor;
  return (
    <group>
      {trusses
        .filter((z) => z > HALL.back)
        .map((z) =>
          [-1, 1].map((s) => (
            <group key={`${z}:${s}`}>
              <mesh position={[s * COLUMN_X, HALL.floor + h / 2, z]}>
                <boxGeometry args={[0.24, h, 0.24]} />
                <meshStandardMaterial {...frame} />
              </mesh>
              <mesh position={[s * (COLUMN_X - 0.6), 4.5, z]} rotation={[0, 0, s * (Math.PI / 4)]}>
                <boxGeometry args={[0.14, 1.7, 0.14]} />
                <meshStandardMaterial {...frame} />
              </mesh>
            </group>
          )),
        )}
    </group>
  );
}

// --- floor markings -----------------------------------------------------
// Painted lines: a walkway down each side by the columns, and a line across
// the floor under each zone's doorway.
const PAINT = SAFETY;
const LANE = [6.3, 7.7];

function FloorMarkings({ doors }) {
  const length = HALL.front - HALL.back;
  const mid = HALL.front - length / 2;
  return (
    <group position={[0, HALL.floor + 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {LANE.flatMap((x) => [-x, x]).map((x) => (
        // laid flat, the plane's y runs along -z
        <mesh key={x} position={[x, -mid, 0]}>
          <planeGeometry args={[0.09, length]} />
          <meshStandardMaterial {...PAINT} />
        </mesh>
      ))}
      {doors.map((z) => (
        <mesh key={z} position={[0, -z, 0]}>
          <planeGeometry args={[LANE[0] * 2, 0.12]} />
          <meshStandardMaterial {...PAINT} />
        </mesh>
      ))}
    </group>
  );
}

// Painted on the walkway each side, an arrow in every zone, a little ahead
// of its machine, pointing down the hall the way the data goes.
const ARROWS = [3, -13, -29, -45, -61];

function FlowArrows() {
  const x = (LANE[0] + LANE[1]) / 2;
  return (
    <group>
      {ARROWS.flatMap((z) =>
        [-1, 1].map((s) => (
          // laid flat, local y runs down the hall (-z)
          <group key={`${s}:${z}`} position={[s * x, HALL.floor + 0.026, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <planeGeometry args={[0.16, 0.6]} />
              <meshStandardMaterial {...PAINT} />
            </mesh>
            {/* the head: a triangle, its point down the hall */}
            <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
              <circleGeometry args={[0.3, 3]} />
              <meshStandardMaterial {...PAINT} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// --- zone doorways ----------------------------------------------------------
// Between each machine and the next, a heavier portal frame across the hall,
// with a lit strip in the next zone's colour along its header and a sign
// hanging from it with the zone's number and name. The camera passes under
// each one on its way to the next machine.
//
// The header sits above the roof trusses. The sign hangs just left of the
// line, which on a wide screen puts it right of the copy, and high above both
// camera paths, which keep to eye level. On a phone each stop holds a little
// short of the next doorway, where its sign is above the top of the screen
// (the portrait path in data.js). Both paths keep at least 2.5 units from
// every part of a doorway in view.
const HEADER_Y = 5.45;
const SIGN = { x: -0.8, y: 4.7, w: 2.2, h: 0.55 };
// The entrance's sign is seen from outside as the camera comes in, so it
// sits right of the line: clear of the copy on a wide screen, and of the
// photo in the top left of a phone's hero.
const ENTRANCE_SIGN_X = 1.6;

// All the signs drawn into one texture, a row each, so their faces share a
// material and merge into one draw call.
function useSignAtlas(zones) {
  const draw = useMemo(() => {
    const W = 512;
    const ROW = 128;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = ROW * zones.length;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const NUMBER_X = 76;
    const NAME_X = 150;
    const font = (px) => `500 ${px}px "DM Mono", ui-monospace, monospace`;
    const paint = () => {
      const g = c.getContext('2d');
      g.fillStyle = '#0a0f15';
      g.fillRect(0, 0, c.width, c.height);
      g.textBaseline = 'middle';
      if ('letterSpacing' in g) g.letterSpacing = '3px';
      // one size for every sign: the largest at which the longest name still
      // fits, whichever font actually drew it
      const names = zones.map((i) => ZONE_NAMES[i].toUpperCase());
      let px = 50;
      for (; px > 24; px -= 2) {
        g.font = font(px);
        if (names.every((n) => g.measureText(n).width <= W - NAME_X - 28)) break;
      }
      zones.forEach((i, r) => {
        const y = r * ROW + ROW / 2;
        g.fillStyle = ZONE_COLORS[i];
        g.fillRect(30, y - 12, 24, 24);
        g.fillText(String(i + 1).padStart(2, '0'), NUMBER_X, y + 2);
        g.fillStyle = '#9fb0bd';
        g.fillText(names[r], NAME_X, y + 2);
      });
      tex.needsUpdate = true;
    };
    return { tex, paint };
  }, [zones]);

  // Drawn at once with whatever font is ready, then again once DM Mono has
  // loaded (the page itself uses it, so that's usually immediate).
  useLayoutEffect(() => {
    draw.paint();
    let live = true;
    document.fonts?.load('500 50px "DM Mono"').then(() => live && draw.paint(), () => {});
    return () => {
      live = false;
    };
  }, [draw]);
  return draw.tex;
}

function ZoneDoors({ doors }) {
  const zones = useMemo(() => doors.map((d) => d.zone), [doors]);
  const atlas = useSignAtlas(zones);

  // each sign face takes its own row of the atlas
  const faces = useMemo(
    () =>
      zones.map((_, r) => {
        const geo = new THREE.PlaneGeometry(SIGN.w, SIGN.h);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (r + 1) / zones.length + uv.getY(i) / zones.length);
        return geo;
      }),
    [zones],
  );
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false }), [atlas]);

  return (
    <group>
      {doors.map((d, k) => (
        <group key={d.z} position={[0, 0, d.z]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * COLUMN_X, (HALL.floor + HEADER_Y + 0.2) / 2, 0]}>
              <boxGeometry args={[0.36, HEADER_Y + 0.2 - HALL.floor, 0.36]} />
              <meshStandardMaterial {...frame} />
            </mesh>
          ))}
          <mesh position={[0, HEADER_Y, 0]}>
            <boxGeometry args={[COLUMN_X * 2 + 0.36, 0.45, 0.4]} />
            <meshStandardMaterial {...frame} />
          </mesh>
          {/* the sign: on two hangers from the header inside the hall, or
              fixed to the header's face over the entrance */}
          {!d.mounted &&
            [-0.9, 0.9].map((dx) => (
              <mesh key={dx} position={[SIGN.x + dx, (SIGN.y + SIGN.h / 2 + HEADER_Y - 0.225) / 2 + 0.03, 0]}>
                <boxGeometry args={[0.04, HEADER_Y - 0.225 - SIGN.y - SIGN.h / 2 + 0.06, 0.04]} />
                <meshStandardMaterial {...frame} />
              </mesh>
            ))}
          {/* the sign's backing is in the frame's steel, so it joins the
              frame's draw call */}
          <group position={d.mounted ? [ENTRANCE_SIGN_X, HEADER_Y, 0.23] : [SIGN.x, SIGN.y, 0]}>
            <mesh>
              <boxGeometry args={[SIGN.w + 0.16, SIGN.h + 0.12, 0.06]} />
              <meshStandardMaterial {...frame} />
            </mesh>
            <mesh position={[0, 0, 0.032]} geometry={faces[k]} material={face} />
          </group>
        </group>
      ))}
    </group>
  );
}

// --- light strips -------------------------------------------------------
// Every lit strip in the hall, in one instanced mesh (one draw call; the
// batch leaves coloured instances alone): one under each roof truss, tinted
// toward its zone's colour from the old steel blue, and one along the front
// of each doorway's header in the colour of the zone it opens into.
const STRIP = new THREE.Color('#3f5666');
const STRIP_TINT = 0.55;
const zoneAt = (z) => Math.min(ZONE_COLORS.length - 1, Math.max(0, Math.round(-z / STATION_GAP)));

function LitStrips({ trusses, doors }) {
  const ref = useRef();
  const count = trusses.length + doors.length;
  useLayoutEffect(() => {
    const mesh = ref.current;
    const m = new THREE.Matrix4();
    const at = new THREE.Vector3();
    const size = new THREE.Vector3();
    const still = new THREE.Quaternion();
    const color = new THREE.Color();
    let k = 0;
    for (const z of trusses) {
      m.compose(at.set(0, 4.94, z), still, size.set(3.4, 0.05, 0.34));
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k++, color.copy(STRIP).lerp(new THREE.Color(ZONE_COLORS[zoneAt(z)]), STRIP_TINT));
    }
    for (const d of doors) {
      m.compose(at.set(0, HEADER_Y - 0.2, d.z + 0.21), still, size.set(COLUMN_X * 2, 0.045, 0.02));
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k++, color.set(ZONE_COLORS[d.zone]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [trusses, doors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// The fittings the truss strips sit in: a steel housing fixed to the
// underside of the truss, with a lip down each long side and an end cap, so
// each strip reads as a lamp hung from the roof rather than a lit bar in
// the air. The housing fills the gap between the strip and the truss.
const FITTING = { w: 3.5, d: 0.42 };
const fitting = steel('steel', { roughness: 0.4 });

function StripFittings({ trusses }) {
  const top = 5.1 - 0.065; // the trusses' underside (Facility in scene/Scene.jsx)
  const stripTop = 4.94 + 0.025;
  return (
    <group>
      {trusses.filter((z) => z > HALL.back).map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, (top + stripTop) / 2, 0]}>
            <boxGeometry args={[FITTING.w, top - stripTop, FITTING.d]} />
            <meshStandardMaterial {...fitting} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`lip${s}`} position={[0, 4.95, (s * (FITTING.d - 0.02)) / 2]}>
              <boxGeometry args={[FITTING.w, 0.06, 0.02]} />
              <meshStandardMaterial {...fitting} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={`end${s}`} position={[(s * (FITTING.w - 0.02)) / 2, 4.96, 0]}>
              <boxGeometry args={[0.02, 0.08, FITTING.d]} />
              <meshStandardMaterial {...fitting} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// --- intake duct ------------------------------------------------------------
// The raw data's way in (DUCT in services.js). Outside, a louvred intake on
// the wall over the entrance, lit amber inside, which the camera sees as it
// pushes in. Inside, a round duct through the wall and down the middle of
// the roof, on a saddle over each truss it crosses, then an elbow and a drop
// into the collar on the silo's head. A sight glass on the drop, lit like
// the intake, faces the camera at the hero.
const TRUSS_TOP = 5.165; // the roof trusses (Facility in scene/Scene.jsx)
const TRUSS_BOTTOM = 5.035;
const duct = steel('steel', { roughness: 0.36 });
const glow = { color: PALETTE.amber, emissive: PALETTE.amber, emissiveIntensity: 0.85, toneMapped: false };
// left of the middle, so the hood clears the entrance's sign
const HOOD_X = -0.05;

function Flange({ radius, ...props }) {
  return (
    <mesh {...props}>
      <torusGeometry args={[radius + 0.012, 0.028, 6, 24]} />
      <meshStandardMaterial {...frame} />
    </mesh>
  );
}

function IntakeDuct({ trusses }) {
  const { radius: r, y, wall, bend, foot } = DUCT;
  const start = wall + 0.03; // in the sleeve, behind the intake's lit back
  const run = start - bend;
  const drop = y - bend - foot;
  const saddles = trusses.filter((z) => z < wall && z > bend);
  return (
    <group>
      {/* the run along the roof, the elbow over the silo, the drop into it */}
      <mesh position={[0, y, start - run / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, run, 20, 1, true]} />
        <meshStandardMaterial {...duct} />
      </mesh>
      <mesh position={[0, y - bend, bend]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[bend, r, 12, 10, Math.PI / 2]} />
        <meshStandardMaterial {...duct} />
      </mesh>
      <mesh position={[0, foot + drop / 2, 0]}>
        <cylinderGeometry args={[r, r, drop, 20, 1, true]} />
        <meshStandardMaterial {...duct} />
      </mesh>

      {/* bolted joints, two of them hiding the seams at the elbow */}
      {[wall - 0.35, 10.5, 7, 3.5, bend].map((z) => (
        <Flange key={z} radius={r} position={[0, y, z]} />
      ))}
      {[y - bend, 5.15].map((fy) => (
        <Flange key={fy} radius={r} position={[0, fy, 0]} rotation={[Math.PI / 2, 0, 0]} />
      ))}

      {/* a saddle on each truss it crosses, and a strap over it */}
      {saddles.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, (TRUSS_TOP + y - r) / 2, 0]}>
            <boxGeometry args={[0.07, y - r - TRUSS_TOP, 0.07]} />
            <meshStandardMaterial {...frame} />
          </mesh>
          <mesh position={[0, y - r - 0.015, 0]}>
            <boxGeometry args={[0.34, 0.03, 0.12]} />
            <meshStandardMaterial {...frame} />
          </mesh>
          <mesh position={[0, y, 0]}>
            <torusGeometry args={[r + 0.01, 0.018, 6, 24]} />
            <meshStandardMaterial {...frame} />
          </mesh>
        </group>
      ))}

      {/* the sleeve where it goes through the wall */}
      <mesh position={[0, y, wall]}>
        <boxGeometry args={[0.62, 0.62, 0.1]} />
        <meshStandardMaterial {...frame} />
      </mesh>

      {/* the intake outside: a louvred box on the wall, lit amber inside,
          its blades slanted down against the rain, under a cap. It faces the
          camera coming in, which sees the glow between the blades. */}
      <group position={[HOOD_X, y + 0.02, wall]}>
        {/* the box: a back, a top, a bottom and two cheeks */}
        {[
          [0, 0.265, 0.2, 0.72, 0.03, 0.4],
          [0, -0.265, 0.2, 0.72, 0.03, 0.4],
          [-0.345, 0, 0.2, 0.03, 0.56, 0.4],
          [0.345, 0, 0.2, 0.03, 0.56, 0.4],
        ].map(([bx, by, bz, w, h, d], i) => (
          <mesh key={i} position={[bx, by, bz]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial {...frame} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.66, 0.5]} />
          <meshStandardMaterial {...glow} />
        </mesh>
        {[-0.17, -0.06, 0.05, 0.16].map((by) => (
          <mesh key={by} position={[0, by, 0.34]} rotation={[0.7, 0, 0]}>
            <boxGeometry args={[0.66, 0.012, 0.13]} />
            <meshStandardMaterial {...frame} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0.24]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.82, 0.035, 0.5]} />
          <meshStandardMaterial {...frame} />
        </mesh>
      </group>

      {/* the sight glass on the drop, above the collar */}
      <group position={[0, foot + 0.41, r]}>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.15, 0.32, 0.05]} />
          <meshStandardMaterial {...frame} />
        </mesh>
        <mesh position={[0, 0, 0.047]}>
          <planeGeometry args={[0.09, 0.24]} />
          <meshStandardMaterial {...glow} />
        </mesh>
      </group>
    </group>
  );
}

// --- cable tray -------------------------------------------------------------
// The control room's wiring (TRAY and TAPS in services.js). A ladder tray on
// a trapeze hanger under each truss it passes, from over the silo to the end
// wall, where it's fixed, with the cables laid along it. From it a cable
// drops to the junction box on each machine, and the control room's own
// cables rise into it from the box on its valance. Every drop leaves the
// tray straight down and goes into its box straight down, like a cable
// through a gland.
const trayMetal = steel('light', { roughness: 0.45 });
const cable = { color: '#1c2229', metalness: 0.15, roughness: 0.75 };
const RUNG = 0.5;

function useInstances(ref, matrices) {
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [ref, matrices]);
}

function CableTray({ trusses }) {
  const { x, y, width: w, from, to } = TRAY;
  const length = from - to;
  const mid = (from + to) / 2;

  const { rungs, rods, bars } = useMemo(() => {
    const at = (px, py, pz) => new THREE.Matrix4().makeTranslation(px, py, pz);
    const out = { rungs: [], rods: [], bars: [] };
    for (let z = from - RUNG / 2; z > to; z -= RUNG) out.rungs.push(at(x, y + 0.01, z));
    // a trapeze under each truss: a bar under the tray, a rod each side up
    for (const z of trusses.filter((t) => t <= from && t > to)) {
      out.bars.push(at(x, y - 0.015, z));
      for (const s of [-1, 1]) out.rods.push(at(x + s * (w / 2 + 0.07), (y - 0.03 + TRUSS_BOTTOM) / 2, z));
    }
    return out;
  }, [trusses, x, y, w, from, to]);
  const rungRef = useRef();
  const rodRef = useRef();
  const barRef = useRef();
  useInstances(rungRef, rungs);
  useInstances(rodRef, rods);
  useInstances(barRef, bars);

  // a drop from the tray down into each machine's box
  const drops = useMemo(
    () =>
      TAPS.filter((t) => !t.riser).map((t) => {
        const [bx, by, bz] = t.box;
        const end = new THREE.Vector3(bx, by + t.size[1] / 2 + 0.04, bz); // inside the gland
        const start = new THREE.Vector3(x, y - 0.01, t.leave ?? bz);
        const slack = new THREE.Vector3().lerpVectors(start, end, 0.55);
        slack.y -= 0.12;
        const curve = new THREE.CatmullRomCurve3(
          [start, new THREE.Vector3(start.x, start.y - 0.3, start.z), slack, new THREE.Vector3(end.x, end.y + 0.3, end.z), end],
          false,
          'centripetal',
        );
        return new THREE.TubeGeometry(curve, 40, 0.04, 8, false);
      }),
    [x, y],
  );

  const riser = TAPS.find((t) => t.riser);
  const riserFoot = riser.box[1] + riser.size[1] / 2;

  return (
    <group>
      {/* the side rails, and the rungs between them */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[x + (s * w) / 2, y + 0.05, mid]}>
          <boxGeometry args={[0.025, 0.1, length]} />
          <meshStandardMaterial {...trayMetal} />
        </mesh>
      ))}
      <instancedMesh ref={rungRef} args={[undefined, undefined, rungs.length]}>
        <boxGeometry args={[w, 0.02, 0.04]} />
        <meshStandardMaterial {...trayMetal} />
      </instancedMesh>
      {/* an end plate over the silo, and the bracket that fixes it to the end wall */}
      <mesh position={[x, y + 0.05, from]}>
        <boxGeometry args={[w, 0.1, 0.02]} />
        <meshStandardMaterial {...trayMetal} />
      </mesh>
      <mesh position={[x, y + 0.05, HALL.back + 0.06]}>
        <boxGeometry args={[w + 0.2, 0.24, 0.12]} />
        <meshStandardMaterial {...frame} />
      </mesh>

      {/* the trapeze hangers */}
      <instancedMesh ref={barRef} args={[undefined, undefined, bars.length]}>
        <boxGeometry args={[w + 0.2, 0.03, 0.05]} />
        <meshStandardMaterial {...frame} />
      </instancedMesh>
      <instancedMesh ref={rodRef} args={[undefined, undefined, rods.length]}>
        <boxGeometry args={[0.02, TRUSS_BOTTOM - (y - 0.03), 0.02]} />
        <meshStandardMaterial {...frame} />
      </instancedMesh>

      {/* the cables laid along it */}
      {[-0.1, 0, 0.1].map((dx) => (
        <mesh key={dx} position={[x + dx, y + 0.045, mid]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, length, 6, 1, true]} />
          <meshStandardMaterial {...cable} />
        </mesh>
      ))}

      {/* down to each machine */}
      {drops.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial {...cable} />
        </mesh>
      ))}

      {/* and up from the control room */}
      {[-0.12, 0, 0.12].map((dx) => (
        <mesh key={dx} position={[riser.box[0] + dx, (riserFoot + y) / 2, riser.box[2]]}>
          <cylinderGeometry args={[0.035, 0.035, y - riserFoot, 8]} />
          <meshStandardMaterial {...cable} />
        </mesh>
      ))}
    </group>
  );
}

// --- roof purlins -------------------------------------------------------------
// The beams that carry the roof from truss to truss: three a side, on the
// trusses' top chords the length of the hall, from the entrance's header to
// the end wall. Clear of the duct down the middle.
const PURLINS = [-6.9, -4.6, -2.2, 2.2, 4.6, 6.9];

function Purlins() {
  const length = HALL.front - HALL.back;
  const mid = HALL.front - length / 2;
  return (
    <group>
      {PURLINS.map((x) => (
        <mesh key={x} position={[x, TRUSS_TOP + 0.06, mid]}>
          <boxGeometry args={[0.08, 0.12, length]} />
          <meshStandardMaterial {...frame} />
        </mesh>
      ))}
    </group>
  );
}

// --- services along the walls -----------------------------------------------
// A pipe and a conduit down each side wall under the windows, behind the
// columns, on a bracket in every bay. They start at the entrance end of the
// wall with a capped end and run into the end wall. Every other bay, on
// alternate sides, an electrical panel at head height with its feed run up
// the wall into the conduit.
const PIPE = { y: 2.95, r: 0.055, out: 0.16 };
const CONDUIT = { y: 2.62, r: 0.03, out: 0.1 };
const SERVICE_FROM = HALL.front - 0.4;
const pipeMetal = steel('steel', { roughness: 0.38 });
const PANEL_BOX = { y: 0.35, w: 0.52, h: 0.78, d: 0.14 };

function WallServices({ trusses }) {
  const length = SERVICE_FROM - HALL.back;
  const mid = SERVICE_FROM - length / 2;
  // a bracket halfway between each pair of columns, from the bay inside the
  // entrance to the last before the end wall
  const bays = trusses.map((z) => z + BAY / 2).filter((z) => z < SERVICE_FROM && z > HALL.back);
  return (
    <group>
      {[-1, 1].map((s) => {
        const at = (out) => s * (HALL.wall - out);
        return (
          <group key={s}>
            {[PIPE, CONDUIT].map((p) => (
              <group key={p.y}>
                <mesh position={[at(p.out), p.y, mid]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[p.r, p.r, length, 10, 1, true]} />
                  <meshStandardMaterial {...(p === PIPE ? pipeMetal : cable)} />
                </mesh>
                {/* the capped end at the entrance */}
                <mesh position={[at(p.out), p.y, SERVICE_FROM]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[p.r * 1.3, p.r * 1.3, 0.04, 10]} />
                  <meshStandardMaterial {...frame} />
                </mesh>
              </group>
            ))}
            {bays.map((z) => (
              <group key={z} position={[0, 0, z]}>
                {/* a plate on the wall, an arm under each line */}
                <mesh position={[at(0.012), (PIPE.y + CONDUIT.y) / 2, 0]}>
                  <boxGeometry args={[0.024, PIPE.y - CONDUIT.y + 0.2, 0.06]} />
                  <meshStandardMaterial {...frame} />
                </mesh>
                {[PIPE, CONDUIT].map((p) => (
                  <mesh key={p.y} position={[at((p.out + p.r) / 2), p.y - p.r - 0.012, 0]}>
                    <boxGeometry args={[p.out + p.r, 0.024, 0.05]} />
                    <meshStandardMaterial {...frame} />
                  </mesh>
                ))}
              </group>
            ))}
            {bays
              .filter((_, i) => i % 2 === (s < 0 ? 0 : 1))
              .map((z) => (
                <group key={z} position={[at(PANEL_BOX.d / 2), PANEL_BOX.y, z]}>
                  <mesh>
                    <boxGeometry args={[PANEL_BOX.d, PANEL_BOX.h, PANEL_BOX.w]} />
                    <meshStandardMaterial {...cast('dark', { roughness: 0.6 })} />
                  </mesh>
                  {/* its door's seam and handle, facing into the hall */}
                  <mesh position={[-s * (PANEL_BOX.d / 2 + 0.003), 0, 0]}>
                    <boxGeometry args={[0.006, PANEL_BOX.h - 0.08, 0.008]} />
                    <meshStandardMaterial {...frame} />
                  </mesh>
                  <mesh position={[-s * (PANEL_BOX.d / 2 + 0.01), 0.02, 0.1]}>
                    <boxGeometry args={[0.02, 0.12, 0.025]} />
                    <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
                  </mesh>
                  <mesh position={[-s * (PANEL_BOX.d / 2 + 0.004), PANEL_BOX.h / 2 - 0.07, -PANEL_BOX.w / 2 + 0.07]}>
                    <sphereGeometry args={[0.018, 8, 6]} />
                    <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
                  </mesh>
                  {/* the feed, up the wall into the conduit */}
                  <mesh position={[s * (PANEL_BOX.d / 2 - CONDUIT.out), (PANEL_BOX.h / 2 + CONDUIT.y - PANEL_BOX.y) / 2, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, CONDUIT.y - PANEL_BOX.y - PANEL_BOX.h / 2, 8]} />
                    <meshStandardMaterial {...cable} />
                  </mesh>
                </group>
              ))}
          </group>
        );
      })}
    </group>
  );
}

// --- exit doors ---------------------------------------------------------------
// A personnel door in each side wall here and there, in a framed opening,
// with a push bar and its green exit sign lit over it. In bays without an
// electrical panel on that side (WallServices) and clear of the doorways.
const EXITS = [
  { side: -1, z: -19 },
  { side: -1, z: -43 },
  { side: 1, z: -13 },
  { side: 1, z: -49 },
];
const EXIT = { w: 0.95, h: 2.1 };

function ExitDoors() {
  return (
    <group>
      {EXITS.map(({ side: s, z }) => {
        const at = (out) => s * (HALL.wall - out);
        const top = HALL.floor + EXIT.h;
        return (
          <group key={`${s}:${z}`}>
            {/* the frame: two jambs and a head */}
            {[-1, 1].map((e) => (
              <mesh key={e} position={[at(0.04), HALL.floor + EXIT.h / 2, z + e * (EXIT.w / 2 + 0.04)]}>
                <boxGeometry args={[0.08, EXIT.h, 0.08]} />
                <meshStandardMaterial {...frame} />
              </mesh>
            ))}
            <mesh position={[at(0.04), top + 0.04, z]}>
              <boxGeometry args={[0.08, 0.08, EXIT.w + 0.16]} />
              <meshStandardMaterial {...frame} />
            </mesh>
            {/* the door and its push bar */}
            <mesh position={[at(0.02), HALL.floor + EXIT.h / 2, z]}>
              <boxGeometry args={[0.03, EXIT.h, EXIT.w]} />
              <meshStandardMaterial color="#25303a" metalness={0.4} roughness={0.55} />
            </mesh>
            <mesh position={[at(0.05), HALL.floor + 1.0, z]}>
              <boxGeometry args={[0.03, 0.05, EXIT.w * 0.75]} />
              <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
            </mesh>
            {/* the exit sign over it */}
            <mesh position={[at(0.05), top + 0.3, z]}>
              <boxGeometry args={[0.08, 0.2, 0.42]} />
              <meshStandardMaterial {...frame} />
            </mesh>
            <mesh position={[at(0.095), top + 0.3, z]}>
              <boxGeometry args={[0.004, 0.15, 0.36]} />
              <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- column feet --------------------------------------------------------------
// Where each column stands on the floor: a base plate with an anchor bolt at
// each corner, and its foot painted in two bands of safety ochre, as columns
// along a forklift lane are. `columns` are the hall's and the doorways'.
const FOOT_BANDS = [
  [0.06, 0.3],
  [0.46, 0.18],
]; // [from the floor, how tall]

function ColumnFeet({ columns }) {
  const bolts = useMemo(
    () =>
      columns.flatMap((c) =>
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz]) => {
          const o = c.size / 2 + 0.07;
          return new THREE.Matrix4().makeTranslation(c.x + sx * o, HALL.floor + 0.05, c.z + sz * o);
        }),
      ),
    [columns],
  );
  const ref = useRef();
  useInstances(ref, bolts);
  return (
    <group>
      {columns.map((c) => (
        <group key={`${c.x}:${c.z}`} position={[c.x, HALL.floor, c.z]}>
          <mesh position={[0, 0.0175, 0]}>
            <boxGeometry args={[c.size + 0.24, 0.035, c.size + 0.24]} />
            <meshStandardMaterial {...frame} />
          </mesh>
          {FOOT_BANDS.map(([from, tall]) => (
            <mesh key={from} position={[0, from + tall / 2, 0]}>
              <boxGeometry args={[c.size + 0.012, tall, c.size + 0.012]} />
              <meshStandardMaterial {...SAFETY} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, bolts.length]}>
        <cylinderGeometry args={[0.022, 0.022, 0.03, 6]} />
        <meshStandardMaterial {...steel('light', { roughness: 0.35 })} />
      </instancedMesh>
    </group>
  );
}

// The entrance, into the intake, with its sign fixed over the opening where
// the camera sees it on the way in. Then a doorway halfway between each
// machine and the next, its sign hanging inside.
const DOORS = [
  { z: HALL.front, zone: 0, mounted: true },
  ...[1, 2, 3, 4].map((zone) => ({ z: -(zone - 0.5) * STATION_GAP, zone })),
];
const DOOR_LINES = DOORS.map((d) => d.z);

// every column in the hall, the doorways' heavier ones where both stand
function useColumns(trusses) {
  return useMemo(() => {
    const at = new Map();
    const add = (z, size) => [-1, 1].forEach((s) => at.set(`${s}:${z}`, { x: s * COLUMN_X, z, size }));
    trusses.filter((z) => z > HALL.back).forEach((z) => add(z, 0.24));
    DOORS.forEach((d) => add(d.z, 0.36));
    return [...at.values()];
  }, [trusses]);
}

export function Hall({ trusses }) {
  const columns = useColumns(trusses);
  return (
    <group>
      <Walls />
      <Columns trusses={trusses} />
      <ColumnFeet columns={columns} />
      <FloorMarkings doors={DOOR_LINES} />
      <FlowArrows />
      <ZoneDoors doors={DOORS} />
      <LitStrips trusses={trusses} doors={DOORS} />
      <StripFittings trusses={trusses} />
      <Purlins />
      <WallServices trusses={trusses} />
      <ExitDoors />
      <IntakeDuct trusses={trusses} />
      <CableTray trusses={trusses} />
    </group>
  );
}
