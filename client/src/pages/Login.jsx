import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ElectricBorder from '../components/ElectricBorder';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Login() {
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/login`, {
                login_id: loginId.trim(),
                password,
            });
            localStorage.setItem('devplay_team', JSON.stringify(res.data));
            navigate('/wheel');
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Unable to connect. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-root">
            {/* Animated background orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />

            {/* Navbar — logo only */}
            <nav className="login-nav">
                <div className="nav-brand">
                    <span className="brand-icon">◈</span>
                    <span className="brand-name">DevPlay<span className="brand-year">'26</span></span>
                </div>
            </nav>


            {/* Login Card */}
            <main className="login-main">
                <ElectricBorder
                    color="#6C63FF"
                    speed={0.8}
                    chaos={0.10}
                    borderRadius={20}
                >
                    <div className="login-card fade-in">
                        <div className="card-header">
                            <div className="card-logo">
                                <span className="logo-dot">◈</span>
                            </div>
                            <h1 className="card-title">
                                DevPlay<span className="title-accent">'26</span>
                            </h1>
                            <p className="card-subtitle">Theme Allocation Portal</p>
                        </div>

                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="teamId">Team ID</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <input
                                        id="teamId"
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter your Team ID"
                                        value={loginId}
                                        onChange={e => setLoginId(e.target.value)}
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="label-row">
                                    <label className="form-label" htmlFor="password">Password</label>
                                    <span className="forgot-link">Forgot?</span>
                                </div>
                                <div className="input-wrapper">
                                    <span className="input-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </span>
                                    <input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-pass"
                                        onClick={() => setShowPass(p => !p)}
                                        aria-label={showPass ? 'Hide password' : 'Show password'}
                                    >
                                        {showPass ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <label className="keep-logged">
                                <input type="checkbox" className="keep-checkbox" />
                                <span>Keep me logged in</span>
                            </label>

                            {error && <div className="error-msg">{error}</div>}

                            <button
                                type="submit"
                                className="access-btn"
                                disabled={loading}
                                id="access-portal-btn"
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="spinner" />
                                        Authenticating...
                                    </span>
                                ) : (
                                    'Access Portal'
                                )}
                            </button>
                        </form>

                        <p className="help-text">
                            Need help?{' '}
                            <a href="mailto:support@devplay26.com" className="support-link">
                                Contact Support
                            </a>
                        </p>
                    </div>
                </ElectricBorder>
            </main>

            <footer className="login-footer">
                <p>© 2026 DEVPLAY HACKATHON. ALL RIGHTS RESERVED.</p>
            </footer>
        </div>
    );
}
