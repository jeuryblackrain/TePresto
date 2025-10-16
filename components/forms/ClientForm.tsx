import React, { useState, useEffect } from 'react';
import { Client } from '../../types.ts';
import Button from '../ui/Button.tsx';

interface ClientFormProps {
    client: Client | null;
    onSave: (clientData: Partial<Client>) => void;
    onClose: () => void;
    isSaving: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onClose, isSaving }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        id_document: '',
        occupation: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                phone: client.phone || '',
                address: client.address || '',
                id_document: client.id_document || '',
                occupation: client.occupation || '',
            });
        } else {
             setFormData({
                name: '',
                phone: '',
                address: '',
                id_document: '',
                occupation: '',
            });
        }
        setErrors({}); // Clear errors when client data changes
    }, [client]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es obligatorio.';
        } else if (!/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ']+$/.test(formData.name)) {
            newErrors.name = 'El nombre solo puede contener letras y espacios.';
        }

        // Phone validation for Dominican format
        if (!formData.phone.trim()) {
            newErrors.phone = 'El teléfono es obligatorio.';
        } else if (!/^\d{3}-\d{3}-\d{4}$/.test(formData.phone)) {
            newErrors.phone = 'El teléfono debe tener el formato 000-000-0000.';
        }

        // Address validation
        if (!formData.address.trim()) {
            newErrors.address = 'La dirección es obligatoria.';
        }
        
        // ID document validation for Dominican Cédula format
        if (formData.id_document && !/^\d{3}-\d{7}-\d{1}$/.test(formData.id_document)) {
             newErrors.id_document = 'La cédula debe tener el formato 000-0000000-0.';
        }
        
        // Occupation validation
        if (formData.occupation && !/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚüÜ']+$/.test(formData.occupation)) {
            newErrors.occupation = 'La ocupación solo puede contener letras y espacios.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        
        if (validate()) {
            onSave({
                id: client?.id,
                ...formData,
            });
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'id_document') {
            const input = value.replace(/\D/g, ''); // Remove all non-digit characters
            let formatted = '';
            if (input.length > 0) {
                formatted = input.substring(0, 3);
            }
            if (input.length > 3) {
                formatted += '-' + input.substring(3, 10);
            }
            if (input.length > 10) {
                formatted += '-' + input.substring(10, 11);
            }
            formattedValue = formatted;
        }

        if (name === 'phone') {
            const input = value.replace(/\D/g, ''); // Remove all non-digit characters
            let formatted = '';
            if (input.length > 0) {
                formatted = input.substring(0, 3);
            }
            if (input.length > 3) {
                formatted += '-' + input.substring(3, 6);
            }
            if (input.length > 6) {
                formatted += '-' + input.substring(6, 10);
            }
            formattedValue = formatted;
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const inputClasses = "mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const errorInputClasses = "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500";
    const errorTextClasses = "mt-1 text-xs text-red-600 dark:text-red-400";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset disabled={isSaving}>
                <div>
                    <label htmlFor="name" className={labelClasses}>Nombre Completo</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        maxLength={100}
                        className={`${inputClasses} ${errors.name ? errorInputClasses : ''}`}
                    />
                    {errors.name && <p className={errorTextClasses}>{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="id_document" className={labelClasses}>Cédula / ID</label>
                        <input
                            type="text"
                            id="id_document"
                            name="id_document"
                            value={formData.id_document}
                            onChange={handleChange}
                            maxLength={13}
                            placeholder="000-0000000-0"
                            className={`${inputClasses} ${errors.id_document ? errorInputClasses : ''}`}
                        />
                         {errors.id_document && <p className={errorTextClasses}>{errors.id_document}</p>}
                    </div>
                    <div>
                        <label htmlFor="phone" className={labelClasses}>Teléfono</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            maxLength={12}
                            placeholder="000-000-0000"
                            className={`${inputClasses} ${errors.phone ? errorInputClasses : ''}`}
                        />
                        {errors.phone && <p className={errorTextClasses}>{errors.phone}</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="occupation" className={labelClasses}>Ocupación</label>
                    <input
                        type="text"
                        id="occupation"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleChange}
                        maxLength={100}
                        className={`${inputClasses} ${errors.occupation ? errorInputClasses : ''}`}
                    />
                    {errors.occupation && <p className={errorTextClasses}>{errors.occupation}</p>}
                </div>
                <div>
                    <label htmlFor="address" className={labelClasses}>Dirección</label>
                    <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        rows={3}
                        maxLength={255}
                        className={`${inputClasses} ${errors.address ? errorInputClasses : ''}`}
                    />
                    {errors.address && <p className={errorTextClasses}>{errors.address}</p>}
                </div>
            </fieldset>

            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cliente'}
                </Button>
            </div>
        </form>
    );
};

export default ClientForm;