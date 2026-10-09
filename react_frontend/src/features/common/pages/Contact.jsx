import React from 'react';
import { PATHS } from '../../../app/paths';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { RoleRedirect } from '../../../app/guards/RoleRedirect';

import '../styles/marketing.css';

export default function Contact() {
  const { user, loading } = useAuth();
  
  if (!loading && user) {
    return <RoleRedirect />;
  }

  return (
    <div className="old-frontend-scope marketing-page">
      <header className="navbar">
        <div className="logo">
          <img src="/assets/images/logo.svg" alt="OfficeSync Logo" />
        </div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/#features">Features</Link>
          <a href="#">About Us</a>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="nav-auth">
          <Link to={PATHS.PUBLIC.LOGIN} className="btn-outline">Sign In</Link>
          <Link to={PATHS.PUBLIC.REGISTER} className="btn-primary">Register</Link>
        </div>
      </header>

      <section className="split-hero">
        <div className="hero-left">
          <span className="hero-badge">● We're here to help</span>

          <h1 className="hero-title">
            Get in Touch.<br />
            <span className="text-blue">Stay<br />Connected.</span>
          </h1>

          <p className="hero-desc">
            Whether you have a question about our compliance platform, need a
            demo, or require technical support, our team is ready to assist you.
          </p>

          <div className="contact-info-list">
            <div className="info-item">
              <h4>Sales Inquiries</h4>
              <a href="mailto:sales@officesuite.com">sales@officesuite.com</a>
            </div>
            <div className="info-item">
              <h4>Technical Support</h4>
              <a href="mailto:support@officesuite.com">support@officesuite.com</a>
            </div>
            <div className="info-item">
              <h4>Office Location</h4>
              <p>
                123 Enterprise Way, Tech District<br />San Francisco, CA 94105
              </p>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card" style={{ padding: '2.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Send us a message</h3>

            <form onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); e.target.reset(); }}>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" placeholder="John Doe" required />
              </div>

              <div className="input-group">
                <label>Work Email</label>
                <div className="input-with-icon">
                  <span>@</span>
                  <input type="email" placeholder="admin@company.com" required />
                </div>
              </div>

              <div className="input-group">
                <label>Message</label>
                <textarea
                  placeholder="How can we help you?"
                  rows="4"
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn-primary full-width">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
