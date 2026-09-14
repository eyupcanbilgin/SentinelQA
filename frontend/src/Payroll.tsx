import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { post, request } from './api';
import { ErrorNotice, money, Status, useResource } from './components';
import type { Employee, PayrollRun, Session } from './types';

export function Payroll({ session }: { session: Session }) {
  const loader = useCallback((signal: AbortSignal) => Promise.all([
    request<PayrollRun[]>('/payroll-runs', session.token, { signal }),
    request<Employee[]>('/employees', session.token, { signal }),
  ]), [session.token]);
  const { data, error, loading, refresh } = useResource(loader);
  const [runs = [], employees = []] = data ?? [];
  const [details, setDetails] = useState<PayrollRun>();
  const [failure, setFailure] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const processing = runs.some(run => run.status === 'PROCESSING');

  useEffect(() => {
    if (!processing || loading || error) return;
    const timer = window.setTimeout(refresh, 1_000);
    return () => window.clearTimeout(timer);
  }, [processing, loading, error, refresh]);

  // The list and detail endpoints share their state; polling also refreshes open details.
  const selected = details ? (runs.find(run => run.id === details.id) ?? details) : undefined;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const period = new FormData(form).get('period');
    setBusy(true); setFailure(undefined); setMessage('');
    try {
      const run = await post<PayrollRun>('/payroll-runs', session.token, { period });
      setDetails(run); form.reset(); setMessage(`Payroll for ${run.period} created.`); refresh();
    } catch (issue) { setFailure(issue); }
    finally { setBusy(false); }
  }
  async function action(run: PayrollRun, operation: 'process' | 'finalize' | 'view') {
    setBusy(true); setFailure(undefined); setMessage('');
    try {
      const result = operation === 'view' ? await request<PayrollRun>(`/payroll-runs/${run.id}`, session.token) :
        await post<PayrollRun>(`/payroll-runs/${run.id}/${operation}`, session.token);
      setDetails(result);
      if (operation !== 'view') { setMessage(operation === 'process' ? 'Payroll processing has started.' : 'Payroll finalized. Items are now locked.'); refresh(); }
    } catch (issue) { setFailure(issue); }
    finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">PAY & OPERATIONS</span><h1>Payroll runs</h1>
      <p className="muted">Review every amount before you make it final.</p></div>
      <button disabled={loading || busy} onClick={refresh}>Refresh payroll</button></div>
    <ErrorNotice error={failure ?? error} />
    {message ? <p role="status" className="notice success">{message}</p> : null}
    {loading && !data ? <p role="status">Loading payroll…</p> : null}
    {processing ? <p role="status" className="notice">Payroll is processing. This page updates automatically.</p> : null}
    <section className="panel create-payroll" aria-labelledby="create-heading"><div><h2 id="create-heading">Start a payroll run</h2><p className="muted">One run per month. Review the results, then finalize.</p></div>
      <form onSubmit={create}><div><label htmlFor="payroll-period">Payroll period</label><input id="payroll-period" name="period" type="month" required /></div>
        <button className="primary" disabled={busy || loading}>Create payroll run</button></form>
    </section>
    <section className="panel" aria-labelledby="runs-heading"><div className="panel-heading"><h2 id="runs-heading">Run history</h2><span className="muted">{runs.length} runs</span></div>
      <div className="table-wrap"><table aria-label="Payroll runs"><thead><tr><th scope="col">Period</th><th scope="col">Status</th><th scope="col">Total net pay</th><th scope="col">Actions</th></tr></thead>
        <tbody>{runs.map(run => <tr key={run.id}><th scope="row">{run.period}</th><td><Status value={run.status} /></td><td className="money">{money(run.totalNet)}</td>
          <td><div className="actions"><button disabled={busy} onClick={() => void action(run, 'view')}>View details</button>
            {run.status === 'CREATED' ? <button className="primary" disabled={busy || loading} onClick={() => void action(run, 'process')}>Process payroll</button> : null}
            {run.status === 'COMPLETED' ? <button className="primary" disabled={busy || loading} onClick={() => void action(run, 'finalize')}>Finalize payroll</button> : null}
            {run.status === 'FAILED' ? <span className="muted">Processing failed. Contact support with the run ID: {run.id}</span> : null}
          </div></td></tr>)}</tbody></table></div>
      {!loading && !error && runs.length === 0 ? <p className="empty-state">No payroll runs yet. Choose a period to get started.</p> : null}
    </section>
    {selected ? <section className="panel" aria-label="Payroll details"><div className="panel-heading"><div><h2>Payroll details · {selected.period}</h2><small>Amounts in USD · tax 20% · deductions 5%</small></div><Status value={selected.status} /></div>
      {selected.status === 'FINALIZED' ? <p className="notice success">Finalized payroll is locked. Amounts cannot be changed.</p> : null}
      <div className="table-wrap"><table aria-label="Payroll items"><thead><tr><th scope="col">Employee</th><th scope="col">Base salary</th><th scope="col">Tax</th><th scope="col">Deductions</th><th scope="col">Net pay</th></tr></thead>
        <tbody>{(selected.items ?? []).map(item => <tr key={item.id}><th scope="row">{employees.find(employee => employee.id === item.employeeId)?.name ?? item.employeeId}</th>
          <td className="money">{money(item.baseSalary)}</td><td className="money">{money(item.tax)}</td><td className="money">{money(item.deductions)}</td><td className="money">{money(item.netPay)}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row" colSpan={4}>Total net pay</th><td className="money">{money(selected.totalNet)}</td></tr></tfoot></table></div>
      {!selected.items?.length ? <p className="empty-state">Payroll items appear when processing completes.</p> : null}
    </section> : null}
  </>;
}
