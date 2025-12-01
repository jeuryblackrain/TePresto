import React, { useState } from 'react';
import Button from '../ui/Button.tsx';

interface NewTenantFormProps {
    onSave: (data: { companyName: string; adminName: string; adminEmail: string; adminPassword?: string }) => void;
    onClose: () => void;
    isSaving: boolean;
}

const NewTenantForm: React.FC<NewTenantFormProps> = ({ onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        const { companyName, adminName, adminEmail, adminPassword } = formData;

        if (!companyName.trim()) newErrors.companyName = 'El nombre de la empresa es obligatorio.';
        if (!adminName.trim()) newErrors.adminName = 'El nombre del administrador es obligatorio.';
        
        if (!adminEmail.trim()) {
            newErrors.adminEmail = 'El email es obligatorio.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
            newErrors.adminEmail = 'Email inválido.';
        }
        
        if (!adminPassword) {
            newErrors.adminPassword = 'La contraseña es obligatoria.';
        } else if (adminPassword.length < 8) {
            newErrors.adminPassword = 'La contraseña debe tener al menos 8 caracteres.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !validate()) return;
        onSave(formData);
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const baseInputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorInputClasses = "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500";
    const errorTextClasses = "mt-1 text-xs text-red-600 dark:text-red-400";
    const getInputClass = (fieldName: string) => `${baseInputClasses} ${errors[fieldName] ? errorInputClasses : ''}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={isSaving}>
                <div>
                    <label htmlFor="companyName" className={labelClasses}>Nombre de la Empresa</label>
                    <input type="text" id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} required className={getInputClass('companyName')} />
                    {errors.companyName && <p className={errorTextClasses}>{errors.companyName}</p>}
                </div>
                <div>
                    <label htmlFor="adminName" className={labelClasses}>Nombre del Administrador</label>
                    <input type="text" id="adminName" name="adminName" value={formData.adminName} onChange={handleChange} required className={getInputClass('adminName')} />
                    {errors.adminName && <p className={errorTextClasses}>{errors.adminName}</p>}
                </div>
                <div>
                    <label htmlFor="adminEmail" className={labelClasses}>Email del Administrador</label>
                    <input type="email" id="adminEmail" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required className={getInputClass('adminEmail')} />
                    {errors.adminEmail && <p className={errorTextClasses}>{errors.adminEmail}</p>}
                </div>
                <div>
                    <label htmlFor="adminPassword" className={labelClasses}>Contraseña del Administrador</label>
                    <input 
                        type="password" 
                        id="adminPassword" 
                        name="adminPassword" 
                        value={formData.adminPassword} 
                        onChange={handleChange} 
                        required 
                        minLength={8}
                        className={getInputClass('adminPassword')} 
                    />
                    {errors.adminPassword ? (
                        <p className={errorTextClasses}>{errors.adminPassword}</p>
                    ) : (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mínimo 8 caracteres.</p>
                    )}
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Creando...' : 'Crear Tenant'}
                </Button>
            </div>
        </form>
    );
};

export default NewTenantForm;