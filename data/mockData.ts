// NOTE: THIS FILE IS NOW DEPRECATED.
// With the integration of Supabase, this mock data should be migrated to your Supabase database.
// The application has been refactored to fetch data from Supabase tables instead of this file.
// You should create tables in Supabase that match the structures defined in `types.ts`.
// For authentication, you must create users in Supabase Auth. The form now uses email and password.
//
// Example user records for your 'profiles' table (linked to auth.users):
// { id: 'auth.users.id', name: 'Admin User', email: 'admin@example.com', role: 'admin', avatar_url: '...' }
// { id: 'auth.users.id', name: 'Juan Pérez', email: 'juan.perez@example.com', role: 'empleado', avatar_url: '...' }

import { Profile, Client, Loan, LoanSchedule, Payment, Role, LoanFrequency, PaymentType, LoanStatus, ScheduleStatus, AppSettings, Route } from '../types.ts';

// FIX: Added missing tenant_id to all mock objects.
export let users: Profile[] = [
    { id: 'u-1', name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN, avatar_url: 'https://picsum.photos/seed/admin/100/100', tenant_id: 't-1' },
    { id: 'u-2', name: 'Juan Pérez', email: 'juan.perez@example.com', role: Role.EMPLOYEE, avatar_url: 'https://picsum.photos/seed/juan/100/100', tenant_id: 't-1' },
    { id: 'u-3', name: 'Maria García', email: 'maria.garcia@example.com', role: Role.EMPLOYEE, avatar_url: 'https://picsum.photos/seed/maria/100/100', tenant_id: 't-1' },
];

export let clients: Client[] = [
    { id: 'c-1', tenant_id: 't-1', name: 'Carlos Sánchez', phone: '555-1234', address: 'Calle Falsa 123' },
    { id: 'c-2', tenant_id: 't-1', name: 'Ana López', phone: '555-5678', address: 'Avenida Siempre Viva 742' },
    { id: 'c-3', tenant_id: 't-1', name: 'Pedro Martínez', phone: '555-8765', address: 'Boulevard de los Sueños Rotos 45' },
];

export let loans: Loan[] = [
    { id: 'l-1', tenant_id: 't-1', client_id: 'c-1', employee_id: 'u-2', amount: 1000, interest_rate: 10, frequency: LoanFrequency.MENSUAL, payment_type: PaymentType.INTERES, issue_date: '2023-10-01', term: 12, status: LoanStatus.ACTIVO, route_id: 'r-1' },
    { id: 'l-2', tenant_id: 't-1', client_id: 'c-2', employee_id: 'u-3', amount: 500, fixed_payment: 50, frequency: LoanFrequency.SEMANAL, payment_type: PaymentType.FIJO, issue_date: '2023-11-15', term: 12, status: LoanStatus.ATRASADO, route_id: 'r-2' },
    { id: 'l-3', tenant_id: 't-1', client_id: 'c-3', employee_id: 'u-2', amount: 2000, interest_rate: 8, frequency: LoanFrequency.QUINCENAL, payment_type: PaymentType.INTERES, issue_date: '2023-01-01', term: 6, status: LoanStatus.PAGADO, route_id: 'r-1' },
];

export let loanSchedules: LoanSchedule[] = [
    // Schedules for Loan l-1
    { id: 'ls-1-1', tenant_id: 't-1', loan_id: 'l-1', installment_number: 1, due_date: '2023-11-01', amount_due: 92.63, amount_paid: 92.63, payment_date: '2023-10-30', status: ScheduleStatus.PAGADO },
    { id: 'ls-1-2', tenant_id: 't-1', loan_id: 'l-1', installment_number: 2, due_date: '2023-12-01', amount_due: 92.63, amount_paid: 92.63, payment_date: '2023-11-29', status: ScheduleStatus.PAGADO },
    { id: 'ls-1-3', tenant_id: 't-1', loan_id: 'l-1', installment_number: 3, due_date: '2024-01-01', amount_due: 92.63, amount_paid: 0, status: ScheduleStatus.VENCIDO },
    { id: 'ls-1-4', tenant_id: 't-1', loan_id: 'l-1', installment_number: 4, due_date: '2024-02-01', amount_due: 92.63, amount_paid: 0, status: ScheduleStatus.PENDIENTE },
    
    // Schedules for Loan l-2
    { id: 'ls-2-1', tenant_id: 't-1', loan_id: 'l-2', installment_number: 1, due_date: '2023-11-22', amount_due: 50, amount_paid: 50, payment_date: '2023-11-21', status: ScheduleStatus.PAGADO },
    { id: 'ls-2-2', tenant_id: 't-1', loan_id: 'l-2', installment_number: 2, due_date: '2023-11-29', amount_due: 50, amount_paid: 0, status: ScheduleStatus.VENCIDO },
    { id: 'ls-2-3', tenant_id: 't-1', loan_id: 'l-2', installment_number: 3, due_date: '2023-12-06', amount_due: 50, amount_paid: 0, status: ScheduleStatus.VENCIDO },
    
    // Schedules for Loan l-3
    ...Array.from({ length: 6 }, (_, i) => ({
        id: `ls-3-${i + 1}`,
        tenant_id: 't-1',
        loan_id: 'l-3',
        installment_number: i + 1,
        due_date: new Date(2023, i, 15).toISOString().split('T')[0],
        amount_due: 341.55,
        amount_paid: 341.55,
        payment_date: new Date(2023, i, 14).toISOString().split('T')[0],
        status: ScheduleStatus.PAGADO,
    })),
];

export let payments: Payment[] = [
    { id: 'p-1', tenant_id: 't-1', schedule_id: 'ls-1-1', loan_id: 'l-1', amount: 92.63, payment_date: '2023-10-30', recorded_by: 'u-2' },
    { id: 'p-2', tenant_id: 't-1', schedule_id: 'ls-1-2', loan_id: 'l-1', amount: 92.63, payment_date: '2023-11-29', recorded_by: 'u-2' },
    { id: 'p-3', tenant_id: 't-1', schedule_id: 'ls-2-1', loan_id: 'l-2', amount: 50, payment_date: '2023-11-21', recorded_by: 'u-3' },
];

export let routes: Route[] = [
    { id: 'r-1', tenant_id: 't-1', name: 'Ruta Centro', employee_id: 'u-2' },
    { id: 'r-2', tenant_id: 't-1', name: 'Ruta Norte', employee_id: 'u-3' },
    { id: 'r-3', tenant_id: 't-1', name: 'Ruta Sur', employee_id: null },
];

export const appSettings: AppSettings = {
    currency: 'USD',
    default_interest_rate: 12,
    max_loan_amount: 10000,
};