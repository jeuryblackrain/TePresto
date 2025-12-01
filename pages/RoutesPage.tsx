
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Route } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { PlusCircle } from 'lucide-react';
import Modal from '../components/ui/Modal.tsx';
import RouteForm from '../components/forms/RouteForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type RouteWithEmployee = Route & {
    profiles: { name: string } | null;
};

const RoutesPage: React.FC = () => {
    const { profile, isReadOnly } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

    // 1. Fetch Routes using React Query
    const { data: routes = [], isLoading, error } = useQuery({
        queryKey: ['routes', profile?.tenant_id],
        queryFn: async () => {
            if (!profile) return [];
            const { data, error } = await supabase
                .from('routes')
                .select('*, profiles(name)')
                .eq('tenant_id', profile.tenant_id)
                .order('name');
            if (error) throw error;
            return data as RouteWithEmployee[];
        },
        enabled: !!profile,
    });

    // 2. Mutation for Save
    const saveRouteMutation = useMutation({
        mutationFn: async (routeData: Partial<Route>) => {
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
            } else { // Insert
                const { error } = await supabase
                    .from('routes')
                    .insert(dataToSave);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            addToast(selectedRoute ? 'Ruta actualizada' : 'Ruta creada', 'success');
            handleCloseModal();
            queryClient.invalidateQueries({ queryKey: ['routes'] });
        },
        onError: (err: any) => {
            addToast(`Error: ${err.message}`, 'error');
        }
    });

    const handleOpenModal = (route: Route | null = null) => {
        setSelectedRoute(route);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRoute(null);
    };
    
    const handleSaveRoute = (routeData: Partial<Route>) => {
        saveRouteMutation.mutate(routeData);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Rutas de Cobro</h1>
                <Button 
                    onClick={() => handleOpenModal()} 
                    leftIcon={PlusCircle}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Modo solo lectura activo" : "Crear nueva ruta"}
                >
                    Nueva Ruta
                </Button>
            </div>
            <Card>
                {isLoading && <p className="p-4 text-center dark:text-gray-300">Cargando...</p>}
                {error && <p className="p-4 text-center text-red-500">Error: {(error as Error).message}</p>}
                {!isLoading && !error && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre de la Ruta</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Empleado Asignado</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Editar</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {routes.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center py-4 dark:text-gray-300">No hay rutas creadas.</td></tr>
                                ) : (
                                    routes.map(route => (
                                        <tr key={route.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{route.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                {route.profiles?.name || <span className="text-gray-400 italic">Sin asignar</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button variant="secondary" size="sm" onClick={() => handleOpenModal(route)} disabled={isReadOnly}>Editar</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
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
                    isSaving={saveRouteMutation.isPending}
                />
            </Modal>
        </>
    );
};

export default RoutesPage;
