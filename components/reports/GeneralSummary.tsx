import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Loan, Client, Profile, Payment, Role } from '../../types.ts';
import { generateReportSummary } from '../../services/geminiService.ts';
import useAuth from '../../hooks/useAuth.ts';
import Card from '../ui/Card.tsx';
import Button from '../ui/Button.tsx';
import { Bot, RefreshCw, HandCoins, PiggyBank, CircleDollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters.ts';

const GeneralSummary: React.FC = () => {
    const { profile } = useAuth();
    const [reportData, setReportData] = useState<{ loans: Loan[], clients: Client[], employees: Profile[], payments: Payment[] } | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [loadingData, setLoadingData] = useState(true);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [totalLoaned, setTotalLoaned] = useState(0);
    const [totalCollected, setTotalCollected] = useState(0);

    const fetchData = useCallback(async () => {
        if (!profile) return;
        setLoadingData(true);
        setError(null);
        try {
            // 1. Fetch loans, filtered by tenant and optionally by employee
            let loansQuery = supabase.from('loans').select('*').eq('tenant_id', profile.tenant_id);
            if (profile.role === Role.EMPLOYEE) {
                loansQuery = loansQuery.eq('employee_id', profile.id);
            }
            const { data: loans, error: loansError } = await loansQuery;
            if (loansError) throw loansError;
            const loanData = loans || [];

            // 2. Fetch payments related to those loans (already tenant-scoped)
            let paymentData: Payment[] = [];
            if (loanData.length > 0) {
                const loanIds = loanData.map(l => l.id);
                const { data: payments, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .in('loan_id', loanIds);
                if (paymentsError) throw paymentsError;
                paymentData = payments || [];
            }

            // 3. Fetch clients and employees (tenant-scoped)
            let clientData: Client[] = [];
            let employeeData: Profile[] = [];

            if (profile.role === Role.ADMIN) {
                const { data: clients, error: clientsError } = await supabase.from('clients').select('*').eq('tenant_id', profile.tenant_id);
                if (clientsError) throw clientsError;
                clientData = clients || [];

                const { data: employees, error: employeesError } = await supabase.from('profiles').select('*').eq('tenant_id', profile.tenant_id);
                if (employeesError) throw employeesError;
                employeeData = employees || [];
            } else { // Employee role
                if (loanData.length > 0) {
                    const clientIds = [...new Set(loanData.map(l => l.client_id))];
                    const { data: clients, error: clientsError } = await supabase
                        .from('clients')
                        .select('*')
                        .in('id', clientIds);
                    if (clientsError) throw clientsError;
                    clientData = clients || [];
                }
                employeeData = [profile];
            }
            
            setReportData({
                loans: loanData,
                clients: clientData,
                employees: employeeData,
                payments: paymentData,
            });

            const totalLoanAmount = loanData.reduce((acc, loan) => acc + Number(loan.amount), 0);
            const totalPaymentsAmount = paymentData.reduce((acc, payment) => acc + Number(payment.amount), 0);
            setTotalLoaned(totalLoanAmount);
            setTotalCollected(totalPaymentsAmount);

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
            const result = await generateReportSummary(reportData);
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
        return <div className="text-center p-8">Cargando datos del resumen...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-500 text-white mr-4"><HandCoins className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Prestado</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalLoaned)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-green-50">
                    <div className="flex items-center">
                         <div className="p-3 rounded-full bg-green-500 text-white mr-4"><PiggyBank className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Cobrado</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalCollected)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-yellow-50">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-500 text-white mr-4"><CircleDollarSign className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Saldo Pendiente</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalLoaned - totalCollected)}</p>
                        </div>
                    </div>
                </Card>
            </div>
            <Card title="Resumen con IA (Gemini)">
                <div className="space-y-4">
                    <Button 
                        onClick={handleGenerateSummary} 
                        disabled={loadingSummary} 
                        leftIcon={loadingSummary ? RefreshCw : Bot}
                        className={loadingSummary ? 'animate-spin' : ''}
                    >
                        {loadingSummary ? 'Generando...' : 'Generar Resumen Inteligente'}
                    </Button>
                    
                    {summary && (
                         <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap font-mono">{summary}</p>
                        </div>
                    )}

                    {error && <p className="text-red-500 mt-2">Error: {error}</p>}
                </div>
            </Card>
        </div>
    );
};

export default GeneralSummary;