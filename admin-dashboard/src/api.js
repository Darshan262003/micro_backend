const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('adminToken');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export async function adminLogin(email, password) {
  return request('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchStats() {
  return request('/admin/stats');
}

export async function fetchEmployers(page = 1, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search.trim()) params.set('search', search.trim());
  return request(`/admin/employers?${params}`);
}

export async function fetchWorkers(page = 1, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search.trim()) params.set('search', search.trim());
  return request(`/admin/workers?${params}`);
}

export function clearSession() {
  localStorage.removeItem('adminToken');
}

export function saveSession(token) {
  localStorage.setItem('adminToken', token);
}

export function hasSession() {
  return Boolean(getToken());
}
