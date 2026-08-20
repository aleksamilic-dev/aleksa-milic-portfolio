import './index.scss'

const Home = () => (
  <section id="home" className="portfolio-section hero-section">
    <div className="hero-copy">
      <p className="eyebrow">Aleksa Milić · Data Engineer · Niš, Serbia</p>
      <h1>Raw data. Trusted decisions.</h1>
      <p className="hero-summary">MSc in Data Science building dependable pipelines, from ingestion to analytics, with Azure Data Factory, Databricks, Fabric, Delta Lake, and Spark.</p>
      <a href="#projects" className="flat-button">EXPLORE PROJECTS</a>
    </div>
    <div className="portrait-space">
      <div className="portrait-frame">
        <img src="/linkedin_image.png" alt="Aleksa Milić" />
      </div>
      <p>Data Engineer<br />Niš, Serbia</p>
    </div>
  </section>
)

export default Home
