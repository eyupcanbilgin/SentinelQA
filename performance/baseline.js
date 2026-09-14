import { setupWorkforce, thresholds, authentication, employeeRead, leaveTransactionFlow, payrollFlow } from './lib/workforce.js';
export { authentication, employeeRead, leaveTransactionFlow, payrollFlow };
export const setup = setupWorkforce;
export const options = {
  setupTimeout: '30s',
  thresholds: thresholds(),
  scenarios: {
    authentication: { executor: 'constant-vus', exec: 'authentication', vus: 1, duration: '60s' },
    employee_reads: { executor: 'constant-vus', exec: 'employeeRead', vus: 6, duration: '60s' },
    leave: { executor: 'constant-vus', exec: 'leaveTransactionFlow', vus: 2, duration: '60s' },
    payroll: { executor: 'shared-iterations', exec: 'payrollFlow', vus: 1, iterations: 10, maxDuration: '60s' },
  },
};
