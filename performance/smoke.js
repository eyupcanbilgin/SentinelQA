import { setupWorkforce, thresholds, authentication, employeeRead, leaveTransactionFlow, payrollFlow } from './lib/workforce.js';
export { authentication, employeeRead, leaveTransactionFlow, payrollFlow };
export const setup = setupWorkforce;
export const options = {
  setupTimeout: '30s',
  thresholds: thresholds(),
  scenarios: {
    authentication: { executor: 'shared-iterations', exec: 'authentication', vus: 1, iterations: 2, maxDuration: '30s' },
    employee_reads: { executor: 'shared-iterations', exec: 'employeeRead', vus: 1, iterations: 8, maxDuration: '30s' },
    leave: { executor: 'shared-iterations', exec: 'leaveTransactionFlow', vus: 1, iterations: 2, maxDuration: '30s' },
    payroll: { executor: 'shared-iterations', exec: 'payrollFlow', vus: 1, iterations: 2, maxDuration: '30s' },
  },
};
