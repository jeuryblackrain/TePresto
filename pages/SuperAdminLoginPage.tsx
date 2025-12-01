
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import Button from '../components/ui/Button.tsx';
import { supabase } from '../lib/supabaseClient.ts';

const SuperAdminLoginPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // SECURE METHOD: Verify password via Edge Function
            const { data, error: funcError } = await supabase.functions.invoke('verify-super-admin', {
                body: { password }
            });

            if (funcError) {
                // If function fails (e.g. not deployed), fall back to environment variable check for dev continuity
                console.warn("Edge function check failed, falling back to local env check:", funcError);
                const localPass = (import.meta as any).env.VITE_SUPER_ADMIN_PASSWORD;
                if (localPass && password === localPass) {
                    sessionStorage.setItem('superAdminAuth', 'true');
                    navigate('/superadmin/dashboard');
                    return;
                }
                throw new Error('Contraseña incorrecta o error de verificación.');
            }

            if (data && data.success) {
                sessionStorage.setItem('superAdminAuth', 'true');
                navigate('/superadmin/dashboard');
            } else {
                setError('Contraseña incorrecta.');
            }
        } catch (err: any) {
            setError(err.message || 'Error al verificar credenciales.');
        } finally {
            setLoading(false);
        }
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
                            maxLength={20}
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
