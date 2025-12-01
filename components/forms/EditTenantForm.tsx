
import React, { useState } from 'react';
import Button from '../ui/Button.tsx';
import { Tenant } from '../../types.ts';

interface EditTenantFormProps {
    tenant: Tenant;
    onSave: (data: Partial<Tenant>) => void;
    onClose: () => void;
    isSaving: boolean;
}

const EditTenantForm: React.FC<EditTenantFormProps> = ({ tenant, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState({
        max_loans: tenant.max_loans?.toString() || '',
        max_users: tenant.max_users?.toString() || '',
        subscription_end_date: tenant.subscription_end_date || '',
        status: tenant.status || 'active',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            max_loans: formData.max_loans ? parseInt(formData.max_loans) : undefined,
            max_users: formData.max_users ? parseInt(formData.max_users) : undefined,
            subscription_end_date: formData.subscription_end_date || undefined,
            status: formData.status as 'active' | 'suspended',
        });
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const inputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={isSaving}>
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Configuración de {tenant.name}
                    </h3>
                </div>
                
                <div>
                    <label htmlFor="status" className={labelClasses}>Estado de la Cuenta</label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className={inputClasses}
                    >
                        <option value="active">Activo (Permitir acceso)</option>
                        <option value="suspended">Suspendido (Bloquear acceso)</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="max_loans" className={labelClasses}>Límite de Préstamos</label>
                        <input
                            type="number"
                            id="max_loans"
                            name="max_loans"
                            value={formData.max_loans}
                            onChange={handleChange}
                            placeholder="Ej. 100"
                            className={inputClasses}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Dejar vacío para ilimitado.
                        </p>
                    </div>
                    <div>
                        <label htmlFor="max_users" className={labelClasses}>Límite de Usuarios</label>
                        <input
                            type="number"
                            id="max_users"
                            name="max_users"
                            value={formData.max_users}
                            onChange={handleChange}
                            placeholder="Ej. 5"
                            className={inputClasses}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Empleados + Admin.
                        </p>
                    </div>
                </div>

                <div>
                    <label htmlFor="subscription_end_date" className={labelClasses}>Fecha de Vencimiento de Suscripción</label>
                    <input
                        type="date"
                        id="subscription_end_date"
                        name="subscription_end_date"
                        value={formData.subscription_end_date}
                        onChange={handleChange}
                        className={`${inputClasses} dark:[color-scheme:dark]`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Después de esta fecha, la cuenta puede pasar a modo lectura.
                    </p>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>
        </form>
    );
};

export default EditTenantForm;
