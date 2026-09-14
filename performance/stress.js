import { setupWorkforce, thresholds, authentication, employeeRead, leaveTransactionFlow, payrollFlow } from './lib/workforce.js';
export { authentication, employeeRead, leaveTransactionFlow, payrollFlow };
export const setup = setupWorkforce;
export const options = {
  setupTimeout: '30s',
  thresholds: thresholds(5000),
  scenarios: {
    employee_reads: { executor: 'ramping-vus', exec: 'employeeRead', startVUs: 0, stages: [{ duration: '15s', target: 12 }, { duration: '30s', target: 24 }, { duration: '15s', target: 0 }], gracefulRampDown: '10s' },
    authentication: { executor: 'constant-vus', exec: 'authentication', vus: 2, duration: '60s' },
    leave: { executor: 'constant-vus', exec: 'leaveTransactionFlow', vus: 4, duration: '60s' },
    payroll: { executor: 'shared-iterations', exec: 'payrollFlow', vus: 1, iterations: 12, maxDuration: '90s' },
  },
};
