import { Fragment, useEffect, useMemo, useState } from 'react';
import type { AttemptState, ExamBundle, Manifest, ManifestEntry, Question } from './types';

const emptyAttempt: AttemptState = {
  answers: {},
  flagged: {},
  elapsedSeconds: 0,
  timerEnabled: true
};

type Screen = 'login' | 'home' | 'intro' | 'test' | 'results' | 'progress';

type AttemptRecord = {
  examId: string;
  examYear: number;
  date: string;
  percent: number;
  correct: number;
  total: number;
  timerEnabled: boolean;
  elapsedSeconds: number;
};

function AnimatedMathSky() {
  const symbols = ['+', '−', '×', '÷', '★', '✓'];
  return (
    <div className="math-sky" aria-hidden="true">
      {symbols.map((symbol, index) => (
        <span
          key={`${symbol}-${index}`}
          className="floaty"
          style={{
            left: `${8 + index * 14}%`,
            animationDelay: `${index * 0.6}s`
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function normalizeAnswer(value: string | any) {
  if (value == null || typeof value !== 'string') return '';
  return value.replace(/,/g, '').trim().toLowerCase();
}

function scoreQuestion(question: Question, answer: string | string[] | Record<string, string> | undefined) {
  if (!answer) return false;

  if (question.answerRule.kind === 'multi_select') {
    const arr = answer as string[];
    if (!Array.isArray(arr)) return false;
    const correctArr = question.answerRule.correct;
    if (arr.length !== correctArr.length) return false;
    return correctArr.every((v) => arr.includes(v));
  }

  if (question.answerRule.kind === 'inline_choice') {
    const obj = answer as Record<string, string>;
    if (typeof obj !== 'object') return false;
    const blanks = question.answerRule.blanks;
    return blanks.every((b) => normalizeAnswer(obj[b.id] ?? '') === normalizeAnswer(b.correct));
  }

  if (question.answerRule.kind === 'drag_drop') {
    const obj = answer as Record<string, string>;
    if (typeof obj !== 'object') return false;
    const dropZones = question.answerRule.dropZones;
    return Object.keys(dropZones).every(
      (dzId) => normalizeAnswer(obj[dzId] ?? '') === normalizeAnswer(dropZones[dzId])
    );
  }

  if (question.answerRule.kind === 'single_choice') {
    return normalizeAnswer(answer as string) === normalizeAnswer(question.answerRule.correct);
  }

  if (question.answerRule.kind === 'numeric_equivalent') {
    return question.answerRule.acceptedValues.some(
      (accepted) => normalizeAnswer(accepted) === normalizeAnswer(answer as string)
    );
  }

  return false;
}

function getDinoForYear(year: number) {
  const mapping: Record<number, string> = {
    2018: 'dino_main_trans.png',
    2019: 'dino1_trans.png',
    2021: 'dino2_trans.png',
    2022: 'dino7_trans.png',
    2023: 'dino5_trans.png',
    2024: 'dino6_trans.png',
    2025: 'dino4_trans.png'
  };
  return `${import.meta.env.BASE_URL}dinos/${mapping[year] || 'dino_main_trans.png'}`;
}

function App() {
  const [activeUser, setActiveUser] = useState<string | null>(() => localStorage.getItem('math-staar-user') || null);
  const [examScores, setExamScores] = useState<Record<string, number>>(() => {
    const user = localStorage.getItem('math-staar-user');
    if (!user) return {};
    const saved = localStorage.getItem(`math-staar-scores:${user}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [screen, setScreen] = useState<Screen>(() => localStorage.getItem('math-staar-user') ? 'home' : 'login');
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedYear, setSelectedYear] = useState<ManifestEntry | null>(null);
  const [exam, setExam] = useState<ExamBundle | null>(null);
  const [attempt, setAttempt] = useState<AttemptState>(emptyAttempt);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedDragOption, setSelectedDragOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);
  const [attemptHistory, setAttemptHistory] = useState<AttemptRecord[]>(() => {
    const user = localStorage.getItem('math-staar-user');
    if (!user) return [];
    const saved = localStorage.getItem(`math-staar-history:${user}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function fetchManifest() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/exams/manifest.json`);
        const json = (await response.json()) as Manifest;
        setManifest(json);
      } catch {
        setError('Could not load the year list.');
      } finally {
        setLoading(false);
      }
    }

    void fetchManifest();
  }, []);

  useEffect(() => {
    setSelectedDragOption(null);
  }, [questionIndex]);

  useEffect(() => {
    if (screen !== 'test' || !attempt.timerEnabled) return;

    const id = window.setInterval(() => {
      setAttempt((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + 1 }));
    }, 1000);

    return () => window.clearInterval(id);
  }, [screen, attempt.timerEnabled]);

  useEffect(() => {
    if (!exam) return;
    sessionStorage.setItem(`math-staar-ishaan:${exam.id}`, JSON.stringify(attempt));
  }, [attempt, exam]);

  const currentQuestion = exam?.questions[questionIndex];

  const results = useMemo(() => {
    if (!exam) return null;

    const correct = exam.questions.filter((question) => scoreQuestion(question, attempt.answers[question.id])).length;
    const total = exam.questions.length;
    const percent = Math.round((correct / total) * 100);

    const byCategory = new Map<string, { correct: number; total: number }>();
    const byReadiness = new Map<string, { correct: number; total: number }>();

    exam.questions.forEach((question) => {
      const categoryKey = `Category ${question.metadata.reportingCategory}`;
      const readinessKey = question.metadata.readinessType;
      const isCorrect = scoreQuestion(question, attempt.answers[question.id]);

      const category = byCategory.get(categoryKey) ?? { correct: 0, total: 0 };
      category.total += 1;
      category.correct += isCorrect ? 1 : 0;
      byCategory.set(categoryKey, category);

      const readiness = byReadiness.get(readinessKey) ?? { correct: 0, total: 0 };
      readiness.total += 1;
      readiness.correct += isCorrect ? 1 : 0;
      byReadiness.set(readinessKey, readiness);
    });

    return {
      correct,
      total,
      percent,
      byCategory: Array.from(byCategory.entries()),
      byReadiness: Array.from(byReadiness.entries())
    };
  }, [attempt.answers, exam]);

  async function chooseYear(entry: ManifestEntry) {
    setSelectedYear(entry);
    setScreen('intro');

    if (entry.status !== 'playable') return;

    const response = await fetch(`${import.meta.env.BASE_URL}data/exams/${entry.dataFile}`);
    const jsonText = await response.text();
    const processedText = jsonText.replace(/"\/images\//g, `"${import.meta.env.BASE_URL}images/`);
    const json = JSON.parse(processedText) as ExamBundle;
    setExam(json);

    const saved = sessionStorage.getItem(`math-staar-ishaan:${json.id}`);
    setAttempt(saved ? (JSON.parse(saved) as AttemptState) : emptyAttempt);
    setQuestionIndex(0);
  }

  function startExam() {
    if (!exam) return;
    setScreen('test');
  }

  function updateAnswer(questionId: string, value: string | string[] | Record<string, string>) {
    setAttempt((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: value
      }
    }));
  }

  function toggleFlag(questionId: string) {
    setAttempt((current) => ({
      ...current,
      flagged: {
        ...current.flagged,
        [questionId]: !current.flagged[questionId]
      }
    }));
  }

  function submitExam() {
    if (!exam) return;
    const unansweredItems = exam.questions.filter((question) => !attempt.answers[question.id]).map(q => q.itemNumber);
    if (unansweredItems.length > 0) {
      setUnansweredList(unansweredItems);
      return;
    }
    setScreen('results');
  }

  function handleNextOrFinish(action: 'next' | 'finish') {
    if (!currentQuestion) return;

    if (currentQuestion.answerRule.kind === 'multi_select') {
      const requiredAnswers = currentQuestion.answerRule.correct.length;
      const currentAnswers = (attempt.answers[currentQuestion.id] as string[]) || [];

      if (currentAnswers.length > 0 && currentAnswers.length < requiredAnswers) {
        window.alert(`This question requires ${requiredAnswers} answers, but you only selected ${currentAnswers.length}. You must select all required answers before moving on!`);
        return;
      }
    }

    if (action === 'next') {
      setQuestionIndex(c => c + 1);
    } else {
      if (!exam) return;
      // Re-calculate the score here to guarantee freshness
      const correct = exam.questions.filter((question) => scoreQuestion(question, attempt.answers[question.id])).length;
      const total = exam.questions.length;
      const computedPercent = Math.round((correct / total) * 100);

      setExamScores(prev => {
        const currentBest = prev[exam.id] || 0;
        if (computedPercent > currentBest) {
          const nextScores = { ...prev, [exam.id]: computedPercent };
          if (activeUser) {
            localStorage.setItem(`math-staar-scores:${activeUser}`, JSON.stringify(nextScores));
          }
          return nextScores;
        }
        return prev;
      });

      // Log attempt record
      const record: AttemptRecord = {
        examId: exam.id,
        examYear: selectedYear?.year ?? 0,
        date: new Date().toISOString(),
        percent: computedPercent,
        correct,
        total,
        timerEnabled: attempt.timerEnabled,
        elapsedSeconds: attempt.elapsedSeconds,
      };
      setAttemptHistory(prev => {
        const next = [record, ...prev];
        if (activeUser) {
          localStorage.setItem(`math-staar-history:${activeUser}`, JSON.stringify(next));
        }
        return next;
      });

      setScreen('results');
      window.scrollTo({ top: 0 });
    }
  }

  function resetProgress() {
    setScreen('home');
    setShowReview(false);
  }

  const renderQuestionTable = (table: NonNullable<Question['table']>) => (
    <div className="question-table-container">
      {table.title && <h4 className="question-table-title">{table.title}</h4>}
      <table className="question-table">
        {table.orientation !== 'horizontal' && table.headers && table.headers.length > 0 && (
          <thead>
            <tr>
              {table.headers.map((h, i) => <th key={`th-${i}`}>{h}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={`tr-${i}`}>
              {table.orientation === 'horizontal' ? (
                <>
                  <th key={`th-col-${i}`}>{row[0]}</th>
                  {row.slice(1).map((cell, j) => <td key={`td-${j}`}>{cell}</td>)}
                </>
              ) : (
                row.map((cell, j) => <td key={`td-${j}`}>{cell}</td>)
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page-shell">
      {screen !== 'test' && (
        <>
          <div className="pterodactyl-wrapper">
            <img src={`${import.meta.env.BASE_URL}dinos/pterodactyl.png`} className="pterodactyl-sprite" alt="Flying Pterodactyl" aria-hidden="true" />
          </div>
          
          <img src={`${import.meta.env.BASE_URL}dinos/dino3.webp`} className="dino-ambient-left ambient-bob" alt="Red T-Rex Ambient" aria-hidden="true" />
          <img src={`${import.meta.env.BASE_URL}dinos/dino_right_transparent.png`} className="dino-ambient-right ambient-bob" alt="New Right Ambient Dino" aria-hidden="true" />
        </>
      )}

      <div className="firefly-layer" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i} 
            className="firefly" 
            style={{ 
              left: `${Math.random() * 100}vw`, 
              top: `${Math.random() * 100}vh`, 
              animationDelay: `${Math.random() * 5}s`,
              transform: `scale(${0.5 + Math.random() * 1.5})`
            }} 
          />
        ))}
      </div>
      {showExitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '2rem', color: 'var(--earth-brown)', marginTop: 0 }}>Leaving so soon?</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-dark)' }}>Are you sure you want to stop exploring? Your progress is automatically saved.</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowExitModal(false)}>Keep Going!</button>
              <button className="danger-button" onClick={() => {
                setShowExitModal(false);
                setScreen('home');
              }}>Exit to Camp</button>
            </div>
          </div>
        </div>
      )}

      {screen !== 'test' && screen !== 'login' && (
        <header className="site-header" style={{ flexWrap: 'wrap', justifyContent: 'space-between', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
            <div className="title-badge" style={{ width: '64px', height: '64px', padding: '10px', overflow: 'hidden', background: '#3b8655', borderRadius: '12px', border: '3px solid #6ccb8e' }}>
              <img src={`${import.meta.env.BASE_URL}Ishaan.png`} alt="Ishaan" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', borderRadius: '8px' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p className="eyebrow" style={{ margin: '0 0 4px 0', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px', fontWeight: 900, color: '#1b5e20' }}>ISHAAN'S DINO JUNGLE SAFARI</p>
              <h1 style={{ margin: 0 }}>Math STAAR Test Prep</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <button className="primary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setScreen('progress')}>📊 Progress</button>
            <span style={{ color: 'var(--earth-dark)', fontWeight: 800, fontFamily: '"Comic Sans MS", "Comic Sans", cursive', fontSize: '1.2rem', padding: '0 8px' }}>{activeUser?.replace('_', ' ').toUpperCase()}</span>
            <button className="secondary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => {
              localStorage.removeItem('math-staar-user');
              setActiveUser(null);
              setExamScores({});
              setScreen('login');
            }}>Log Out</button>
          </div>
        </header>
      )}

      {screen === 'login' && (
        <div className="test-layout" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 100 }}>
          <form className="card-panel" style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }} onSubmit={(e) => {
            e.preventDefault();
            const fn = (e.currentTarget.elements.namedItem('firstName') as HTMLInputElement).value;
            const ln = (e.currentTarget.elements.namedItem('lastName') as HTMLInputElement).value;
            const userId = `${fn.trim().toLowerCase()}_${ln.trim().toLowerCase()}`;
            if (!userId.match(/^[a-z]+_[a-z]+$/)) {
              alert('Please enter a valid First and Last name without spaces.');
              return;
            }
            localStorage.setItem('math-staar-user', userId);
            setActiveUser(userId);
            const savedScores = localStorage.getItem(`math-staar-scores:${userId}`);
            setExamScores(savedScores ? JSON.parse(savedScores) : {});
            const savedHistory = localStorage.getItem(`math-staar-history:${userId}`);
            setAttemptHistory(savedHistory ? JSON.parse(savedHistory) : []);
            setScreen('home');
          }}>
            <h2 style={{ fontSize: '2rem', color: '#2d3748' }}>Welcome Explorer!</h2>
            <p>Enter your name to start tracking your jungle safari progress.</p>
            <input name="firstName" placeholder="First Name" required minLength={2} className="blank-select" style={{ width: '100%' }} />
            <input name="lastName" placeholder="Last Name" required minLength={2} className="blank-select" style={{ width: '100%' }} />
            <button type="submit" className="primary-button" style={{ marginTop: '12px' }}>Start Safari</button>
          </form>
        </div>
      )}

      {screen !== 'results' && screen !== 'login' && (
        <main className="main-container">
          {loading && <div className="card-panel"><p>Loading the jungle trail...</p></div>}
          {error && <div className="card-panel error-card"><p>{error}</p></div>}

          {!loading && !error && manifest && screen === 'home' && (
            <div className="home-grid">
              <section className="hero-box" style={{ paddingBottom: '12px' }}>
                <div className="hero-text">
                  <h2>Ready for MATH STAAR Jungle Safari!</h2>
                  <p>Pick a trail below and start exploring. Get ready to stomp through your math skills with instant feedback and step-by-step review!</p>
                  <p style={{ marginTop: '7px', padding: '10px 18px', background: 'rgba(255, 240, 180, 0.95)', border: '2px solid rgba(255, 180, 0, 0.9)', borderRadius: '12px', color: '#8a6300', fontWeight: 'bold', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', textShadow: 'none', fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                    ⭐ Score at least 85% on a level to unlock the next challenge!
                  </p>
                </div>
            </section>

            <div className="perfect-map-overlay" style={{
              position: 'absolute',
              top: '20vmax',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max(100vw, 100vh)',
              height: 'max(100vw, 100vh)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              {/* Dashed ellipse trace matching the background oval */}
              <svg className="trail-path-svg" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }} aria-hidden="true">
                <ellipse cx="50%" cy="29.8%" rx="24.3%" ry="17.3%" fill="none" stroke="rgba(255,255,255,0.0)" strokeWidth="2" strokeDasharray="8 8" />
              </svg>

              {/* Realistic Animated Water Lake perfectly aligning with background glow */}
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <filter id="water-filter">
                  <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise">
                    <animate attributeName="baseFrequency" values="0.015; 0.025; 0.015" dur="10s" repeatCount="indefinite" />
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="B" />
                </filter>
              </svg>
              <div className="lake-water" style={{ pointerEvents: 'none', top: '29.8%' }} />

              {manifest.years.map((entry, index) => {
                const levelNum = index + 1;
                // Mapped positions for 100vw/100vh overlay
                const manualPositions = [
                  { left: 50, top: 11.6 },  // L1: Top center
                  { left: 68.9, top: 16.4 }, // L2: Upper right
                  { left: 72.5, top: 33.2 }, // L3: Right
                  { left: 59, top: 41.6 }, // L4: Lower right
                  { left: 40.1, top: 41.6 }, // L5: Lower left
                  { left: 26.6, top: 33.2 }, // L6: Left
                  { left: 32, top: 16.4 }, // L7: Upper left
                ];
                const { left, top } = manualPositions[index];

                // Manual dino offsets (X px, Y px) — user-tunable
                const dinoOffsets = [
                  { x: 55,  y: 73,  h: 85 }, // L1: straight up
                  { x: 24,  y: -5,  h: 85 }, // L2: upper-right
                  { x: 40,  y: 10,  h: 85 }, // L3: right
                  { x: 15,  y: -20, h: 115 }, // L4: lower-right (larger)
                  { x: -20, y: -16, h: 115 }, // L5: lower-left  (larger)
                  { x: 20,  y: 0,   h: 115 }, // L6: left        (larger)
                  { x: -20, y: -10, h: 85 }, // L7: upper-left
                ];
                const dinoOffsetX = dinoOffsets[index].x;
                const dinoOffsetY = dinoOffsets[index].y;
                const dinoHeight = dinoOffsets[index].h;

                // Mountain color hues to match dinos:
                const mountainHues = [
                  '-50deg',  // L1: Orange
                  '60deg',   // L2: Teal
                  '230deg',  // L3: Pink
                  '30deg',   // L4: Light Green
                  '0deg',    // L5: Green
                  '-70deg',  // L6: Orange/Red
                  '0deg',    // L7: Green
                ];
                const hue = mountainHues[index % mountainHues.length];

                // Progression Logic: Unlock if Level 1, or if previous level has score >= 85
                const toExamId = (e: ManifestEntry) => `staar-g3-math-${(e.dataFile ?? `${e.slug}.json`).replace('.json', '')}`;
                const prevEntry = index > 0 ? manifest.years[index - 1] : null;
                const isLocked = index > 0 && (examScores[toExamId(prevEntry!)] || 0) < 85;
                const currentScore = examScores[toExamId(entry)];
                const hasStar = currentScore !== undefined && currentScore >= 85;

                return (
                  <div
                    key={entry.slug}
                    className="mountain-row"
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                      margin: 0,
                      width: 'auto',
                      zIndex: top > 60 ? 10 : 1,
                      filter: 'none',
                      transition: 'all 0.4s ease'
                    }}
                  >
                    <button
                      className={`mountain-button ${entry.status}`}
                      onClick={() => {
                        if (!isLocked) chooseYear(entry);
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* Dino positioned on the outside of the mountain, facing away from center */}
                        <img
                          src={getDinoForYear(entry.year)}
                          alt={`Level ${levelNum} Dino`}
                          className="mountain-dino dino-bob"
                          style={{
                            left: `calc(50% + ${dinoOffsetX}px)`,
                            top: `calc(-25px + ${dinoOffsetY}px)`,
                            transform: 'translate(-50%, 0)',
                            height: dinoHeight ? `${dinoHeight}px` : undefined,
                            filter: 'none',
                          }}
                        />

                        {/* Level flag on peak */}
                        <div className="mountain-flag" style={{ filter: isLocked ? 'opacity(0.6) grayscale(0.8)' : 'none' }}>
                          <div className="flag-pole" />
                          <div className="flag-banner">
                            Level {levelNum}
                          </div>
                        </div>

                        {/* Mountain image mapped to dino hue */}
                        <img 
                          src={`${import.meta.env.BASE_URL}dinos/mountain_vines_clean.png`}
                          alt="Jungle Mountain" 
                          className="mountain-shape" 
                          style={{ objectFit: 'contain', filter: `hue-rotate(${hue}) saturate(${isLocked ? 0.2 : 1.2}) opacity(${isLocked ? 0.7 : 1}) grayscale(${isLocked ? 0.8 : 0})` }}
                        />

                        {hasStar && (
                          <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', perspective: '200px', zIndex: 20 }}>
                            <div className="star-badge" style={{ fontSize: '3.5rem', color: '#FFD700', textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.8)', animation: 'star-glow-spin 3s ease-in-out infinite', transformStyle: 'preserve-3d' }}>★</div>
                          </div>
                        )}
                        {isLocked && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.2rem', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' }}>🔒</div>
                        )}
                      </div>

                      {/* Info overlay at mountain base */}
                      <div className="mountain-info">
                        <span className={`mountain-status ${entry.status}`}>
                          {isLocked ? '🔒 Locked' : (entry.status === 'playable' ? '▶ Play' : 'Draft')}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {screen === 'progress' && (
          <main className="main-container" style={{ maxWidth: '900px' }}>
            <section className="card-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '2.2rem', color: 'var(--earth-brown)', margin: 0 }}>📊 Progress Report</h2>
                <button className="secondary-button" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setScreen('home')}>← Back to Dashboard</button>
              </div>

              {attemptHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ fontSize: '4rem', margin: '0 0 16px 0' }}>🦕</p>
                  <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--earth-dark)' }}>No exams taken yet!</p>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-light)' }}>Complete an exam to see your progress here.</p>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', padding: '20px', borderRadius: '16px', color: 'white', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>{attemptHistory.length}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.9 }}>Total Attempts</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #FF8F00, #FFCA28)', padding: '20px', borderRadius: '16px', color: 'var(--earth-dark)', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>{new Set(attemptHistory.map(a => a.examId)).size}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.9 }}>Exams Attempted</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #1565C0, #42A5F5)', padding: '20px', borderRadius: '16px', color: 'white', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>{Math.round(attemptHistory.reduce((sum, a) => sum + a.percent, 0) / attemptHistory.length)}%</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.9 }}>Average Score</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #6A1B9A, #AB47BC)', padding: '20px', borderRadius: '16px', color: 'white', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }}>{Math.max(...attemptHistory.map(a => a.percent))}%</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.9 }}>Best Score</p>
                    </div>
                  </div>

                  {/* Attempt History Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>#</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Exam</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Date</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Score</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Result</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Timer</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)' }}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attemptHistory.map((record, idx) => {
                          const d = new Date(record.date);
                          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          const mins = Math.floor(record.elapsedSeconds / 60);
                          const secs = record.elapsedSeconds % 60;
                          const passed = record.percent >= 85;
                          return (
                            <tr key={`${record.date}-${idx}`} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-light)', borderRadius: '12px 0 0 12px' }}>{attemptHistory.length - idx}</td>
                              <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--earth-dark)' }}>Year {record.examYear}</td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                                <div>{dateStr}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{timeStr}</div>
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 900, fontSize: '1.2rem', color: passed ? 'var(--jungle-green)' : '#e74c3c' }}>{record.percent}%</td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ padding: '4px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', background: passed ? 'var(--mint)' : '#ff7675', color: 'white' }}>
                                  {record.correct}/{record.total}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '1.2rem' }}>
                                {record.timerEnabled ? '⏱️' : '—'}
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-light)', borderRadius: '0 12px 12px 0' }}>
                                {record.timerEnabled ? `${mins}m ${secs.toString().padStart(2, '0')}s` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </main>
        )}

        {screen === 'intro' && selectedYear && (
        <main className="intro-layout">
          <section className="card-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={getDinoForYear(selectedYear.year)} alt="Friendly Dino Mascot" className="mascot-img ambient-bob" />
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--earth-brown)', margin: '0 0 16px 0' }}>Year {selectedYear.year} Exam</h2>
              <p style={{ fontSize: '1.2rem', marginBottom: '24px', lineHeight: '1.6' }}>Grab your backpack and get ready for an awesome math adventure! Your friendly dinosaur guides are waiting to help you stomp through these questions. Take your time, do your best, and have fun. You've got this—let's go on a jungle safari!</p>
              
              {selectedYear.status === 'playable' && exam ? (
                <>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="primary-button" onClick={startExam}>Launch Safari</button>
                    <button className="secondary-button" style={{ backgroundColor: '#ff6b6b' }} onClick={() => {
                      if (confirm('Are you sure you want to clear all your answers and start from scratch?')) {
                        setAttempt(emptyAttempt);
                        if (exam) sessionStorage.removeItem(`math-staar-ishaan:${exam.id}`);
                      }
                    }}>Reset Exam</button>
                    <button className="secondary-button" onClick={() => setScreen('home')}>Cancel</button>
                  </div>
                </>
              ) : (
                <button className="secondary-button" onClick={() => setScreen('home')}>Back to Map</button>
              )}
            </div>
          </section>
        </main>
      )}

      {screen === 'test' && exam && currentQuestion && (
         <div className="test-layout">
           {unansweredList.length > 0 && (
             <div className="modal-overlay">
               <div className="modal-content">
                 <h2>Incomplete Exam</h2>
                 <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>You have not answered the following questions:</p>
                 <div className="unanswered-grid">
                   {unansweredList.map((num) => (
                     <button
                       key={num}
                       className="unanswered-badge"
                       title={`Go to Question ${num}`}
                       onClick={() => {
                         const targetIdx = exam.questions.findIndex(q => q.itemNumber === num);
                         if (targetIdx !== -1) {
                           setQuestionIndex(targetIdx);
                           setUnansweredList([]);
                         }
                       }}
                     >
                       #{num}
                     </button>
                   ))}
                 </div>
                  <p style={{ marginBottom: '24px', color: '#555' }}>
                    <strong>Click on a question number to go directly to that question.</strong><br/>
                    You must revisit and answer all of them before finishing the test.
                  </p>
                 <div className="modal-actions">
                   <button className="primary-button" onClick={() => setUnansweredList([])}>Return to Test</button>
                 </div>
               </div>
             </div>
           )}
           <div className="test-top-bar">
             <div className="progress-pill">
               Question {questionIndex + 1} of {exam.questions.length}
             </div>
             {attempt.timerEnabled && <div className="timer-pill">{formatTime(attempt.elapsedSeconds)}</div>}
           </div>

           <div className="question-scroll-zone">
             <div className="card-panel">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {currentQuestion.stem.split('\n').map((paragraph, index) => (
                      <Fragment key={index}>
                        {currentQuestion.itemType === 'inline_choice' && currentQuestion.answerRule.kind === 'inline_choice' && paragraph.includes('[BLANK_') ? (
                          <div className="question-stem">
                            {paragraph.split(/(\[BLANK_\d+\])/g).map((part, pIdx) => {
                              const blankMatch = part.match(/\[(BLANK_\d+)\]/);
                              if (blankMatch) {
                                const blankId = blankMatch[1];
                                const blankDef = (currentQuestion.answerRule as any).blanks?.find((b: any) => b.id === blankId);
                                if (blankDef) {
                                  const obj = (attempt.answers[currentQuestion.id] as Record<string, string>) || {};
                                  return (
                                    <select 
                                      key={pIdx}
                                      value={obj[blankId] ?? ''}
                                      onChange={(e) => updateAnswer(currentQuestion.id, { ...obj, [blankId]: e.target.value })}
                                      className="blank-select"
                                      style={{ margin: '0 4px', display: 'inline-block', fontSize: '1rem', padding: '4px 8px', verticalAlign: 'middle' }}
                                    >
                                      <option value="">- Select -</option>
                                      {(blankDef.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  );
                                }
                              }
                              return <span key={pIdx} dangerouslySetInnerHTML={{ __html: part }} />;
                            })}
                          </div>
                        ) : (
                          <div className="question-stem" dangerouslySetInnerHTML={{ __html: paragraph }} />
                        )}
                        {index === 0 && currentQuestion.table && renderQuestionTable(currentQuestion.table)}
                        {index === 0 && currentQuestion.imageUrl && (
                          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            <img src={currentQuestion.imageUrl} alt="Question Reference" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                 <button className={`flag-button ${attempt.flagged[currentQuestion.id] ? 'active' : ''}`} onClick={() => toggleFlag(currentQuestion.id)}>
                   {attempt.flagged[currentQuestion.id] ? '⭐ Flagged' : '☆ Flag for review'}
                 </button>
               </div>
               
               {currentQuestion.directions && <p className="directions-text" style={{ marginTop: '-16px' }}>{currentQuestion.directions}</p>}

               {currentQuestion.itemType === 'multiple_choice' && currentQuestion.options && (
                  <div className={`option-stack ${currentQuestion.optionsLayout === 'grid_2col' ? 'grid-2col' : currentQuestion.optionsLayout === 'grid_2col_vertical' ? 'grid-2col-vert' : ''}`}>
                    {currentQuestion.options.map((option) => {
                      const selected = attempt.answers[currentQuestion.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          className={`option-card ${selected ? 'selected' : ''}`}
                          onClick={() => updateAnswer(currentQuestion.id, option.id)}
                        >
                          <span className="option-chip">{option.id}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            {option.text && <span style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: option.text }} />}
                            {option.table && renderQuestionTable(option.table)}
                            {option.imageUrl && <img src={option.imageUrl} alt={`Option ${option.id}`} style={{ maxWidth: '100%', maxHeight: '200px', marginTop: option.text ? '8px' : '0', borderRadius: '4px' }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
               )}

              {currentQuestion.itemType === 'griddable_numeric' && (
                <div className="numeric-wrap">
                  <input
                    id={currentQuestion.id}
                    className="numeric-input"
                    inputMode={currentQuestion.metadata?.isVoided ? "text" : "numeric"}
                    placeholder="Type a number"
                    disabled={currentQuestion.metadata?.isVoided === true}
                    value={currentQuestion.metadata?.isVoided ? (currentQuestion.answerRule as any).canonicalValue : ((attempt.answers[currentQuestion.id] as string) ?? '')}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (!/^-?\d*\.?\d*$/.test(val)) {
                        window.alert("Please enter only numbers.");
                        return;
                      }
                      updateAnswer(currentQuestion.id, val);
                    }}
                  />
                </div>
              )}

              {currentQuestion.itemType === 'multi_select' && currentQuestion.options && (
                <div className={`option-stack ${currentQuestion.optionsLayout === 'grid_2col' ? 'grid-2col' : currentQuestion.optionsLayout === 'grid_2col_vertical' ? 'grid-2col-vert' : currentQuestion.optionsLayout === 'grid_6col' ? 'grid-6col' : ''}`}>

                  {currentQuestion.options.map((option) => {
                    const arr = (attempt.answers[currentQuestion.id] as string[]) || [];
                    const selected = arr.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        className={`option-card ${selected ? 'selected' : ''}`}
                        onClick={() => {
                          const newArr = selected ? arr.filter(v => v !== option.id) : [...arr, option.id];
                          updateAnswer(currentQuestion.id, newArr);
                        }}
                      >
                        <span className="option-chip">{selected ? '✓' : option.id}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          {option.text && <span style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: option.text }} />}
                          {option.table && renderQuestionTable(option.table)}
                          {option.imageUrl && <img src={option.imageUrl} alt={`Option ${option.id}`} style={{ maxWidth: '100%', maxHeight: '200px', marginTop: option.text ? '8px' : '0', borderRadius: '4px' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}



              {currentQuestion.itemType === 'drag_drop' && currentQuestion.answerRule.kind === 'drag_drop' && (
                <div className="drag-drop-wrap">
                  <p className="directions-text">Tap an option, then tap where it belongs:</p>
                  <div className="drag-options">
                    {currentQuestion.answerRule.options.map((opt) => (
                      <button 
                        key={opt}
                        className={`drag-chip ${selectedDragOption === opt ? 'active' : ''}`}
                        onClick={() => setSelectedDragOption(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div className="drop-zones">
                    {currentQuestion.answerRule.sentenceTemplate ? (
                      <p className="drag-drop-sentence" style={{ fontSize: '1.25rem', lineHeight: '2.5' }}>
                        {currentQuestion.answerRule.sentenceTemplate.split(/(\[BLANK_[0-9]+\])/).map((part, i) => {
                          const match = part.match(/\[(BLANK_[0-9]+)\]/);
                          if (match) {
                            const dz = match[1];
                            const obj = (attempt.answers[currentQuestion.id] as Record<string, string>) || {};
                            const currentVal = obj[dz];
                            return (
                               <button
                                 key={dz}
                                 className={`drop-zone inline-drop-zone ${currentVal ? 'filled' : ''} ${selectedDragOption ? 'ready' : ''}`}
                                 style={{ display: 'inline-flex', alignItems: 'center', margin: '0 8px', padding: '4px 12px', minHeight: '40px', verticalAlign: 'middle' }}
                                 onClick={() => {
                                   if (selectedDragOption) {
                                     updateAnswer(currentQuestion.id, { ...obj, [dz]: selectedDragOption });
                                     setSelectedDragOption(null);
                                   } else if (currentVal) {
                                     const newObj = { ...obj };
                                     delete newObj[dz];
                                     updateAnswer(currentQuestion.id, newObj);
                                   }
                                 }}
                               >
                                 {currentVal ? (
                                   <>
                                     <span style={{ marginRight: '8px' }}>{currentVal}</span>
                                     <span className="clear-icon" style={{ cursor: 'pointer', color: '#ff4d4f', fontWeight: 'bold' }} onClick={(e) => { e.stopPropagation(); const newObj = { ...obj }; delete newObj[dz]; updateAnswer(currentQuestion.id, newObj); }}>✕</span>
                                   </>
                                 ) : <span style={{ color: '#aaa' }}>{dz.replace('BLANK_', 'Box ')}</span>}
                               </button>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      </p>
                    ) : (
                      Object.keys(currentQuestion.answerRule.dropZones).map((dz) => {
                         const obj = (attempt.answers[currentQuestion.id] as Record<string, string>) || {};
                         const currentVal = obj[dz];
                         return (
                           <button
                             key={dz}
                             className={`drop-zone ${currentVal ? 'filled' : ''} ${selectedDragOption ? 'ready' : ''}`}
                             onClick={() => {
                               if (selectedDragOption) {
                                 updateAnswer(currentQuestion.id, { ...obj, [dz]: selectedDragOption });
                                 setSelectedDragOption(null);
                               } else if (currentVal) {
                                 const newObj = { ...obj };
                                 delete newObj[dz];
                                 updateAnswer(currentQuestion.id, newObj);
                               }
                             }}
                           >
                             {currentVal ? (
                               <>
                                 <span style={{ marginRight: '8px' }}>{currentVal}</span>
                                 <span className="clear-icon" style={{ cursor: 'pointer', color: '#ff4d4f', fontWeight: 'bold' }} onClick={(e) => { e.stopPropagation(); const newObj = { ...obj }; delete newObj[dz]; updateAnswer(currentQuestion.id, newObj); }}>✕</span>
                               </>
                             ) : `Drop ${dz.replace('BLANK_', 'Box ')} here`}
                           </button>
                         );
                      })
                    )}
                  </div>
                </div>
              )}

             </div>
           </div>

           <div className="bottom-action-bar">
             <div className="action-bar-center">
               <button className="danger-button" onClick={() => setShowExitModal(true)}>Leave</button>
               <button className="secondary-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(c => c - 1)}>Back</button>
               {questionIndex < exam.questions.length - 1 && (
                 <button className="primary-button" onClick={() => handleNextOrFinish('next')}>Next</button>
               )}
               <button 
                 className="primary-button" 
                 style={{ marginLeft: questionIndex < exam.questions.length - 1 ? '48px' : '0' }}
                 onClick={() => handleNextOrFinish('finish')}
               >
                 Finish Test
               </button>
             </div>
           </div>
         </div>
      )}
      </main>
      )}

      {screen === 'results' && exam && results && (
        <main className="results-layout" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          {!showReview ? (
            <section className="score-hero">
              <img src={`${import.meta.env.BASE_URL}dinos/dino2.png`} alt="Happy Dino" className="mascot-img dino-walk" />
              <h2 style={{ fontSize: '3rem', margin: '0', color: 'var(--earth-dark)' }}>Exam Complete!</h2>
              <div className="score-bubble" style={{ background: 'white', padding: '8px 32px', borderRadius: '32px', margin: '8px 0', border: '6px solid var(--sunshine)', fontSize: '4.5rem' }}>{results.percent}%</div>
              <p style={{ color: 'var(--earth-dark)', fontSize: '1.3rem', fontWeight: 900, margin: '0' }}>You got {results.correct} Correct out of {results.total}</p>
              
              <div className="intro-actions" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button className="primary-button" onClick={() => setShowReview(true)}>Review your exam answers</button>
                <button className="secondary-button" onClick={resetProgress}>Back to Dashboard</button>
              </div>
            </section>
          ) : (
            <section style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10, paddingBottom: '64px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--space-dark)', fontSize: '2rem' }}>Exam Review</h2>
                  <p style={{ margin: '8px 0 0 0', color: '#636e72', fontWeight: 600 }}>Score: {results.percent}% ({results.correct} / {results.total})</p>
                </div>
                <button className="secondary-button" onClick={resetProgress}>Back to Dashboard</button>
              </div>

              {exam.questions.map((question) => {
              const answer = attempt.answers[question.id];
              const isCorrect = scoreQuestion(question, answer);
              const wrongExplanation = typeof answer === 'string' && question.rationale.incorrectOptionExplanations ? question.rationale.incorrectOptionExplanations[answer] : undefined;
              
              const correctAnswer = (() => {
                const r = question.answerRule;
                if (r.kind === 'single_choice') return r.correct;
                if (r.kind === 'numeric_equivalent') return r.canonicalValue;
                if (r.kind === 'multi_select') return r.correct.join(', ');
                if (r.kind === 'inline_choice') return r.blanks.map(b => `${b.id}=${b.correct}`).join(', ');
                if (r.kind === 'drag_drop') return Object.entries(r.dropZones).map(([k,v]) => `${k}=${v}`).join(', ');
                return '';
              })();

              const displayAnswer = typeof answer === 'object' ? JSON.stringify(answer) : (answer ?? 'No answer');

              return (
                <article key={question.id} className="card-panel">
                  <div className="review-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--space-dark)' }}>Question {question.itemNumber}</h3>
                    <span className={`result-pill ${isCorrect ? 'correct' : 'incorrect'}`} style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 800 }}>{isCorrect ? 'Score +1' : 'Missed'}</span>
                  </div>
                  <div>
                    <div className="question-stem" style={{ fontSize: '1.25rem', margin: '16px 0', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: question.stem }} />
                    {question.table && renderQuestionTable(question.table)}
                    {question.imageUrl && (
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                        <img src={question.imageUrl} alt="Question Reference" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '2px solid #e9ecef' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Your answer:</strong> {displayAnswer}</p>
                    <p style={{ margin: 0 }}><strong>Correct answer:</strong> {correctAnswer}</p>
                  </div>
                  
                  <div className="review-reasoning" style={{ background: '#f1f2f6', padding: '16px', borderRadius: '12px', marginTop: '16px' }}>
                    <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: `<strong>Here's why:</strong> ${question.rationale.correctExplanation}` }} />
                    {!isCorrect && wrongExplanation && <p style={{ marginTop: '12px', color: '#d63031', marginBottom: 0 }} dangerouslySetInnerHTML={{ __html: `<strong>Why your choice missed:</strong> ${wrongExplanation}` }} />}
                  </div>
                  {question.rationale.remediationTip && (
                    <div className="remediation-box">
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <img src={`${import.meta.env.BASE_URL}dinos/dino5.avif`} alt="Dino Tip" style={{ height: '32px', borderRadius: '8px' }} />
                        Dino Tip:
                      </strong> 
                      {question.rationale.remediationTip}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
          )}
        </main>
      )}
    </div>
  );
}

export default App;

