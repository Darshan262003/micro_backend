import { useEffect, useState } from 'react';
import {
  adminLogin,
  clearSession,
  fetchEmployers,
  fetchStats,
  fetchWorkers,
  hasSession,
  saveSession,
} from './api';

function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminLogin(email, password);
      saveSession(result.token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <h1>Admin Dashboard</h1>
      <p>Sign in to view employers and workers.</p>
      {error ? <div className="error">{error}</div> : null}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function UserTable({ rows, role }) {
  if (!rows.length) {
    return <div className="empty">No {role}s found.</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Mobile</th>
          <th>Profile</th>
          <th>Last login</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.email}</td>
            <td>{row.name || '—'}</td>
            <td>{row.mobileNumber || '—'}</td>
            <td>
              <span className={`badge ${row.profileCompleted ? 'ok' : 'pending'}`}>
                {row.profileCompleted ? 'Complete' : 'Incomplete'}
              </span>
            </td>
            <td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : '—'}</td>
            <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('employers');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const loader = tab === 'employers' ? fetchEmployers : fetchWorkers;
    loader(page, query)
      .then((result) => {
        setRows(result.data);
        setPagination(result.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tab, page, query]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  return (
    <div className="app-shell">
      <div className="header">
        <h1>Workforce Admin</h1>
        <button className="btn btn-secondary" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>

      {stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Employers</span>
            <strong>{stats.employers}</strong>
          </div>
          <div className="stat-card">
            <span>Workers</span>
            <strong>{stats.workers}</strong>
          </div>
          <div className="stat-card">
            <span>Total users</span>
            <strong>{stats.totalUsers}</strong>
          </div>
          <div className="stat-card">
            <span>Workers with complete profile</span>
            <strong>{stats.profileCompletedWorkers}</strong>
          </div>
        </div>
      ) : null}

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'employers' ? 'active' : ''}`}
          onClick={() => { setTab('employers'); setPage(1); }}
        >
          Employers
        </button>
        <button
          type="button"
          className={`tab ${tab === 'workers' ? 'active' : ''}`}
          onClick={() => { setTab('workers'); setPage(1); }}
        >
          Workers
        </button>
      </div>

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          placeholder={`Search ${tab} by email, name, or mobile`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      <div className="panel">
        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="empty">Loading…</div> : <UserTable rows={rows} role={tab.slice(0, -1)} />}
        <div className="pagination">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ marginLeft: 8 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(hasSession());

  function handleLogout() {
    clearSession();
    setAuthed(false);
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
