import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Loan, Profile, Role, Route, LoanFrequency, PaymentType } from '../../types.ts';
import Button from '../ui/Button.tsx';
import { calculateInstallmentAmount } from '../../utils/LoanScheduleGenerator.ts';
import { Info } from 'lucide-react';
import useAuth from '../../hooks/useAuth.ts';

interface EditLoanFormProps {
    loan: Loan;
    onSave: (loanData: Partial<Loan>) => void;
    onClose: () => void;
    isSaving: boolean;
    hasPayments: boolean;
}

const EditLoanForm: React.FC<EditLoanFormProps> = ({ loan, onSave, onClose, isSaving, hasPayments }) => {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [formData, setFormData] = useState({
        employee_id: loan.employee_id || '',
        route_id: loan.route_id || '',
        amount: String(loan.amount),
        interest_rate: String(loan.interest_rate || ''),
        fixed_payment: String(loan.fixed_payment || ''),
        frequency: loan.frequency,
        payment_type: loan.payment_type,
        issue_date: loan.issue_date,
        term: String(loan.term),
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [calculatedInstallment, setCalculatedInstallment] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile) return;
            const { data: employeesData, error: employeesError } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .or(`role.eq.${Role.EMPLOYEE},role.eq.${Role.ADMIN}`)
                .order('name');
            if (employeesError) console.error("Error fetching employees", employeesError);
            else setEmployees(employeesData || []);

            const { data: routesData, error: routesError } = await supabase
                .from('routes')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('name');
            if (routesError) console.error("Error fetching routes", routesError);
            else setRoutes(routesData || []);
        };
        fetchData();
    }, [profile]);

    useEffect(() => {
        setFormData({
            employee_id: loan.employee_id || '',
            route_id: loan.route_id || '',
            amount: String(loan.amount),
            interest_rate: String(loan.interest_rate || ''),
            fixed_payment: String(loan.fixed_payment || ''),
            frequency: loan.frequency,
            payment_type: loan.payment_type,
            issue_date: loan.issue_date,
            term: String(loan.term),
        });
        setErrors({});
    }, [loan]);

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
        const { employee_id, amount, term, payment_type, interest_rate, fixed_payment } = formData;

        if (!employee_id) newErrors.employee_id = "Debe seleccionar un empleado.";
        
        // Only validate financial fields if they are editable
        if (!hasPayments) {
            const numericAmount = parseFloat(amount.replace(',', '.'));
            if (isNaN(numericAmount) || numericAmount <= 0) {
                newErrors.amount = "El monto debe ser un número positivo.";
            }

            const numericTerm = parseInt(term, 10);
            if (isNaN(numericTerm) || numericTerm <= 0 || !Number.isInteger(numericTerm)) {
                newErrors.term = "El plazo debe ser un número entero positivo.";
            }

            if (payment_type === PaymentType.INTERES) {
                const numericInterest = parseFloat(interest_rate.replace(',', '.'));
                if (isNaN(numericInterest) || numericInterest <= 0) {
                    newErrors.interest_rate = "La tasa de interés debe ser un número positivo.";
                }
            }

            if (payment_type === PaymentType.FIJO) {
                const numericFixedPayment = parseFloat(fixed_payment.replace(',', '.'));
                if (isNaN(numericFixedPayment) || numericFixedPayment <= 0) {
                    newErrors.fixed_payment = "El pago fijo debe ser un número positivo.";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            const { amount, payment_type, interest_rate, fixed_payment, term } = formData;
            onSave({
                ...formData,
                amount: parseFloat(amount.replace(',', '.')),
                term: parseInt(term, 10),
                interest_rate: payment_type === PaymentType.INTERES ? parseFloat(interest_rate.replace(',', '.')) : undefined,
                fixed_payment: payment_type === PaymentType.FIJO ? parseFloat(fixed_payment.replace(',', '.')) : undefined,
                route_id: formData.route_id || null,
            });
        }
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const baseInputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorInputClasses = "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500";
    const errorTextClasses = "mt-1 text-xs text-red-600 dark:text-red-400";
    const getInputClass = (fieldName: string) => `${baseInputClasses} ${errors[fieldName] ? errorInputClasses : ''} disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`;


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {hasPayments && (
                <div className="flex items-start p-3 text-sm text-yellow-800 bg-yellow-50 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-300">
                    <Info className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>Los detalles financieros no se pueden editar porque este préstamo ya tiene pagos registrados. Solo se puede cambiar el empleado y la ruta.</span>
                </div>
            )}
            <fieldset disabled={isSaving}>
                 <div>
                    <label htmlFor="employee_id" className={labelClasses}>Empleado Asignado</label>
                    <select
                        id="employee_id"
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        required
                        className={getInputClass('employee_id')}
                    >
                        <option value="">Seleccione un empleado</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                     {errors.employee_id && <p className={errorTextClasses}>{errors.employee_id}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="amount" className={labelClasses}>Monto del Préstamo</label>
                        <input type="text" inputMode="decimal" id="amount" name="amount" value={formData.amount} onChange={handleChange} required className={getInputClass('amount')} disabled={hasPayments}/>
                         {errors.amount && <p className={errorTextClasses}>{errors.amount}</p>}
                    </div>
                     <div>
                        <label htmlFor="term" className={labelClasses}>Plazo (en pagos)</label>
                        <input type="number" id="term" name="term" value={formData.term} onChange={handleChange} required min="1" step="1" className={getInputClass('term')} disabled={hasPayments} />
                         {errors.term && <p className={errorTextClasses}>{errors.term}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="payment_type" className={labelClasses}>Tipo de Pago</label>
                        <select id="payment_type" name="payment_type" value={formData.payment_type} onChange={handleChange} className={getInputClass('payment_type')} disabled={hasPayments}>
                            <option value={PaymentType.INTERES}>Tasa de Interés</option>
                            <option value={PaymentType.FIJO}>Pago Fijo</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="frequency" className={labelClasses}>Frecuencia</label>
                        <select id="frequency" name="frequency" value={formData.frequency} onChange={handleChange} className={getInputClass('frequency')} disabled={hasPayments}>
                            {Object.values(LoanFrequency).map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                        </select>
                    </div>
                </div>

                {formData.payment_type === PaymentType.INTERES ? (
                    <div>
                        <label htmlFor="interest_rate" className={labelClasses}>Tasa de Interés Anual (%)</label>
                        <input type="text" inputMode="decimal" id="interest_rate" name="interest_rate" value={formData.interest_rate} onChange={handleChange} required className={getInputClass('interest_rate')} disabled={hasPayments}/>
                        {errors.interest_rate && <p className={errorTextClasses}>{errors.interest_rate}</p>}
                        {calculatedInstallment !== null && !errors.interest_rate && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cuota calculada: ${calculatedInstallment.toFixed(2)}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        <label htmlFor="fixed_payment" className={labelClasses}>Monto de Pago Fijo</label>
                        <input type="text" inputMode="decimal" id="fixed_payment" name="fixed_payment" value={formData.fixed_payment} onChange={handleChange} required className={getInputClass('fixed_payment')} disabled={hasPayments}/>
                        {errors.fixed_payment && <p className={errorTextClasses}>{errors.fixed_payment}</p>}
                    </div>
                )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="issue_date" className={labelClasses}>Fecha de Emisión</label>
                        <input type="date" id="issue_date" name="issue_date" value={formData.issue_date} onChange={handleChange} required className={`${getInputClass('issue_date')} dark:[color-scheme:dark]`} disabled={hasPayments}/>
                    </div>
                    <div>
                        <label htmlFor="route_id" className={labelClasses}>Ruta Asignada</label>
                        <select id="route_id" name="route_id" value={formData.route_id ?? ''} onChange={handleChange} className={getInputClass('route_id')}>
                            <option value="">Sin ruta</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>
        </form>
    );
};

export default EditLoanForm;