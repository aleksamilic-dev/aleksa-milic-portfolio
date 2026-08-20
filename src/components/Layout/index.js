import Sidebar from '../Sidebar/'
import './index.scss'

const Layout = ({ children }) => {
  return (
    <div className="App">
      <Sidebar />
      <main className="page">
        <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div>
        {children}
      </main>
    </div>
  )
}

export default Layout
