import WordCloud from './wordcloud'
import './index.scss'

const skills = ['Python', 'Azure Data Factory', 'Databricks', 'Microsoft Fabric', 'Delta Lake', 'Apache Spark', 'PostgreSQL', 'DuckDB', 'Google Cloud', 'AWS', 'Git']

const Skills = () => (
  <section id="skills" className="portfolio-section skills-page">
    <div className="section-heading"><span>03</span><h2>Skills</h2></div>
    <div className="text-zone"><p>A data engineering toolkit for moving, modeling, and serving data across cloud platforms.</p><div className="skill-badges">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>
    <div className="tagcloud-wrap"><WordCloud /></div>
  </section>
)

export default Skills
