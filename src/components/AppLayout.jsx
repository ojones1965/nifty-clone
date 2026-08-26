import { NavLink } from 'react-router-dom';

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <path d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" />
    ),
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: (
      <path d="M4 4h16v5H4zM4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M9 13h6" />
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: <path d="M4 19h16M5 15l4-5 3 3 6-8" />,
  },
  {
    to: '/automation',
    label: 'Automation',
    icon: (
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    ),
  },
];

// Mobile-first shell: page content + fixed bottom tab bar (like the real app).
export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <nav className="bottom-nav">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => 'bottom-tab' + (isActive ? ' active' : '')}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {t.icon}
            </svg>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
