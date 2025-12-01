
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { Loan, Client, LoanSchedule, Payment, Profile, ScheduleStatus, Role, LoanStatus } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { User, ArrowLeft, DollarSign, FileText, Map, Edit, CircleDollarSign, Repeat } from 'lucide-react';
import Modal from '../components/ui/Modal.tsx';
import RecordPaymentForm from '../components/forms/RecordPaymentForm.tsx';
import EditLoanForm from '../components/forms/EditLoanForm.tsx';
import RenovateLoanForm from '../components/forms/RenovateLoanForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';
import PaymentReceipt from '../components/ui/PaymentReceipt.tsx';
import { generateLoanSchedule } from '../utils/LoanScheduleGenerator.ts';
import ConfirmationModal from '../components/ui/ConfirmationModal.tsx';
import StatusBadge from '../components/ui/StatusBadge.tsx';

type LoanDetails = Loan & {
    clients: Client | null;
    profiles: Profile | null;
    routes: { name: string } | null;
};

const LoanDetailPage: React.FC = () => {
    const { loanId } = useParams<{ loanId: string }>();
    const { addToast } = useToast();
    const { profile, isReadOnly } = useAuth();
    const navigate = useNavigate();
    
    const [loan, setLoan] = useState<LoanDetails | null>(null);
    const [schedule, setSchedule] = useState<LoanSchedule[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [tenantName, setTenantName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [isRenovateModalOpen, setIsRenovateModalOpen] = useState(false);
    
    const [selectedSchedule, setSelectedSchedule] = useState<LoanSchedule | null>(null);
    const [activePayment, setActivePayment] = useState<Payment | null>(null);
    const [receiptContext, setReceiptContext] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSettling, setIsSettling] = useState(false);

    const fetchData = useCallback(async () => {
        if (!loanId || !profile) return;
        setLoading(true);
        setError(null);
        try {
            const { data: loanData, error: loanError } = await supabase
                .from('loans')
                .select('*, clients(*), profiles(*), routes(name)')
                .eq('id', loanId)
                .eq('tenant_id', profile.tenant_id)
                .single();
            if (loanError) throw loanError;
            setLoan(loanData);

            const { data: scheduleData, error: scheduleError } = await supabase
                .from('loan_schedules')
                .select('*')
                .eq('loan_id', loanId)
                .order('installment_number', { ascending: true });
            if (scheduleError) throw scheduleError;
            setSchedule(scheduleData);

            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('loan_id', loanId)
                .order('payment_date', { ascending: true });
            if (paymentsError) throw paymentsError;
            setPayments(paymentsData || []);
            
            // Fetch tenant name for the receipt
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', profile.tenant_id)
                .single();
            if (tenantError) throw tenantError;
            setTenantName(tenantData.name);


        } catch (err: any) {
            setError(err.message || 'Failed to fetch loan details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [loanId, profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenPaymentModal = (scheduleItem: LoanSchedule) => {
        setSelectedSchedule(scheduleItem);
        setPaymentModalOpen(true);
    };
    
    const handleClosePaymentModal = useCallback(() => setPaymentModalOpen(false), []);
    const handleCloseReceiptModal = useCallback(() => setReceiptModalOpen(false), []);
    const handleCloseEditModal = useCallback(() => setEditModalOpen(false), []);
    const handleCloseRenovateModal = useCallback(() => setIsRenovateModalOpen(false), []);

    const handleRecordPayment = async (paymentData: Omit<Payment, 'id' | 'tenant_id'>) => {
        if (!selectedSchedule || !loan || !profile) return;
        try {
            const paymentPayload = { ...paymentData };
            const { data: newPayment, error: paymentError } = await supabase
                .from('payments')
                .insert(paymentPayload)
                .select()
                .single();

            if (paymentError) throw paymentError;
            
            const newAmountPaid = selectedSchedule.amount_paid + paymentData.amount;
            const newStatus = newAmountPaid >= selectedSchedule.amount_due ? ScheduleStatus.PAGADO : selectedSchedule.status;
            
            const { error: scheduleUpdateError } = await supabase
                .from('loan_schedules')
                .update({ 
                    amount_paid: newAmountPaid, 
                    status: newStatus,
                    payment_date: paymentData.payment_date
                })
                .eq('id', selectedSchedule.id);
            
            if (scheduleUpdateError) throw scheduleUpdateError;
            
            addToast('Pago registrado exitosamente', 'success');
            setPaymentModalOpen(false);
            setActivePayment(newPayment);

            const totalDue = schedule.reduce((sum, s) => sum + s.amount_due, 0);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + newPayment.amount;
            
            setReceiptContext({
                employeeName: loan?.profiles?.name,
                remainingBalance: totalDue - totalPaid,
                installment_number: selectedSchedule.installment_number
            });
            
            setReceiptModalOpen(true);
            fetchData();
        } catch (err: any) {
            console.error("Error recording payment:", err);
            addToast(`Error al registrar pago: ${err.message}`, 'error');
        }
    };
    
    const handleViewReceipt = (scheduleItem: LoanSchedule) => {
        if (!loan) return;
        const paymentForSchedule = payments
            .filter(p => p.schedule_id === scheduleItem.id)
            .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

        if (!paymentForSchedule) {
            addToast('No se encontró el comprobante para esta cuota.', 'info');
            return;
        }

        setActivePayment(paymentForSchedule);

        const totalDue = schedule.reduce((sum, s) => sum + s.amount_due, 0);
        const totalPaidUpTo = payments
            .filter(p => new Date(p.payment_date).getTime() <= new Date(paymentForSchedule.payment_date).getTime())
            .reduce((sum, p) => sum + p.amount, 0);

        setReceiptContext({
            employeeName: loan.profiles?.name,
            remainingBalance: totalDue - totalPaidUpTo,
            installment_number: scheduleItem.installment_number,
        });
        setReceiptModalOpen(true);
    };

    const handleUpdateLoan = async (updatedFields: Partial<Loan>) => {
        if (!loan) return;
        setIsSaving(true);
    
        const financialFields: (keyof Loan)[] = ['amount', 'interest_rate', 'fixed_payment', 'frequency', 'payment_type', 'term', 'issue_date'];
        const financialsChanged = financialFields.some(field =>
            String(loan[field] ?? '') !== String(updatedFields[field] ?? '')
        );
    
        if (financialsChanged && payments.length > 0) {
            addToast('No se pueden editar los detalles financieros de un préstamo que ya tiene pagos registrados.', 'error');
            setIsSaving(false);
            return;
        }
    
        try {
            const { data: updatedLoan, error: updateError } = await supabase
                .from('loans')
                .update(updatedFields)
                .eq('id', loan.id)
                .select()
                .single();
    
            if (updateError) throw updateError;
            if (!updatedLoan) throw new Error("Failed to retrieve updated loan.");
    
            if (financialsChanged) {
                addToast('Actualizando préstamo y regenerando calendario de pagos...', 'info');
                
                const { error: deleteError } = await supabase.from('loan_schedules').delete().eq('loan_id', loan.id);
                if (deleteError) throw deleteError;
    
                const newSchedule = generateLoanSchedule(updatedLoan);
                const { error: insertError } = await supabase.from('loan_schedules').insert(newSchedule);
                if (insertError) throw insertError;
            }
    
            addToast('Préstamo actualizado exitosamente', 'success');
            setEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addToast(`Error al actualizar préstamo: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const totalDue = schedule.reduce((sum, s) => sum + s.amount_due, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, totalDue - totalPaid);
    
    // Check for Renovation eligibility (3 or fewer unpaid installments)
    const unpaidInstallmentsCount = schedule.filter(s => s.status !== ScheduleStatus.PAGADO).length;
    const canRenovate = unpaidInstallmentsCount <= 3 && loan?.status !== LoanStatus.PAGADO;

    const handleConfirmSettleLoan = async () => {
        if (!loan || !profile) return;
    
        const finalRemainingBalance = parseFloat(remainingBalance.toFixed(2));
    
        if (finalRemainingBalance <= 0) {
            addToast('El préstamo ya está saldado.', 'info');
            setIsSettleModalOpen(false);
            return;
        }
        
        setIsSettling(true);
    
        try {
            const today = new Date().toISOString().split('T')[0];
    
            const firstUnpaidSchedule = schedule.find(s => s.status !== ScheduleStatus.PAGADO);
            if (!firstUnpaidSchedule) {
                 throw new Error('No se encontraron cuotas pendientes para saldar el préstamo.');
            }
    
            const { data: settlementPayment, error: paymentError } = await supabase.from('payments').insert({
                loan_id: loan.id,
                schedule_id: firstUnpaidSchedule.id,
                amount: finalRemainingBalance,
                payment_date: today,
                recorded_by: profile.id,
            }).select().single();

            if (paymentError) throw paymentError;
            if (!settlementPayment) throw new Error("Failed to record settlement payment.");
    
            const schedulesToUpdate = schedule
                .filter(s => s.status !== ScheduleStatus.PAGADO)
                .map(s => ({
                    id: s.id,
                    loan_id: s.loan_id,
                    installment_number: s.installment_number,
                    due_date: s.due_date,
                    amount_due: s.amount_due,
                    amount_paid: s.amount_due, 
                    payment_date: today,
                    status: ScheduleStatus.PAGADO,
                }));
    
            if (schedulesToUpdate.length > 0) {
                const { error: scheduleUpsertError } = await supabase
                    .from('loan_schedules')
                    .upsert(schedulesToUpdate.map(({loan_id, due_date, amount_due, ...rest}) => rest));
                if (scheduleUpsertError) throw scheduleUpsertError;
            }
            
            const { error: loanUpdateError } = await supabase
                .from('loans')
                .update({ status: LoanStatus.PAGADO })
                .eq('id', loan.id);
            if (loanUpdateError) throw loanUpdateError;
    
            addToast('Préstamo saldado exitosamente.', 'success');
            
            setActivePayment(settlementPayment);
            setReceiptContext({
                employeeName: loan?.profiles?.name,
                remainingBalance: 0,
                isSettlement: true,
            });
            setReceiptModalOpen(true);

            setIsSettleModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error("Error settling loan:", err);
            addToast(`Error al saldar el préstamo: ${err.message}`, 'error');
        } finally {
            setIsSettling(false);
        }
    };

    const handleRenovateLoan = async (newLoanData: Omit<Loan, 'id' | 'status' | 'tenant_id'>) => {
        if (!loan || !profile) return;
        setIsSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const finalRemainingBalance = parseFloat(remainingBalance.toFixed(2));

            // 1. If there's a balance, settle the old loan (internally)
            if (finalRemainingBalance > 0) {
                const firstUnpaidSchedule = schedule.find(s => s.status !== ScheduleStatus.PAGADO);
                // Insert a settlement payment marked as renovation (optional: could add a note field if DB supported it)
                const { error: paymentError } = await supabase.from('payments').insert({
                    loan_id: loan.id,
                    schedule_id: firstUnpaidSchedule?.id, // Link to a schedule or null if DB allows
                    amount: finalRemainingBalance,
                    payment_date: today,
                    recorded_by: profile.id,
                });
                if (paymentError) throw paymentError;

                // Update schedules
                const schedulesToUpdate = schedule
                    .filter(s => s.status !== ScheduleStatus.PAGADO)
                    .map(s => ({
                        id: s.id,
                        loan_id: s.loan_id,
                        installment_number: s.installment_number,
                        due_date: s.due_date,
                        amount_due: s.amount_due,
                        amount_paid: s.amount_due, 
                        payment_date: today,
                        status: ScheduleStatus.PAGADO,
                    }));
                
                if (schedulesToUpdate.length > 0) {
                     const { error: scheduleUpsertError } = await supabase
                        .from('loan_schedules')
                        .upsert(schedulesToUpdate.map(({loan_id, due_date, amount_due, ...rest}) => rest));
                    if (scheduleUpsertError) throw scheduleUpsertError;
                }
            }

            // 2. Close the old loan
            const { error: closeLoanError } = await supabase
                .from('loans')
                .update({ status: LoanStatus.PAGADO })
                .eq('id', loan.id);
            if (closeLoanError) throw closeLoanError;

            // 3. Create the NEW loan
            const loanPayload = { 
                ...newLoanData, 
                status: LoanStatus.ACTIVO
            };
            const { data: insertedLoan, error: createLoanError } = await supabase
                .from('loans')
                .insert(loanPayload)
                .select()
                .single<Loan>();
            
            if (createLoanError) throw createLoanError;
            if (!insertedLoan) throw new Error("Failed to create new loan.");

            // 4. Generate schedules for new loan
            const newSchedule = generateLoanSchedule(insertedLoan);
            const { error: createScheduleError } = await supabase
                .from('loan_schedules')
                .insert(newSchedule);
            
            if (createScheduleError) throw createScheduleError;

            addToast('Préstamo renovado exitosamente.', 'success');
            setIsRenovateModalOpen(false);
            
            // Redirect to the new loan detail page
            navigate(`/loans/${insertedLoan.id}`);

        } catch (err: any) {
            console.error('Renovation error:', err);
            addToast(`Error al renovar préstamo: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="dark:text-white">Cargando detalles del préstamo...</div>;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!loan) return <div className="dark:text-white">Préstamo no encontrado.</div>;

    const totalInterest = totalDue - loan.amount;

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <Link to="/loans" className="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Volver a Préstamos
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Renovate Button */}
                    {canRenovate && (
                         <Button
                            onClick={() => setIsRenovateModalOpen(true)}
                            variant="primary" // Highlighting this action
                            leftIcon={Repeat}
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={isReadOnly}
                        >
                            Renovar
                        </Button>
                    )}

                    {loan.status !== LoanStatus.PAGADO && (
                        <Button
                            onClick={() => setIsSettleModalOpen(true)}
                            variant="success"
                            leftIcon={CircleDollarSign}
                            disabled={remainingBalance <= 0 || isReadOnly}
                        >
                            Saldar
                        </Button>
                    )}
                    {profile?.role === Role.ADMIN && (
                        <Button onClick={() => setEditModalOpen(true)} leftIcon={Edit} variant="secondary" disabled={isReadOnly}>
                            Editar
                        </Button>
                    )}
                </div>
            </div>
            
            <Card title={`Detalles del Préstamo #${loan.id.split('-')[0]}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            <User className="w-4 h-4 mr-2" /> 
                            <Link to={`/clients/${loan.client_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">{loan.clients?.name}</Link>
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monto del Préstamo</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(loan.amount)}</p>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Intereses</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(totalInterest)}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total a Pagar</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(totalDue)}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{loan.status}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Emisión</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatDate(loan.issue_date)}</p>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Empleado</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{loan.profiles?.name}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ruta Asignada</h4>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                           <Map className="w-4 h-4 mr-2"/>
                           {loan.routes?.name ?? 'Sin asignar'}
                        </p>
                    </div>
                </div>
                {/* Warning for Renovation Eligibility */}
                {!canRenovate && loan.status === LoanStatus.ACTIVO && (
                     <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-xs text-yellow-800 dark:text-yellow-200 rounded">
                        * La renovación solo está disponible cuando faltan 3 o menos cuotas por pagar.
                    </div>
                )}
            </Card>

            <Card title="Calendario de Pagos" className="mt-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Cuota</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Vencimiento</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto a Pagar</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto Pagado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha de Pago</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {schedule.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{item.installment_number}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(item.due_date)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatCurrency(item.amount_due)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatCurrency(item.amount_paid)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(item.payment_date)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {item.status !== ScheduleStatus.PAGADO ? (
                                            <Button size="sm" onClick={() => handleOpenPaymentModal(item)} leftIcon={DollarSign} disabled={isReadOnly}>
                                                Registrar Pago
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => handleViewReceipt(item)} leftIcon={FileText}>
                                                Ver Comprobante
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {selectedSchedule && (
                <Modal isOpen={paymentModalOpen} onClose={handleClosePaymentModal} title="Registrar Pago">
                    <RecordPaymentForm 
                        schedule={selectedSchedule} 
                        onClose={handleClosePaymentModal} 
                        onSuccess={handleRecordPayment}
                    />
                </Modal>
            )}

            {loan && (
                <>
                    <Modal isOpen={editModalOpen} onClose={handleCloseEditModal} title="Editar Préstamo">
                        <EditLoanForm 
                            loan={loan}
                            onClose={handleCloseEditModal} 
                            onSave={handleUpdateLoan}
                            isSaving={isSaving}
                            hasPayments={payments.length > 0}
                        />
                    </Modal>

                    <Modal isOpen={isRenovateModalOpen} onClose={handleCloseRenovateModal} title="Renovar Préstamo">
                        <RenovateLoanForm
                            oldLoan={loan}
                            balanceToPayOff={remainingBalance}
                            onSave={handleRenovateLoan}
                            onClose={handleCloseRenovateModal}
                            isSaving={isSaving}
                        />
                    </Modal>
                </>
            )}

            {activePayment && loan.clients && (
                <Modal isOpen={receiptModalOpen} onClose={handleCloseReceiptModal} title="Comprobante de Pago">
                    <PaymentReceipt
                        payment={activePayment}
                        loan={loan}
                        client={loan.clients}
                        tenantName={tenantName}
                        onClose={handleCloseReceiptModal}
                        receiptContext={receiptContext}
                    />
                </Modal>
            )}
            
            <ConfirmationModal
                isOpen={isSettleModalOpen}
                onClose={() => setIsSettleModalOpen(false)}
                onConfirm={handleConfirmSettleLoan}
                title="Confirmar Saldo de Préstamo"
                message={`Se registrará un pago único por el saldo restante de ${formatCurrency(remainingBalance)} para saldar la deuda. ¿Desea continuar?`}
                isConfirming={isSettling}
            />
        </>
    );
};

export default LoanDetailPage;
