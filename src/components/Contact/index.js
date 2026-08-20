import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './index.scss'

const Contact = () => (
  <section id="contact" className="portfolio-section contact-section">
    <div className="section-heading"><span>04</span><h2>Contact</h2></div>
    <p className="section-intro">Interested in building useful, reliable data systems together?</p>
    <div className="contact-links">
      <a href="https://github.com/aleksamilic-dev" target="_blank" rel="noreferrer"><FontAwesomeIcon icon={faGithub} /> GitHub <span>@aleksamilic-dev</span></a>
      <a href="https://linkedin.com/in/aleksa-milic" target="_blank" rel="noreferrer"><FontAwesomeIcon icon={faLinkedin} /> LinkedIn <span>/in/aleksa-milic</span></a>
      <a href="mailto:aleksamilic2224@gmail.com"><FontAwesomeIcon icon={faEnvelope} /> Email <span>aleksamilic2224@gmail.com</span></a>
    </div>
  </section>
)

export default Contact
