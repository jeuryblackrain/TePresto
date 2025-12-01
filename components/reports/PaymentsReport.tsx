
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Payment, Role } from '../../types.ts';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import useAuth from '../../hooks/useAuth.ts';
import Pagination from '../ui/Pagination.tsx';

type PaymentWithDetails = Payment & {
    loans: {
        clients: { name: string } | null
    } | null;
    profiles: { name: string } | null;
};

const ITEMS_PER_PAGE = 20;

const PaymentsReport: React.FC = () => {
    const { profile } = useAuth();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(todayStr);
    const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0); // Total amount for the period (unpaginated)

    // Separate fetch for the total sum to avoid fetching all rows just to sum them in JS
    const fetchTotalAmount = useCallback(async () => {
        if (!startDate || !endDate || !profile) return;
        
        // This is a simplified sum query. 
        // Note: Supabase doesn't support aggregate .sum() directly in the JS client efficiently without an RPC or fetching all rows.
        // For simplicity and speed, we will fetch 'amount' only for all rows in range to calculate sum on client,
        // which is lighter than fetching full joined objects.
        try {
             let query = supabase
                .from('payments')
                .select('amount')
                .eq('tenant_id', profile.tenant_id)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate);
            
             if (profile.role === Role.EMPLOYEE) {
                 query = query.eq('recorded_by', profile.id);
             }

             const { data, error } = await query;
             if (!error && data) {
                 const sum = data.reduce((acc, curr) => acc + curr.amount, 0);
                 setTotalAmount(sum);
             }
        } catch (e) {
            console.error("Error fetching total amount", e);
        }
    }, [startDate, endDate, profile]);

    const fetchPayments = useCallback(async () => {
        if (!startDate || !endDate || !profile) return;
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('payments')
                .select('*, loans(clients(name)), profiles(name)', { count: 'exact' })
                .eq('tenant_id', profile.tenant_id)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate)
                .order('payment_date', { ascending: false });

            if (profile.role === Role.EMPLOYEE) {
                // For reports, employees usually see payments they recorded or related to their loans.
                // Simplification: Employees see payments they recorded.
                query = query.eq('recorded_by', profile.id);
            }
            
            // Pagination logic
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);
            
            const { data, error: paymentsError, count } = await query;
            
            if (paymentsError) throw paymentsError;
            setPayments(data as PaymentWithDetails[]);
            setTotalCount(count || 0);

            // Fetch totals separately
            fetchTotalAmount();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, profile, page, fetchTotalAmount]);
    
    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]); 

    const handleFilter = () => {
        setPage(1);
        fetchPayments();
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const inputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

    return (
        <Card title="Reporte de Pagos">
            <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                <div>
                    <label htmlFor="startDate" className={labelClasses}>Desde</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputClasses} dark:[color-scheme:dark]`} />
                </div>
                <div>
                    <label htmlFor="endDate" className={labelClasses}>Hasta</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputClasses} dark:[color-scheme:dark]`} />
                </div>
                <Button onClick={handleFilter} disabled={loading}>{loading ? 'Cargando...' : 'Filtrar'}</Button>
            </div>

            {error && <p className="text-red-500">Error: {error}</p>}

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cobrado en Periodo</h4>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalAmount)}</p>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Pago</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Préstamo ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cobrado por</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {payments.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 dark:text-gray-300">No se encontraron pagos en este rango de fechas.</td></tr>
                        ) : (
                            payments.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatDate(p.payment_date)}</td>
                                    <td className="px-6 py-4 text-gray-800 dark:text-white">{p.loans?.clients?.name ?? 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(p.amount)}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">{p.loan_id.split('-')[0]}...</td>
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{p.profiles?.name ?? 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Pagination 
                    currentPage={page} 
                    totalCount={totalCount} 
                    pageSize={ITEMS_PER_PAGE} 
                    onPageChange={setPage} 
                />
            </div>

        </Card>
    );
};

export default PaymentsReport;
