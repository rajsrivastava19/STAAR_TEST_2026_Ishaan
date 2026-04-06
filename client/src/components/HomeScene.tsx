import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCENE_W,
  SCENE_H,
  LEVELS,
  LAKE,
  HERO_BOX,
  AMBIENT,
  FIREFLIES,
  DINO_IMAGES,
} from '../homeSceneProfiles';
import type { Manifest, ManifestEntry } from '../types';

/* ── Types ────────────────────────────────────────────────── */

interface HomeSceneProps {
  manifest: Manifest;
  examScores: Record<string, number>;
  chooseYear: (entry: ManifestEntry) => void;
  activeUser: string | null;
  isAdmin: boolean;
  onShowProgress: () => void;
  onShowAdmin: () => void;
  onLogout: () => void;
}

/* ── Helpers ──────────────────────────────────────────────── */

const BASE = import.meta.env.BASE_URL;

function getDinoSrc(year: number) {
  return `${BASE}dinos/${DINO_IMAGES[year] || 'dino_main_trans.png'}`;
}

function toExamId(e: ManifestEntry) {
  return `staar-g3-math-${(e.dataFile ?? `${e.slug}.json`).replace('.json', '')}`;
}

/* ── Component ────────────────────────────────────────────── */

export default function HomeScene({
  manifest,
  examScores,
  chooseYear,
  activeUser,
  isAdmin,
  onShowProgress,
  onShowAdmin,
  onLogout,
}: HomeSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  /* Measure viewport and compute uniform scale */
  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const s = Math.min(el.clientWidth / SCENE_W, el.clientHeight / SCENE_H);
    setScale(s);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className="home-scene-viewport" ref={viewportRef}>
      <div
        className="home-scene-stage-shell"
        style={{ width: SCENE_W * scale, height: SCENE_H * scale }}
      >
        <div
          className="home-scene-stage"
          style={{
            width: SCENE_W,
            height: SCENE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* ── Background ──────────────────────────────── */}
          <img
            src={`${BASE}dinos/jungle_bg.png`}
            alt=""
            className="scene-bg"
            draggable={false}
          />

          {/* ── Fireflies ───────────────────────────────── */}
          {FIREFLIES.map((f, i) => (
            <div
              key={`ff-${i}`}
              className="scene-firefly firefly"
              style={{
                left: f.x,
                top: f.y,
                animationDelay: `${f.delay}s`,
                transform: `scale(${f.scale})`,
              }}
            />
          ))}

          {/* ── Lake ────────────────────────────────────── */}
          <svg
            width="0"
            height="0"
            style={{ position: 'absolute' }}
            aria-hidden="true"
          >
            <filter id="water-filter-hs">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015"
                numOctaves={3}
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  values="0.015; 0.025; 0.015"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={12}
                xChannelSelector="R"
                yChannelSelector="B"
              />
            </filter>
          </svg>
          <div
            className="scene-lake"
            style={{
              left: LAKE.cx - LAKE.rx,
              top: LAKE.cy - LAKE.ry,
              width: LAKE.rx * 2,
              height: LAKE.ry * 2,
            }}
          />

          {/* ── Header bar ──────────────────────────────── */}
          <div className="scene-header" style={{ position: 'absolute', top: 0, left: 0, width: SCENE_W, height: 120, boxSizing: 'border-box', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 32px', height: '100%', boxSizing: 'border-box', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <img src={`${BASE}Ishaan.png`} alt="Ishaan" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 16, flexShrink: 0, boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} />
                <div style={{ textAlign: 'left' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#5D4037', textTransform: 'uppercase', letterSpacing: 2 }}>ISHAAN'S DINO JUNGLE SAFARI</h1>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="primary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={onShowProgress}>📊 Progress</button>
                  {isAdmin && (
                    <button className="primary-button" style={{ padding: '8px 16px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #d32f2f, #f44336)' }} onClick={onShowAdmin}>🔧 Admin</button>
                  )}
                  <span style={{ color: '#3E2723', fontWeight: 800, fontFamily: '"Comic Sans MS", "Comic Sans", cursive', fontSize: '1.2rem', padding: '0 8px' }}>{activeUser?.replace('_', ' ').toUpperCase()}</span>
                  <button className="secondary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={onLogout}>Log Out</button>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3E2723', paddingRight: '4px' }}>
                  Need help with the application? Email: <a href="mailto:raj.srivastava@gmail.com" style={{ color: '#0369a1', textDecoration: 'underline' }}>raj.srivastava@gmail.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Hero box ────────────────────────────────── */}
          <div
            className="scene-hero"
            style={{
              position: 'absolute',
              left: HERO_BOX.x,
              top: HERO_BOX.y,
              width: HERO_BOX.w,
              height: HERO_BOX.h,
            }}
          >
            <div className="hero-text" style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2.4rem', margin: '0 0 8px 0' }}>Ready for MATH STAAR Jungle Safari!</h2>
              <p style={{ fontSize: '1.15rem', lineHeight: 1.5, margin: 0 }}>
                Pick a Mountain below and start exploring. Get ready to stomp through your math skills with instant feedback and step-by-step review!
              </p>
            </div>
          </div>

          {/* ── Trail path (subtle dashed oval) ─────────── */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: SCENE_W, height: SCENE_H, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <ellipse
              cx={LAKE.cx}
              cy={LAKE.cy}
              rx={LAKE.rx + 80}
              ry={LAKE.ry + 120}
              fill="none"
              stroke="rgba(255,255,255,0.0)"
              strokeWidth={2}
              strokeDasharray="8 8"
            />
          </svg>

          {/* ── Mountains / Level buttons ───────────────── */}
          {manifest.years.map((entry, index) => {
            const level = LEVELS[index];
            if (!level) return null;

            const levelNum = index + 1;
            const prevEntry = index > 0 ? manifest.years[index - 1] : null;
            const isLocked = index > 0 && (examScores[toExamId(prevEntry!)] || 0) < 85;
            const currentScore = examScores[toExamId(entry)];
            const hasStar = currentScore !== undefined && currentScore >= 85;

            return (
              <div
                key={entry.slug}
                className="scene-mountain"
                style={{
                  position: 'absolute',
                  left: level.x,
                  top: level.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: level.y > 650 ? 10 : 1,
                }}
              >
                <button
                  className={`mountain-button ${entry.status}`}
                  onClick={() => { if (!isLocked) chooseYear(entry); }}
                  style={{ 
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    width: `${level.mountainW}px`,
                    height: `${level.mountainH}px`
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* Dino */}
                    <img
                      src={getDinoSrc(entry.year)}
                      alt={`Level ${levelNum} Dino`}
                      className="mountain-dino dino-bob"
                      style={{
                        left: `calc(50% + ${level.dinoOffX}px)`,
                        top: `${level.dinoOffY}px`,
                        transform: 'translate(-50%, 0)',
                        height: level.dinoH,
                        filter: 'none',
                      }}
                    />

                    {/* Flag */}
                    <div className="mountain-flag" style={{ filter: isLocked ? 'opacity(0.6) grayscale(0.8)' : 'none' }}>
                      <div className="flag-pole" />
                      <div className="flag-banner">Level {levelNum}</div>
                    </div>

                    {/* Mountain shape */}
                    <img
                      src={`${BASE}dinos/mountain_vines_clean.png`}
                      alt="Jungle Mountain"
                      className="mountain-shape"
                      style={{
                        objectFit: 'contain',
                        width: '100%',
                        height: '100%',
                        filter: `hue-rotate(${level.hue}) saturate(${isLocked ? 0.2 : 1.2}) opacity(${isLocked ? 0.7 : 1}) grayscale(${isLocked ? 0.8 : 0})`,
                      }}
                    />

                    {/* Star */}
                    {hasStar && (
                      <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', perspective: 200, zIndex: 20 }}>
                        <div className="star-badge" style={{ fontSize: '3.5rem', color: '#FFD700', textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.8)', animation: 'star-glow-spin 3s ease-in-out infinite', transformStyle: 'preserve-3d' }}>★</div>
                      </div>
                    )}

                    {/* Lock */}
                    {isLocked && (
                      <div style={{ position: 'absolute', top: '58%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.8))' }}>
                        <svg width="48" height="56" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="12" width="18" height="14" rx="3" fill="#FFD700" stroke="#D97706" strokeWidth="1.5"/>
                          <path d="M6 12V7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7V12" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round"/>
                          <circle cx="12" cy="18" r="2" fill="#D97706"/>
                          <path d="M12 20V23" stroke="#D97706" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}

                    {/* Central Checkmark */}
                    {hasStar && (
                      <div style={{ position: 'absolute', top: '58%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#047857" strokeWidth="2"/>
                          <path d="M7 12L10.5 15.5L18 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Status label (Only show Play/Draft) */}
                  {!isLocked && !hasStar && (
                    <div className="mountain-info">
                      <span className={`mountain-status ${entry.status}`}>
                        {entry.status === 'playable' ? '▶ Play' : 'Draft'}
                      </span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}

          {/* ── Ambient dinos ───────────────────────────── */}
          <img
            src={`${BASE}dinos/dino3.webp`}
            alt=""
            className="scene-ambient ambient-bob"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: AMBIENT.leftDino.x,
              top: AMBIENT.leftDino.y,
              width: AMBIENT.leftDino.w,
              height: AMBIENT.leftDino.h,
              filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.5))',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
          <img
            src={`${BASE}dinos/dino_right_transparent.png`}
            alt=""
            className="scene-ambient ambient-bob"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: AMBIENT.rightDino.x,
              top: AMBIENT.rightDino.y,
              width: AMBIENT.rightDino.w,
              height: AMBIENT.rightDino.h,
              filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.5))',
              pointerEvents: 'none',
              zIndex: 5,
              transform: 'scaleX(-1)',
            }}
          />

          {/* ── Pterodactyl ─────────────────────────────── */}
          <div className="scene-ptero-wrapper">
            <img
              src={`${BASE}dinos/pterodactyl.png`}
              alt=""
              className="pterodactyl-sprite"
              aria-hidden="true"
              style={{ width: 200 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
