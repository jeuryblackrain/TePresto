import React, { useState } from 'react';
import Button from '../ui/Button.tsx';

interface ResetPasswordFormProps {
    onSave: (password: string) => void;
    onClose: () => void;
    isSaving: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSave, onClose, isSaving }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!newPassword) {
            newErrors.newPassword = 'La nueva contraseña es obligatoria.';
        } else if (newPassword.length < 6) {
            newErrors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres.';
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        if (validate()) {
            onSave(newPassword);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'newPassword') setNewPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);

        // Clear errors as user types
        if (errors[name] || errors.confirmPassword) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                delete newErrors.confirmPassword;
                return newErrors;
            });
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
                    <label htmlFor="newPassword" className={labelClasses}>Nueva Contraseña</label>
                    <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={newPassword}
                        onChange={handleChange}
                        required
                        className={getInputClass('newPassword')}
                    />
                    {errors.newPassword && <p className={errorTextClasses}>{errors.newPassword}</p>}
                </div>
                <div>
                    <label htmlFor="confirmPassword" className={labelClasses}>Confirmar Nueva Contraseña</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={handleChange}
                        required
                        className={getInputClass('confirmPassword')}
                    />
                    {errors.confirmPassword && <p className={errorTextClasses}>{errors.confirmPassword}</p>}
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Establecer Contraseña'}
                </Button>
            </div>
        </form>
    );
};

export default ResetPasswordForm;
