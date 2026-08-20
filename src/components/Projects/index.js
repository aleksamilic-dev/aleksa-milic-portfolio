import { useState } from 'react'

import { faArrowUpRightFromSquare, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import './index.scss'

const projects = [
  { title: 'Niš Urban Development Radar', description: 'Construction activity dashboard for Niš, built around 2007–2026 data.', technologies: ['Python', 'PostgreSQL', 'Apache Superset'], dashboardUrl: null, note: '[TODO: add the public/embed-safe Superset dashboard URL and guest-token setup.]' },
  { title: '[TODO: second project name]', description: '[TODO: add a concise description for this project.]', technologies: ['[TODO: technology]'], dashboardUrl: null, note: '[TODO: add live dashboard or project URL.]' },
  { title: '[TODO: third project name]', description: '[TODO: add a concise description for this project.]', technologies: ['[TODO: technology]'], dashboardUrl: null, note: '[TODO: add live dashboard or project URL.]' },
]

const Projects = () => {
  const [activeProject, setActiveProject] = useState(null)
  const [embedFailed, setEmbedFailed] = useState(false)
  const openProject = (project) => { setEmbedFailed(false); setActiveProject(project) }
  return <section id="projects" className="portfolio-section projects-section">
    <div className="section-heading"><span>02</span><h2>Projects</h2></div>
    <p className="section-intro">Selected work in data products, infrastructure, and analytics.</p>
    <div className="flip-grid">{projects.map((project) => <article className="flip-card" key={project.title}><div className="flip-card-inner"><div className="flip-face flip-front"><p className="card-kicker">DATA PROJECT</p><h3>{project.title}</h3><p>{project.description}</p><div className="technologies">{project.technologies.map((tech) => <span className="tech-tag" key={tech}>{tech}</span>)}</div><span className="flip-hint">Hover or focus to explore</span></div><div className="flip-face flip-back"><h3>{project.title}</h3><p>{project.note}</p><button className="flat-button" type="button" onClick={() => openProject(project)} disabled={!project.dashboardUrl}>VIEW LIVE DASHBOARD <FontAwesomeIcon icon={faArrowUpRightFromSquare} /></button></div></div></article>)}</div>
    {activeProject && <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={`${activeProject.title} dashboard`}><div className="modal-panel"><button className="modal-close" type="button" onClick={() => setActiveProject(null)} aria-label="Close dashboard"><FontAwesomeIcon icon={faXmark} /></button><h3>{activeProject.title}</h3>{embedFailed ? <p className="embed-fallback">The embedded dashboard could not be loaded. Check its Superset guest-token and frame-ancestors configuration.</p> : <iframe title={`${activeProject.title} live dashboard`} src={activeProject.dashboardUrl} onError={() => setEmbedFailed(true)} allow="fullscreen" />}</div></div>}
  </section>
}

export default Projects
