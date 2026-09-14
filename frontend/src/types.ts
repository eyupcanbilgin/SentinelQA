export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
export interface Session { token: string; role: Role; employeeId: string; name: string }
export interface Employee {
  id: string; name: string; email: string; departmentId: string;
  managerId: string | null; active: boolean; baseSalary: string;
}
export interface Department { id: string; name: string }
export interface Balance { employeeId: string; availableDays: number }
export type LeaveStatus = 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
export interface LeaveRequest {
  id: string; employeeId: string; employeeName: string; startDate: string;
  endDate: string; days: number; reason: string; status: LeaveStatus;
}
export type PayrollStatus = 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'FINALIZED';
export interface PayrollItem {
  id: string; employeeId: string; baseSalary: string;
  tax: string; deductions: string; netPay: string;
}
export interface PayrollRun {
  id: string; period: string; status: PayrollStatus; totalNet: string; items: PayrollItem[];
}
