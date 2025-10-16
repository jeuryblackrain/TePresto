import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Menu, Sun, Moon, Laptop, KeyRound } from 'lucide-react';
import useAuth from '../../hooks/useAuth.ts';
import { useTheme } from '../../hooks/useTheme.ts';
import Modal from '../ui/Modal.tsx';
import ChangePasswordForm from '../forms/ChangePasswordForm.tsx';
import { useToast } from '../../hooks/useToast.ts';
import { supabase } from '../../lib/supabaseClient.ts';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { profile, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleUpdatePassword = async (passwords: { oldPassword: string, newPassword: string }) => {
        setIsSaving(true);
        const { error } = await supabase.functions.invoke('change-password', {
            body: {
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword,
            },
        });
        setIsSaving(false);

        if (error) {
            addToast(`Error al cambiar la contraseña: ${error.message}`, 'error');
        } else {
            addToast('Contraseña actualizada exitosamente.', 'success');
            setIsChangePasswordModalOpen(false);
        }
    };

    const handleLogout = async () => {
        setDropdownOpen(false);
        addToast('Cerrando sesión...', 'info');
        const { error } = await signOut();
        if (error) {
            addToast(`Error al cerrar sesión: ${error.message}`, 'error');
        } else {
            // Explicitly navigate to ensure the user is moved to the login page.
            navigate('/login');
        }
    };

    if (!profile) return null;

    return (
        <>
            <header className="h-20 flex items-center justify-between md:justify-end px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                 <button onClick={onMenuClick} className="md:hidden text-gray-500 dark:text-gray-300 focus:outline-none">
                    <Menu className="h-6 w-6" />
                </button>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center space-x-3 focus:outline-none"
                    >
                        <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={profile.avatar_url}
                            alt="User avatar"
                        />
                        <div className="text-left hidden md:block">
                            <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">{profile.name}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 capitalize">{profile.role}</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div
                        className={`absolute right-0 mt-2 w-56 bg-white rounded-md shadow-xl z-20 dark:bg-gray-800 overflow-hidden transition-all duration-200 ease-out origin-top-right transform
                        ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                    >
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={profile.name}>
                                {profile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={profile.email}>
                                {profile.email}
                            </p>
                        </div>
                        <div className="border-b border-gray-200 dark:border-gray-700 py-1">
                            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500">Tema</p>
                            <div className="flex justify-around px-2 py-1">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-100' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title="Light Mode"
                                >
                                    <Sun className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-primary-900 text-primary-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title="Dark Mode"
                                >
                                    <Moon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title="System Default"
                                >
                                    <Laptop className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    setDropdownOpen(false);
                                    setIsChangePasswordModalOpen(true);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white flex items-center transition-colors"
                                disabled={!dropdownOpen}
                            >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Cambiar Contraseña
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-500 hover:text-white flex items-center transition-colors"
                                disabled={!dropdownOpen}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <Modal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setIsChangePasswordModalOpen(false)}
                title="Cambiar Contraseña"
            >
                <ChangePasswordForm
                    onSave={handleUpdatePassword}
                    onClose={() => setIsChangePasswordModalOpen(false)}
                    isSaving={isSaving}
                />
            </Modal>
        </>
    );
};

export default Header;