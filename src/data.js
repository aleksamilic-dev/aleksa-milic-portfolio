import engineBenchmark from './assets/engine-benchmark.svg';
import harvestWarehouse from './assets/harvest-warehouse.svg';

// ---------------------------------------------------------------------------
// Single source of truth: portfolio content + the ambient scene's layout.
//
// Hero, about, experience, skills, education, and certifications are filled in
// from the CV. The `PROJECTS` array below is still scaffolding — every entry
// marked `TODO —` needs a real project written up before this goes in front of
// a recruiter. Nothing here should be guessed at in an interview.
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
  status: 'Open to talk',
  value:
    'I build and run data platforms end to end — Spark and Azure Data Factory ' +
    'pipelines, warehouses that stay fast at billions of rows, and the CI/CD ' +
    'and infrastructure under them.',
  tagline: 'Raw in. Value out.',
  ctas: [
    { label: 'See selected work', to: 'work', primary: true },
    { label: 'Get in touch', to: 'contact' },
  ],
};

export const ABOUT =
  'I’m a data engineer with around five years building pipelines and cloud ' +
  'data platforms across AWS, Azure, and GCP — most of it on Databricks and ' +
  'Azure Data Factory. Enough of my time has gone into DevOps — containers, ' +
  'CI/CD, infrastructure-as-code — that I can take a pipeline from ingestion ' +
  'to production without handing it off. I care about pipelines that fail ' +
  'loudly and data models analysts can trust.';

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
    id: 'project-1',
    title: 'Niš Urban Development Radar',
    year: '2026',
    context:
      'A BI / data-engineering project on construction activity in Niš — official ' +
      'Statistical Office of Serbia open data, normalised and validated with Python, ' +
      'loaded into PostgreSQL, and served as an embeddable Apache Superset dashboard.',
    role:
      'Solo build. The ingestion and validation pipeline, the SQL schema and ' +
      'analytical views, the Superset dashboard-as-code, and the Dockerised deploy ' +
      '(PostgreSQL, Superset, a guest-token API, Caddy) on a single VM.',
    stack: ['Python', 'PostgreSQL', 'Apache Superset', 'Docker', 'Caddy'],
    outcome:
      'Reproducible from a clean clone — every source download is checksummed, and ' +
      'the pipeline never fills a missing month with zero. Ships a self-contained ' +
      'rebuild of the dashboard for embedding without a Superset host — running below.',
    href: 'https://github.com/aleksamilic-dev/nis-urban-development-radar',
    image: null,
    imageAlt: '',
    embed: {
      src: '/nis-urban-development-radar.html',
      title: 'Live dashboard',
      blurb:
        'Three cross-filtered panels over the official SORS series: completed dwellings ' +
        '(KPI + sparkline), permitted vs completed by year, and a sortable municipality ' +
        'coverage table. Click a table row — Град Ниш or one of its five city ' +
        'municipalities — and the KPI and chart re-render for that territory. The 2026 ' +
        'completed figures are a labelled projection; SORS has not published 2026 annual ' +
        'data yet, so everything else is 2025-and-earlier plus permits through May 2026.',
      note: 'Static rebuild of the Superset dashboard — no live backend.',
      repo: 'https://github.com/aleksamilic-dev/nis-urban-development-radar',
      repoLabel: 'Pipeline & methodology on GitHub',
      minHeight: 800,
    },
  },
  {
    id: 'project-2',
    title: 'When do you actually need a cluster?',
    year: '2026',
    context:
      'A reproducible TPC-H benchmark — Apache Spark (local, and a real 2-worker ' +
      'standalone cluster) against DuckDB, Polars and DataFusion, all reading the ' +
      'same Parquet. It measures how far a single machine gets before a ' +
      'distributed engine is worth its overhead.',
    role:
      'Solo build. The engine adapters, the timing + peak-memory harness, a ' +
      'cross-run correctness gate, the Dockerised Spark cluster, the CI, and the ' +
      'report generator. Grew out of my MSc thesis on distributed-pipeline tuning.',
    stack: ['Apache Spark', 'DuckDB', 'Polars', 'DataFusion', 'Docker', 'TPC-H'],
    outcome:
      'Across SF1 and SF10 the in-process engines finish the workload ~10× faster ' +
      'than Spark on the same box, and the gap holds as data grows — every run ' +
      'gated on 96 row-for-row correctness checks. Full report published on each push.',
    href: 'https://github.com/aleksamilic-dev/tpch-engine-benchmark',
    image: engineBenchmark,
    imageAlt: 'TPC-H total workload time, log scale: in-process engines vs Spark, SF1 to SF10',
  },
  {
    id: 'project-3',
    title: 'Harvest Yield Warehouse',
    year: '2026',
    context:
      'A dimensional warehouse for a produce cooperative’s harvest deliveries — ' +
      'an operational feed modelled into a Kimball star schema with slowly-changing ' +
      'dimensions, a tested dbt transformation layer, and lineage docs published live.',
    role:
      'Solo build. The data model, the dbt project, 65 data tests, the CI, and the ' +
      'published lineage site. A rebuild of an old Oracle + Apache NiFi coursework mart.',
    stack: ['dbt', 'DuckDB', 'Kimball / SCD2', 'GitHub Actions', 'SQL'],
    outcome:
      'Rebuilds from a clean clone in one command; every CI run is gated on 65 data ' +
      'tests (schema, referential, SCD2 integrity, business rules); the model docs and ' +
      'interactive lineage graph deploy to GitHub Pages on each push.',
    href: 'https://github.com/aleksamilic-dev/harvest-yield-warehouse',
    image: harvestWarehouse,
    imageAlt: 'Harvest Yield Warehouse — Kimball star schema fed by a dbt pipeline',
  },
];

// --- experience ------------------------------------------------------
export const EXPERIENCE = [
  {
    role: 'Data Engineer',
    org: 'Ingsoftware / ASML',
    period: 'Jan 2026 — Present',
    points: [
      'Run distributed processing on Databricks and Spark over 10+ TB, with Delta Lake for ACID transactions on AWS; extended the same patterns to GCP (BigQuery, Dataflow) for a multi-cloud setup holding 99.9% uptime.',
      'Cut average runtime on critical Spark jobs by 40% through partition tuning, caching, and cluster right-sizing.',
      'Own data governance across Databricks and Delta Lake — quality checks, access control, and lineage for production datasets.',
    ],
  },
  {
    role: 'Data Engineer',
    org: 'Vega IT',
    period: 'Jun 2024 — Jan 2026',
    points: [
      'Built and ran 20+ ETL/ELT pipelines on Azure Data Factory and Airflow, with reconciliation and data-quality controls that lifted accuracy by 35%.',
      'Architected warehouses on AWS Redshift and Databricks Delta Lake over 5+ billion records; schema design improved query performance by 40%.',
      'Shipped 25+ Power BI dashboards and ran the platform DevOps — ECS/EKS with Docker and Kubernetes, Terraform IaC, multi-cloud CI/CD.',
    ],
  },
  {
    role: 'Data Analyst',
    org: 'Gemini Software',
    period: 'Jul 2022 — Jun 2024',
    points: [
      'Automated transformation and ingestion workflows in Python (Pandas, NumPy), cutting manual processing time by 60%.',
      'Handled cleansing and collation from internal and external sources; wrote complex SQL with advanced joins, window functions, and CTEs.',
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
  { label: 'Email', href: 'mailto:aleksamilic2224@gmail.com', icon: 'mail' },
];

export const CONTACT = {
  email: 'aleksamilic2224@gmail.com',
  blurb:
    'I’m at Ingsoftware these days, on ASML’s data platform. Always glad to ' +
    'talk data platforms, Spark performance, or multi-cloud — role attached ' +
    'or not. Email is the quickest way to reach me.',
};

// --- education & certifications --------------------------------------
export const EDUCATION = [
  {
    degree: 'MSc — Data Science & Engineering',
    org: 'Faculty of Electronic Engineering, Niš',
    period: '2023 — 2025',
    note: 'GPA 9.7 / 10. Thesis: optimising distributed data-pipeline architectures on cloud platforms.',
  },
  {
    degree: 'BSc — Computer Science & Informatics',
    org: 'Faculty of Electronic Engineering, Niš',
    period: '2019 — 2023',
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

// Portrait / phone camera path. The landscape keyframes above pan left so
// machinery sits in the right ~40% of a wide screen — a portrait phone has no
// right 40%. This one rides straight down the corridor centreline at a constant
// pulled-back offset (a gentle 3/4 from the right for depth), so each machine
// drifts past small and legible with the corridor around it as you scroll.
// Machine i sits at z = -STATION_GAP * i; storage (03) sits in the left lane so
// its beat looks a touch left.
export const CAMERA_WIDE_PORTRAIT = { pos: [2.4, 4.4, 17], look: [-1.6, 1.3, -6] };
export const CAMERA_KEYFRAMES_PORTRAIT = [
  { pos: [1.2, 3.1, 11], look: [-1.7, 0.9, -4] }, //  ingestion  (z 0 — arrival: silo sits right-of-centre, low, so the title clears it)
  { pos: [2.1, 3.6, -2], look: [0, 1.7, -19] }, //     processing (z -16)
  { pos: [2.2, 3.7, -18], look: [-0.9, 1.6, -35] }, // storage    (z -32, left lane)
  { pos: [2.1, 3.6, -34], look: [0, 1.7, -51] }, //   control    (z -48)
  { pos: [2.1, 3.5, -50], look: [0, 1.5, -67] }, //   shipping   (z -64)
];
