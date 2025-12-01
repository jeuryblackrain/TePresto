
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Profile, Role } from '../types.ts';
import Card from '../components/ui/Card.tsx';
import Button from '../components/ui/Button.tsx';
import { PlusCircle, Edit, Trash2, KeyRound } from 'lucide-react';
import Modal from '../components/ui/Modal.tsx';
import EmployeeForm from '../components/forms/EmployeeForm.tsx';
import { useToast } from '../hooks/useToast.ts';
import useAuth from '../hooks/useAuth.ts';
import ConfirmationModal from '../components/ui/ConfirmationModal.tsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminPage: React.FC = () => {
    const { profile: adminProfile, isReadOnly } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [employeeToReset, setEmployeeToReset] = useState<Profile | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);

    // 1. Fetch Employees using React Query
    const { data: employees = [], isLoading, error } = useQuery({
        queryKey: ['employees', adminProfile?.tenant_id],
        queryFn: async () => {
            if (!adminProfile) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', adminProfile.tenant_id)
                .or(`role.eq.${Role.EMPLOYEE},role.eq.${Role.ADMIN}`)
                .order('name');
            if (error) throw error;
            return data as Profile[];
        },
        enabled: !!adminProfile,
    });

    // 2. Mutation for Saving (Create/Update)
    const saveEmployeeMutation = useMutation({
        mutationFn: async ({ employeeData, password }: { employeeData: Partial<Profile>, password?: string }) => {
            if (selectedEmployee) { // Update
                const { error } = await supabase
                    .from('profiles')
                    .update({ name: employeeData.name, role: employeeData.role })
                    .eq('id', selectedEmployee.id);
                if (error) throw error;
            } else { // Create
                if (!password || !employeeData.email || !employeeData.name) {
                    throw new Error("Email, password, and name are required.");
                }
                if (!adminProfile?.tenant_id) throw new Error("Tenant ID missing.");

                const { error: signUpError } = await supabase.auth.signUp({
                    email: employeeData.email,
                    password: password,
                    options: {
                        data: {
                            name: employeeData.name,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeData.name)}`,
                            tenant_id: adminProfile.tenant_id
                        }
                    }
                });
                if (signUpError) throw signUpError;
            }
        },
        onSuccess: () => {
            addToast(selectedEmployee ? 'Empleado actualizado' : 'Empleado creado', 'success');
            handleCloseFormModal();
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (err: any) => {
            addToast(`Error: ${err.message}`, 'error');
        }
    });

    // 3. Mutation for Password Reset
    const resetPasswordMutation = useMutation({
        mutationFn: async (email: string) => {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
        },
        onSuccess: (_, email) => {
            addToast(`Correo enviado a ${email}`, 'success');
            setIsConfirmModalOpen(false);
            setEmployeeToReset(null);
        },
        onError: (err: any) => {
            addToast(`Error al enviar correo: ${err.message}`, 'error');
        }
    });

    const handleOpenFormModal = (employee: Profile | null = null) => {
        setSelectedEmployee(employee);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setSelectedEmployee(null);
    };
    
    const handleOpenConfirmModal = (employee: Profile) => {
        setEmployeeToReset(employee);
        setIsConfirmModalOpen(true);
    };

    const handleSaveEmployee = (employeeData: Partial<Profile>, password?: string) => {
        saveEmployeeMutation.mutate({ employeeData, password });
    };
    
    const handleDeleteInfo = () => {
        addToast('La eliminación de usuarios debe realizarse desde el panel de control de Supabase por seguridad.', 'info');
    };
    
    const handleConfirmResetPassword = () => {
        if (employeeToReset) {
            resetPasswordMutation.mutate(employeeToReset.email);
        }
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Empleados</h1>
                <Button 
                    onClick={() => handleOpenFormModal()} 
                    leftIcon={PlusCircle}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Modo solo lectura activo" : "Crear nuevo empleado"}
                >
                    Nuevo Empleado
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {employees.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 dark:text-gray-300">No hay empleados registrados.</td></tr>
                                ) : (
                                    employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-white">{emp.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{emp.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap capitalize text-gray-600 dark:text-gray-300">{emp.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenConfirmModal(emp)} title="Resetear contraseña" disabled={isReadOnly}><KeyRound className="h-4 w-4"/></Button>
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenFormModal(emp)} title="Editar" disabled={isReadOnly}><Edit className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="danger" onClick={handleDeleteInfo} title="Eliminar" disabled={isReadOnly}><Trash2 className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={selectedEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}>
                <EmployeeForm 
                    employee={selectedEmployee} 
                    onSave={handleSaveEmployee} 
                    onClose={handleCloseFormModal}
                    isSaving={saveEmployeeMutation.isPending}
                />
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmResetPassword}
                title="Confirmar Restablecimiento"
                message={`¿Está seguro de que desea enviar un correo de restablecimiento de contraseña a ${employeeToReset?.email}?`}
                isConfirming={resetPasswordMutation.isPending}
            />
        </>
    );
};

export default AdminPage;
