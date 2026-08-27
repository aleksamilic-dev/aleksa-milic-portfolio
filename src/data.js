// ---------------------------------------------------------------------------
// Single source of truth: portfolio content + the ambient scene's layout.
//
// Text marked `TODO —` is scaffolding. Replace every one with a real specific
// before this goes in front of a recruiter — especially outcomes, employers,
// dates, and links. Nothing here should be guessed at in an interview.
// ---------------------------------------------------------------------------

export const PALETTE = {
  void: '#080b10',
  steelDark: '#19222c',
  steel: '#2c3a47',
  steelLight: '#485c6a',
  blue: '#4d9fd6',
  blueDeep: '#2f6f9c',
  blueBright: '#9ad7f5',
  amber: '#ff9d4d',
  amberBright: '#ffc794',
  amberDeep: '#b1541c',
  green: '#5fd39a',
  ink: '#eef3f7',
  inkMute: '#9fb2bf',
  inkFaint: '#5d7280',
};

// --- who ----------------------------------------------------------------
export const HERO = {
  name: 'Aleksa Milić',
  role: 'Data Engineer',
  location: 'Niš, Serbia',
  value:
    'I build and run data platforms — dependable pipelines, modelled storage, and the dashboards teams actually make decisions from.',
  tagline: 'Raw in. Value out.',
  ctas: [
    { label: 'See selected work', to: 'work', primary: true },
    { label: 'Get in touch', to: 'contact' },
  ],
};

export const ABOUT =
  'TODO — 2–3 plain sentences: your background, the kind of problems you like ' +
  'working on, and what you want next. No factory metaphors. Example shape: ' +
  '“I’ve spent N years building data platforms on Azure and Databricks, mostly ' +
  'for <industry>. I care about pipelines that fail loudly and models analysts ' +
  'can trust. I’m looking for a <role type> role, remote or in Niš.”';

// --- selected work ----------------------------------------------------
// Keep this to your 3 strongest. Each entry: what it was, your role, the
// stack, and a concrete outcome. Lead with the outcome.
//
// `image` is the visual that sits to the right of the text — a dashboard
// screenshot, architecture diagram, etc. Drop a file in src/assets/, import
// it at the top of this file, and set `image` to the import. Until then the
// slot shows a placeholder.
export const PROJECTS = [
  {
    id: 'radar',
    title: 'Niš Urban Development Radar',
    year: '2024',
    context:
      'A public dashboard tracking construction permits and urban development across the city, built from open municipal data.',
    role: 'Sole engineer — ingestion, data model, and the published dashboard.',
    stack: ['Python', 'Azure Data Factory', 'PostgreSQL', 'dbt', 'Power BI'],
    outcome:
      'TODO — the measurable result. e.g. “Merged 6 disconnected registries into one daily-refreshed model; used by <N> planners / <N> monthly visitors.”',
    href: '', // TODO — case study or repo link
    image: null, // TODO — import a dashboard screenshot and set it here
    imageAlt: 'Niš Urban Development Radar dashboard',
  },
  {
    id: 'project-2',
    title: 'TODO — Project two',
    year: 'YYYY',
    context:
      'TODO — one sentence: what the system was and which business problem it solved.',
    role: 'TODO — your specific responsibility (e.g. “Led the migration, 2-person team”).',
    stack: ['Databricks', 'Apache Spark', 'Delta Lake'],
    outcome:
      'TODO — the concrete result, with a number where you have one (cost, time saved, reliability, adoption).',
    href: '',
    image: null, // TODO — screenshot / diagram
    imageAlt: '',
  },
  {
    id: 'project-3',
    title: 'TODO — Project three',
    year: 'YYYY',
    context: 'TODO — one sentence of context.',
    role: 'TODO — your role.',
    stack: ['Microsoft Fabric', 'SQL', 'Power BI'],
    outcome: 'TODO — the result.',
    href: '',
    image: null, // TODO — screenshot / diagram
    imageAlt: '',
  },
];

// --- experience ------------------------------------------------------
export const EXPERIENCE = [
  {
    role: 'TODO — Job title',
    org: 'TODO — Company',
    period: 'YYYY — Present',
    points: [
      'TODO — what you own day to day: systems, data volume, team size.',
      'TODO — one shipped result you’re proud of.',
    ],
  },
  {
    role: 'TODO — Previous title',
    org: 'TODO — Company',
    period: 'YYYY — YYYY',
    points: ['TODO — scope, and a result.'],
  },
];

// --- skills ---------------------------------------------------------
// Confirm each line is something you’d be comfortable being questioned on.
export const SKILLS = [
  {
    group: 'Ingestion & orchestration',
    items: ['Azure Data Factory', 'Python', 'REST / CDC', 'Airflow'],
  },
  {
    group: 'Processing',
    items: ['Apache Spark', 'Databricks', 'Microsoft Fabric', 'SQL'],
  },
  {
    group: 'Storage & modelling',
    items: ['Delta Lake', 'Medallion architecture', 'dbt', 'Unity Catalog'],
  },
  {
    group: 'Serving & BI',
    items: ['Power BI', 'Apache Superset', 'Semantic models'],
  },
];

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/', icon: 'github' }, // TODO — real profile URL
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: 'linkedin' }, // TODO
  { label: 'Email', href: 'mailto:you@example.com', icon: 'mail' }, // TODO
];

export const CONTACT = {
  email: 'you@example.com', // TODO — real address
  blurb:
    'Open to data engineering roles — remote, or on-site in Niš. Email is the quickest way to reach me.',
};

// Section order — drives the nav panel and the progress rail.
export const SECTIONS = [
  { id: 'hero', num: '01', nav: 'Top' },
  { id: 'work', num: '02', nav: 'Selected work' },
  { id: 'skills', num: '03', nav: 'Skills & experience' },
  { id: 'contact', num: '04', nav: 'Contact' },
];

// ---------------------------------------------------------------------------
// Ambient scene layout — the "factory" that sits dim and mostly still behind
// the content. No longer a tour: the camera holds near the entrance.
// ---------------------------------------------------------------------------

// Distance between consecutive machines along -Z.
export const STATION_GAP = 16;

// The central conveyor "spine" that threads the machines together.
export const SPINE = { startZ: 8, endZ: -72, y: 0.34 };

// The five machines, front to back. Only the front few are ever in frame;
// the rest sit past the fog and exist so the corridor has depth.
export const MACHINES = [
  { id: '01', side: 'right' },
  { id: '02', side: 'left' },
  { id: '03', side: 'left' },
  { id: '04', side: 'left' },
  { id: '05', side: 'left' },
].map((m, i) => ({ ...m, index: i, z: -i * STATION_GAP }));

// Camera path. On load it eases WIDE -> keyframe 0 (the push-in). After that
// it glides slowly down the corridor as you scroll — one keyframe per beat,
// interpolated by `progress` and heavily damped, so each machine drifts past
// behind the copy in turn. Deliberately languid, not a tour.
export const CAMERA_WIDE = { pos: [-3.6, 4.4, 18.5], look: [-1.3, 0.9, -6] };

// Keyframe 0 frames the hero (machinery low and right of the copy). From
// there the camera pans left as it descends, so from the work section on
// the machinery sits in the right ~40% of the screen — clear of the text
// column and behind where the project visuals go.
export const CAMERA_KEYFRAMES = [
  { pos: [-2.7, 3.3, 11.2], look: [-1.7, 0.5, -5.5] }, // hero    · ingestion  (z 0)
  { pos: [-1.4, 2.4, -3.0], look: [-4.8, 1.1, -16] }, //  work    · processing (z -16)
  { pos: [-2.4, 2.3, -19], look: [-5.1, 1.3, -33] }, //   skills  · storage    (z -32)
  { pos: [-1.6, 2.2, -34], look: [-4.7, 1.4, -48] }, //   skills  · control    (z -48)
  { pos: [-2.2, 2.1, -50], look: [-4.6, 1.2, -63] }, //   contact · shipping   (z -64)
];
