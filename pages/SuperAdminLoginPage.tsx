import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import Button from '../components/ui/Button.tsx';

const SuperAdminLoginPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // This is a simple client-side check. For higher security, this check could
        // be moved to a dedicated serverless function.
        const superAdminPassword = (import.meta as any).env.VITE_SUPER_ADMIN_PASSWORD;

        if (!superAdminPassword) {
             setError('La contraseña de Super Admin no está configurada en el entorno.');
             setLoading(false);
             return;
        }

        if (password === superAdminPassword) {
            // Set a flag in session storage to mark as authenticated
            sessionStorage.setItem('superAdminAuth', 'true');
            navigate('/superadmin/dashboard');
        } else {
            setError('Contraseña incorrecta.');
        }
        
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-800">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
                <div className="text-center">
                    <div className="flex justify-center mx-auto mb-4">
                        <Shield className="w-12 h-12 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Panel</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Acceso de Administrador del Sistema</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2"/>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            placeholder="Contraseña Maestra"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 text-center">
                            {error}
                        </div>

                    )}

                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Verificando...' : 'Acceder'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminLoginPage;