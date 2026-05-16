// src/utils/api.js
// Central API helper — all fetch calls go through here

const BASE = 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('ra_token');
}

export function getUser() {
  const raw = localStorage.getItem('ra_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('ra_token');
  localStorage.removeItem('ra_user');
  window.location.href = '/login';
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    return;
  }

  // For blob responses (PDF, CSV)
  if (options._blob) return res;

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get:  (path)         => request(path),
  post: (path, body)   => request(path, { method: 'POST', body: JSON.stringify(body) }),
  blob: (path)         => request(path, { _blob: true }),
};

export default api;