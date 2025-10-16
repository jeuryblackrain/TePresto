import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { Client, Loan, LoanStatus, LoanSchedule } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import { ArrowLeft, User, Phone, MapPin, Edit, Briefcase, Badge, Bot, Shield, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import Button from '../components/ui/Button.tsx';
import Modal from '../components/ui/Modal.tsx';
import ClientForm from '../components/forms/ClientForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import { generateClientRiskAnalysis } from '../services/geminiService.ts';
import StatusBadge from '../components/ui/StatusBadge.tsx';

type LoanWithSchedules = Loan & {
    loan_schedules: LoanSchedule[];
};

interface RiskAnalysisResult {
    risk_level: 'Bajo' | 'Medio' | 'Alto';
    summary: string;
}

const ClientDetailPage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const [client, setClient] = useState<Client | null>(null);
    const [loans, setLoans] = useState<LoanWithSchedules[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    
    const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single();
            if (clientError) throw clientError;
            setClient(clientData);

            const { data: loansData, error: loansError } = await supabase
                .from('loans')
                .select('*, loan_schedules(*)')
                .eq('client_id', clientId)
                .order('issue_date', { ascending: false });
            if (loansError) throw loansError;
            setLoans(loansData as LoanWithSchedules[]);

        } catch (err: any) {
            setError(err.message || 'Failed to fetch client details.');
        } finally {
            setLoading(false);
        }
    }, [clientId]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleAnalyzeRisk = async () => {
        if (!client || !loans) return;
        setIsAnalyzing(true);
        setRiskAnalysis(null);
        setError(null);
        try {
            const result = await generateClientRiskAnalysis(client, loans);
            setRiskAnalysis(result);
        } catch (err: any) {
            addToast(`Error al analizar riesgo: ${err.message}`, 'error');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveClient = async (clientData: Partial<Client>) => {
        if (!client) return;
        setIsSaving(true);
        try {
            const dataToSave = {
                name: clientData.name,
                phone: clientData.phone,
                address: clientData.address,
                id_document: clientData.id_document,
                occupation: clientData.occupation,
            };
            
            const { error } = await supabase
                .from('clients')
                .update(dataToSave)
                .eq('id', client.id);
            if (error) throw error;

            addToast('Cliente actualizado correctamente', 'success');
            setIsModalOpen(false);
            fetchData(); // Refresh data on the page
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

     const RiskDisplay: React.FC<{ analysis: RiskAnalysisResult | null }> = ({ analysis }) => {
        if (!analysis) return null;

        const riskConfig = {
            'Bajo': { icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/30' },
            'Medio': { icon: ShieldAlert, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
            'Alto': { icon: Shield, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' },
        };
        const config = riskConfig[analysis.risk_level] || riskConfig['Medio'];
        const Icon = config.icon;

        return (
            <div className={`p-4 rounded-lg mt-4 ${config.bg}`}>
                <div className="flex items-center">
                    <Icon className={`w-8 h-8 mr-3 ${config.color}`} />
                    <div>
                        <h4 className={`text-lg font-bold ${config.color}`}>Riesgo {analysis.risk_level}</h4>
                    </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{analysis.summary}</p>
            </div>
        );
    };

    if (loading) return <div>Cargando...</div>;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!client) return <div>Cliente no encontrado.</div>;

    return (
        <>
            <Link to="/clients" className="flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver a Clientes
            </Link>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Detalles del Cliente" className="relative">
                        <div className="absolute top-4 right-4">
                            <Button variant="secondary" onClick={() => setIsModalOpen(true)} leftIcon={Edit}>Editar Cliente</Button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <User className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
                                <span className="text-xl font-bold text-gray-800 dark:text-white">{client.name}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                <div className="flex items-center">
                                    <Badge className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Cédula / ID</p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">{client.id_document || 'No especificado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">{client.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Briefcase className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Ocupación</p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">{client.occupation || 'No especificada'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <MapPin className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Dirección</p>
                                        <p className="text-gray-700 dark:text-gray-300 font-medium">{client.address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Historial de Préstamos">
                        {loans.length === 0 ? (
                            <p className="dark:text-gray-300">Este cliente no tiene préstamos registrados.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Emisión</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                            <th className="relative px-6 py-3"><span className="sr-only">Ver</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {loans.map(loan => (
                                            <tr key={loan.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatCurrency(loan.amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(loan.issue_date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={loan.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link to={`/loans/${loan.id}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200">
                                                        Ver Préstamo
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
                <div>
                     <Card title="Análisis de Riesgo con IA">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Use Gemini AI para evaluar el historial de pagos del cliente y generar un perfil de riesgo para futuros préstamos.
                        </p>
                        <Button onClick={handleAnalyzeRisk} disabled={isAnalyzing || loans.length === 0} leftIcon={isAnalyzing ? RefreshCw : Bot} className={isAnalyzing ? 'animate-spin' : ''}>
                             {isAnalyzing ? 'Analizando...' : 'Analizar Riesgo'}
                        </Button>
                        {loans.length === 0 && <p className="text-xs text-yellow-600 mt-2">El cliente no tiene historial de préstamos para analizar.</p>}
                        
                        <RiskDisplay analysis={riskAnalysis} />
                     </Card>
                </div>
            </div>

            {client && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Cliente">
                    <ClientForm
                        client={client}
                        onSave={handleSaveClient}
                        onClose={() => setIsModalOpen(false)}
                        isSaving={isSaving}
                    />
                </Modal>
            )}
        </>
    );
};

export default ClientDetailPage;