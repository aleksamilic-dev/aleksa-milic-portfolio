import { useEffect, useState } from 'react'

import './index.scss'
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'
import {
  faBriefcase,
  faEnvelope,
  faHome,
  faLaptopCode,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const navigation = [
  ['home', faHome, 'Home'],
  ['experience', faBriefcase, 'Experience'],
  ['projects', faLaptopCode, 'Projects'],
  ['skills', faScrewdriverWrench, 'Skills'],
  ['contact', faEnvelope, 'Contact'],
]

const Sidebar = () => {
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    let frameId

    const syncPipeline = () => {
      frameId = undefined
      const focusLine = window.innerHeight * 0.48
      const visibleSection = navigation.reduce((current, [id]) => {
        const section = document.getElementById(id)
        return section && section.getBoundingClientRect().top <= focusLine
          ? id
          : current
      }, 'home')

      setActiveSection(visibleSection)
    }

    const onScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(syncPipeline)
    }

    syncPipeline()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <aside className="nav-bar" aria-label="Primary navigation">
      <a className="logo" href="#home" aria-label="Aleksa Milić home">
        <span>AM</span>
      </a>
      <nav>
        {navigation.map(([id, icon, label]) => (
          <a
            key={id}
            className={activeSection === id ? 'is-active' : ''}
            href={`#${id}`}
            aria-label={label}
            aria-current={activeSection === id ? 'location' : undefined}
          >
            <FontAwesomeIcon icon={icon} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      <ul>
        <li>
          <a
            href="https://github.com/aleksamilic-dev"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <FontAwesomeIcon icon={faGithub} />
          </a>
        </li>
        <li>
          <a
            href="https://linkedin.com/in/aleksa-milic"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
          >
            <FontAwesomeIcon icon={faLinkedin} />
          </a>
        </li>
      </ul>
    </aside>
  )
}

export default Sidebar
