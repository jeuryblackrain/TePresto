
import React from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { HandCoins, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card.tsx';
import { Loan, LoanStatus, Payment } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend as RechartsLegend } from 'recharts';
import useAuth from '../hooks/useAuth.ts';
import { useQuery } from '@tanstack/react-query';

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

    const fetchDashboardData = async () => {
        if (!profile) throw new Error("No profile");
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateString = sevenDaysAgo.toISOString().split('T')[0];

        // Fetch loans, clients, and payments in parallel
        const [loansResult, clientsResult, paymentsResult] = await Promise.all([
            supabase.from('loans').select('amount, status').eq('tenant_id', profile.tenant_id),
            supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
            supabase.from('payments').select('amount, payment_date').eq('tenant_id', profile.tenant_id).gte('payment_date', dateString)
        ]);

        if (loansResult.error) throw loansResult.error;
        if (clientsResult.error) throw clientsResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        const loans = loansResult.data as Pick<Loan, 'amount' | 'status'>[];
        const payments = paymentsResult.data as Payment[];
        const clientCount = clientsResult.count || 0;

        // Process stats
        const totalLoanAmount = loans.reduce((acc, loan) => acc + Number(loan.amount), 0);
        const activeLoans = loans.filter(l => l.status === LoanStatus.ACTIVO).length;
        const overdueLoans = loans.filter(l => l.status === LoanStatus.ATRASADO).length;
        const paidLoans = loans.filter(l => l.status === LoanStatus.PAGADO).length;

        const stats: DashboardStats = {
            totalLoans: loans.length,
            activeLoans,
            overdueLoans,
            paidLoans,
            totalLoanAmount,
            totalClients: clientCount,
        };

        // Chart Data
        const statusCounts = loans.reduce((acc, loan) => {
            acc[loan.status] = (acc[loan.status] || 0) + 1;
            return acc;
        }, {} as Record<LoanStatus, number>);
        
        const loanStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

        const paymentsByDay = payments.reduce((acc, payment) => {
            const date = formatDate(payment.payment_date);
            acc[date] = (acc[date] || 0) + payment.amount;
            return acc;
        }, {} as Record<string, number>);

        const weeklyPaymentsData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const formattedDate = formatDate(d.toISOString().split('T')[0]);
            weeklyPaymentsData.push({
                date: formattedDate.substring(0, 5), // "dd/mm"
                Cobrado: paymentsByDay[formattedDate] || 0,
            });
        }

        return { stats, loanStatusData, weeklyPaymentsData };
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboardStats', profile?.tenant_id],
        queryFn: fetchDashboardData,
        enabled: !!profile,
    });

    if (isLoading) {
        return <div className="text-center p-8 dark:text-gray-300">Cargando datos del dashboard...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {(error as Error).message}</div>;
    }

    if (!data) return null;

    const { stats, loanStatusData, weeklyPaymentsData } = data;

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
