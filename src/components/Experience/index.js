import { faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './index.scss'

const workExperience = [
  { company: 'Ingsoftware / ASML', role: 'Data Engineer', dates: 'January 2026 – Present', description: 'Building and governing large-scale Databricks and Spark workloads across AWS and GCP, with Delta Lake, data quality, lineage, and performance tuning at their core.' },
  { company: 'Vega IT', role: 'Data Engineer', dates: 'June 2024 – January 2026', description: 'Built ETL/ELT pipelines with Azure Data Factory and Airflow, and designed warehouse and analytical workloads across AWS Redshift and Databricks Delta Lake.' },
  { company: 'Gemini Software', role: 'Data Analyst', dates: 'July 2022 – June 2024', description: 'Developed Python-based ingestion and transformation workflows, complex SQL analysis, third-party API integrations, and early cloud migration work across AWS and Azure.' },
]

const Experience = () => (
  <section id="experience" className="portfolio-section experience-section">
    <div className="section-heading"><span>01</span><h2>Experience</h2></div>
    <div className="timeline">{workExperience.map((job) => <article className="timeline-item" key={job.company}><div className="timeline-marker"><FontAwesomeIcon icon={faBriefcase} /></div><div className="timeline-content"><p className="timeline-date">{job.dates}</p><h3>{job.company}</h3><h4>{job.role}</h4><p>{job.description}</p></div></article>)}</div>
  </section>
)

export default Experience
