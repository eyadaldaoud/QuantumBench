import React from "react";
import Link from "next/link";
import { EXPERIMENTS } from "@/lib/experiments";

export default function Footer() {
  return (
    <footer className="platform-footer">
      <div className="platform-footer-container">
        <div className="footer-top-grid">
          {/* Col 1: Platform Brand & Mission */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="footer-brand-icon">⚛</span>
              <span className="footer-brand-title">QUANTALAB</span>
            </div>
            <p className="footer-description">
              An open-source, interactive 3D laboratory platform designed for students, researchers,
              and quantum physics enthusiasts to visualize and manipulate quantum mechanical
              phenomena in the browser.
            </p>
            <div className="footer-tech-badges">
              <span className="tech-badge">Next.js 16</span>
              <span className="tech-badge">React 19</span>
              <span className="tech-badge">Three.js</span>
              <span className="tech-badge">TypeScript</span>
              <span className="tech-badge">Web Audio</span>
            </div>
          </div>

          {/* Col 2: Active & Planned Experiments */}
          <div className="footer-col">
            <h4 className="footer-heading">EXPERIMENTS</h4>
            <ul className="footer-links-list">
              {EXPERIMENTS.map((exp) => (
                <li key={exp.id}>
                  {exp.status === "active" ? (
                    <Link href={exp.route} className="footer-link active-link">
                      <span className="bullet-active">●</span> {exp.title}
                    </Link>
                  ) : (
                    <span className="footer-link planned-link">
                      <span className="bullet-planned">○</span> {exp.title}
                      <span className="footer-tag-soon">Soon</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Educational Concepts */}
          <div className="footer-col">
            <h4 className="footer-heading">CORE PRINCIPLES</h4>
            <ul className="footer-links-list">
              <li className="footer-text-item">Wave-Particle Duality (de Broglie)</li>
              <li className="footer-text-item">Quantum Superposition &amp; Wavefunctions</li>
              <li className="footer-text-item">Observer Effect &amp; State Collapse</li>
              <li className="footer-text-item">Heisenberg Uncertainty Principle</li>
              <li className="footer-text-item">Single-Photon Wavepacket Dynamics</li>
              <li className="footer-text-item">Diffraction &amp; Interference Envelopes</li>
            </ul>
          </div>

          {/* Col 4: Open Source & Community */}
          <div className="footer-col">
            <h4 className="footer-heading">OPEN ARCHITECTURE</h4>
            <p className="footer-subtext">
              Built with a modular experiment registry designed to welcome community-contributed
              simulations.
            </p>
            <div className="footer-cta-box">
              <span className="footer-cta-title">Want to contribute an experiment?</span>
              <p className="footer-cta-desc">
                Follow our step-by-step developer guide in the repository documentation.
              </p>
              <a
                href="https://github.com/eyadaldaoud/QuantaLab"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-github-btn"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="footer-bottom-bar">
          <div className="footer-copy">
            © 2026 QuantaLab — Open Source Quantum Physics Simulator. Released under the MIT License.
          </div>
          <div className="footer-disclaimer">
            Simulations calculate real-time analytical quantum mechanics and Monte Carlo stochastic probabilities.
          </div>
        </div>
      </div>
    </footer>
  );
}
