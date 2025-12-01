import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Profile, Loan, Role, LoanSchedule } from '../../types.ts';
import Card from '../ui/Card.tsx';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.ts';
import StatusBadge from '../ui/StatusBadge.tsx';
import { DollarSign, TrendingUp, PiggyBank, Briefcase } from 'lucide-react';

type LoanWithDetails = Loan & {
    clients: { name: string } | null;
    loan_schedules: { amount_due: number }[];
};

const EmployeeReport: React.FC = () => {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [loans, setLoans] = useState<LoanWithDetails[]>([]);
    const [stats, setStats] = useState({
        totalLoaned: 0,
        totalReceivable: 0,
        projectedInterest: 0,
        totalCollected: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!profile) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .or(`role.eq.${Role.EMPLOYEE},role.eq.${Role.ADMIN}`)
                .order('name');
            if (error) {
                setError('Failed to fetch employees');
            } else {
                setEmployees(data || []);
            }
        };
        fetchEmployees();
    }, [profile]);

    useEffect(() => {
        const fetchLoansByEmployee = async () => {
            if (!selectedEmployeeId || !profile) {
                setLoans([]);
                setStats({ totalLoaned: 0, totalReceivable: 0, projectedInterest: 0, totalCollected: 0 });
                return;
            }
            setLoading(true);
            setError(null);

            try {
                // Fetch loans with client names and schedules to calculate total receivable
                const { data: loansData, error: loansError } = await supabase
                    .from('loans')
                    .select('*, clients(name), loan_schedules(amount_due)')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('employee_id', selectedEmployeeId)
                    .order('issue_date', { ascending: false });

                if (loansError) throw loansError;
                
                const typedLoans = loansData as unknown as LoanWithDetails[];
                setLoans(typedLoans);

                // Fetch payments for these loans to calculate total collected
                const loanIds = typedLoans.map(l => l.id);
                let totalCollectedAmount = 0;
                
                if (loanIds.length > 0) {
                    const { data: paymentsData, error: paymentsError } = await supabase
                        .from('payments')
                        .select('amount')
                        .in('loan_id', loanIds);
                    
                    if (paymentsError) throw paymentsError;
                    totalCollectedAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
                }

                // Calculate Metrics
                const totalLoaned = typedLoans.reduce((sum, l) => sum + Number(l.amount), 0);
                
                const totalReceivable = typedLoans.reduce((sum, l) => {
                    // Sum amount_due from all schedules
                    const schedulesTotal = l.loan_schedules?.reduce((sSum, s) => sSum + s.amount_due, 0) || 0;
                    return sum + schedulesTotal;
                }, 0);

                const projectedInterest = Math.max(0, totalReceivable - totalLoaned);

                setStats({
                    totalLoaned,
                    totalReceivable,
                    projectedInterest,
                    totalCollected: totalCollectedAmount
                });

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLoansByEmployee();
    }, [selectedEmployeeId, profile]);

    return (
        <Card title="Reporte Financiero por Empleado">
            <div className="mb-6">
                <label htmlFor="employee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Seleccionar Empleado
                </label>
                <select
                    id="employee"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="mt-1 block w-full md:w-1/3 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                    <option value="">-- Seleccione un empleado --</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                </select>
            </div>
            
            {loading && <p className="dark:text-gray-300 p-4 text-center">Calculando métricas...</p>}
            {error && <p className="text-red-500 p-4">{error}</p>}
            
            {selectedEmployeeId && !loading && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                         <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center mb-2">
                                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2"/>
                                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Capital Prestado</h4>
                            </div>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.totalLoaned)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                             <div className="flex items-center mb-2">
                                <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2"/>
                                <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Total a Cobrar</h4>
                            </div>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.totalReceivable)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Capital + Intereses</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                             <div className="flex items-center mb-2">
                                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mr-2"/>
                                <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Interés Proyectado</h4>
                            </div>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.projectedInterest)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ganancia Estimada</p>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                             <div className="flex items-center mb-2">
                                <PiggyBank className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2"/>
                                <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Total Cobrado</h4>
                            </div>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.totalCollected)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {stats.totalReceivable > 0 
                                    ? `${((stats.totalCollected / stats.totalReceivable) * 100).toFixed(1)}% Recuperado` 
                                    : '0% Recuperado'}
                            </p>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Detalle de Préstamos</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prestado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total a Pagar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Interés</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Emisión</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {loans.map(loan => {
                                    // Calculate individual loan metrics for the table
                                    const receivable = loan.loan_schedules?.reduce((acc, s) => acc + s.amount_due, 0) || 0;
                                    const interest = Math.max(0, receivable - Number(loan.amount));
                                    
                                    return (
                                        <tr key={loan.id}>
                                            <td className="px-6 py-4 text-gray-800 dark:text-white">{loan.clients?.name}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(loan.amount)}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{formatCurrency(receivable)}</td>
                                            <td className="px-6 py-4 text-green-600 dark:text-green-400">{formatCurrency(interest)}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatDate(loan.issue_date)}</td>
                                            <td className="px-6 py-4"><StatusBadge status={loan.status} /></td>
                                            <td className="px-6 py-4 text-right">
                                                <Link to={`/loans/${loan.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">Ver</Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Card>
    );
};

export default EmployeeReport;
