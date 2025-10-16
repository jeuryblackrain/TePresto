export enum Role {
    ADMIN = 'admin',
    EMPLOYEE = 'empleado'
}

export interface Profile {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar_url: string;
    tenant_id: string;
}

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    address: string;
    id_document?: string;
    occupation?: string;
}

export enum LoanFrequency {
    DIARIO = 'diario',
    SEMANAL = 'semanal',
    QUINCENAL = 'quincenal',
    MENSUAL = 'mensual'
}

export enum PaymentType {
    FIJO = 'fijo',
    INTERES = 'tasa de interés'
}

export enum LoanStatus {
    ACTIVO = 'Activo',
    PAGADO = 'Pagado',
    ATRASADO = 'Atrasado'
}

export interface Loan {
    id: string;
    tenant_id: string;
    client_id: string;
    employee_id: string;
    amount: number;
    interest_rate?: number;
    fixed_payment?: number;
    frequency: LoanFrequency;
    payment_type: PaymentType;
    issue_date: string;
    term: number; // in number of payments
    status: LoanStatus;
    route_id?: string | null;
}

export enum ScheduleStatus {
    PENDIENTE = 'Pendiente',
    PAGADO = 'Pagado',
    VENCIDO = 'Vencido'
}

export interface LoanSchedule {
    id: string;
    tenant_id: string;
    loan_id: string;
    installment_number: number;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    payment_date?: string;
    status: ScheduleStatus;
}

export interface Payment {
    id: string;
    tenant_id: string;
    schedule_id: string;
    loan_id: string;
    amount: number;
    payment_date: string;
    recorded_by: string; // employeeId
}

export interface AppSettings {
    currency: string;
    default_interest_rate: number;
    max_loan_amount: number;
}

export interface Route {
    id: string;
    tenant_id: string;
    name: string;
    employee_id: string | null;
}