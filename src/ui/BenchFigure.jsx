import { ExternalLink } from './icons.js';

// The benchmark's headline result as a graph: total time for the 8 queries at
// two data sizes, on a log scale, Spark against the in-process engines.
//
// It used to be an SVG file drawn 900 units wide and shown in a slot of 300
// to 430px, which put its labels on screen at about 5px. This one is drawn
// for the slot (a viewBox about as wide as the slot is in pixels) and inline,
// so its text is set in the page's own fonts and prerenders as real text.
// Every position is computed from the seconds in data.js.
//
// What it shows: each kind of engine is a band from its fastest setup to its
// slowest, with a line through one setup (DuckDB, and Spark's default). The
// bracket at each end is how many times longer that Spark line takes.

const W = 360;
const H = 348;
const X = [100, 268]; // the two data sizes
const TOP = 74; // plot top and bottom (log seconds)
const BOT = 296;
const GRID = [56, 338];

const secs = (s) => (s < 1 ? s.toFixed(2) : s.toFixed(1));

// A label set along a sloping edge, offset to one side of it.
function alongEdge(p0, p1, side, gap) {
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  // the edge's normal that points up the screen
  const up = [Math.sin(a), -Math.cos(a)];
  const k = side === 'above' ? gap : -gap;
  return {
    x: mid[0] + up[0] * k,
    y: mid[1] + up[1] * k,
    deg: (a * 180) / Math.PI,
  };
}

export default function BenchFigure({ bench, onReport }) {
  const { scales, engines, groups } = bench;
  const all = scales.flatMap((s) => Object.values(s.seconds));
  const lo = Math.log10(Math.min(...all) / 1.5);
  const hi = Math.log10(Math.max(...all) * 1.6);
  const y = (v) => BOT - ((Math.log10(v) - lo) / (hi - lo)) * (BOT - TOP);
  const ticks = [];
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) ticks.push(10 ** e);

  const shapes = groups.map((g) => {
    const ids = engines.filter((e) => e.group === g.id).map((e) => e.id);
    const range = scales.map((s) => {
      const v = ids.map((id) => s.seconds[id]);
      return [Math.min(...v), Math.max(...v)];
    });
    // the seconds of the engine the line follows, one per data size
    const vals = scales.map((s) => s.seconds[g.line]);
    return { ...g, range, vals };
  });
  // the slower kind sits above the faster one, so its label goes on its top
  // edge and the other's on its bottom edge
  const [fast, slow] = [...shapes].sort((a, b) => a.vals[0] - b.vals[0]);

  return (
    <figure className="project__figure bfig">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="bfig-title bfig-desc"
      >
        <title id="bfig-title">{bench.title}</title>
        <desc id="bfig-desc">
          {scales
            .map(
              (s) =>
                `${s.label}: ${slow.lineName} ${secs(s.seconds[slow.line])} s, ` +
                `${fast.lineName} ${secs(s.seconds[fast.line])} s`,
            )
            .join('. ')}
        </desc>

        <text className="bfig__title" x={GRID[0] - 8} y="24">
          {bench.title}
        </text>
        <text className="bfig__sub" x={GRID[0] - 8} y="43">
          {bench.unit}
        </text>

        {/* gridlines + tick labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line className="bfig__grid" x1={GRID[0]} x2={GRID[1]} y1={y(t)} y2={y(t)} />
            <text className="bfig__tick" x={GRID[0] - 8} y={y(t) + 4} textAnchor="end">
              {t >= 1 ? t : t.toFixed(1)} s
            </text>
          </g>
        ))}

        {/* the two kinds of engine: a band from fastest to slowest, a line
            through one setup */}
        {shapes.map((g) => (
          <g key={g.id} className={`bfig__group bfig__group--${g.id}`}>
            <polygon
              className="bfig__band"
              points={[
                [X[0], y(g.range[0][1])],
                [X[1], y(g.range[1][1])],
                [X[1], y(g.range[1][0])],
                [X[0], y(g.range[0][0])],
              ]
                .map((p) => p.join(','))
                .join(' ')}
            />
            <line
              className="bfig__line"
              x1={X[0]}
              y1={y(g.vals[0])}
              x2={X[1]}
              y2={y(g.vals[1])}
            />
            {g.vals.map((v, i) => (
              <circle key={i} className="bfig__dot" cx={X[i]} cy={y(v)} r="4.5">
                <title>{`${g.lineName}, ${scales[i].label}: ${secs(v)} s`}</title>
              </circle>
            ))}
          </g>
        ))}

        {/* direct labels, laid along each band's outer edge */}
        {[
          [slow, 'above', 1],
          [fast, 'below', 0],
        ].map(([g, side, edge]) => {
          const at = alongEdge(
            [X[0], y(g.range[0][edge])],
            [X[1], y(g.range[1][edge])],
            side,
            side === 'above' ? 8 : 18,
          );
          return (
            <text
              key={g.id}
              className="bfig__label"
              textAnchor="middle"
              transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${at.deg.toFixed(1)})`}
            >
              {g.label}
            </text>
          );
        })}

        {/* the gap at each size: how many times longer the slow line takes */}
        {scales.map((s, i) => {
          const a = y(s.seconds[slow.line]);
          const b = y(s.seconds[fast.line]);
          const left = i === 0;
          const bx = left ? X[0] - 22 : X[1] + 22;
          const tick = left ? 6 : -6;
          const ratio = s.seconds[slow.line] / s.seconds[fast.line];
          return (
            <g key={s.id} className="bfig__gap">
              <path d={`M${bx + tick} ${a} H${bx} V${b} H${bx + tick}`} />
              <text
                x={left ? bx - 7 : bx + 7}
                y={(a + b) / 2 + 5}
                textAnchor={left ? 'end' : 'start'}
              >
                {Math.round(ratio)}×
              </text>
            </g>
          );
        })}

        {/* data sizes */}
        {scales.map((s, i) => (
          <g key={s.id} className="bfig__x">
            <text x={X[i]} y="322" textAnchor="middle">
              {s.label}
            </text>
            <text className="bfig__x-sub" x={X[i]} y="339" textAnchor="middle">
              {s.size}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="bfig__cap">
        {bench.caption}{' '}
        <a href={bench.report} target="_blank" rel="noreferrer" onClick={onReport}>
          {bench.reportLabel} <ExternalLink size={12} />
        </a>
      </figcaption>

      {/* every number on the graph, for anyone not looking at it */}
      <table className="sr-only">
        <caption>{bench.title}, seconds</caption>
        <thead>
          <tr>
            <th scope="col">Engine</th>
            {scales.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {engines.map((e) => (
            <tr key={e.id}>
              <th scope="row">{e.name}</th>
              {scales.map((s) => (
                <td key={s.id}>{secs(s.seconds[e.id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
