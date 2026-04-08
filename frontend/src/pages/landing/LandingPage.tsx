import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Users,
  BarChart3,
  Shield,
  Building2,
  TrendingUp,
  MapPin,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import './LandingPage.css';

/* ── Static data ─────────────────────────────────────── */
const features = [
  {
    icon: <Wallet size={22} />,
    color: 'gold',
    title: 'Digital Wallet',
    desc: 'Secure wallet system for instant deposits, investments, and profit withdrawals – available 24/7.',
  },
  {
    icon: <Users size={22} />,
    color: 'blue',
    title: 'Team Building',
    desc: 'Build a 20-member team to unlock investment opportunities and climb the growth ladder together.',
  },
  {
    icon: <Building2 size={22} />,
    color: 'green',
    title: 'Premium Projects',
    desc: 'Curated residential, resort, hotel, and farmhouse developments across prime locations.',
  },
  {
    icon: <BarChart3 size={22} />,
    color: 'orange',
    title: 'Transparent Returns',
    desc: 'Real-time profit tracking with automated, proportional distribution after every plot sale.',
  },
  {
    icon: <Shield size={22} />,
    color: 'purple',
    title: 'Bank-Grade Security',
    desc: 'End-to-end encryption, 2FA, PCI-DSS compliant payments, and full audit trails.',
  },
  {
    icon: <TrendingUp size={22} />,
    color: 'teal',
    title: 'Reinvestment Engine',
    desc: 'Reinvest returns automatically or manually into new projects for compounding growth.',
  },
];

const projects = [
  {
    img: '/hero-property.png',
    type: 'residential',
    typeLabel: 'Residential',
    name: 'Golden Palm Estates',
    location: 'Ahmedabad, Gujarat',
    plots: '120',
    roi: '18 – 24%',
    starts: '₹5 L',
  },
  {
    img: '/project-resort.png',
    type: 'resort',
    typeLabel: 'Resort',
    name: 'Azure Bay Resort',
    location: 'Goa, India',
    plots: '64',
    roi: '22 – 30%',
    starts: '₹8 L',
  },
  {
    img: '/project-farmhouse.png',
    type: 'farmhouse',
    typeLabel: 'Farmhouse',
    name: 'Hillcrest Farm Villas',
    location: 'Lonavala, Maharashtra',
    plots: '40',
    roi: '20 – 28%',
    starts: '₹12 L',
  },
];

const steps = [
  { num: '01', title: 'Register & KYC', desc: 'Create your account with a simple ₹500 registration and optional KYC verification.' },
  { num: '02', title: 'Build Your Team', desc: 'Invite 20 members via referral link to activate your investment features.' },
  { num: '03', title: 'Invest in Projects', desc: 'Browse premium projects, pick plots, and invest starting from just ₹500.' },
  { num: '04', title: 'Earn Returns', desc: 'Receive automated profit distributions to your wallet when plots are sold.' },
];

const testimonials = [
  {
    initials: 'RK',
    name: 'Rajesh Kumar',
    role: 'Investor since 2024',
    text: 'The transparency is unmatched. I can see every transaction, every profit distribution – right down to the rupee. My portfolio has grown 40% in 18 months.',
  },
  {
    initials: 'PM',
    name: 'Priya Mehta',
    role: 'Team Leader',
    text: 'Building my team was incredibly rewarding. The referral system is smooth and the dashboard makes it easy to track everyone\'s progress.',
  },
  {
    initials: 'AS',
    name: 'Amit Shah',
    role: 'Investor since 2025',
    text: 'I was skeptical at first, but the RERA compliance and bank-grade security convinced me. Best investment decision I\'ve made.',
  },
];

/* ── Component ───────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* ── Navbar ──────────────────────────── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`} id="landing-nav">
        <div className="nav-brand">
          <div className="nav-logo">RP</div>
          <span className="nav-brand-text">RP Investments</span>
        </div>

        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollTo('features')}>Features</button>
          <button className="nav-link" onClick={() => scrollTo('projects')}>Projects</button>
          <button className="nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
          <button className="nav-link" onClick={() => scrollTo('testimonials')}>Testimonials</button>
        </div>

        <div className="nav-actions">
          <Link to="/login"><button className="nav-login-btn">Sign In</button></Link>
          <Link to="/register"><button className="nav-register-btn">Get Started</button></Link>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 999,
          background: 'rgba(10,14,26,0.96)', backdropFilter: 'blur(20px)',
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <button className="nav-link" onClick={() => scrollTo('features')}>Features</button>
          <button className="nav-link" onClick={() => scrollTo('projects')}>Projects</button>
          <button className="nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
          <button className="nav-link" onClick={() => scrollTo('testimonials')}>Testimonials</button>
          <Link to="/login" style={{ width: '100%' }}><button className="nav-login-btn" style={{ width: '100%' }}>Sign In</button></Link>
          <Link to="/register" style={{ width: '100%' }}><button className="nav-register-btn" style={{ width: '100%' }}>Get Started</button></Link>
        </div>
      )}

      {/* ── Hero ────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-bg">
          <img src="/hero-property.png" alt="Premium real estate development" />
          <div className="hero-bg-overlay" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            RERA Compliant &middot; Regulated Platform
          </div>

          <h1 className="hero-title">
            Invest in <span className="gold">Premium Property</span> Projects with Confidence
          </h1>

          <p className="hero-description">
            Pool investments with your team, access curated real estate developments,
            and receive transparent, automated profit distributions — starting from just ₹500.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="cta-primary">
              Start Investing <ArrowRight size={18} />
            </Link>
            <button className="cta-secondary" onClick={() => scrollTo('how-it-works')}>
              Learn How It Works <ChevronDown size={18} />
            </button>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <h3>₹25 Cr+</h3>
              <p>Total Investments</p>
            </div>
            <div className="hero-stat">
              <h3>1,200+</h3>
              <p>Active Investors</p>
            </div>
            <div className="hero-stat">
              <h3>15+</h3>
              <p>Premium Projects</p>
            </div>
            <div className="hero-stat">
              <h3>22%</h3>
              <p>Avg. ROI</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="section-label">
          <span className="section-label-line" />
          Why Choose Us
        </div>
        <h2 className="section-title">Everything You Need to Invest Smarter</h2>
        <p className="section-subtitle">
          A complete ecosystem built for modern property investors — from team building
          to profit tracking, all in one secure platform.
        </p>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Projects Showcase ───────────────── */}
      <section className="projects-section" id="projects">
        <div className="landing-section">
          <div className="section-label">
            <span className="section-label-line" />
            Featured Projects
          </div>
          <h2 className="section-title">Explore Premium Developments</h2>
          <p className="section-subtitle">
            Handpicked property projects across India — rigorously vetted for legal compliance,
            development quality, and strong return potential.
          </p>

          <div className="projects-grid">
            {projects.map((p, i) => (
              <div className="project-card" key={i}>
                <div className="project-card-img">
                  <img src={p.img} alt={p.name} />
                  <div className="project-card-overlay">
                    <span className={`project-type-badge ${p.type}`}>{p.typeLabel}</span>
                  </div>
                </div>
                <div className="project-card-info">
                  <h3>{p.name}</h3>
                  <div className="project-card-location">
                    <MapPin size={14} />
                    {p.location}
                  </div>
                  <div className="project-card-meta">
                    <div className="project-meta-item">
                      <span className="project-meta-label">Plots</span>
                      <span className="project-meta-value">{p.plots}</span>
                    </div>
                    <div className="project-meta-item">
                      <span className="project-meta-label">Est. ROI</span>
                      <span className="project-meta-value">{p.roi}</span>
                    </div>
                    <div className="project-meta-item">
                      <span className="project-meta-label">Starts at</span>
                      <span className="project-meta-value">{p.starts}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────── */}
      <section className="landing-section" id="how-it-works">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <span className="section-label-line" />
            How It Works
          </div>
          <h2 className="section-title" style={{ margin: '0 auto 1rem' }}>Four Simple Steps to Start Earning</h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            From sign-up to your first profit — here's exactly what happens.
          </p>
        </div>

        <div className="how-it-works-grid">
          {steps.map((s, i) => (
            <div className="step-card" key={i}>
              <div className="step-number">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────── */}
      <section className="testimonials-section" id="testimonials">
        <div className="landing-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="section-label">
            <span className="section-label-line" />
            Testimonials
          </div>
          <h2 className="section-title">Trusted by Investors Across India</h2>
          <p className="section-subtitle">
            Real stories from real investors who are building wealth with RP Investments.
          </p>

          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-quote">"</div>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, j) => (
                    <span className="star" key={j}>★</span>
                  ))}
                </div>
                <p>{t.text}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.initials}</div>
                  <div className="testimonial-author-info">
                    <h4>{t.name}</h4>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Build Your Property Portfolio?</h2>
          <p>
            Join thousands of smart investors who are generating consistent returns
            through premium real estate developments. Start with just ₹500.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-primary">
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="cta-secondary">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="nav-brand">
              <div className="nav-logo">RP</div>
              <span className="nav-brand-text">RP Investments</span>
            </div>
            <p>
              A premium property investment platform enabling transparent, team-based
              investing in curated real estate projects across India.
            </p>
          </div>

          <div className="footer-column">
            <h4>Platform</h4>
            <ul>
              <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
              <li><a href="#projects" onClick={(e) => { e.preventDefault(); scrollTo('projects'); }}>Projects</a></li>
              <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>How It Works</a></li>
              <li><a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollTo('testimonials'); }}>Testimonials</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Risk Disclosure</a></li>
              <li><a href="#">RERA Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} RP Investments. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
