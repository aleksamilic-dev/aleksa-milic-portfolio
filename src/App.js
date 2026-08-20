import Contact from './components/Contact'
import Experience from './components/Experience'
import Home from './components/Home'
import Layout from './components/Layout'
import Projects from './components/Projects'
import Skills from './components/Skills'
import './App.scss'

function App() {
  return (
    <Layout>
      <Home />
      <Experience />
      <Projects />
      <Skills />
      <Contact />
    </Layout>
  )
}

export default App
