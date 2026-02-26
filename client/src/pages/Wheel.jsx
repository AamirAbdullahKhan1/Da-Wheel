import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import SpinningWheel from '../components/SpinningWheel';
import FloatingLines from '../components/FloatingLines';
import ElectricBorder from '../components/ElectricBorder';
import './Wheel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Wheel() {
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [spinDone, setSpinDone] = useState(false);
    const [assignedTheme, setAssignedTheme] = useState(null);
    const [error, setError] = useState('');
    // allThemes: ordered list from DB; themeQuotas: { name: { count, is_full } }
    const [allThemes, setAllThemes] = useState([]);
    const [themeQuotas, setThemeQuotas] = useState({});
    const [quotasLoaded, setQuotasLoaded] = useState(false);
    const wheelKey = useRef(0);

    // Fetch themes + quotas from server
    async function fetchQuotas() {
        try {
            const res = await axios.get(`${API_URL}/themes`);
            // Preserve order from DB for rendering
            const ordered = res.data.map(t => t.theme_name);
            const map = {};
            res.data.forEach(t => { map[t.theme_name] = { count: t.count, is_full: t.is_full }; });
            setAllThemes(ordered);
            setThemeQuotas(map);
            setQuotasLoaded(true);
        } catch {
            setQuotasLoaded(true);
        }
    }

    useEffect(() => {
        const raw = localStorage.getItem('devplay_team');
        if (!raw) { navigate('/'); return; }
        try {
            const data = JSON.parse(raw);
            setTeam(data);
            if (data.spin_completed && data.assigned_theme) {
                setSpinDone(true);
                setAssignedTheme(data.assigned_theme);
            }
        } catch {
            navigate('/');
        }
        fetchQuotas();
    }, [navigate]); // eslint-disable-line

    const availableThemes = allThemes.filter(t => !themeQuotas[t]?.is_full);
    const notReady = !quotasLoaded || allThemes.length === 0;

    function fireConfetti() {
        const end = Date.now() + 3000;
        const colors = ['#6C63FF', '#F5C518', '#a855f7', '#fff', '#8b5cf6'];
        (function frame() {
            confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
            confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    }

    async function handleSpinComplete(theme) {
        setError('');
        try {
            const res = await axios.post(`${API_URL}/spin`, { login_id: team.login_id, theme });
            const updated = { ...team, spin_completed: true, assigned_theme: res.data.assigned_theme };
            localStorage.setItem('devplay_team', JSON.stringify(updated));
            setTeam(updated);
            setAssignedTheme(res.data.assigned_theme);
            setSpinDone(true);
            setSpinning(false);
            fireConfetti();
            // Refresh quotas so UI updates immediately
            fetchQuotas();
        } catch (err) {
            setSpinning(false);
            if (err.response?.status === 403) {
                setError('This team has already spun the wheel!');
            } else if (err.response?.status === 409) {
                // Theme full — re-enable spin so they can try again
                setError('That theme was just taken! Spin again to get a new one.');
                wheelKey.current += 1;
                setSpinning(false);
            } else {
                setError(err.response?.data?.error || 'Spin failed. Please try again.');
            }
        }
    }

    function handleLogout() {
        localStorage.removeItem('devplay_team');
        navigate('/');
    }

    if (!team) return null;

    const attemptsLeft = spinDone ? 0 : 1;

    return (
        <div className="wheel-root">
            {/* Animated background */}
            <div className="wheel-bg-lines">
                <FloatingLines
                    enabledWaves={['top', 'bottom', 'middle']}
                    lineCount={[8]}
                    lineDistance={[29]}
                    bendRadius={10}
                    bendStrength={-1}
                    animationSpeed={1}
                    interactive={true}
                    parallax={true}
                    parallaxStrength={0.2}
                    mixBlendMode="screen"
                />
            </div>
            {/* Navbar — logo + user only */}
            <nav className="wheel-nav">
                <div className="nav-brand">
                    <span className="brand-icon">◈</span>
                    <span className="brand-name">DevPlay<span className="brand-year">'26</span></span>
                </div>
                <div className="nav-user">
                    <div className="user-info">
                        <span className="signed-label">Signed in as</span>
                        <span className="team-name-nav">{team.team_name}</span>
                    </div>
                    <div className="user-avatar" onClick={handleLogout} title="Log out">
                        {team.team_name?.slice(0, 2).toUpperCase()}
                    </div>
                </div>
            </nav>

            {/* Page header */}
            <div className="wheel-header fade-in">
                <div className="header-left">
                    <h1 className="page-title">Theme Selection</h1>
                    <p className="page-desc">
                        Welcome, <span className="team-highlight">{team.team_name}</span>. Your journey begins here.{' '}
                        {spinDone
                            ? 'Your theme has been allocated.'
                            : "Spin the wheel to reveal your designated track for DevPlay'26."}
                    </p>
                </div>
            </div>

            {/* Main content */}
            <div className="wheel-body">
                {/* Left: Wheel */}
                <div className="wheel-left">
                    <div className="wheel-container">
                        <SpinningWheel
                            key={wheelKey.current}
                            disabled={spinDone || spinning || notReady || availableThemes.length === 0}
                            allThemes={allThemes}
                            availableThemes={availableThemes}
                            onSpinComplete={handleSpinComplete}
                        />
                    </div>

                    {error && <div className="spin-error">{error}</div>}

                    <button
                        id="spin-btn"
                        className={`spin-btn ${spinDone ? 'spin-btn--done' : ''}`}
                        onClick={() => {
                            if (!spinDone && !spinning && !notReady) {
                                setSpinning(true);
                                setError('');
                                document.getElementById('spin-canvas')?.click();
                            }
                        }}
                        disabled={spinDone || spinning || notReady || availableThemes.length === 0}
                    >
                        <span className={`spin-icon ${spinning ? 'spinning' : ''}`}>⟳</span>
                        {spinning ? 'SPINNING...' : spinDone ? 'SPIN USED' : 'SPIN THE WHEEL'}
                    </button>
                </div>

                {/* Right: Sidebar */}
                <div className="wheel-sidebar">
                    {/* Status card */}
                    <div className="status-card slide-in-right">
                        <div className="status-header">
                            <span className="status-icon">⏱</span>
                            <div>
                                <div className="status-title">Current Status</div>
                                <div className="status-sub">
                                    {spinDone ? 'Theme allocated' : 'Waiting for allocation'}
                                </div>
                            </div>
                        </div>
                        <div className="status-row">
                            <span className="status-label">Attempts Remaining</span>
                            <span className={`attempts-badge ${attemptsLeft === 0 ? 'attempts-zero' : ''}`}>
                                {attemptsLeft}
                            </span>
                        </div>
                        <div className="status-divider" />
                        <div className="status-row">
                            <span className="status-label">Allocated Theme</span>
                            <span className="status-value">
                                {assignedTheme || <em className="pending-text">Pending spin...</em>}
                            </span>
                        </div>
                    </div>

                    {/* Result card */}
                    {spinDone && assignedTheme && (
                        <ElectricBorder
                            color="#6C63FF"
                            speed={0.8}
                            chaos={0.10}
                            borderRadius={16}
                        >
                            <div className="result-card slide-in-right">
                                <div className="result-header">
                                    <span className="new-badge">NEW RESULT</span>
                                    <span className="lock-icon">🔒</span>
                                </div>
                                <div className="result-label">Your Assigned Theme</div>
                                <div className="result-theme">{assignedTheme}</div>
                                <div className="result-info">
                                    <span className="info-icon">ℹ</span>
                                    <span>Theme allocation is final. This choice has been locked to your team profile and cannot be changed.</span>
                                </div>
                            </div>
                        </ElectricBorder>
                    )}
                </div>
            </div>

            {/* Available Categories — shows quota status */}
            <div className="categories-section fade-in">
                <div className="categories-label">AVAILABLE CATEGORIES</div>
                <div className="categories-tags">
                    {!quotasLoaded && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading themes...</span>
                    )}
                    {allThemes.map((t) => {
                        const quota = themeQuotas[t];
                        const isFull = quota?.is_full;
                        const count = quota?.count ?? 0;
                        const maxCount = quota?.max_count ?? 2;
                        const isAssigned = assignedTheme === t;
                        return (
                            <span
                                key={t}
                                className={`category-tag ${isAssigned ? 'category-tag--active' : ''} ${isFull ? 'category-tag--full' : ''}`}
                                title={isFull ? `This theme is fully allocated (${maxCount}/${maxCount} teams)` : `${count}/${maxCount} teams`}
                            >
                                {isFull && <span className="tag-lock">🔒</span>}
                                {t}
                                {isFull && <span className="tag-full-label">FULL</span>}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <footer className="wheel-footer">
                <p>DevPlay'26 Organizers. All tracks vetted for 48-hour development cycles.</p>
            </footer>
        </div>
    );
}
