import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LandingPage() {
  const { isAuthed } = useAuth();

  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand-mark lg">VA</span>
        <span className="landing-logo">Vault Arena</span>
        <div className="landing-nav-actions">
          {isAuthed ? (
            <Link to="/app" className="btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/login" className="btn-primary">
                Launch wallet
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <p className="hero-tag">Custodial DeFi + on-chain arena</p>
        <h1>
          Play, swap, and send
          <br />
          <span className="gradient-text">without holding keys</span>
        </h1>
        <p className="hero-sub">
          Email OTP login, server-held custodial wallets, native transfers, gasless relayer sends,
          and contract writes — same ks-wallet-be APIs, packaged like a real product.
        </p>
        <div className="hero-cta">
          <Link to={isAuthed ? "/app" : "/login"} className="btn-primary lg">
            {isAuthed ? "Go to dashboard" : "Create wallet with email"}
          </Link>
          <a href="#features" className="btn-ghost lg">
            See features
          </a>
        </div>
        <div className="hero-stats">
          <div>
            <strong>OTP</strong>
            <span>Email sign-in</span>
          </div>
          <div>
            <strong>Gasless</strong>
            <span>Relayer lane</span>
          </div>
          <div>
            <strong>Arena</strong>
            <span>Skill mini-game</span>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <article className="feature-card">
          <h3>Treasury</h3>
          <p>Native sends via <code>POST /v2/wallet/send-transaction</code>. Your custodial wallet pays gas.</p>
        </article>
        <article className="feature-card">
          <h3>Relay lane</h3>
          <p>ERC-20 and native gasless transfers through <code>POST /relayer/send-transaction</code>.</p>
        </article>
        <article className="feature-card">
          <h3>Crystal Arena</h3>
          <p>Battle rounds, streaks, and optional on-chain “entry” via gasless send when you are ready.</p>
        </article>
      </section>

      <footer className="landing-foot">
        <p>Demo dApp · ks-wallet-be · set <code>VITE_API_BASE_URL</code> in <code>.env</code></p>
      </footer>
    </div>
  );
}
