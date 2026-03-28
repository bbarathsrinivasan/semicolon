"use client";

/**
 * Full-bleed aurora-style gradient wash for the home hero.
 * Heavy blur + drift animations; keep behind content (z-0).
 */
export default function HomeAurora() {
  return (
    <div className="home-aurora" aria-hidden>
      <div className="home-aurora__vignette" />
      <div className="home-aurora__blobs">
        <div className="home-aurora__blob home-aurora__blob--a" />
        <div className="home-aurora__blob home-aurora__blob--b" />
        <div className="home-aurora__blob home-aurora__blob--c" />
        <div className="home-aurora__blob home-aurora__blob--d" />
      </div>
      <div className="home-aurora__sheen" />
    </div>
  );
}
