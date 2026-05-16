// src/pages/Login.jsx
// Single login page — detects role from URL: /login?role=student|faculty|admin

import { useState } from 'react';
import { api } from '../utils/api';

const ROLE_CONFIG = {
  student: {
    label:       'Student Portal',
    placeholder: 'HT Number (e.g. 24261A0501)',
    endpoint:    '/auth/student-login',
    field:       'ht_no',
    redirect:    '/student',
    accent:      '#00e5a0',
  },
  faculty: {
    label:       'Faculty Portal',
    placeholder: 'Faculty Username',
    endpoint:    '/auth/faculty-login',
    field:       'username',
    redirect:    '/faculty',
    accent:      '#f5a623',
  },
  admin: {
    label:       'Admin Portal',
    placeholder: 'Admin Username',
    endpoint:    '/auth/admin-login',
    field:       'username',
    redirect:    '/admin',
    accent:      '#7c6af7',
  },
};

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const role   = params.get('role') || 'student';
  const cfg    = ROLE_CONFIG[role] || ROLE_CONFIG.student;

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { password, [cfg.field]: identifier };
      const data = await api.post(cfg.endpoint, body);
      localStorage.setItem('ra_token', data.token);
      localStorage.setItem('ra_user', JSON.stringify({
        id: identifier,
        role: data.role
        }));
      window.location.href = cfg.redirect;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:       '100vh',
      background:      '#0d0f14',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      fontFamily:      "'JetBrains Mono', 'Fira Code', monospace",
      padding:         '1rem',
    }}>
      {/* Role switcher tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {['student', 'faculty', 'admin'].map(r => (
          <a
            key={r}
            href={`/login?role=${r}`}
            style={{
              padding:         '0.4rem 1rem',
              borderRadius:    '4px',
              fontSize:        '0.72rem',
              textTransform:   'uppercase',
              letterSpacing:   '0.1em',
              textDecoration:  'none',
              background:      role === r ? ROLE_CONFIG[r].accent : '#1a1d24',
              color:           role === r ? '#0d0f14' : '#555',
              fontWeight:      role === r ? '700' : '400',
              transition:      'all 0.2s',
            }}
          >{r}</a>
        ))}
      </div>

      <div style={{
        background:   '#13161e',
        border:       `1px solid ${cfg.accent}22`,
        borderRadius: '8px',
        padding:      '2.5rem 2rem',
        width:        '100%',
        maxWidth:     '380px',
        boxShadow:    `0 0 40px ${cfg.accent}11`,
      }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '48px',
            height:         '48px',
            borderRadius:   '10px',
            background:     `${cfg.accent}18`,
            border:         `1px solid ${cfg.accent}44`,
            fontSize:       '1.4rem',
            marginBottom:   '0.8rem',
          }}>
            {role === 'student' ? '◈' : role === 'faculty' ? '◉' : '◆'}
          </div>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: '600', letterSpacing: '0.05em' }}>
            MGIT Result Analysis
          </div>
          <div style={{ color: cfg.accent, fontSize: '0.72rem', letterSpacing: '0.15em', marginTop: '0.2rem' }}>
            {cfg.label.toUpperCase()}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Identifier</label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={cfg.placeholder}
              required
              style={inputStyle(cfg.accent)}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={inputStyle(cfg.accent)}
            />
          </div>

          {error && (
            <div style={{
              background: '#ff4d4d18',
              border:     '1px solid #ff4d4d44',
              color:      '#ff7070',
              borderRadius: '4px',
              padding:    '0.6rem 0.8rem',
              fontSize:   '0.78rem',
              marginBottom: '1rem',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:          '100%',
              padding:        '0.7rem',
              background:     loading ? '#1a1d24' : cfg.accent,
              color:          loading ? '#555' : '#0d0f14',
              border:         'none',
              borderRadius:   '4px',
              fontSize:       '0.82rem',
              fontWeight:     '700',
              letterSpacing:  '0.1em',
              cursor:         loading ? 'not-allowed' : 'pointer',
              fontFamily:     'inherit',
              transition:     'opacity 0.2s',
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN →'}
          </button>
        </form>
      </div>

      <div style={{ color: '#333', fontSize: '0.68rem', marginTop: '2rem', letterSpacing: '0.05em' }}>
        MGIT CSE · Result Analysis System
      </div>
    </div>
  );
}

const labelStyle = {
  display:       'block',
  color:         '#666',
  fontSize:      '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom:  '0.4rem',
};

const inputStyle = (accent) => ({
  width:        '100%',
  background:   '#0d0f14',
  border:       `1px solid #2a2d36`,
  borderRadius: '4px',
  padding:      '0.6rem 0.8rem',
  color:        '#e0e0e0',
  fontSize:     '0.85rem',
  fontFamily:   'inherit',
  outline:      'none',
  boxSizing:    'border-box',
  transition:   'border-color 0.2s',
  // focus handled inline via onFocus/onBlur if needed
});