import engineBenchmark from './assets/engine-benchmark.svg';

// ---------------------------------------------------------------------------
// Single source of truth: portfolio content + the ambient scene's layout.
//
// Hero, about, experience, skills, education, and certifications come from the
// CV, and all three projects are written up. Nothing here should be anything
// you couldn't be questioned on in an interview.
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
  inkFaint: '#5d7280',
};

// --- who ----------------------------------------------------------------
export const HERO = {
  name: 'Aleksa Milic',
  role: 'Data Engineer',
  location: 'Niš, Serbia',
  status: 'Open to work',
  value:
    'I build and run data platforms end to end: Spark and Azure Data Factory ' +
    'pipelines, warehouses that stay fast at billions of rows, and the CI/CD ' +
    'and infrastructure under them.',
  tagline: 'Raw in. Value out.',
  ctas: [
    { label: 'See selected work', to: 'work', primary: true },
    { label: 'Get in touch', to: 'contact' },
  ],
};

export const ABOUT =
  'I’m a data engineer with four years building pipelines and cloud ' +
  'data platforms across AWS, Azure, and GCP, mostly on Databricks and Azure ' +
  'Data Factory. Enough of my time has gone into DevOps (containers, CI/CD, ' +
  'infrastructure-as-code) that I can take a pipeline from ingestion to ' +
  'production without handing it off.';

// --- selected work ----------------------------------------------------
// Keep this to your 3 strongest. Each entry: what it was, your role, the
// stack, and a concrete outcome. Lead with the outcome.
//
// `image` is the visual that sits to the right of the text — a dashboard
// screenshot, architecture diagram, etc. Drop a file in src/assets/, import
// it at the top of this file, and set `image` to the import.
//
// `embed` replaces that slot with a live panel spanning the full row. A
// same-origin one posts its height back (see ProjectEmbed); mark a
// cross-origin one `external` for a fixed height, a click-to-activate shield,
// and a hand-off link below 1100px.
export const PROJECTS = [
  {
    id: 'project-1',
    title: 'Niš Urban Development Radar',
    year: '2026',
    context:
      'Construction activity in Niš from official Statistical Office open data: ' +
      'normalised and validated in Python, loaded into PostgreSQL, served as an ' +
      'Apache Superset dashboard.',
    role:
      'Solo. Ingestion and validation, the SQL schema and views, the dashboard ' +
      'as code, and the Dockerised deploy on one VM.',
    stack: ['Python', 'PostgreSQL', 'Apache Superset', 'Docker', 'Caddy'],
    outcome:
      'Reproducible from a clean clone. Sources are checksummed and gaps are ' +
      'never zero-filled. The panel below is a self-contained rebuild.',
    href: 'https://github.com/aleksamilic-dev/nis-urban-development-radar',
    image: null,
    imageAlt: '',
    embed: {
      src: '/nis-urban-development-radar.html',
      source: 'nis-radar',
      title: 'Live dashboard',
      repo: 'https://github.com/aleksamilic-dev/nis-urban-development-radar',
      repoLabel: 'Pipeline and methodology on GitHub',
      minHeight: 800,
    },
  },
  {
    id: 'project-2',
    title: 'When do you actually need a cluster?',
    year: '2026',
    context:
      'A reproducible TPC-H benchmark: Apache Spark (local, plus a real 2-worker ' +
      'cluster) against DuckDB, Polars and DataFusion on identical Parquet. How ' +
      'far does one machine get before a cluster earns its overhead?',
    role:
      'Solo. Engine adapters, the timing and memory harness, a cross-run ' +
      'correctness gate, the Dockerised cluster, CI, and the report generator.',
    stack: ['Apache Spark', 'DuckDB', 'Polars', 'DataFusion', 'Docker', 'TPC-H'],
    outcome:
      'The in-process engines finish ~10x faster than Spark at SF1 and SF10, and ' +
      'the gap holds as data grows. Every run gated on 96 correctness checks.',
    href: 'https://github.com/aleksamilic-dev/tpch-engine-benchmark',
    image: engineBenchmark,
    imageAlt: 'TPC-H workload time, log scale: in-process engines versus Spark, SF1 to SF10',
  },
  {
    id: 'project-3',
    title: 'Harvest Yield Warehouse',
    year: '2026',
    context:
      'A dimensional warehouse for a produce cooperative’s harvest deliveries: an ' +
      'operational feed modelled into a Kimball star schema with slowly-changing ' +
      'dimensions and a tested dbt layer.',
    role:
      'Solo. The data model, the dbt project, 65 data tests, CI, and the published ' +
      'lineage site. A rebuild of an old Oracle and Apache NiFi coursework mart.',
    stack: ['dbt', 'DuckDB', 'Kimball / SCD2', 'GitHub Actions', 'SQL'],
    outcome:
      'Rebuilds from a clean clone in one command. Every CI run is gated on 65 data ' +
      'tests. Model docs and the lineage graph deploy to GitHub Pages on each push.',
    href: 'https://github.com/aleksamilic-dev/harvest-yield-warehouse',
    image: null,
    imageAlt: '',
    embed: {
      // The project's own dbt docs, deep-linked past the landing page straight
      // onto the lineage graph (?g_v=1). Cross-origin, so there's no height
      // handshake — `external` gives it a fixed viewport and a click-to-activate
      // shield, without which a scroll down the page gets eaten by the graph's
      // own zoom.
      src: 'https://aleksamilic-dev.github.io/harvest-yield-warehouse/#!/overview?g_v=1',
      external: true,
      title: 'Lineage graph',
      // dbt fits the DAG to whatever viewport it's given, so an over-tall frame
      // doesn't show more graph — it shows the same graph with a band of empty
      // page colour under it, which is the one thing on this site that isn't
      // in the palette. Sized to what the graph actually fills.
      height: 'clamp(320px, 42vh, 430px)',
      // dbt's graph sits 20px inside its own page, so the docs article behind it
      // shows as a band around the frame and puts a scrollbar there that the
      // shield makes unusable. Oversize the frame by that much and clip it.
      inset: 20,
      activate: 'Click to explore the graph',
      repo: 'https://aleksamilic-dev.github.io/harvest-yield-warehouse/',
      repoLabel: 'Open the full dbt docs',
      narrowLabel: 'Open the interactive lineage graph',
      // Rendered as native markup above the frame rather than inside it, so it
      // prerenders, stays on-brand, and costs nothing to load.
      stats: {
        counts: [
          { n: 11, label: 'models' },
          { n: 5, label: 'seeds' },
          { n: 65, label: 'tests' },
        ],
        tests: [
          { name: 'not_null', n: 30, tone: 'blue' },
          { name: 'unique', n: 13, tone: 'blue-bright' },
          { name: 'accepted_values', n: 9, tone: 'green' },
          { name: 'relationships', n: 8, tone: 'amber' },
          { name: 'custom', n: 5, tone: 'ink-faint' },
        ],
      },
    },
  },
];

// --- experience ------------------------------------------------------
export const EXPERIENCE = [
  {
    role: 'Data Engineer',
    org: 'Ingsoftware / ASML',
    period: 'Jan 2026 – Present',
    points: [
      'Run distributed processing on Databricks and Spark over 10+ TB, with Delta Lake for ACID transactions on AWS. Extended the same patterns to GCP (BigQuery, Dataflow) for a multi-cloud setup.',
      'Cut average runtime on critical Spark jobs by 40% through partition tuning, caching, and cluster right-sizing.',
      'Own data governance across Databricks and Delta Lake: quality checks, access control, and lineage for production datasets.',
    ],
  },
  {
    role: 'Data Engineer',
    org: 'Vega IT',
    period: 'Jun 2024 – Jan 2026',
    points: [
      'Built and ran 20+ ETL/ELT pipelines on Azure Data Factory and Airflow, with reconciliation and data-quality controls gating every load.',
      'Architected warehouses on AWS Redshift and Databricks Delta Lake over 5+ billion records: partitioning, distribution keys, and incremental models sized to the query patterns.',
      'Shipped 25+ Power BI dashboards and ran the platform DevOps: ECS/EKS with Docker and Kubernetes, Terraform IaC, multi-cloud CI/CD.',
    ],
  },
  {
    role: 'Data Analyst',
    org: 'Gemini Software',
    period: 'Jul 2022 – Jun 2024',
    points: [
      'Automated transformation and ingestion workflows in Python (Pandas, NumPy), replacing steps that had been run by hand.',
      'Handled cleansing and collation from internal and external sources. Wrote complex SQL with advanced joins, window functions, and CTEs.',
      'Integrated third-party APIs and contributed to AWS/Azure cloud-migration work.',
    ],
  },
];

// --- skills ---------------------------------------------------------
// Confirm each line is something you’d be comfortable being questioned on.
export const SKILLS = [
  {
    group: 'Ingestion & orchestration',
    items: ['Azure Data Factory', 'Apache Airflow', 'AWS Glue', 'AWS DMS', 'Python'],
  },
  {
    group: 'Processing',
    items: ['Apache Spark', 'PySpark', 'Databricks', 'Microsoft Fabric'],
  },
  {
    group: 'Storage & modelling',
    items: [
      'Delta Lake',
      'Medallion architecture',
      'AWS Redshift',
      'Azure Synapse',
      'BigQuery',
      'Advanced SQL',
    ],
  },
  {
    group: 'Platform, DevOps & BI',
    items: ['Docker', 'Kubernetes', 'Terraform', 'Multi-cloud CI/CD', 'Power BI'],
  },
];

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/aleksamilic-dev', icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/aleksa-milic', icon: 'linkedin' },
  { label: 'Email', href: 'mailto:aleksa@aleksa-milic.com', icon: 'mail' },
];

export const CONTACT = {
  email: 'aleksa@aleksa-milic.com',
  // Lives in public/, which Vite copies into docs/ verbatim — so the file the
  // site serves and the file you edit are the same one.
  cv: { href: '/Aleksa_Milic_CV.pdf', label: 'Download CV', type: 'PDF' },
  blurb:
    'I’m at Ingsoftware these days, on ASML’s data platform. Open to work on ' +
    'data platforms, Spark performance, or multi-cloud. Email is the quickest ' +
    'way to reach me.',
};

// --- education & certifications --------------------------------------
export const EDUCATION = [
  {
    degree: 'MSc, Data Science and Engineering',
    org: 'Faculty of Electronic Engineering, Niš',
    period: '2023 – 2025',
    note: 'GPA 9.7 / 10. Thesis: optimising distributed data-pipeline architectures on cloud platforms.',
  },
  {
    degree: 'BSc, Computer Science and Informatics',
    org: 'Faculty of Electronic Engineering, Niš',
    period: '2019 – 2023',
    note: 'GPA 8.7 / 10. Thesis: benchmarking distributed data-processing frameworks for large-scale analytics.',
  },
];

// `issuer` picks the brand mark shown on the card (see src/ui/brands.jsx);
// `level` is the small tag beside it. Each renders as a card linking to the
// public credential.
export const CERTIFICATIONS = [
  {
    name: 'Microsoft Certified: SQL AI Developer Associate',
    issuer: 'Microsoft',
    level: 'Associate',
    href: 'https://learn.microsoft.com/en-us/users/aleksamilic-9741/credentials/972a8900a661e357',
  },
  {
    name: 'Microsoft Certified: Fabric Data Engineer Associate',
    issuer: 'Microsoft',
    level: 'Associate',
    href: 'https://learn.microsoft.com/en-us/users/aleksamilic-9741/credentials/2f8a1b129206564',
  },
  {
    name: 'Databricks Generative AI Fundamentals',
    issuer: 'Databricks',
    level: 'Fundamentals',
    href: 'https://credentials.databricks.com/a19fc6fc-5a93-4121-be99-81a2e97cb347#acc.k7pDhwHX',
  },
  {
    name: 'Databricks Platform Fundamentals',
    issuer: 'Databricks',
    level: 'Fundamentals',
    href: 'https://credentials.databricks.com/df903b21-ba0e-47cf-ad70-b3bfb4e866fb#acc.UPA5rqcN',
  },
];

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
// the rest sit past the fog and exist so the corridor has depth. `id` is the
// React key; `z` is the position along the corridor.
export const MACHINES = ['01', '02', '03', '04', '05'].map((id, i) => ({
  id,
  z: -i * STATION_GAP,
}));

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
  { pos: [-2.5, 2.35, -19], look: [-3.3, 1.15, -31] }, //   skills  · storage    (z -32)
  { pos: [-1.6, 2.2, -34], look: [-4.7, 1.4, -48] }, //   skills  · control    (z -48)
  { pos: [-2.2, 2.1, -50], look: [-4.6, 1.2, -63] }, //   contact · shipping   (z -64)
];

// Portrait camera path. The landscape keyframes above pan left so machinery
// sits in the right ~40% of a wide screen — a tall screen has no right 40%.
// This one rides straight down the corridor centreline at a constant pulled-
// back offset (a gentle 3/4 from the right for depth), so each machine drifts
// past small and legible with the corridor around it as you scroll. Machine i
// sits at z = -STATION_GAP * i; storage (03) sits in the left lane so its beat
// looks a touch left.
//
// Which path a visitor gets is an ASPECT question, not a width one: three's
// `fov` is vertical, so the horizontal frustum narrows with the aspect ratio
// and nothing else. Projecting each machine's bounds through both cameras, the
// landscape path holds every beat fully in frame down to aspect 1.0 and then
// falls off fast (67% of the machine at 0.9, 33% at 0.7, nothing by 0.5),
// while this one frames all five at every aspect from 0.42 to 2.4. So the
// switch lives at 1/1 — see `portrait` in App.jsx. It used to key off
// `max-width: 720px`, which is the same thing on a phone but leaves the band
// above it wrong: a 768x1024 tablet is over 720px wide and gets the landscape
// path at aspect 0.75, which cuts 33-44% off three of the five machines.
export const CAMERA_WIDE_PORTRAIT = { pos: [2.4, 4.4, 17], look: [-1.6, 1.3, -6] };
export const CAMERA_KEYFRAMES_PORTRAIT = [
  { pos: [1.2, 3.1, 11], look: [-1.7, 0.9, -4] }, //  ingestion  (z 0 — arrival: silo sits right-of-centre, low, so the title clears it)
  { pos: [2.1, 3.6, -2], look: [0, 1.7, -19] }, //     processing (z -16)
  { pos: [2.2, 3.7, -18], look: [-0.9, 1.6, -35] }, // storage    (z -32, left lane)
  { pos: [2.1, 3.6, -34], look: [0, 1.7, -51] }, //   control    (z -48)
  { pos: [2.1, 3.5, -50], look: [0, 1.5, -67] }, //   shipping   (z -64)
];
