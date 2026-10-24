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
