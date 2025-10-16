import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Route } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { PlusCircle } from 'lucide-react';
import Modal from '../components/ui/Modal.tsx';
import RouteForm from '../components/forms/RouteForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';

type RouteWithEmployee = Route & {
    profiles: { name: string } | null;
};

const RoutesPage: React.FC = () => {
    const { profile } = useAuth();
    const [routes, setRoutes] = useState<RouteWithEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const fetchRoutes = async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('routes')
                .select('*, profiles(name)')
                .eq('tenant_id', profile.tenant_id);
            if (error) throw error;
            setRoutes(data || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch routes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, [profile]);

    const handleOpenModal = (route: Route | null = null) => {
        setSelectedRoute(route);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRoute(null);
    };
    
    const handleSaveRoute = async (routeData: Partial<Route>) => {
        if (!profile) return;
        setIsSaving(true);
        try {
            // The tenant_id is now set by the database default.
            const dataToSave = {
                name: routeData.name,
                employee_id: routeData.employee_id,
            };

            if (selectedRoute) { // Update
                const { error } = await supabase
                    .from('routes')
                    .update(dataToSave)
                    .eq('id', selectedRoute.id);
                if (error) throw error;
                addToast('Ruta actualizada correctamente', 'success');
            } else { // Insert
                const { error } = await supabase
                    .from('routes')
                    .insert(dataToSave);
                if (error) throw error;
                addToast('Ruta creada correctamente', 'success');
            }
            handleCloseModal();
            fetchRoutes();
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Rutas de Cobro</h1>
                <Button onClick={() => handleOpenModal()} leftIcon={PlusCircle}>
                    Nueva Ruta
                </Button>
            </div>
            <Card>
                {loading && <p className="p-4 text-center">Cargando...</p>}
                {error && <p className="p-4 text-center text-red-500">{error}</p>}
                {!loading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre de la Ruta</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado Asignado</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Editar</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {routes.map(route => (
                                    <tr key={route.id}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{route.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{route.profiles?.name || <span className="text-gray-400">Sin asignar</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button variant="secondary" size="sm" onClick={() => handleOpenModal(route)}>Editar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedRoute ? 'Editar Ruta' : 'Nueva Ruta'}>
                <RouteForm
                    route={selectedRoute}
                    onSave={handleSaveRoute}
                    onClose={handleCloseModal}
                    isSaving={isSaving}
                />
            </Modal>
        </>
    );
};

export default RoutesPage;