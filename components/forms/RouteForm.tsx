import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.ts';
import { Route, Profile, Role } from '../../types.ts';
import Button from '../ui/Button.tsx';
import useAuth from '../../hooks/useAuth.ts';

interface RouteFormProps {
    route: Route | null;
    onSave: (routeData: Partial<Route>) => void;
    onClose: () => void;
    isSaving: boolean;
}

const RouteForm: React.FC<RouteFormProps> = ({ route, onSave, onClose, isSaving }) => {
    const { profile } = useAuth();
    const [name, setName] = useState('');
    const [employee_id, setEmployeeId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Profile[]>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!profile) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .or(`role.eq.${Role.EMPLOYEE},role.eq.${Role.ADMIN}`);
            if (error) console.error(error);
            else setEmployees(data || []);
        };
        fetchEmployees();

        if (route) {
            setName(route.name);
            setEmployeeId(route.employee_id);
        } else {
            setName('');
            setEmployeeId(null);
        }
        setErrors({});
    }, [route, profile]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) {
            newErrors.name = 'El nombre de la ruta es obligatorio.';
        } else if (!/^[a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚüÜ']+$/.test(name)) {
            newErrors.name = 'El nombre solo puede contener letras, números y espacios.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        if (errors.name) {
            setErrors({});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        
        if (validate()) {
            onSave({
                id: route?.id,
                name,
                employee_id,
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
                    <label htmlFor="name" className={labelClasses}>Nombre de la Ruta</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={handleChange}
                        required
                        maxLength={100}
                        className={getInputClass('name')}
                    />
                    {errors.name && <p className={errorTextClasses}>{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="employee_id" className={labelClasses}>Asignar Empleado</label>
                    <select
                        id="employee_id"
                        value={employee_id || ''}
                        onChange={e => setEmployeeId(e.target.value || null)}
                        className={baseInputClasses}
                    >
                        <option value="">Sin asignar</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
            </fieldset>
            
            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Ruta'}
                </Button>
            </div>
        </form>
    );
};

export default RouteForm;