import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Route, Loan } from '../../types.ts';
import Card from '../ui/Card.tsx';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.ts';
import StatusBadge from '../ui/StatusBadge.tsx';

type LoanWithClient = Loan & {
    clients: { name: string } | null;
};

const RouteReport: React.FC = () => {
    const { profile } = useAuth();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string>('');
    const [loans, setLoans] = useState<LoanWithClient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRoutes = async () => {
            if (!profile) return;
            // FIX: Select all columns ('*') to match the `Route` type.
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('name');
            if (error) {
                setError('Failed to fetch routes');
            } else {
                setRoutes(data || []);
            }
        };
        fetchRoutes();
    }, [profile]);

    useEffect(() => {
        const fetchLoansByRoute = async () => {
            if (!selectedRouteId || !profile) {
                setLoans([]);
                return;
            }
            setLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from('loans')
                    .select('*, clients(name)')
                    .eq('tenant_id', profile.tenant_id)
                    .eq('route_id', selectedRouteId)
                    .order('issue_date', { ascending: false });

                if (error) throw error;
                setLoans(data as LoanWithClient[]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLoansByRoute();
    }, [selectedRouteId, profile]);

    const totalLoanAmount = loans.reduce((acc, loan) => acc + loan.amount, 0);

    return (
        <Card title="Reporte por Ruta">
            <div className="mb-4">
                <label htmlFor="route" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Seleccionar Ruta
                </label>
                <select
                    id="route"
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="mt-1 block w-full md:w-1/3 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                    <option value="">-- Todas --</option>
                    {routes.map(route => (
                        <option key={route.id} value={route.id}>{route.name}</option>
                    ))}
                </select>
            </div>
            
            {loading && <p className="dark:text-gray-300">Cargando reporte...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            
            {selectedRouteId && !loading && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                         <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Préstamos en Ruta</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{loans.length}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monto Total en Ruta</h4>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalLoanAmount)}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                           <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Emisión</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {loans.map(loan => (
                                    <tr key={loan.id}>
                                        <td className="px-6 py-4 text-gray-800 dark:text-white">{loan.clients?.name}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(loan.amount)}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatDate(loan.issue_date)}</td>
                                        <td className="px-6 py-4"><StatusBadge status={loan.status} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <Link to={`/loans/${loan.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">Ver</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Card>
    );
};

export default RouteReport;