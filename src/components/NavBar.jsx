import { Link } from 'react-router-dom';
import './NavBar.css';

export default function NavBar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">SafeWork</Link>
      <button className="lang-toggle" disabled title="Coming soon">
        EN / עב
      </button>
    </nav>
  );
}
