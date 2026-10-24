"use client";

import React from "react";
import Link from "next/link";
import { ExperimentMetadata } from "@/lib/experiments";

interface ExperimentCardProps {
  experiment: ExperimentMetadata;
  onSelect: (experiment: ExperimentMetadata) => void;
}

export default function ExperimentCard({ experiment, onSelect }: ExperimentCardProps) {
  const isLive = experiment.status === "active";

  return (
    <article
      id={`exp-${experiment.slug}`}
      className={`exp-card ${isLive ? "card-live" : "card-upcoming"}`}
      style={
        {
          "--accent-color": experiment.accentColor,
          "--accent-glow": experiment.accentGlow,
        } as React.CSSProperties
      }
    >
      {/* Top Banner / Tags */}
      <div className="card-top-row">
        <div className="card-category-cluster">
          <span className="card-icon">{experiment.icon}</span>
          <span className="card-category-label">{experiment.category}</span>
        </div>

        <div className="card-status-cluster">
          <span className="card-diff-tag">{experiment.difficulty}</span>
          <span className={`status-pill ${isLive ? "pill-live" : "pill-upcoming"}`}>
            <span className={`status-dot ${isLive ? "dot-pulsing" : ""}`} />
            {isLive ? "LIVE NOW" : "ROADMAP"}
          </span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="card-headline">
        <h3 className="card-title">{experiment.title}</h3>
        <p className="card-subtitle">{experiment.subtitle}</p>
      </div>

      {/* Summary */}
      <p className="card-summary">{experiment.summary}</p>

      {/* Key Formula Snippet */}
      {experiment.keyFormulas.length > 0 && (
        <div className="card-formula-preview">
          <span className="formula-tag">PRIMARY EQUATION:</span>
          <code className="formula-inline">{experiment.keyFormulas[0].math}</code>
        </div>
      )}

      {/* Tags */}
      <div className="card-tags-row">
        {experiment.tags.slice(0, 3).map((tag, idx) => (
          <span key={idx} className="card-tag-pill">
            #{tag}
          </span>
        ))}
      </div>

      {/* Card Action Buttons */}
      <div className="card-actions-row">
        {isLive ? (
          <>
            <Link href={experiment.route} className="btn-card-launch">
              <span>Launch 3D Lab</span>
              <span className="arrow-launch">↗</span>
            </Link>
            <button
              type="button"
              onClick={() => onSelect(experiment)}
              className="btn-card-details"
              title="View Physics Equations &amp; Background"
            >
              Theory &amp; Specs
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(experiment)}
              className="btn-card-launch upcoming-btn"
            >
              <span>Explore Physics &amp; Specs</span>
              <span>ℹ</span>
            </button>
            <span className="upcoming-tag-note">Phase Roadmap</span>
          </>
        )}
      </div>
    </article>
  );
}
