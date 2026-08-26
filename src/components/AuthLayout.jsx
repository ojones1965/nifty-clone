import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';

// Public-facing shell: top nav like Nifty's marketing/app header,
// with the page content centered below.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <header className="auth-header">
        <div className="auth-header-inner">
          <Link to="/sign-in" className="brand">
            <Logo size={28} />
            <span className="brand-name">Flow</span>
          </Link>
          <nav className="auth-nav">
            <a href="#" onClick={(e) => e.preventDefault()}>Pricing</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Blog</a>
          </nav>
          <div className="auth-actions">
            <NavLink to="/sign-in" className="btn btn-ghost">Sign in</NavLink>
            <NavLink to="/sign-up" className="btn btn-primary">Sign up</NavLink>
          </div>
        </div>
      </header>
      <main className="auth-main">{children}</main>
    </div>
  );
}
