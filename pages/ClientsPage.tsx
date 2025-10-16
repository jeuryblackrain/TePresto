import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.ts';
import { Client } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { PlusCircle, Search } from 'lucide-react';
import Modal from '../components/ui/Modal.tsx';
import ClientForm from '../components/forms/ClientForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';

const ClientsPage: React.FC = () => {
    const { profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const fetchClients = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('clients')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .order('name', { ascending: true });

            if (searchTerm) {
                const searchIlke = `%${searchTerm.replace(/ /g, '%')}%`;
                // Search in name, phone, or ID document
                // FIX: Corrected typo from searchIlike to searchIlke
                query = query.or(`name.ilike.${searchIlke},phone.ilike.${searchIlke},id_document.ilike.${searchIlke}`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setClients(data || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch clients.");
        } finally {
            setLoading(false);
        }
    }, [searchTerm, profile]);
    
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchClients();
        }, 300); // Debounce search to avoid excessive API calls

        return () => clearTimeout(debounceTimer);
    }, [fetchClients]);
    
    const handleOpenModal = (client: Client | null = null) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
    };

    const handleSaveClient = async (clientData: Partial<Client>) => {
        if (!profile) return;
        setIsSaving(true);
        try {
            // The tenant_id is now set by the database default.
            const dataToSave = {
                name: clientData.name,
                phone: clientData.phone,
                address: clientData.address,
                id_document: clientData.id_document,
                occupation: clientData.occupation,
            };
            
            if (selectedClient) { // Update
                const { error } = await supabase
                    .from('clients')
                    .update(dataToSave)
                    .eq('id', selectedClient.id);
                if (error) throw error;
                addToast('Cliente actualizado correctamente', 'success');
            } else { // Insert
                const { error } = await supabase
                    .from('clients')
                    .insert(dataToSave);
                if (error) throw error;
                addToast('Cliente creado correctamente', 'success');
            }
            handleCloseModal();
            fetchClients();
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes</h1>
                <Button onClick={() => handleOpenModal()} leftIcon={PlusCircle}>
                    Nuevo Cliente
                </Button>
            </div>
            <Card>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o cédula..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
                {loading && <p className="p-4 text-center">Cargando...</p>}
                {error && <p className="p-4 text-center text-red-500">{error}</p>}
                {!loading && !error && (
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teléfono</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dirección</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {clients.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4">No se encontraron clientes.</td></tr>
                                ) : (
                                    clients.map(client => (
                                        <tr key={client.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{client.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{client.phone}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{client.address}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(client)}>
                                                    Editar
                                                </Button>
                                                <Link to={`/clients/${client.id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200 inline-block align-middle">
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
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}>
                <ClientForm
                    client={selectedClient}
                    onSave={handleSaveClient}
                    onClose={handleCloseModal}
                    isSaving={isSaving}
                />
            </Modal>
        </>
    );
};

export default ClientsPage;