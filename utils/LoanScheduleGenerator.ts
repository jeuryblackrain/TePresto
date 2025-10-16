import { Loan, LoanSchedule, LoanFrequency, PaymentType, ScheduleStatus } from '../types.ts';

/**
 * Adds a payment period to a given date based on the loan frequency.
 * @param date The starting date.
 * @param frequency The payment frequency (daily, weekly, etc.).
 * @returns A new Date object for the next payment.
 */
const addPeriod = (date: Date, frequency: LoanFrequency): Date => {
    const newDate = new Date(date);

    switch (frequency) {
        case LoanFrequency.DIARIO:
            newDate.setDate(newDate.getDate() + 1);
            break;
        case LoanFrequency.SEMANAL:
            newDate.setDate(newDate.getDate() + 7);
            break;
        case LoanFrequency.QUINCENAL:
            newDate.setDate(newDate.getDate() + 15);
            break;
        case LoanFrequency.MENSUAL: {
            const originalMonth = newDate.getMonth();
            newDate.setMonth(originalMonth + 1);
            
            // This robustly handles month-end calculations.
            // If we intended to go to the next month, but jumped ahead by more than one
            // (e.g., from Jan 31 to Mar 2), it means the target month was shorter.
            // In that case, we set the date to the last day of the intended month.
            // The modulo operator handles year-end rollovers correctly (e.g., month 11 to 0).
            if (newDate.getMonth() !== (originalMonth + 1) % 12) {
                // `setDate(0)` gets the last day of the *previous* month.
                // Since our date jumped ahead (e.g., into March), the "previous" month
                // is our actual target month (February).
                newDate.setDate(0);
            }
            break;
        }
    }
    return newDate;
};

interface InstallmentCalculationDetails {
    amount: number;
    interest_rate: number; // Annual percentage e.g., 10 for 10%
    term: number;
    frequency: LoanFrequency;
}

/**
 * Calculates the periodic payment amount for an amortized loan.
 * @param details An object containing the loan's principal, interest rate, term, and frequency.
 * @returns The calculated installment amount, or null if inputs are invalid.
 */
export const calculateInstallmentAmount = (details: InstallmentCalculationDetails): number | null => {
    const { amount, interest_rate, term, frequency } = details;
    const annualRate = interest_rate / 100;
    let periodicRate = 0;
    
    switch (frequency) {
        case LoanFrequency.DIARIO: periodicRate = annualRate / 365; break;
        case LoanFrequency.SEMANAL: periodicRate = annualRate / 52; break;
        case LoanFrequency.QUINCENAL: periodicRate = annualRate / 24; break;
        case LoanFrequency.MENSUAL: periodicRate = annualRate / 12; break;
    }

    if (periodicRate <= 0) return null;

    const numerator = periodicRate * amount;
    const denominator = 1 - Math.pow(1 + periodicRate, -term);
    
    if (denominator === 0) return null;

    return parseFloat((numerator / denominator).toFixed(2));
};

/**
 * Generates a complete loan payment schedule.
 * @param loan The loan object containing all necessary details.
 * @returns An array of LoanSchedule objects.
 */
export const generateLoanSchedule = (loan: Loan): Omit<LoanSchedule, 'id' | 'tenant_id'>[] => {
    const schedules: Omit<LoanSchedule, 'id' | 'tenant_id'>[] = [];
    let amountDue = 0;

    if (loan.payment_type === PaymentType.INTERES && loan.interest_rate) {
        const calculatedAmount = calculateInstallmentAmount({
            amount: loan.amount,
            interest_rate: loan.interest_rate,
            term: loan.term,
            frequency: loan.frequency,
        });
        if (calculatedAmount !== null) {
            amountDue = calculatedAmount;
        }
    } else if (loan.payment_type === PaymentType.FIJO && loan.fixed_payment) {
        amountDue = loan.fixed_payment;
    }

    if (amountDue <= 0) {
        console.error("Could not calculate a valid payment amount.", { loan });
        return [];
    }
    
    // The issue_date is YYYY-MM-DD. new Date() will parse it as UTC midnight.
    // Adding T12:00 avoids timezone issues where the date might shift back a day.
    let currentDueDate = new Date(`${loan.issue_date}T12:00:00Z`);

    for (let i = 1; i <= loan.term; i++) {
        currentDueDate = addPeriod(currentDueDate, loan.frequency);
        
        const schedule: Omit<LoanSchedule, 'id' | 'tenant_id'> = {
            loan_id: loan.id,
            installment_number: i,
            due_date: currentDueDate.toISOString().split('T')[0],
            amount_due: amountDue,
            amount_paid: 0,
            status: ScheduleStatus.PENDIENTE,
        };
        schedules.push(schedule);
    }

    return schedules;
}