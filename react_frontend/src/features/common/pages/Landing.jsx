import React, { useEffect, useState } from 'react';
import { PATHS } from '../../../app/paths';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { RoleRedirect } from '../../../app/guards/RoleRedirect';

import '../styles/marketing.css';

export default function Landing() {
  const { user, loading } = useAuth();
  
  // Accordion State
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Contact Form State
  const [intent, setIntent] = useState('say_hi');
  const [contactName, setContactName] = useState('');
  
  if (!loading && user) {
    return <RoleRedirect />;
  }

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (intent === 'quote') {
      alert(`Thank you, ${contactName}! Your quote request has been received. Our sales team will be in touch shortly.`);
    } else {
      alert(`Thanks for saying hi, ${contactName}! We've received your message.`);
    }
    e.target.reset();
    setContactName('');
    setIntent('say_hi');
  };

  return (
    <div className="old-frontend-scope">
      <header className="navbar">
        <div className="logo">
          <img src="/assets/images/logo.svg" alt="OfficeSync Logo" />
        </div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="nav-auth">
          <Link to={PATHS.PUBLIC.LOGIN} className="btn-outline">Sign In</Link>
          <Link to={PATHS.PUBLIC.REGISTER} className="btn-primary">Register</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>Master Operational Tracking</h1>
            <p>
              Track tasks,<br />Automate workflows, and<br />Maintain verified
              compliance — <br />All in one enterprise platform.
            </p>
            <br />
            <Link to={PATHS.PUBLIC.REGISTER} className="btn-primary large">Sign Up</Link>
          </div>
          <div className="hero-image">
            <img
              src="/assets/images/hero-illustration.png"
              alt="Workflow Dashboard Illustration"
            />
          </div>
        </section>
        
        <section className="trusted-section">
          <div className="dashboard-section">
            <img
              src="/assets/images/Dashboard.png"
              alt="OfficeSync Dashboard Interface"
            />
          </div>
          <div className="trusted-banner">
            <p>
              Built for
              <strong> Operations, Compliance, Administrative Teams and Process Managers</strong>
            </p>
          </div>
        </section>
        
        <div className="problem-section">
          <h2 className="problem-text">
            Operational inefficiencies increase by up to 35% in fragmented process
            environments.
          </h2>
          <div className="problem-image">
            <img
              src="/assets/images/problem.png"
              alt="Dashboard Mockup"
              width="540.78"
            />
            <div className="sol-image">
              <img
                src="/assets/images/problem-img2.png"
                alt="Dashboard Mockup"
                width="328.69"
              />
              <div className="sol-image2">
                <img
                  src="/assets/images/problem-img3.png"
                  alt="Dashboard Mockup"
                  width="332.71"
                />
              </div>
            </div>
          </div>
        </div>

        <section id="features" className="solutions-section">
          <div className="solutions-header">
            <h2 className="problem-text">
              A smarter way to run operational workflows. OfficeSync centralizes
              tasks, approvals, and compliance into a single workflow system built
              for modern organizations.
            </h2>
          </div>
          <div className="cards-grid">
            <div className="card">
              <h3>Workflow driven operations</h3>
              <p className="card-text">
                Design and automate operational workflows that mirror how your
                organization actually works.
              </p>
              <img
                src="/assets/images/card-icon-1.png"
                alt="Workflow layers"
                width="264.48"
              />
            </div>
            <div className="card">
              <h3>Transparent approvals</h3>
              <p className="card-text">
                Teams know exactly who needs to review, approve, or act—reducing
                delays and miscommunication.
              </p>
              <img
                src="/assets/images/card-icon-2.png"
                alt="Approvals"
                width="264.48"
              />
            </div>
            <div className="card">
              <h3>Verified compliance</h3>
              <p className="card-text">
                Maintain automated audit trails and enforce standardized procedures
                across all departments.
              </p>
              <img
                src="/assets/images/card-icon-3.png"
                alt="Compliance"
                width="264.48"
              />
            </div>
          </div>
        </section>

        <section className="core-features-section">
          <div className="features-label">
            <div className="fheading">
              <p className="badge">Core Features</p>
            </div>
            <div className="fcontent">
              <p>
                Step-by-Step Guide to Achieving<br />
                Your Business Goals
              </p>
            </div>
          </div>

          <div className="accordion-container">
            {[
              { num: '01', title: 'Structured Workflow Builder', content: 'Design operational workflows with clearly defined steps, approvals, and responsibilities that mirror how your organization actually works.' },
              { num: '02', title: 'Smart Task Ownership', content: 'Assign clear ownership to every stage so teams always have accountability as progress moves forward.' },
              { num: '03', title: 'Intelligent Approval Routing', content: 'Automatically route requests through predefined approval chains, ensuring the right stakeholders review and act at the right time.' },
              { num: '04', title: 'Real-Time Workflow Visibility', content: 'Define permissions by role to ensure the right people create, approve, and manage workflows securely.' },
              { num: '05', title: 'Complete Audit Trails', content: 'Maintain a verifiable record of every action, approval, and workflow change to support compliance and governance.' }
            ].map((item, index) => {
              const isActive = activeAccordion === index;
              return (
                <div key={index} className={`accordion-item ${isActive ? 'active' : ''}`}>
                  <button className="accordion" onClick={() => toggleAccordion(index)}>
                    <div className="acc-title">
                      <span className="acc-num">{item.num}</span> {item.title}
                    </div>
                    <div className="acc-icon">{isActive ? '-' : '+'}</div>
                  </button>
                  <div className="panel" style={{ maxHeight: isActive ? '200px' : null }}>
                    <div className="panel-content">
                      {item.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bento-cta">
          <div className="bento-left">
            <h3>Work becomes simpler when everything lives in one place.</h3>
            <p>Manage tasks, track deadlines, and collaborate with clarity.</p>

            <Link to={PATHS.PUBLIC.REGISTER} className="learn-more">
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 7h10v10" />
                  <path d="M7 17 17 7" />
                </svg>
              </span>
              <p>Learn more</p>
            </Link>
          </div>
          <div className="bento-right">
            <h3>Great ideas deserve fast execution.</h3>
            <p>Our tools help teams turn plans into progress.</p>
          </div>
        </section>

        <div className="final-cta">
          <h2 className="problem-text">
            The Future of Operational Workflows starts here
          </h2>
          <Link to={PATHS.PUBLIC.REGISTER} className="btn-outline-blue">Get Started FREE</Link>
        </div>

        <div className="contact-header">
          <span className="badge dark"><p className="contact-title">Contact Us</p></span>
          <p>Connect with Us. Let's Discuss Your <br />Business Needs.</p>
        </div>
        <section id="contact" className="contact-section">
          <div className="contact-form-container">
            <form onSubmit={handleContactSubmit}>
              <div className="radio-group">
                <label><input type="radio" name="intent" value="say_hi" checked={intent === 'say_hi'} onChange={(e) => setIntent(e.target.value)} /> Say Hi</label>
                <label><input type="radio" name="intent" value="quote" checked={intent === 'quote'} onChange={(e) => setIntent(e.target.value)} /> Get a Quote</label>
              </div>
              <div className="input-group">
                <label>Name*</label>
                <input type="text" required placeholder="Your Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Email*</label>
                <input type="email" required placeholder="Your Email" />
              </div>
              <div className="input-group">
                <label>Message*</label>
                <textarea required placeholder={intent === 'quote' ? "Please describe your project requirements and estimated budget..." : "Message"} rows="4"></textarea>
              </div>
              <button type="submit" className="btn-primary full-width">
                {intent === 'quote' ? "Request Quote" : "Send Message"}
              </button>
            </form>
          </div>

          <div className="contact-graphics">
            <img src="/assets/images/contact-stars.png" alt="Decorative Stars" />
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-top">
          <div className="footer-logo">
            <img src="/assets/images/logo-light.svg" alt="OfficeSync Logo" />
          </div>
          <div className="footer-nav">
            <a href="#">Company</a>
            <a href="#">Product</a>
            <a href="#features">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Resources</a>
          </div>
          <div className="footer-social">
            {/* Social Icons (kept original SVGs) */}
            <a href="#" className="social-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
            <a href="#" className="social-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg></a>
            <a href="#" className="social-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
          </div>
        </div>

        <div className="footer-middle">
          <div className="contact-info">
            <span className="badge light">Contact us:</span>
            <p>Email: info@officesync.com</p>
            <p>Phone: 555-567-XXXX</p>
            <p>Address: IIIT Sricity<br />Chittoor District, Andhra Pradesh</p>
          </div>

          <div className="footer-newsletter">
            <form id="newsletterForm" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
              <input type="email" placeholder="Email" required />
              <button type="submit">Subscribe to news</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 OfficeSync. All Rights Reserved.</p>
          <div className="legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}