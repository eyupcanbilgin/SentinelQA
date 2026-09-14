import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="notice error" role="alert">
    <strong>{error instanceof Error ? error.message : 'Something went wrong. Please try again.'}</strong>
    {error instanceof ApiError ? <small>Reference: {error.correlationId} · {error.code}</small> : null}
  </div>;
}

const statusLabels: Record<string, string> = {
  PENDING_MANAGER: 'Pending manager', PENDING_HR: 'Pending HR', APPROVED: 'Approved',
  REJECTED: 'Rejected', CREATED: 'Created', PROCESSING: 'Processing',
  COMPLETED: 'Completed', FAILED: 'Failed', FINALIZED: 'Finalized',
};

export function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase()}`}>{statusLabels[value] ?? value}</span>;
}

// Monetary values remain server-calculated decimal strings, including during presentation.
export function money(value: string | undefined): string {
  if (value === undefined) return '—';
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return 'Unavailable';
  const [whole, fraction = ''] = value.split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`;
}

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void loader(controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [loader, generation]);
  return { data, error, loading, refresh };
}
