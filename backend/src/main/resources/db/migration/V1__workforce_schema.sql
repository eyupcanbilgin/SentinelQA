CREATE TABLE departments (id uuid PRIMARY KEY, name varchar(120) NOT NULL UNIQUE);
CREATE TABLE employees (
    id uuid PRIMARY KEY, name varchar(120) NOT NULL, email varchar(254) NOT NULL UNIQUE,
    department_id uuid NOT NULL REFERENCES departments(id), manager_id uuid REFERENCES employees(id),
    active boolean NOT NULL DEFAULT true, base_salary numeric(14,2) NOT NULL CHECK (base_salary >= 0),
    CHECK (manager_id IS NULL OR manager_id <> id)
);
CREATE INDEX employees_manager_idx ON employees(manager_id);
CREATE TABLE users (
    id uuid PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, password_hash varchar(255) NOT NULL,
    employee_id uuid NOT NULL UNIQUE REFERENCES employees(id),
    role varchar(20) NOT NULL CHECK (role IN ('EMPLOYEE','MANAGER','HR','ADMIN'))
);
CREATE TABLE leave_balances (
    employee_id uuid PRIMARY KEY REFERENCES employees(id), available_days integer NOT NULL CHECK (available_days >= 0),
    reserved_days integer NOT NULL DEFAULT 0 CHECK (reserved_days >= 0 AND reserved_days <= available_days)
);
CREATE TABLE leave_requests (
    id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES employees(id),
    start_date date NOT NULL, end_date date NOT NULL CHECK (end_date >= start_date),
    days integer NOT NULL CHECK (days > 0 AND days = end_date - start_date + 1), reason varchar(1000) NOT NULL,
    status varchar(30) NOT NULL CHECK (status IN ('PENDING_MANAGER','PENDING_HR','APPROVED','REJECTED'))
);
CREATE INDEX leave_requests_employee_idx ON leave_requests(employee_id);
CREATE TABLE payroll_runs (
    id uuid PRIMARY KEY, period varchar(7) NOT NULL UNIQUE CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    status varchar(20) NOT NULL CHECK (status IN ('CREATED','PROCESSING','COMPLETED','FAILED','FINALIZED')),
    total_net numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_net >= 0), created_at timestamptz NOT NULL,
    queued_at timestamptz, error_message varchar(500)
);
CREATE INDEX payroll_queue_idx ON payroll_runs(queued_at) WHERE status = 'PROCESSING';
CREATE TABLE payroll_items (
    id uuid PRIMARY KEY, payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id), employee_id uuid NOT NULL REFERENCES employees(id),
    base_salary numeric(14,2) NOT NULL CHECK (base_salary >= 0), tax numeric(14,2) NOT NULL CHECK (tax >= 0),
    deductions numeric(14,2) NOT NULL CHECK (deductions >= 0), net_pay numeric(14,2) NOT NULL CHECK (net_pay >= 0),
    UNIQUE(payroll_run_id, employee_id), CHECK (net_pay = base_salary - tax - deductions)
);
CREATE TABLE audit_events (
    id uuid PRIMARY KEY, actor_id uuid REFERENCES employees(id), action varchar(100) NOT NULL,
    entity_type varchar(80) NOT NULL, entity_id uuid NOT NULL, correlation_id varchar(64), created_at timestamptz NOT NULL
);
CREATE INDEX audit_events_created_idx ON audit_events(created_at);

CREATE FUNCTION protect_finalized_payroll_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_run uuid;
BEGIN
    target_run := CASE WHEN TG_OP = 'DELETE' THEN OLD.payroll_run_id ELSE NEW.payroll_run_id END;
    -- Locking the parent serializes item writes with finalization, including direct SQL writers.
    PERFORM 1 FROM payroll_runs WHERE id = target_run AND status <> 'FINALIZED' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Finalized payroll items are immutable' USING ERRCODE = '23514'; END IF;
    IF TG_OP = 'UPDATE' AND OLD.payroll_run_id <> NEW.payroll_run_id THEN
        RAISE EXCEPTION 'Payroll item parent is immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER payroll_item_immutable BEFORE INSERT OR UPDATE OR DELETE ON payroll_items FOR EACH ROW EXECUTE FUNCTION protect_finalized_payroll_items();

CREATE FUNCTION protect_terminal_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'payroll_runs' AND OLD.status = 'FINALIZED' AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Finalized payroll run is immutable' USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'leave_requests' AND OLD.status IN ('APPROVED','REJECTED') AND NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Final leave decision is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER payroll_run_immutable BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION protect_terminal_state();
CREATE TRIGGER leave_decision_immutable BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION protect_terminal_state();
