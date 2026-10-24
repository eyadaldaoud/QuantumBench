"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ExperimentMetadata } from "@/lib/experiments";

interface ExperimentModalProps {
  experiment: ExperimentMetadata | null;
  onClose: () => void;
}

export default function ExperimentModal({ experiment, onClose }: ExperimentModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!experiment) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content experiment-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="exp-modal-title-group">
            <div className="exp-modal-badge-row">
              <span className="exp-modal-icon">{experiment.icon}</span>
              <span
                className="exp-modal-status-badge"
                style={{
                  color: experiment.status === "active" ? "#38e1ff" : "#ffaa3b",
                  borderColor: experiment.status === "active" ? "rgba(56, 225, 255, 0.4)" : "rgba(255, 170, 59, 0.4)",
                  backgroundColor: experiment.status === "active" ? "rgba(56, 225, 255, 0.1)" : "rgba(255, 170, 59, 0.1)",
                }}
              >
                {experiment.status === "active" ? "● LIVE SIMULATION AVAILABLE" : "🚧 IN ROADMAP / DEVELOPMENT"}
              </span>
              <span className="exp-modal-category-badge">{experiment.category}</span>
              <span className="exp-modal-diff-badge">{experiment.difficulty}</span>
            </div>
            <h3 className="exp-modal-title">{experiment.title}</h3>
            <p className="exp-modal-sub">{experiment.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close experiment details"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body exp-modal-body">
          {/* Summary */}
          <div className="exp-modal-section">
            <h4 className="exp-modal-section-title">Physical Overview</h4>
            <p className="exp-modal-text">{experiment.summary}</p>
          </div>

          {/* Historical Significance */}
          <div className="exp-modal-section history-box">
            <h4 className="exp-modal-section-title">Historical &amp; Scientific Significance</h4>
            <div className="history-meta">
              <span><strong>Year:</strong> {experiment.historicalContext.year}</span>
              <span><strong>Key Physicists:</strong> {experiment.historicalContext.discoverers}</span>
            </div>
            <p className="history-quote">&ldquo;{experiment.historicalContext.significance}&rdquo;</p>
          </div>

          {/* Mathematical Foundations */}
          <div className="exp-modal-section">
            <h4 className="exp-modal-section-title">Governing Equations &amp; Formulas</h4>
            <div className="exp-formulas-grid">
              {experiment.keyFormulas.map((f, i) => (
                <div key={i} className="exp-formula-card">
                  <span className="formula-label">{f.label}</span>
                  <div className="formula-math-code">{f.math}</div>
                  <span className="formula-desc">{f.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Planned / Interactive Features */}
          <div className="exp-modal-section">
            <h4 className="exp-modal-section-title">
              {experiment.status === "active" ? "Interactive Lab Features" : "Planned Simulation Apparatus"}
            </h4>
            <ul className="exp-features-checklist">
              {experiment.features.map((feat, i) => (
                <li key={i}>
                  <span className="check-icon">✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Roadmap Milestone Note if planned */}
          {experiment.roadmapMilestone && (
            <div className="exp-modal-section milestone-box">
              <h4 className="exp-modal-section-title">Development Status</h4>
              <p className="milestone-text">{experiment.roadmapMilestone}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer exp-modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>

          {experiment.status === "active" ? (
            <Link href={experiment.route} className="btn-primary-action">
              <span>Launch 3D Simulation Now</span>
              <span>→</span>
            </Link>
          ) : (
            <div className="roadmap-notice">
              <span>Under construction for upcoming release</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
