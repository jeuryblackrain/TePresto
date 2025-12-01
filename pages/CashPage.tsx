
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { CashShift, Expense, ShiftStatus, Role } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { Wallet, Lock, TrendingDown, AlertCircle, History } from 'lucide-react';
import useAuth from '../hooks/useAuth.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import Modal from '../components/ui/Modal.tsx';
import { useToast } from '../hooks/useToast.ts';
import StatusBadge from '../components/ui/StatusBadge.tsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- MODAL COMPONENTS ---

interface OpenShiftModalProps {
    onOpenShift: (startAmount: number) => void;
    onClose: () => void;
    isSaving: boolean;
}

const OpenShiftModal: React.FC<OpenShiftModalProps> = ({ onOpenShift, onClose, isSaving }) => {
    const [amount, setAmount] = useState('0');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onOpenShift(parseFloat(amount) || 0);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Monto Inicial en Caja
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Ingrese la cantidad de efectivo que lleva consigo al iniciar la ruta.
                </p>
            </div>
            <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Abriendo...' : 'Abrir Caja'}</Button>
            </div>
        </form>
    );
};

interface ExpenseModalProps {
    onSave: (amount: number, description: string) => void;
    onClose: () => void;
    isSaving: boolean;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ onSave, onClose, isSaving }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount && description) {
            onSave(parseFloat(amount), description);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto del Gasto</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <input
                    type="text"
                    required
                    placeholder="Ej. Gasolina, Comida..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
            </div>
            <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Registrar Gasto'}</Button>
            </div>
        </form>
    );
};

interface CloseShiftModalProps {
    expectedAmount: number;
    onCloseShift: (declaredAmount: number, notes: string) => void;
    onClose: () => void;
    isSaving: boolean;
}

const CloseShiftModal: React.FC<CloseShiftModalProps> = ({ expectedAmount, onCloseShift, onClose, isSaving }) => {
    const [declared, setDeclared] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCloseShift(parseFloat(declared) || 0, notes);
    };

    const diff = (parseFloat(declared) || 0) - expectedAmount;
    const isExact = Math.abs(diff) < 0.01;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Esperado en Sistema</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(expectedAmount)}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Efectivo Real en Mano (Contado)
                </label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={declared}
                    onChange={(e) => setDeclared(e.target.value)}
                    className="mt-1 block w-full text-lg font-bold border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
            </div>

            {declared !== '' && (
                <div className={`p-3 rounded-md flex items-center ${isExact ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>
                        {isExact 
                            ? "El monto cuadra perfectamente." 
                            : `Diferencia: ${formatCurrency(diff)} (${diff > 0 ? 'Sobrante' : 'Faltante'})`}
                    </span>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas / Observaciones</label>
                <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Explique cualquier diferencia o incidencia del día..."
                />
            </div>

            <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" variant={isExact ? 'primary' : 'danger'} disabled={isSaving}>
                    {isSaving ? 'Cerrando...' : 'Cerrar Caja'}
                </Button>
            </div>
        </form>
    );
};


// --- MAIN PAGE COMPONENT ---

const CashPage: React.FC = () => {
    const { profile, isReadOnly } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    
    // View State
    const [showHistory, setShowHistory] = useState(false);
    
    // Modals
    const [openModalOpen, setOpenModalOpen] = useState(false);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);

    // --- QUERIES ---

    // 1. Get Active Shift
    const { data: activeShift, isLoading: isActiveShiftLoading } = useQuery({
        queryKey: ['activeShift', profile?.id],
        queryFn: async () => {
            if (!profile) return null;
            const { data, error } = await supabase
                .from('cash_shifts')
                .select('*')
                .eq('employee_id', profile.id)
                .eq('status', ShiftStatus.OPEN)
                .maybeSingle(); // maybeSingle allows null without error
            
            if (error) throw error;
            return data as CashShift | null;
        },
        enabled: !!profile && !showHistory, // Only fetch if not viewing history
    });

    // 2. Get Expenses for Active Shift
    const { data: currentExpenses } = useQuery({
        queryKey: ['expenses', activeShift?.id],
        queryFn: async () => {
             if (!activeShift) return [];
             const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('shift_id', activeShift.id);
            if (error) throw error;
            return data as Expense[];
        },
        enabled: !!activeShift && !showHistory,
        initialData: [],
    });

    // 3. Get Collections Today (Payments since shift start)
    const { data: todayCollected } = useQuery({
        queryKey: ['todayCollected', activeShift?.id],
        queryFn: async () => {
            if (!activeShift || !profile) return 0;
            const { data, error } = await supabase
                .from('payments')
                .select('amount')
                .eq('recorded_by', profile.id)
                .gte('created_at', activeShift.start_time);
            
            if (error) throw error;
            return data?.reduce((sum, p) => sum + p.amount, 0) || 0;
        },
        enabled: !!activeShift && !!profile && !showHistory,
        initialData: 0,
    });

    // 4. Get History
    const { data: historyShifts, isLoading: isHistoryLoading } = useQuery({
        queryKey: ['cashHistory', profile?.id, profile?.role],
        queryFn: async () => {
            if (!profile) return [];
            // Removed 'profiles(name)' to avoid manual relationship error
            let query = supabase
                .from('cash_shifts')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('start_time', { ascending: false });

            // Employees see only their own history
            if (profile.role === Role.EMPLOYEE) {
                query = query.eq('employee_id', profile.id);
            }
            
            const { data: shifts, error } = await query;
            if (error) throw error;

            // Manual Join for Profiles
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

            // Map data
            return shifts.map(s => ({
                ...s,
                profiles: { name: profilesMap[s.employee_id] || 'Unknown' }
            })) as (CashShift & { profiles: { name: string } | null })[];
        },
        enabled: !!profile && showHistory,
    });

    // 5. Get Last Closed Shift (for suggesting start amount)
    const { data: lastClosedShift } = useQuery({
        queryKey: ['lastClosedShift', profile?.id],
        queryFn: async () => {
            if (!profile) return null;
            const { data, error } = await supabase
                .from('cash_shifts')
                .select('*')
                .eq('employee_id', profile.id)
                .neq('status', ShiftStatus.OPEN)
                .order('start_time', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error) console.error("Error fetching last shift:", error); // Don't throw to avoid blocking UI
            return data as CashShift | null;
        },
        enabled: !!profile && !activeShift && !showHistory,
    });


    // --- MUTATIONS ---

    const openShiftMutation = useMutation({
        mutationFn: async (startAmount: number) => {
             const { error } = await supabase.from('cash_shifts').insert({
                tenant_id: profile?.tenant_id,
                employee_id: profile?.id,
                start_amount: startAmount,
                status: ShiftStatus.OPEN
            });
            if (error) throw error;
        },
        onSuccess: () => {
            addToast('Caja abierta exitosamente.', 'success');
            setOpenModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['activeShift'] });
        },
        onError: (err: any) => addToast(`Error: ${err.message}`, 'error')
    });

    const addExpenseMutation = useMutation({
        mutationFn: async ({amount, description}: {amount: number, description: string}) => {
             if (!activeShift) throw new Error("No active shift");
             const { error } = await supabase.from('expenses').insert({
                tenant_id: profile?.tenant_id,
                shift_id: activeShift.id,
                amount,
                description,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            addToast('Gasto registrado.', 'success');
            setExpenseModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: (err: any) => addToast(`Error: ${err.message}`, 'error')
    });

    const closeShiftMutation = useMutation({
        mutationFn: async ({declaredAmount, notes}: {declaredAmount: number, notes: string}) => {
            if (!activeShift) throw new Error("No active shift");
            
            // Re-calculate expected on server/submission time to be safe? 
            // We rely on the client passed logic here for simplicity, but ideally backend handles this.
            const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
            const expected = activeShift.start_amount + todayCollected - totalExpenses;

             const { error } = await supabase.from('cash_shifts').update({
                end_time: new Date().toISOString(),
                status: ShiftStatus.CLOSED,
                expected_end_amount: expected,
                declared_end_amount: declaredAmount,
                notes: notes
            }).eq('id', activeShift.id);

            if (error) throw error;
        },
        onSuccess: () => {
             addToast('Caja cerrada correctamente.', 'success');
             setCloseModalOpen(false);
             queryClient.invalidateQueries({ queryKey: ['activeShift'] });
             queryClient.invalidateQueries({ queryKey: ['cashHistory'] });
        },
        onError: (err: any) => addToast(`Error: ${err.message}`, 'error')
    });


    // --- RENDERING ---

    if ((isActiveShiftLoading && !showHistory) || (isHistoryLoading && showHistory)) {
        return <div className="p-8 text-center dark:text-white">Cargando Caja...</div>;
    }

    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = activeShift ? (activeShift.start_amount + todayCollected - totalExpenses) : 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Control de Caja</h1>
                <div className="space-x-2">
                    <Button 
                        variant={!showHistory ? 'primary' : 'secondary'} 
                        onClick={() => setShowHistory(false)}
                        leftIcon={Wallet}
                    >
                        Caja Actual
                    </Button>
                    <Button 
                        variant={showHistory ? 'primary' : 'secondary'} 
                        onClick={() => setShowHistory(true)}
                        leftIcon={History}
                    >
                        Historial
                    </Button>
                </div>
            </div>

            {!showHistory ? (
                <>
                    {!activeShift ? (
                        <Card className="text-center py-12">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                                    <Lock className="w-12 h-12 text-gray-400" />
                                </div>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">La caja está cerrada</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Debe abrir caja para comenzar a registrar cobros y gastos del día.</p>
                            {lastClosedShift && (
                                <p className="text-sm text-green-600 mb-4">
                                    Sugerencia: El último cierre fue de {formatCurrency(lastClosedShift.declared_end_amount)}
                                </p>
                            )}
                            <Button 
                                onClick={() => setOpenModalOpen(true)} 
                                size="lg"
                                disabled={isReadOnly}
                                title={isReadOnly ? "Acción deshabilitada en modo solo lectura" : "Abrir caja"}
                            >
                                Abrir Caja
                            </Button>
                        </Card>
                    ) : (
                        <>
                            {/* ACTIVE SHIFT DASHBOARD */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="bg-blue-50 dark:bg-blue-900/20">
                                    <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Fondo Inicial</div>
                                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(activeShift.start_amount)}</div>
                                </Card>
                                <Card className="bg-green-50 dark:bg-green-900/20">
                                    <div className="text-sm font-medium text-green-800 dark:text-green-300">Cobrado Hoy</div>
                                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(todayCollected)}</div>
                                </Card>
                                <Card className="bg-red-50 dark:bg-red-900/20">
                                    <div className="text-sm font-medium text-red-800 dark:text-red-300">Gastos</div>
                                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalExpenses)}</div>
                                </Card>
                                <Card className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500">
                                    <div className="text-sm font-medium text-purple-800 dark:text-purple-300">Saldo Esperado</div>
                                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(expectedCash)}</div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2">
                                    <Card title="Gastos Registrados">
                                        {currentExpenses.length === 0 ? (
                                            <p className="text-gray-500 dark:text-gray-400 text-sm p-4">No hay gastos registrados en este turno.</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                        {currentExpenses.map(exp => (
                                                            <tr key={exp.id}>
                                                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{exp.description}</td>
                                                                <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400">-{formatCurrency(exp.amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Card>
                                </div>
                                <div className="space-y-4">
                                    <Card>
                                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Acciones</h3>
                                        <div className="space-y-3">
                                            <Button 
                                                variant="secondary" 
                                                className="w-full justify-start" 
                                                leftIcon={TrendingDown}
                                                onClick={() => setExpenseModalOpen(true)}
                                                disabled={isReadOnly}
                                            >
                                                Registrar Gasto
                                            </Button>
                                            <Button 
                                                variant="danger" 
                                                className="w-full justify-start" 
                                                leftIcon={Lock}
                                                onClick={() => setCloseModalOpen(true)}
                                                disabled={isReadOnly}
                                            >
                                                Cerrar Caja (Cuadre)
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <Card title="Historial de Cierres">
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicial</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Esperado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Declarado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {(historyShifts || []).map(shift => {
                                    const diff = (shift.declared_end_amount || 0) - (shift.expected_end_amount || 0);
                                    const hasDiff = Math.abs(diff) > 0.01;
                                    return (
                                        <tr key={shift.id}>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                {formatDate(shift.start_time)}
                                                <div className="text-xs text-gray-400">
                                                    {new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{shift.profiles?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm"><StatusBadge status={shift.status as any} /></td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(shift.start_amount)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{shift.expected_end_amount ? formatCurrency(shift.expected_end_amount) : '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{shift.declared_end_amount ? formatCurrency(shift.declared_end_amount) : '-'}</td>
                                            <td className={`px-6 py-4 text-sm font-bold ${hasDiff ? 'text-red-500' : 'text-green-500'}`}>
                                                {shift.status === ShiftStatus.CLOSED ? formatCurrency(diff) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* MODALS */}
            <Modal isOpen={openModalOpen} onClose={() => setOpenModalOpen(false)} title="Abrir Caja">
                <OpenShiftModal 
                    onOpenShift={(amount) => openShiftMutation.mutate(amount)} 
                    onClose={() => setOpenModalOpen(false)} 
                    isSaving={openShiftMutation.isPending} 
                />
            </Modal>

            <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Registrar Gasto Operativo">
                <ExpenseModal 
                    onSave={(amount, description) => addExpenseMutation.mutate({amount, description})} 
                    onClose={() => setExpenseModalOpen(false)} 
                    isSaving={addExpenseMutation.isPending} 
                />
            </Modal>
            
            {activeShift && (
                <Modal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Cerrar Turno (Cuadre de Caja)">
                    <CloseShiftModal 
                        expectedAmount={expectedCash}
                        onCloseShift={(declaredAmount, notes) => closeShiftMutation.mutate({declaredAmount, notes})} 
                        onClose={() => setCloseModalOpen(false)} 
                        isSaving={closeShiftMutation.isPending} 
                    />
                </Modal>
            )}
        </div>
    );
};

export default CashPage;
