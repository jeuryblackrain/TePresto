
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Loan, Client, Profile, Payment, Role, LoanStatus } from '../../types.ts';
import { generateReportSummary } from '../../services/geminiService.ts';
import useAuth from '../../hooks/useAuth.ts';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { Bot, RefreshCw, HandCoins, PiggyBank, CircleDollarSign, TrendingUp, DollarSign, PieChart as PieIcon, Activity } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters.ts';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportData {
    loans: (Loan & { loan_schedules: { amount_due: number }[] })[];
    clients: Client[];
    employees: Profile[];
    payments: Payment[];
}

const GeneralSummary: React.FC = () => {
    const { profile } = useAuth();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [loadingData, setLoadingData] = useState(true);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic Metrics
    const [totalLoaned, setTotalLoaned] = useState(0);
    const [totalCollected, setTotalCollected] = useState(0);
    
    // Advanced Financial Metrics
    const [projectedInterest, setProjectedInterest] = useState(0);
    const [realizedProfit, setRealizedProfit] = useState(0); // From closed loans
    const [estimatedCollectedInterest, setEstimatedCollectedInterest] = useState(0); // Estimated from active loans
    const [totalReceivable, setTotalReceivable] = useState(0);
    const [roi, setRoi] = useState(0);

    const fetchData = useCallback(async () => {
        if (!profile) return;
        setLoadingData(true);
        setError(null);
        try {
            // 1. Fetch Loans
            let loansQuery = supabase
                .from('loans')
                .select('*')
                .eq('tenant_id', profile.tenant_id);

            if (profile.role === Role.EMPLOYEE) {
                loansQuery = loansQuery.eq('employee_id', profile.id);
            }
            
            const { data: loansRaw, error: loansError } = await loansQuery;
            if (loansError) throw loansError;
            const loans = loansRaw || [];

            // 2. Fetch Schedules (Manual Join)
            const loanIds = loans.map(l => l.id);
            let schedulesMap: Record<string, { amount_due: number, status: string }[]> = {};
            
            if (loanIds.length > 0) {
                const { data: schedules } = await supabase
                    .from('loan_schedules')
                    .select('loan_id, amount_due, status')
                    .in('loan_id', loanIds);
                
                if (schedules) {
                    schedules.forEach(s => {
                        if (!schedulesMap[s.loan_id]) schedulesMap[s.loan_id] = [];
                        schedulesMap[s.loan_id].push(s);
                    });
                }
            }

            // Combine Loans with Schedules
            const loansData = loans.map(loan => ({
                ...loan,
                loan_schedules: schedulesMap[loan.id] || []
            }));

            // 3. Fetch Payments
            let paymentData: Payment[] = [];
            if (loanIds.length > 0) {
                const { data: payments, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .in('loan_id', loanIds);
                if (paymentsError) throw paymentsError;
                paymentData = payments || [];
            }

            // 4. Fetch clients and employees (Optional, for context)
            let clientData: Client[] = [];
            let employeeData: Profile[] = [];
            
            if (profile.role === Role.ADMIN) {
                 const { data: clients } = await supabase.from('clients').select('*').eq('tenant_id', profile.tenant_id);
                 clientData = clients || [];
                 const { data: employees } = await supabase.from('profiles').select('*').eq('tenant_id', profile.tenant_id);
                 employeeData = employees || [];
            } else {
                 employeeData = [profile];
            }

            setReportData({
                loans: loansData,
                clients: clientData,
                employees: employeeData,
                payments: paymentData,
            });

            // --- CALCULATIONS ---

            // 1. Total Principal (Capital Prestado)
            const principal = loansData.reduce((acc, loan) => acc + Number(loan.amount), 0);
            
            // 2. Total Collected (Total Cobrado)
            const collected = paymentData.reduce((acc, payment) => acc + Number(payment.amount), 0);

            // 3. Total Receivable (Total a cobrar segun cronograma)
            const receivable = loansData.reduce((acc, loan) => {
                const scheduleSum = loan.loan_schedules.reduce((sAcc, schedule) => sAcc + schedule.amount_due, 0);
                return acc + scheduleSum;
            }, 0);

            // 4. Projected Interest
            const interestProj = Math.max(0, receivable - principal);

            // 5. Realized Profit (Closed Loans)
            const closedLoans = loansData.filter(l => l.status === LoanStatus.PAGADO);
            const closedLoanIds = new Set(closedLoans.map(l => l.id));
            
            const closedLoansPrincipal = closedLoans.reduce((sum, l) => sum + Number(l.amount), 0);
            const closedLoansPayments = paymentData.filter(p => closedLoanIds.has(p.loan_id));
            const closedLoansCollected = closedLoansPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            
            const profitRealized = Math.max(0, closedLoansCollected - closedLoansPrincipal);

            // 6. Estimated Collected Interest
            const collectionRatio = receivable > 0 ? collected / receivable : 0;
            const estimatedInterest = interestProj * collectionRatio;

            // 7. ROI
            const calculatedRoi = principal > 0 ? (interestProj / principal) * 100 : 0;

            setTotalLoaned(principal);
            setTotalCollected(collected);
            setTotalReceivable(receivable);
            setProjectedInterest(interestProj);
            setRealizedProfit(profitRealized);
            setEstimatedCollectedInterest(estimatedInterest);
            setRoi(calculatedRoi);

        } catch (err: any) {
            setError(err.message || "Failed to fetch report data.");
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    }, [profile]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateSummary = async () => {
        if (!reportData) return;
        setLoadingSummary(true);
        setSummary('');
        setError(null);
        try {
            const result = await generateReportSummary({
                loans: reportData.loans,
                clients: reportData.clients,
                employees: reportData.employees,
                payments: reportData.payments
            });
            setSummary(result);
        } catch (err: any) {
            console.error("Error in summary generation:", err);
            setError(err.message || "No se pudo generar el resumen.");
            setSummary("");
        } finally {
            setLoadingSummary(false);
        }
    };

    if (loadingData) {
        return <div className="text-center p-8 dark:text-gray-300">Cargando datos del resumen...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error cargando reporte: {error}</div>;
    }

    const pieData = [
        { name: 'Capital Prestado', value: totalLoaned },
        { name: 'Interés Proyectado', value: projectedInterest },
    ];
    
    const COLORS = ['#3b82f6', '#10b981']; 

    return (
        <div className="space-y-6">
            {/* Basic Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 dark:bg-blue-900/30">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-500 text-white mr-4"><HandCoins className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Capital Prestado</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalLoaned)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/30">
                    <div className="flex items-center">
                         <div className="p-3 rounded-full bg-green-500 text-white mr-4"><PiggyBank className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cobrado (Flujo)</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalCollected)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-yellow-50 dark:bg-yellow-900/30">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-500 text-white mr-4"><CircleDollarSign className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartera por Cobrar</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalReceivable - totalCollected)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Profitability Analysis Row */}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Análisis de Rentabilidad e Intereses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card className="bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500">
                    <div className="flex items-center mb-2">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ganancia Realizada</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(realizedProfit)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Neta de préstamos cerrados.</p>
                </Card>

                <Card className="bg-teal-50 dark:bg-teal-900/30 border-l-4 border-teal-500">
                     <div className="flex items-center mb-2">
                        <Activity className="h-5 w-5 text-teal-600 dark:text-teal-400 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interés Cobrado (Est.)</h3>
                    </div>
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(estimatedCollectedInterest)}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Estimación basada en cobros actuales.</p>
                </Card>

                <Card className="bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500">
                     <div className="flex items-center mb-2">
                        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interés Proyectado</h3>
                    </div>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(projectedInterest)}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Beneficio total esperado.</p>
                </Card>

                 <Card className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500">
                    <div className="flex items-center mb-2">
                        <PieIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Margen (ROI)</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{roi.toFixed(1)}%</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Retorno sobre capital.</p>
                </Card>
            </div>

            {/* Visual Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Composición de Cartera Proyectada">
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-2">
                        Muestra la relación entre el dinero prestado y la ganancia esperada.
                    </div>
                </Card>

                <Card title="Resumen con IA (Gemini)">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Genere un análisis cualitativo del estado de su negocio basado en los datos financieros actuales.
                        </p>
                        <Button 
                            onClick={handleGenerateSummary} 
                            disabled={loadingSummary} 
                            leftIcon={loadingSummary ? RefreshCw : Bot}
                            className={loadingSummary ? 'animate-spin' : ''}
                        >
                            {loadingSummary ? 'Generando...' : 'Generar Resumen Inteligente'}
                        </Button>
                        
                        {summary && (
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{summary}</p>
                            </div>
                        )}

                        {error && <p className="text-red-500 mt-2 text-sm">Error: {error}</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default GeneralSummary;
