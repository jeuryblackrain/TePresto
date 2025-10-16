import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, User, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';
import Button from '../components/ui/Button.tsx';

const RegisterPage: React.FC = () => {
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setLoading(false);
            return;
        }

        // The `handle_new_user` trigger in the database handles tenant and profile creation.
        // We pass the required info in the `options.data` field during sign-up.
        // For a new registration from this page, the user is always an 'admin' of a new company.
        // FIX: Use Supabase v2 `signUp` syntax, where options is nested inside the first argument.
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                    company_name: companyName,
                    role: 'admin',
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                }
            }
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message || 'Ocurrió un error durante el registro. El email puede que ya esté en uso.');
        } else {
            setSuccessMessage('¡Registro exitoso! Por favor, revise su correo electrónico para confirmar su cuenta y finalizar la configuración.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-800">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
                <div className="text-center">
                    <div className="flex justify-center mx-auto mb-4">
                        <Building className="w-12 h-12 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crear una Cuenta Nueva</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Únase a Prestamos Diarios SRL</p>
                </div>

                {successMessage ? (
                    <div className="text-center p-4 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg">
                        <p>{successMessage}</p>
                        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 mt-4 inline-block">
                            Volver a Iniciar Sesión
                        </Link>
                    </div>
                ) : (
                    <>
                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                             <div className="relative">
                                <User className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2"/>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    placeholder="Su Nombre Completo"
                                />
                            </div>
                             <div className="relative">
                                <Building className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2"/>
                                <input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    autoComplete="organization"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    placeholder="Nombre de la Empresa"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2"/>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    placeholder="Email"
                                />
                            </div>
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
                                    placeholder="Contraseña"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-red-600 text-center">
                                    {error}
                                </div>
                            )}

                            <div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Registrando...' : 'Registrarse'}
                                </Button>
                            </div>
                        </form>
                        <div className="text-center text-sm pt-4">
                            <p className="text-gray-600 dark:text-gray-400">
                                ¿Ya tiene una cuenta?{' '}
                                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                                    Inicie sesión
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RegisterPage;
