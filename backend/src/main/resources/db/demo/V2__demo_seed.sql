-- Seed demo departments
INSERT INTO departments (id, name) VALUES
    ('00000000-0000-0000-0000-000000000101', 'Engineering'),
    ('00000000-0000-0000-0000-000000000102', 'Operations')
ON CONFLICT (id) DO NOTHING;

-- Seed demo employees (manager first to satisfy foreign key for reports)
INSERT INTO employees (id, name, email, department_id, manager_id, active, base_salary) VALUES
    ('00000000-0000-0000-0000-000000000003', 'Manager One', 'manager@example.test', '00000000-0000-0000-0000-000000000101', NULL, true, 8000.00),
    ('00000000-0000-0000-0000-000000000001', 'Employee One', 'employee1@example.test', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003', true, 5000.00),
    ('00000000-0000-0000-0000-000000000002', 'Employee Two', 'employee2@example.test', '00000000-0000-0000-0000-000000000102', NULL, true, 6000.00),
    ('00000000-0000-0000-0000-000000000004', 'HR One', 'hr@example.test', '00000000-0000-0000-0000-000000000102', NULL, true, 7000.00),
    ('00000000-0000-0000-0000-000000000005', 'Admin One', 'admin@example.test', '00000000-0000-0000-0000-000000000102', NULL, true, 9000.00)
ON CONFLICT (id) DO NOTHING;

-- Seed demo users with BCrypt hash of 'LocalDemo!2026'
INSERT INTO users (id, email, password_hash, employee_id, role) VALUES
    ('00000000-0000-0000-0000-000000000201', 'employee1@example.test', '$2a$12$clgxPzPWGtJvR4oXp0jua.1ud44FHoK/P5q/EFa6nDhd4ZFjFaSyu', '00000000-0000-0000-0000-000000000001', 'EMPLOYEE'),
    ('00000000-0000-0000-0000-000000000202', 'employee2@example.test', '$2a$12$clgxPzPWGtJvR4oXp0jua.1ud44FHoK/P5q/EFa6nDhd4ZFjFaSyu', '00000000-0000-0000-0000-000000000002', 'EMPLOYEE'),
    ('00000000-0000-0000-0000-000000000203', 'manager@example.test', '$2a$12$clgxPzPWGtJvR4oXp0jua.1ud44FHoK/P5q/EFa6nDhd4ZFjFaSyu', '00000000-0000-0000-0000-000000000003', 'MANAGER'),
    ('00000000-0000-0000-0000-000000000204', 'hr@example.test', '$2a$12$clgxPzPWGtJvR4oXp0jua.1ud44FHoK/P5q/EFa6nDhd4ZFjFaSyu', '00000000-0000-0000-0000-000000000004', 'HR'),
    ('00000000-0000-0000-0000-000000000205', 'admin@example.test', '$2a$12$clgxPzPWGtJvR4oXp0jua.1ud44FHoK/P5q/EFa6nDhd4ZFjFaSyu', '00000000-0000-0000-0000-000000000005', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

-- Seed leave balances: 20 calendar days per employee
INSERT INTO leave_balances (employee_id, available_days, reserved_days) VALUES
    ('00000000-0000-0000-0000-000000000001', 20, 0),
    ('00000000-0000-0000-0000-000000000002', 20, 0),
    ('00000000-0000-0000-0000-000000000003', 20, 0),
    ('00000000-0000-0000-0000-000000000004', 20, 0),
    ('00000000-0000-0000-0000-000000000005', 20, 0)
ON CONFLICT (employee_id) DO NOTHING;
