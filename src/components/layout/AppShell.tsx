import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const nav = [
  { to: "/app", end: true, label: "Dashboard", icon: "◈" },
  { to: "/app/send", label: "Transfer", icon: "↗" },
  { to: "/app/relay", label: "Gasless", icon: "⚡" },
  { to: "/app/arena", label: "Arena", icon: "⚔" },
  { to: "/app/contracts", label: "Contracts", icon: "◇" },
  { to: "/app/profile", label: "Profile", icon: "◎" },
];

export function AppShell() {
  const { session, logout, selectedChain } = useAuth();
  const navigate = useNavigate();

  const shortAddr = session?.walletAddress
    ? `${session.walletAddress.slice(0, 6)}…${session.walletAddress.slice(-4)}`
    : "";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => navigate("/app")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/app")}
          role="button"
          tabIndex={0}
        >
          <span className="brand-mark">VA</span>
          <div>
            <strong>Vault Arena</strong>
            <small>Custodial DeFi</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="network-pill">
            {selectedChain?.blockchain} · {selectedChain?.network}
          </div>
          <button
            type="button"
            className="btn-logout"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Connected wallet</p>
            <p className="topbar-addr">{shortAddr}</p>
          </div>
          <p className="topbar-email">{session?.email ?? session?.userId}</p>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
