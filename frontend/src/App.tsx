import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { post } from './api';
import { ErrorNotice } from './components';
import { Employees } from './Employees';
import { Leave } from './Leave';
import { Payroll } from './Payroll';
import type { Session } from './types';

type Page = 'employees' | 'leave' | 'payroll';

function Login({ onLogin, message }: { onLogin: (session: Session) => void; message: string }) {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      onLogin(await post<Session>('/auth/login', undefined, {
        email: values.get('email'), password: values.get('password'),
      }));
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  return <main id="main" className="login-layout">
    <div className="login-intro">
      <span className="eyebrow">WORKFORCEOPS</span>
      <h1>A little more clarity.<br />A better workday.</h1>
      <p>Keep your people, time away, and payroll moving forward.</p>
      <div className="intro-rule" />
      <p className="muted">Built for the way your team works.</p>
    </div>
    <section className="login-card" aria-labelledby="login-title">
      <span className="brand-mark" aria-hidden="true">W</span>
      <h2 id="login-title">Sign in to your workspace</h2>
      <p className="muted">Welcome back. Let’s get you settled in.</p>
      {message ? <p role="status" className="notice">{message}</p> : null}
      <ErrorNotice error={error} />
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button className="primary full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="fine-print">SentinelQE reference workspace · fictional demonstration data</p>
    </section>
  </main>;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>('employees');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const expire = () => { setSession(null); setMessage('Your session has expired. Please sign in again.'); };
    window.addEventListener('workforce:session-expired', expire);
    return () => window.removeEventListener('workforce:session-expired', expire);
  }, []);
  function login(value: Session) { setSession(value); setPage('employees'); setMessage(''); }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    {!session ? <Login onLogin={login} message={message} /> : <div className="workspace">
      <header className="app-header">
        <a className="brand" href="#main" onClick={() => setPage('employees')}>
          <span className="brand-mark" aria-hidden="true">W</span> WorkforceOps
        </a>
        <div className="user-menu"><span>{session.name}<small>{session.role}</small></span>
          <button onClick={() => { setSession(null); setMessage('You have signed out.'); }}>Sign out</button>
        </div>
      </header>
      <div className="workspace-body">
        <aside className="sidebar">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <nav aria-label="Main navigation">
            <button aria-current={page === 'employees' ? 'page' : undefined} onClick={() => setPage('employees')}>Employees</button>
            <button aria-current={page === 'leave' ? 'page' : undefined} onClick={() => setPage('leave')}>Leave</button>
            {session.role === 'ADMIN' ? <button aria-current={page === 'payroll' ? 'page' : undefined} onClick={() => setPage('payroll')}>Payroll</button> : null}
          </nav>
          <div className="sidebar-note"><span className="live-dot" /> WorkforceOps workspace<small>SentinelQE reference platform</small></div>
        </aside>
        <main id="main" className="main-content" tabIndex={-1}>
          {page === 'employees' ? <Employees session={session} /> : null}
          {page === 'leave' ? <Leave session={session} /> : null}
          {page === 'payroll' && session.role === 'ADMIN' ? <Payroll session={session} /> : null}
        </main>
      </div>
    </div>}
  </>;
}
