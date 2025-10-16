
import React, { useState, useEffect } from 'react';
import { Profile, Role } from '../../types.ts';
import Button from '../ui/Button.tsx';

interface EmployeeFormProps {
    employee: Profile | null;
    onSave: (employeeData: Partial<Profile>, password?: string) => void;
    onClose: () => void;
    isSaving: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: Role.EMPLOYEE,
        password: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const isNew = !employee;

    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name || '',
                email: employee.email || '',
                role: employee.role || Role.EMPLOYEE,
                password: '',
            });
        } else {
            setFormData({
                name: '',
                email: '',
                role: Role.EMPLOYEE,
                password: '',
            });
        }
        setErrors({});
    }, [employee]);
    
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        const { name, email, password } = formData;

        if (!name.trim()) {
            newErrors.name = 'El nombre es obligatorio.';
        } else if (!/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ']+$/.test(name)) {
            newErrors.name = 'El nombre solo puede contener letras y espacios.';
        }

        if (!email.trim()) {
            newErrors.email = 'El email es obligatorio.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Por favor, introduzca un correo electrónico válido.';
        }

        if (isNew) {
            if (!password) {
                newErrors.password = 'La contraseña es obligatoria.';
            } else if (password.length < 6) {
                newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        if (isSaving) return;
        
        if (validate()) {
            const employeeData: Partial<Profile> = {
                id: employee?.id,
                name: formData.name,
                email: formData.email,
                role: formData.role,
            };
            onSave(employeeData, isNew ? formData.password : undefined);
        }
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
                    <label htmlFor="name" className={labelClasses}>Nombre</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        maxLength={100}
                        className={getInputClass('name')}
                    />
                     {errors.name && <p className={errorTextClasses}>{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="email" className={labelClasses}>Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={!isNew}
                        maxLength={255}
                        className={`${getInputClass('email')} disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
                    />
                    {errors.email && <p className={errorTextClasses}>{errors.email}</p>}
                </div>
                {isNew && (
                    <div>
                        <label htmlFor="password" className={labelClasses}>Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className={getInputClass('password')}
                        />
                         {errors.password && <p className={errorTextClasses}>{errors.password}</p>}
                    </div>
                )}
                <div>
                    <label htmlFor="role" className={labelClasses}>Rol</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={`${baseInputClasses} disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed`}
                        disabled={isNew}
                    >
                        <option value={Role.EMPLOYEE}>Empleado</option>
                        {!isNew && <option value={Role.ADMIN}>Admin</option>}
                    </select>
                    {isNew && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Los nuevos usuarios se crean como 'Empleado'. El rol se puede cambiar después.
                        </p>
                    )}
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
            </div>
        </form>
    );
};

export default EmployeeForm;
