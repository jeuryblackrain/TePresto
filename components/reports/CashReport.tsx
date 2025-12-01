
import React, { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { CashShift, Role } from '../../types.ts';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import useAuth from '../../hooks/useAuth.ts';
import Pagination from '../ui/Pagination.tsx';
import StatusBadge from '../ui/StatusBadge.tsx';
import { AlertCircle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

type CashShiftWithProfile = CashShift & {
    profiles: { name: string } | null;
};

const ITEMS_PER_PAGE = 20;

const CashReport: React.FC = () => {
    const { profile } = useAuth();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(todayStr);
    const [page, setPage] = useState(1);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['cashReport', profile?.tenant_id, startDate, endDate, page],
        queryFn: async () => {
            if (!profile) return { data: [], count: 0, stats: { totalDiff: 0, totalShortage: 0, totalSurplus: 0 } };

            // 1. Fetch Shifts (removed 'profiles(name)' join to avoid relationship error)
            let query = supabase
                .from('cash_shifts')
                .select('*', { count: 'exact' })
                .eq('tenant_id', profile.tenant_id)
                .gte('start_time', `${startDate}T00:00:00`)
                .lte('start_time', `${endDate}T23:59:59`)
                .order('start_time', { ascending: false });

            if (profile.role === Role.EMPLOYEE) {
                query = query.eq('employee_id', profile.id);
            }

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            
            // Fetch paginated data
            const { data: rows, error, count } = await query.range(from, to);
            if (error) throw error;

            const shifts = rows as CashShift[];

            // 2. Manual Join for Profiles
            const employeeIds = Array.from(new Set(shifts.map(s => s.employee_id)));
            const profilesMap: Record<string, string> = {};

            if (employeeIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', employeeIds);
                
                if (profiles) {
                    profiles.forEach(p => {
                        profilesMap[p.id] = p.name;
                    });
                }
            }

            const dataWithProfiles = shifts.map(s => ({
                ...s,
                profiles: { name: profilesMap[s.employee_id] || 'Unknown' }
            }));

            // Fetch aggregate stats (separate query to get totals for the whole period)
            let statsQuery = supabase
                .from('cash_shifts')
                .select('expected_end_amount, declared_end_amount')
                .eq('tenant_id', profile.tenant_id)
                .gte('start_time', `${startDate}T00:00:00`)
                .lte('start_time', `${endDate}T23:59:59`)
                .not('end_time', 'is', null); // Only closed shifts

             if (profile.role === Role.EMPLOYEE) {
                statsQuery = statsQuery.eq('employee_id', profile.id);
            }
            
            const { data: allStatsRows } = await statsQuery;
            
            let totalDiff = 0;
            let totalShortage = 0;
            let totalSurplus = 0;

            if (allStatsRows) {
                allStatsRows.forEach(s => {
                    const expected = s.expected_end_amount || 0;
                    const declared = s.declared_end_amount || 0;
                    const diff = declared - expected;
                    totalDiff += diff;
                    if (diff < -0.01) totalShortage += Math.abs(diff);
                    if (diff > 0.01) totalSurplus += diff;
                });
            }

            return { 
                data: dataWithProfiles as CashShiftWithProfile[], 
                count: count || 0,
                stats: { totalDiff, totalShortage, totalSurplus }
            };
        },
        enabled: !!profile,
    });

    const shifts = data?.data || [];
    const totalCount = data?.count || 0;
    const stats = data?.stats || { totalDiff: 0, totalShortage: 0, totalSurplus: 0 };

    const handleFilter = () => {
        setPage(1);
        refetch();
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const inputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

    return (
        <Card title="Reporte de Cierres de Caja">
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                <div>
                    <label htmlFor="startDate" className={labelClasses}>Desde</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputClasses} dark:[color-scheme:dark]`} />
                </div>
                <div>
                    <label htmlFor="endDate" className={labelClasses}>Hasta</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputClasses} dark:[color-scheme:dark]`} />
                </div>
                <Button onClick={handleFilter} disabled={isLoading}>{isLoading ? 'Cargando...' : 'Filtrar'}</Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                     <div className="flex items-center mb-2">
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"/>
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300">Total Faltante</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">-{formatCurrency(stats.totalShortage)}</p>
                </div>
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                     <div className="flex items-center mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mr-2"/>
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Total Sobrante</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">+{formatCurrency(stats.totalSurplus)}</p>
                </div>
                 <div className={`p-4 rounded-lg border ${stats.totalDiff >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'}`}>
                     <div className="flex items-center mb-2">
                        {stats.totalDiff >= 0 ? <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"/> : <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2"/>}
                        <h4 className={`text-sm font-medium ${stats.totalDiff >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>Balance Neto</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDiff > 0 ? '+' : ''}{formatCurrency(stats.totalDiff)}</p>
                </div>
            </div>

            {error && <p className="text-red-500">Error: {(error as Error).message}</p>}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Cierre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Empleado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fondo Inicial</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Esperado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Declarado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Diferencia</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {shifts.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-4 dark:text-gray-300">No se encontraron cierres en este rango de fechas.</td></tr>
                        ) : (
                            shifts.map(s => {
                                const diff = (s.declared_end_amount || 0) - (s.expected_end_amount || 0);
                                const hasDiff = Math.abs(diff) > 0.01;
                                return (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                            {s.end_time ? formatDate(s.end_time) : <span className="italic text-gray-400">Abierta</span>}
                                            {s.end_time && (
                                                <div className="text-xs text-gray-400">
                                                    {new Date(s.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-800 dark:text-white">{s.profiles?.name ?? 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(s.start_amount)}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{s.expected_end_amount !== null ? formatCurrency(s.expected_end_amount) : '-'}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{s.declared_end_amount !== null ? formatCurrency(s.declared_end_amount) : '-'}</td>
                                        <td className={`px-6 py-4 font-bold ${diff < -0.01 ? 'text-red-500' : diff > 0.01 ? 'text-green-500' : 'text-gray-500'}`}>
                                            {s.status === 'cerrada' ? formatCurrency(diff) : '-'}
                                        </td>
                                         <td className="px-6 py-4"><StatusBadge status={s.status as any} /></td>
                                    </tr>
                                );
                            })
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

export default CashReport;
