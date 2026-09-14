import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { post, request } from './api';
import { ErrorNotice, Status, useResource } from './components';
import type { Balance, Employee, LeaveRequest, Session } from './types';

export function Leave({ session }: { session: Session }) {
  const loader = useCallback((signal: AbortSignal) => Promise.all([
    request<LeaveRequest[]>('/leave-requests', session.token, { signal }),
    request<Balance>('/leave-balances/me', session.token, { signal }),
    request<Employee[]>('/employees', session.token, { signal }),
  ]), [session.token]);
  const { data, error, loading, refresh } = useResource(loader);
  const [requests = [], balance, employees = []] = data ?? [];
  const [failure, setFailure] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const self = employees.find(employee => employee.id === session.employeeId);
  const canRequest = self?.active === true && !loading;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setFailure(undefined); setMessage('');
    try {
      await post<LeaveRequest>('/leave-requests', session.token, {
        startDate: values.get('startDate'), endDate: values.get('endDate'), reason: values.get('reason'),
      });
      form.reset(); setStartDate('');
      setMessage('Your leave request was submitted for approval.'); refresh();
    } catch (issue) { setFailure(issue); }
    finally { setBusy(false); }
  }
  async function decide(id: string, action: string) {
    setBusy(true); setFailure(undefined); setMessage('');
    try {
      await post<LeaveRequest>(`/leave-requests/${id}/${action}`, session.token);
      setMessage(action === 'reject' ? 'Leave request rejected.' : 'Leave approval recorded.'); refresh();
    } catch (issue) { setFailure(issue); }
    finally { setBusy(false); }
  }
  function approver(item: LeaveRequest): 'manager' | 'hr' | undefined {
    if (item.employeeId === session.employeeId) return undefined;
    if (item.status === 'PENDING_MANAGER' && session.role === 'MANAGER' &&
      employees.some(employee => employee.id === item.employeeId && employee.managerId === session.employeeId)) return 'manager';
    if (item.status === 'PENDING_HR' && (session.role === 'HR' || session.role === 'ADMIN')) return 'hr';
    return undefined;
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">TIME AWAY</span><h1>Leave management</h1>
      <p className="muted">Plan your time off. Keep approvals moving.</p></div>
      <button disabled={loading || busy} onClick={refresh}>Refresh leave</button></div>
    <ErrorNotice error={failure ?? error} />
    {message ? <p role="status" className="notice success">{message}</p> : null}
    {loading ? <p role="status">Loading leave…</p> : null}
    <div className="leave-top">
      <section className="balance-card" aria-labelledby="balance-heading"><span className="eyebrow">YOUR TIME OFF</span>
        <h2 id="balance-heading">Leave balance</h2>
        <div className="balance-value"><output aria-label="Available leave balance">{balance?.availableDays ?? '—'}</output><span>days</span></div>
        <p>Calendar days remaining.</p><small>Pending requests reserve days. Your balance updates after final approval.</small>
      </section>
      <section className="panel request-panel" aria-labelledby="request-heading"><h2 id="request-heading">Request time off</h2>
        {self && !self.active ? <p className="notice">Your employee profile is inactive. New leave requests are unavailable.</p> : null}
        <form onSubmit={submit}>
          <fieldset disabled={!canRequest || busy}><legend className="sr-only">Leave request</legend>
            <div className="form-row"><div><label htmlFor="start-date">Start date</label>
              <input id="start-date" name="startDate" type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></div>
              <div><label htmlFor="end-date">End date</label><input id="end-date" name="endDate" type="date" min={startDate || undefined} required /></div></div>
            <label htmlFor="reason">Reason</label><textarea id="reason" name="reason" required minLength={3} maxLength={500} rows={2} placeholder="Add a short note for your approver" />
            <div className="form-footer"><small>Both start and end dates count toward your leave.</small><button className="primary" type="submit">{busy ? 'Saving…' : 'Request leave'}</button></div>
          </fieldset>
        </form>
      </section>
    </div>
    <section className="panel" aria-labelledby="requests-heading"><div className="panel-heading"><h2 id="requests-heading">Leave requests</h2><span className="muted">{requests.length} requests</span></div>
      <div className="table-wrap"><table aria-label="Leave requests"><thead><tr>
        <th scope="col">Employee</th><th scope="col">Dates</th><th scope="col">Days</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Actions</th>
      </tr></thead><tbody>{requests.map(item => {
        const role = approver(item);
        return <tr key={item.id}><td><strong>{item.employeeName}</strong>{item.employeeId === session.employeeId ? <small>You</small> : null}</td>
          <td className="date-cell"><time dateTime={item.startDate}>{item.startDate}</time><span> to </span><time dateTime={item.endDate}>{item.endDate}</time></td>
          <td>{item.days}</td><td className="reason-cell">{item.reason}</td><td><Status value={item.status} /></td>
          <td>{role ? <div className="actions"><button className="primary" disabled={busy || loading} onClick={() => void decide(item.id, `${role}-approve`)}>Approve as {role === 'hr' ? 'HR' : 'manager'}</button>
            <button disabled={busy || loading} onClick={() => void decide(item.id, 'reject')}>Reject</button></div> : <span className="muted">—</span>}</td></tr>;
      })}</tbody></table></div>
      {!loading && !error && requests.length === 0 ? <p className="empty-state">No leave requests yet. Your next break starts here.</p> : null}
    </section>
  </>;
}
