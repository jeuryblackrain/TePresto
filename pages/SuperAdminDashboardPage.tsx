import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Modal from '../components/ui/Modal.tsx';
import { useToast } from '../hooks/useToast.ts';
import { LogOut, PlusCircle, Download, KeyRound } from 'lucide-react';
import NewTenantForm from '../components/forms/NewTenantForm.tsx';
import ResetPasswordForm from '../components/forms/ResetPasswordForm.tsx';
import { formatDate } from '../utils/formatters.ts';

interface Tenant {
    id: string;
    name: string;
    created_at: string;
    admin_email: string | null;
}

const SuperAdminDashboardPage: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('get-all-tenants');
            if (error) throw error;
            setTenants(data.tenants || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch tenants.');
            addToast('Error al cargar los tenants', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const handleLogout = () => {
        sessionStorage.removeItem('superAdminAuth');
        navigate('/loginadmin');
    };

    const handleCreateTenant = async (tenantData: { companyName: string; adminName: string; adminEmail: string; adminPassword?: string }) => {
        setIsSaving(true);
        try {
            const { error } = await supabase.functions.invoke('create-tenant', {
                body: tenantData
            });
            if (error) throw error;
            addToast('Tenant creado exitosamente.', 'success');
            setIsNewTenantModalOpen(false);
            fetchTenants();
        } catch (err: any) {
            addToast(`Error al crear tenant: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleOpenResetPasswordModal = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsResetPasswordModalOpen(true);
    };

    const handleResetPassword = async (password: string) => {
        if (!selectedTenant) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.functions.invoke('reset-tenant-admin-password', {
                body: { tenantId: selectedTenant.id, newPassword: password }
            });
            if (error) throw error;
            addToast(`Contraseña para ${selectedTenant.name} actualizada.`, 'success');
            setIsResetPasswordModalOpen(false);
        } catch (err: any) {
             addToast(`Error al actualizar contraseña: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackup = async (tenant: Tenant) => {
        addToast(`Iniciando backup para ${tenant.name}...`, 'info');
        try {
            const { data, error } = await supabase.functions.invoke('backup-tenant', {
                body: { tenantId: tenant.id }
            });
            if (error) throw error;
            
            const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${tenant.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast('Backup descargado exitosamente.', 'success');
        } catch (err: any) {
            addToast(`Error al crear backup: ${err.message}`, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="h-20 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Panel de Super Administrador</h1>
                <Button onClick={handleLogout} variant="secondary" leftIcon={LogOut}>
                    Cerrar Sesión
                </Button>
            </header>
            <main className="p-6">
                <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Gestión de Tenants</h2>
                     <Button onClick={() => setIsNewTenantModalOpen(true)} leftIcon={PlusCircle}>
                         Crear Nuevo Tenant
                     </Button>
                </div>
                <Card>
                    {loading && <p className="p-4 text-center">Cargando tenants...</p>}
                    {error && <p className="p-4 text-center text-red-500">{error}</p>}
                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre de Empresa</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email Admin</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Creación</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {tenants.map(tenant => (
                                        <tr key={tenant.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{tenant.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{tenant.admin_email || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(tenant.created_at)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenResetPasswordModal(tenant)} title="Resetear Contraseña" aria-label={`Resetear contraseña para ${tenant.name}`}><KeyRound className="h-4 w-4"/></Button>
                                                <Button size="sm" variant="secondary" onClick={() => handleBackup(tenant)} title="Descargar Backup" aria-label={`Descargar backup para ${tenant.name}`}><Download className="h-4 w-4"/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </main>
            <Modal isOpen={isNewTenantModalOpen} onClose={() => setIsNewTenantModalOpen(false)} title="Crear Nuevo Tenant">
                <NewTenantForm 
                    onSave={handleCreateTenant}
                    onClose={() => setIsNewTenantModalOpen(false)}
                    isSaving={isSaving}
                />
            </Modal>
             <Modal isOpen={isResetPasswordModalOpen} onClose={() => setIsResetPasswordModalOpen(false)} title={`Resetear Contraseña para ${selectedTenant?.name}`}>
                {selectedTenant && <ResetPasswordForm 
                    onSave={handleResetPassword}
                    onClose={() => setIsResetPasswordModalOpen(false)}
                    isSaving={isSaving}
                />}
            </Modal>
        </div>
    );
};

export default SuperAdminDashboardPage;