
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
    created_at?: string;
}

// Added Tenant Interface for SaaS Management
export interface Tenant {
    id: string;
    name: string;
    created_at: string;
    admin_email?: string | null; // Joined field
    max_loans?: number;
    max_users?: number; // New field for seat limits
    subscription_end_date?: string;
    status?: 'active' | 'suspended';
}

export interface Announcement {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    is_active: boolean;
    created_at: string;
}

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    address: string;
    id_document?: string;
    occupation?: string;
    created_at?: string;
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
    created_at?: string;
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
    created_at?: string;
}

export interface Payment {
    id: string;
    tenant_id: string;
    schedule_id: string;
    loan_id: string;
    amount: number;
    payment_date: string;
    recorded_by: string; // employeeId
    created_at?: string;
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
    created_at?: string;
}

// --- NEW CASH MANAGEMENT TYPES ---

export enum ShiftStatus {
    OPEN = 'abierta',
    CLOSED = 'cerrada',
    VERIFIED = 'verificada'
}

export interface CashShift {
    id: string;
    tenant_id: string;
    employee_id: string;
    start_time: string;
    end_time?: string;
    start_amount: number;
    expected_end_amount?: number;
    declared_end_amount?: number;
    status: ShiftStatus;
    notes?: string;
    profiles?: { name: string }; // Join
    created_at?: string;
}

export interface Expense {
    id: string;
    tenant_id: string;
    shift_id: string;
    amount: number;
    description: string;
    date: string;
    created_at?: string;
}