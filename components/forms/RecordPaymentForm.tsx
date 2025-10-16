import React, { useState } from 'react';
import { LoanSchedule, Payment } from '../../types.ts';
import useAuth from '../../hooks/useAuth.ts';
import Button from '../ui/Button.tsx';

interface RecordPaymentFormProps {
    schedule: LoanSchedule;
    onClose: () => void;
    onSuccess: (paymentData: Omit<Payment, 'id' | 'tenant_id'>) => void;
}

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ schedule, onClose, onSuccess }) => {
    const { user } = useAuth();
    const amountToPay = schedule.amount_due - schedule.amount_paid;
    const [amount, setAmount] = useState(amountToPay.toFixed(2));
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (currentAmount: string): boolean => {
        const newErrors: { [key: string]: string } = {};
        const paidAmount = parseFloat(currentAmount);

        if (isNaN(paidAmount) || paidAmount <= 0) {
            newErrors.amount = 'El monto debe ser un número positivo.';
        } else if (paidAmount > amountToPay) {
            newErrors.amount = `El monto no puede ser mayor al saldo pendiente (${amountToPay.toFixed(2)}).`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setAmount(value);
        validate(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate(amount)) return;

        if (!user) {
             setErrors({ general: 'No se pudo identificar al empleado. Por favor, inicie sesión de nuevo.' });
             return;
        }

        onSuccess({
            schedule_id: schedule.id,
            loan_id: schedule.loan_id,
            amount: parseFloat(amount),
            payment_date: paymentDate,
            recorded_by: user.id,
        });
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const baseInputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorInputClasses = "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500";
    const errorTextClasses = "mt-1 text-xs text-red-600 dark:text-red-400";
    const getInputClass = (fieldName: string) => `${baseInputClasses} ${errors[fieldName] ? errorInputClasses : ''}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800 dark:text-gray-200">
            <div>
                <p><strong>Cuota #{schedule.installment_number}</strong></p>
                <p>Monto Adeudado: <span className="font-semibold">{formatCurrency(schedule.amount_due)}</span></p>
                <p>Saldo Pendiente: <span className="font-semibold text-red-600">{formatCurrency(amountToPay)}</span></p>
            </div>
            <div>
                <label htmlFor="amount" className={labelClasses}>Monto a Pagar</label>
                <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={handleChange}
                    required
                    max={amountToPay.toFixed(2)}
                    step="0.01"
                    className={getInputClass('amount')}
                />
                 {errors.amount && <p className={errorTextClasses}>{errors.amount}</p>}
            </div>
            <div>
                <label htmlFor="paymentDate" className={labelClasses}>Fecha de Pago</label>
                <input
                    type="date"
                    id="paymentDate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className={`${baseInputClasses} dark:[color-scheme:dark]`}
                />
            </div>

            {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Confirmar Pago</Button>
            </div>
        </form>
    );
};

export default RecordPaymentForm;