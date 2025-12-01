import React, { useState, useEffect } from 'react';
import { Loan, LoanFrequency, PaymentType } from '../../types.ts';
import Button from '../ui/Button.tsx';
import { calculateInstallmentAmount } from '../../utils/LoanScheduleGenerator.ts';
import { formatCurrency } from '../../utils/formatters.ts';
import { ArrowRight, Calculator } from 'lucide-react';

interface RenovateLoanFormProps {
    oldLoan: Loan;
    balanceToPayOff: number;
    onSave: (loanData: Omit<Loan, 'id' | 'status' | 'tenant_id'>) => void;
    onClose: () => void;
    isSaving: boolean;
}

const RenovateLoanForm: React.FC<RenovateLoanFormProps> = ({ oldLoan, balanceToPayOff, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState({
        amount: '', // New total amount
        interest_rate: oldLoan.interest_rate ? String(oldLoan.interest_rate) : '',
        fixed_payment: oldLoan.fixed_payment ? String(oldLoan.fixed_payment) : '',
        frequency: oldLoan.frequency,
        payment_type: oldLoan.payment_type,
        issue_date: new Date().toISOString().split('T')[0],
        term: '12', // Default to a standard term, or could inherit oldLoan.term
        route_id: oldLoan.route_id || '',
    });
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [calculatedInstallment, setCalculatedInstallment] = useState<number | null>(null);

    // Calculate the installment amount dynamically
    useEffect(() => {
        if (formData.payment_type === PaymentType.INTERES) {
            const { amount, interest_rate, term, frequency } = formData;
            if (Number(amount) > 0 && Number(interest_rate) > 0 && Number(term) > 0) {
                const installment = calculateInstallmentAmount({
                    amount: parseFloat(amount),
                    interest_rate: parseFloat(interest_rate),
                    term: parseInt(term, 10),
                    frequency: frequency,
                });
                setCalculatedInstallment(installment);
            } else {
                setCalculatedInstallment(null);
            }
        } else {
            setCalculatedInstallment(null);
        }
    }, [formData.amount, formData.interest_rate, formData.term, formData.frequency, formData.payment_type]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        const { amount, term, payment_type, interest_rate, fixed_payment } = formData;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            newErrors.amount = "El monto debe ser un número positivo.";
        } else if (numericAmount <= balanceToPayOff) {
            newErrors.amount = `El nuevo monto debe ser mayor al saldo actual (${formatCurrency(balanceToPayOff)}) para cubrir la deuda.`;
        }

        const numericTerm = parseInt(term, 10);
        if (isNaN(numericTerm) || numericTerm <= 0 || !Number.isInteger(numericTerm)) {
            newErrors.term = "El plazo debe ser un número entero positivo.";
        }

        if (payment_type === PaymentType.INTERES) {
            const numericInterest = parseFloat(interest_rate);
            if (isNaN(numericInterest) || numericInterest <= 0) {
                newErrors.interest_rate = "La tasa de interés debe ser un número positivo.";
            }
        }

        if (payment_type === PaymentType.FIJO) {
            const numericFixedPayment = parseFloat(fixed_payment);
            if (isNaN(numericFixedPayment) || numericFixedPayment <= 0) {
                newErrors.fixed_payment = "El pago fijo debe ser un número positivo.";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear specific error
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        if (validate()) {
            const { amount, payment_type, interest_rate, fixed_payment, term, frequency, issue_date, route_id } = formData;
            const loanData: Omit<Loan, 'id' | 'status' | 'tenant_id'> = {
                client_id: oldLoan.client_id, // Inherit client
                employee_id: oldLoan.employee_id, // Inherit employee (can be edited later if needed)
                amount: parseFloat(amount),
                interest_rate: payment_type === PaymentType.INTERES ? parseFloat(interest_rate) : undefined,
                fixed_payment: payment_type === PaymentType.FIJO ? parseFloat(fixed_payment) : undefined,
                frequency,
                payment_type,
                issue_date,
                term: parseInt(term, 10),
                route_id: route_id || null,
            };
            onSave(loanData);
        }
    };

    const netToClient = Math.max(0, (parseFloat(formData.amount) || 0) - balanceToPayOff);

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const baseInputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorInputClasses = "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500";
    const errorTextClasses = "mt-1 text-xs text-red-600 dark:text-red-400";
    const getInputClass = (fieldName: string) => `${baseInputClasses} ${errors[fieldName] ? errorInputClasses : ''}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Financial Summary Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                    <Calculator className="w-4 h-4 mr-2" />
                    Resumen de la Transacción
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Saldo Préstamo Anterior:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(balanceToPayOff)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Nuevo Monto (Capital):</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formData.amount ? formatCurrency(parseFloat(formData.amount)) : '$0.00'}</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-700 pt-2 flex justify-between items-center text-base font-bold">
                        <span className="text-blue-900 dark:text-blue-200">Efectivo a Entregar:</span>
                        <span className="text-green-600 dark:text-green-400">{formatCurrency(netToClient)}</span>
                    </div>
                </div>
            </div>

            <fieldset disabled={isSaving} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="amount" className={labelClasses}>Nuevo Monto Total</label>
                        <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required className={getInputClass('amount')} placeholder={`Min: ${balanceToPayOff + 1}`} />
                        {errors.amount && <p className={errorTextClasses}>{errors.amount}</p>}
                    </div>
                     <div>
                        <label htmlFor="term" className={labelClasses}>Nuevo Plazo (cuotas)</label>
                        <input type="number" id="term" name="term" value={formData.term} onChange={handleChange} required min="1" step="1" className={getInputClass('term')} />
                         {errors.term && <p className={errorTextClasses}>{errors.term}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="payment_type" className={labelClasses}>Tipo de Pago</label>
                        <select id="payment_type" name="payment_type" value={formData.payment_type} onChange={handleChange} className={baseInputClasses}>
                            <option value={PaymentType.INTERES}>Tasa de Interés</option>
                            <option value={PaymentType.FIJO}>Pago Fijo</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="frequency" className={labelClasses}>Frecuencia</label>
                        <select id="frequency" name="frequency" value={formData.frequency} onChange={handleChange} className={baseInputClasses}>
                            {Object.values(LoanFrequency).map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                        </select>
                    </div>
                </div>

                {formData.payment_type === PaymentType.INTERES ? (
                    <div>
                        <label htmlFor="interest_rate" className={labelClasses}>Tasa de Interés Anual (%)</label>
                        <input type="number" id="interest_rate" name="interest_rate" value={formData.interest_rate} onChange={handleChange} required className={getInputClass('interest_rate')} />
                         {errors.interest_rate && <p className={errorTextClasses}>{errors.interest_rate}</p>}
                        {calculatedInstallment !== null && !errors.interest_rate && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nueva Cuota: {formatCurrency(calculatedInstallment)}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        <label htmlFor="fixed_payment" className={labelClasses}>Monto de Pago Fijo</label>
                        <input type="number" id="fixed_payment" name="fixed_payment" value={formData.fixed_payment} onChange={handleChange} required className={getInputClass('fixed_payment')} />
                         {errors.fixed_payment && <p className={errorTextClasses}>{errors.fixed_payment}</p>}
                    </div>
                )}
                 
                 <div>
                    <label htmlFor="issue_date" className={labelClasses}>Fecha de Renovación</label>
                    <input type="date" id="issue_date" name="issue_date" value={formData.issue_date} onChange={handleChange} required className={`${baseInputClasses} dark:[color-scheme:dark]`} />
                </div>
            </fieldset>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving} leftIcon={ArrowRight}>
                    {isSaving ? 'Procesando...' : 'Confirmar Renovación'}
                </Button>
            </div>
        </form>
    );
};

export default RenovateLoanForm;
