import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { HandCoins, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import { Loan, LoanStatus, Payment } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Legend as RechartsLegend } from 'recharts';
import useAuth from '../hooks/useAuth.ts';


interface DashboardStats {
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    paidLoans: number;
    totalLoanAmount: number;
    totalClients: number;
}

const COLORS = {
    [LoanStatus.PAGADO]: '#3b82f6',
    [LoanStatus.ACTIVO]: '#22c55e',
    [LoanStatus.ATRASADO]: '#ef4444',
};

const DashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loanStatusData, setLoanStatusData] = useState<any[]>([]);
    const [weeklyPaymentsData, setWeeklyPaymentsData] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!profile) return;
            setLoading(true);
            setError(null);
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const dateString = sevenDaysAgo.toISOString().split('T')[0];

                // Fetch loans, clients, and payments in parallel for better performance
                const [loansResult, clientsResult, paymentsResult] = await Promise.all([
                    supabase.from('loans').select('amount, status').eq('tenant_id', profile.tenant_id),
                    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
                    supabase.from('payments').select('amount, payment_date').eq('tenant_id', profile.tenant_id).gte('payment_date', dateString)
                ]);

                // Destructure and check for errors
                const { data: loans, error: loansError } = loansResult;
                if (loansError) throw loansError;
                const loanData = loans as Pick<Loan, 'amount' | 'status'>[];

                const { count: clientCount, error: clientsError } = clientsResult;
                if (clientsError) throw clientsError;

                const { data: payments, error: paymentsError } = paymentsResult;
                if (paymentsError) throw paymentsError;

                // Process stats
                const totalLoanAmount = loanData.reduce((acc, loan) => acc + Number(loan.amount), 0);
                const activeLoans = loanData.filter(l => l.status === LoanStatus.ACTIVO).length;
                const overdueLoans = loanData.filter(l => l.status === LoanStatus.ATRASADO).length;
                const paidLoans = loanData.filter(l => l.status === LoanStatus.PAGADO).length;

                setStats({
                    totalLoans: loanData.length,
                    activeLoans,
                    overdueLoans,
                    paidLoans,
                    totalLoanAmount,
                    totalClients: clientCount ?? 0,
                });

                // Process data for charts
                const statusCounts = loanData.reduce((acc, loan) => {
                    acc[loan.status] = (acc[loan.status] || 0) + 1;
                    return acc;
                }, {} as Record<LoanStatus, number>);
                
                setLoanStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

                const paymentsByDay = (payments as Payment[]).reduce((acc, payment) => {
                    const date = formatDate(payment.payment_date);
                    acc[date] = (acc[date] || 0) + payment.amount;
                    return acc;
                }, {} as Record<string, number>);

                const last7Days: { date: string; Cobrado: number }[] = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const formattedDate = formatDate(d.toISOString().split('T')[0]);
                    last7Days.push({
                        date: formattedDate.substring(0, 5), // "dd/mm"
                        Cobrado: paymentsByDay[formattedDate] || 0,
                    });
                }
                setWeeklyPaymentsData(last7Days);


            } catch (err: any) {
                setError(err.message || "Failed to fetch dashboard data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [profile]);

    if (loading) {
        return <div className="text-center p-8">Cargando datos del dashboard...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    if (!stats) {
        return <div className="text-center p-8">No se encontraron datos.</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-blue-50 dark:bg-blue-900/50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-500 text-white mr-4">
                            <HandCoins className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Monto Total Prestado</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.totalLoanAmount)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-500 text-white mr-4">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clientes Totales</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalClients}</p>
                        </div>
                    </div>
                </Card>
                 <Card className="bg-yellow-50 dark:bg-yellow-900/50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-500 text-white mr-4">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Préstamos Atrasados</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.overdueLoans}</p>
                        </div>
                    </div>
                </Card>
                 <Card className="bg-indigo-50 dark:bg-indigo-900/50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-indigo-500 text-white mr-4">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Préstamos Activos</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.activeLoans}</p>
                        </div>
                    </div>
                </Card>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                <div className="lg:col-span-3">
                    <Card title="Pagos Cobrados (Últimos 7 Días)">
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyPaymentsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(2px)' }} formatter={(value) => [formatCurrency(Number(value)), "Monto"]} />
                                    <Bar dataKey="Cobrado" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card title="Distribución de Préstamos">
                         <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={loanStatusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        // FIX: Cast `percent` to Number to avoid TypeScript arithmetic error.
                                        label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                                    >
                                        {loanStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as LoanStatus]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} préstamos`, name]} />
                                    <RechartsLegend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;