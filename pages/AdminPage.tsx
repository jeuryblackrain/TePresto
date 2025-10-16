

import React, { useState, useEffect } from 'react';
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

const AdminPage: React.FC = () => {
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [employeeToReset, setEmployeeToReset] = useState<Profile | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();
    const { profile: adminProfile } = useAuth();

    const fetchEmployees = async () => {
        if (!adminProfile) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', adminProfile.tenant_id)
                .or(`role.eq.${Role.EMPLOYEE},role.eq.${Role.ADMIN}`);
            if (error) throw error;
            setEmployees(data || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

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

    const handleSaveEmployee = async (employeeData: Partial<Profile>, password?: string) => {
        setIsSaving(true);
        try {
            if (selectedEmployee) { // Editing existing employee
                const { error } = await supabase
                    .from('profiles')
                    .update({ name: employeeData.name, role: employeeData.role })
                    .eq('id', selectedEmployee.id);
                if (error) throw error;
                addToast('Empleado actualizado exitosamente', 'success');
            } else { // Creating new employee, now handled by a secure DB trigger
                if (!password || !employeeData.email || !employeeData.name) {
                    throw new Error("Email, password, and name are required for new employees.");
                }
                if (!adminProfile?.tenant_id) {
                    throw new Error("Could not determine the tenant for the new employee.");
                }

                // FIX: Use Supabase v2 `signUp` syntax, where options is nested inside the first argument.
                const { error: signUpError } = await supabase.auth.signUp({
                    email: employeeData.email,
                    password: password,
                    options: {
                        data: {
                            name: employeeData.name,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeData.name)}`,
                            tenant_id: adminProfile.tenant_id // The trigger uses this to assign the 'empleado' role
                        }
                    }
                });

                if (signUpError) throw signUpError;
                
                addToast('Empleado creado exitosamente. Recibirán un email de confirmación.', 'success');
            }
            handleCloseFormModal();
            fetchEmployees();
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteInfo = () => {
        addToast('La eliminación de usuarios debe realizarse desde el panel de control de Supabase por seguridad.', 'info');
    };
    
    const handleConfirmResetPassword = async () => {
        if (!employeeToReset) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(employeeToReset.email, {
                redirectTo: window.location.origin, // Redirect user back to the app after reset
            });
            if (error) throw error;
            addToast(`Correo de restablecimiento enviado a ${employeeToReset.email}`, 'success');
        } catch (err: any) {
             addToast(`Error al enviar correo: ${err.message}`, 'error');
        } finally {
            setIsConfirmModalOpen(false);
            setEmployeeToReset(null);
        }
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gestión de Empleados</h1>
                <Button onClick={() => handleOpenFormModal()} leftIcon={PlusCircle}>
                    Nuevo Empleado
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {employees.map(emp => (
                                    <tr key={emp.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{emp.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{emp.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap capitalize">{emp.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenConfirmModal(emp)} title="Resetear contraseña" aria-label={`Resetear contraseña para ${emp.name}`}><KeyRound className="h-4 w-4"/></Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenFormModal(emp)} title="Editar" aria-label={`Editar empleado ${emp.name}`}><Edit className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="danger" onClick={handleDeleteInfo} title="Información de eliminación" aria-label="Información de eliminación"><Trash2 className="h-4 w-4" /></Button>
                                        </td>
                                    </tr>
                                ))}
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
                    isSaving={isSaving}
                />
            </Modal>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmResetPassword}
                title="Confirmar Restablecimiento"
                message={`¿Está seguro de que desea enviar un correo de restablecimiento de contraseña a ${employeeToReset?.email}?`}
            />
        </>
    );
};

export default AdminPage;