import { useCallback, useState } from 'react';
import { request } from './api';
import { ErrorNotice, money, useResource } from './components';
import type { Department, Employee, Session } from './types';

export function Employees({ session }: { session: Session }) {
  const loader = useCallback((signal: AbortSignal) => Promise.all([
    request<Employee[]>('/employees', session.token, { signal }),
    request<Department[]>('/departments', session.token, { signal }),
  ]), [session.token]);
  const { data, error, loading, refresh } = useResource(loader);
  const [selectedId, setSelectedId] = useState<string>();
  const [employees = [], departments = []] = data ?? [];
  const selected = employees.find(employee => employee.id === selectedId);
  const departmentName = (id: string) => departments.find(department => department.id === id)?.name ?? '—';
  return <>
    <div className="page-heading"><div><span className="eyebrow">PEOPLE & TEAMS</span><h1>Employees</h1>
      <p className="muted">A clear view of the people in your workspace.</p></div>
      <button onClick={refresh} disabled={loading}>Refresh employees</button></div>
    <ErrorNotice error={error} />
    {loading ? <p role="status">Loading employees…</p> : null}
    <section className="panel" aria-labelledby="directory-heading">
      <div className="panel-heading"><h2 id="directory-heading">Employee directory</h2><span className="muted">{employees.length} visible profiles</span></div>
      <div className="table-wrap"><table aria-label="Employees"><thead><tr>
        <th scope="col">Employee</th><th scope="col">Department</th><th scope="col">Status</th><th scope="col">Profile</th>
      </tr></thead><tbody>{employees.map(employee => <tr key={employee.id}>
        <td><strong>{employee.name}</strong><small>{employee.email}</small></td>
        <td>{departmentName(employee.departmentId)}</td>
        <td><span className={`status ${employee.active ? 'status-approved' : ''}`}>{employee.active ? 'Active' : 'Inactive'}</span></td>
        <td><button aria-label={`View profile for ${employee.name}`} onClick={() => setSelectedId(employee.id)}>View profile</button></td>
      </tr>)}</tbody></table></div>
      {!loading && !error && employees.length === 0 ? <p className="empty-state">No employee profiles are available.</p> : null}
    </section>
    {selected ? <section className="panel profile" aria-label="Employee profile">
      <div className="panel-heading"><h2>{selected.name}</h2><button onClick={() => setSelectedId(undefined)}>Close profile</button></div>
      <dl className="detail-grid">
        <div><dt>Email</dt><dd>{selected.email}</dd></div>
        <div><dt>Department</dt><dd>{departmentName(selected.departmentId)}</dd></div>
        <div><dt>Manager</dt><dd>{employees.find(employee => employee.id === selected.managerId)?.name ?? (selected.managerId ? 'Assigned manager' : 'No manager assigned')}</dd></div>
        <div><dt>Base salary</dt><dd>{money(selected.baseSalary)}</dd></div>
      </dl>
    </section> : null}
  </>;
}
