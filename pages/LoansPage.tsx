


import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { Loan, LoanStatus, Role } from '../types.ts';
import Button from '../components/ui/Button.tsx';
import Card from '../components/ui/Card.tsx';
import { PlusCircle, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import NewLoanForm from '../components/forms/NewLoanForm.tsx';
import Modal from '../components/ui/Modal.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';
import { generateLoanSchedule } from '../utils/LoanScheduleGenerator.ts';
import StatusBadge from '../components/ui/StatusBadge.tsx';

type LoanWithClient = Loan & {
    clients: { name: string } | null;
};

const LoansPage: React.FC = () => {
    const { profile } = useAuth();
    const [loans, setLoans] = useState<LoanWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<LoanStatus | 'all'>('all');


    const fetchLoans = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('loans')
                .select('*, clients!inner(name)')
                .eq('tenant_id', profile.tenant_id)
                .order('issue_date', { ascending: false });
            
            if (profile.role === Role.EMPLOYEE) {
                query = query.eq('employee_id', profile.id);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            
            if (searchTerm) {
                 query = query.ilike('clients.name', `%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLoans(data as LoanWithClient[]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch loans.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [profile, statusFilter, searchTerm]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (profile) {
                fetchLoans();
            }
        }, 300); // Debounce search input

        return () => clearTimeout(debounceTimer);
    }, [profile, fetchLoans]);

    const handleSaveLoan = async (loanData: Omit<Loan, 'id' | 'status' | 'tenant_id'>) => {
        if (!profile) return;
        setIsSaving(true);
        try {
            // 1. Insert the new loan. The tenant_id is now set by the database default.
            const loanPayload = { 
                ...loanData, 
                status: LoanStatus.ACTIVO
            };

            const { data: insertedLoan, error: loanError } = await supabase
                .from('loans')
                .insert(loanPayload)
                .select()
                .single<Loan>();

            if (loanError) throw loanError;
            if (!insertedLoan) throw new Error("Failed to get inserted loan data.");
            
            // 2. Generate the schedule using the newly inserted loan data
            const schedule = generateLoanSchedule(insertedLoan);
            
            // 3. Insert the generated schedule. tenant_id is also handled by DB default.
            const { error: scheduleError } = await supabase
                .from('loan_schedules')
                .insert(schedule);

            if (scheduleError) {
                // Attempt to roll back loan insertion if schedule fails
                await supabase.from('loans').delete().eq('id', insertedLoan.id);
                throw scheduleError;
            }

            addToast('Préstamo creado exitosamente', 'success');
            setIsModalOpen(false);
            fetchLoans(); // Refresh the list
        } catch (err: any) {
            console.error('Error saving loan:', err);
            addToast(`Error al crear préstamo: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);
    
    const filterButtons = useMemo(() => [
        { label: 'Todos', value: 'all' },
        { label: 'Activos', value: LoanStatus.ACTIVO },
        { label: 'Atrasados', value: LoanStatus.ATRASADO },
        { label: 'Pagados', value: LoanStatus.PAGADO }
    ], []);

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Préstamos</h1>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={PlusCircle}>
                    Nuevo Préstamo
                </Button>
            </div>
            <Card>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre de cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {filterButtons.map(btn => (
                                <button
                                    key={btn.value}
                                    onClick={() => setStatusFilter(btn.value as LoanStatus | 'all')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === btn.value ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading && <p className="p-4 text-center">Cargando préstamos...</p>}
                {error && <p className="p-4 text-center text-red-500">{error}</p>}
                {!loading && !error && (
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha de Emisión</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ver</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {loans.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4">No hay préstamos para mostrar.</td></tr>
                                ) : (
                                    loans.map(loan => (
                                        <tr key={loan.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{loan.clients?.name ?? 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(loan.amount)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(loan.issue_date)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <StatusBadge status={loan.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/loans/${loan.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200">
                                                    Ver Detalles
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Crear Nuevo Préstamo">
                <NewLoanForm onSave={handleSaveLoan} onClose={handleCloseModal} isSaving={isSaving} />
            </Modal>
        </>
    );
};

export default LoansPage;