
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { Tenant } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import Modal from '../components/ui/Modal.tsx';
import { useToast } from '../hooks/useToast.ts';
import { LogOut, PlusCircle, Download, KeyRound, Settings, Megaphone, Trash2 } from 'lucide-react';
import NewTenantForm from '../components/forms/NewTenantForm.tsx';
import ResetPasswordForm from '../components/forms/ResetPasswordForm.tsx';
import EditTenantForm from '../components/forms/EditTenantForm.tsx';
import { formatDate } from '../utils/formatters.ts';

const SuperAdminDashboardPage: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Announcement State
    const [announcementMsg, setAnnouncementMsg] = useState('');
    const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'error'>('info');
    const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

    const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
    
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
            // Don't show toast on load unless it's critical, to avoid spamming
            console.error('Error fetching tenants:', err);
        } finally {
            setLoading(false);
        }
    }, []);

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
            const { data, error } = await supabase.functions.invoke('create-tenant', {
                body: tenantData
            });

            // Manejo robusto de errores de Edge Functions
            if (error) {
                let errorMessage = error.message;
                // Intentar leer el cuerpo de error si está disponible en el contexto
                try {
                    const errorBody = await error.context.json();
                    if (errorBody && errorBody.error) {
                        errorMessage = errorBody.error;
                    }
                } catch (e) { /* ignore parse error */ }
                throw new Error(errorMessage);
            }

            // Manejo de errores lógicos devueltos por la función (status 400)
            if (data && data.error) {
                throw new Error(data.error);
            }

            addToast('Tenant creado exitosamente.', 'success');
            setIsNewTenantModalOpen(false);
            fetchTenants();
        } catch (err: any) {
            console.error("Error creating tenant:", err);
            addToast(`Error al crear tenant: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleOpenResetPasswordModal = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsResetPasswordModalOpen(true);
    };

    const handleOpenEditModal = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setIsEditTenantModalOpen(true);
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

    const handleUpdateTenant = async (tenantData: Partial<Tenant>) => {
        if (!selectedTenant) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.functions.invoke('update-tenant', {
                body: { 
                    tenantId: selectedTenant.id, 
                    ...tenantData 
                }
            });
            
            if (error) throw error;
            
            addToast(`Tenant ${selectedTenant.name} actualizado.`, 'success');
            setIsEditTenantModalOpen(false);
            fetchTenants();
        } catch (err: any) {
             addToast(`Error al actualizar tenant: ${err.message}`, 'error');
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

    // --- ANNOUNCEMENT HANDLERS (UPDATED TO USE RPC) ---
    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementMsg) return;
        setIsPostingAnnouncement(true);
        
        try {
            // Using RPC (Database Function) instead of Edge Function for reliability
            const { error } = await supabase.rpc('manage_announcements', {
                p_action: 'publish',
                p_message: announcementMsg,
                p_type: announcementType
            });
            
            if (error) throw error;
            addToast('Anuncio publicado exitosamente.', 'success');
            setAnnouncementMsg('');
        } catch (err: any) {
            console.error('Error posting announcement:', err);
            addToast(`Error al publicar: ${err.message || err.details || 'Error desconocido'}`, 'error');
        } finally {
            setIsPostingAnnouncement(false);
        }
    };

    const handleClearAnnouncements = async () => {
        setIsPostingAnnouncement(true);
         try {
            // Using RPC
            const { error } = await supabase.rpc('manage_announcements', {
                p_action: 'clear',
                p_message: null,
                p_type: null
            });
            
            if (error) throw error;
            addToast('Anuncios limpiados correctamente.', 'info');
        } catch (err: any) {
            console.error('Error clearing announcements:', err);
            addToast(`Error al limpiar: ${err.message || err.details}`, 'error');
        } finally {
            setIsPostingAnnouncement(false);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
            <header className="h-20 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Panel de Super Administrador</h1>
                <Button onClick={handleLogout} variant="secondary" leftIcon={LogOut}>
                    Cerrar Sesión
                </Button>
            </header>
            <main className="p-6 max-w-7xl mx-auto space-y-6">
                
                {/* Announcement Section */}
                <Card title="Comunicación Global">
                    <form onSubmit={handlePostAnnouncement} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje de Anuncio</label>
                            <input 
                                type="text" 
                                value={announcementMsg} 
                                onChange={e => setAnnouncementMsg(e.target.value)}
                                placeholder="Ej. Mantenimiento programado para esta noche..."
                                className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm sm:text-sm p-2 border focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                             <select 
                                value={announcementType}
                                onChange={e => setAnnouncementType(e.target.value as any)}
                                className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm sm:text-sm p-2 border focus:ring-primary-500 focus:border-primary-500"
                             >
                                <option value="info">Info (Azul)</option>
                                <option value="warning">Advertencia (Amarillo)</option>
                                <option value="error">Alerta (Rojo)</option>
                             </select>
                        </div>
                        <Button type="submit" leftIcon={Megaphone} disabled={isPostingAnnouncement}>
                            {isPostingAnnouncement ? '...' : 'Publicar'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleClearAnnouncements} leftIcon={Trash2} disabled={isPostingAnnouncement}>
                            Limpiar
                        </Button>
                    </form>
                </Card>

                <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Gestión de Tenants</h2>
                     <Button onClick={() => setIsNewTenantModalOpen(true)} leftIcon={PlusCircle}>
                         Crear Nuevo Tenant
                     </Button>
                </div>

                <Card>
                    {loading && <p className="p-4 text-center dark:text-gray-300">Cargando tenants...</p>}
                    {error && <p className="p-4 text-center text-red-500">{error}</p>}
                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Empresa</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Límite Préstamos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Límite Usuarios</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vencimiento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Admin Email</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {tenants.map(tenant => (
                                        <tr key={tenant.id} className={tenant.status === 'suspended' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{tenant.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    tenant.status === 'suspended' 
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                }`}>
                                                    {tenant.status === 'suspended' ? 'Suspendido' : 'Activo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {tenant.max_loans ? tenant.max_loans : 'Ilimitado'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {tenant.max_users ? tenant.max_users : 'Ilimitado'}
                                            </td>
                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                {tenant.subscription_end_date ? formatDate(tenant.subscription_end_date) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 text-sm">{tenant.admin_email || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(tenant)} title="Configuración" aria-label={`Configurar ${tenant.name}`}><Settings className="h-4 w-4"/></Button>
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
            
            <Modal isOpen={isEditTenantModalOpen} onClose={() => setIsEditTenantModalOpen(false)} title={`Configuración de Tenant`}>
                {selectedTenant && <EditTenantForm
                    tenant={selectedTenant}
                    onSave={handleUpdateTenant}
                    onClose={() => setIsEditTenantModalOpen(false)}
                    isSaving={isSaving}
                />}
            </Modal>

             <Modal isOpen={isResetPasswordModalOpen} onClose={() => setIsResetPasswordModalOpen(false)} title={`Resetear Contraseña`}>
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
