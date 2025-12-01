
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';
import ToastContainer from '../ui/ToastContainer.tsx';
import { supabase } from '../../lib/supabaseClient.ts';
import { Announcement } from '../../types.ts';
import { Megaphone, X, Lock } from 'lucide-react';
import useAuth from '../../hooks/useAuth.ts';

const MainLayout: React.FC = () => {
    const { isReadOnly, tenant } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Prevent body scroll when mobile sidebar is open for a better user experience.
        if (isSidebarOpen && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isSidebarOpen]);

    // Fetch active announcement
    useEffect(() => {
        const fetchAnnouncement = async () => {
            // We use maybeSingle because there might be multiple, we just take the latest one active
            const { data } = await supabase
                .from('system_announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (data) {
                setAnnouncement(data as Announcement);
            }
        };
        fetchAnnouncement();
    }, []);

    const bannerColors = {
        info: 'bg-blue-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600'
    };

    return (
        <>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Read Only Warning Banner */}
                    {isReadOnly && (
                        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center shadow-md relative z-50">
                            <Lock className="h-5 w-5 mr-2" />
                            <div className="font-medium text-sm text-center">
                                {tenant?.status === 'suspended' 
                                    ? 'Esta cuenta ha sido suspendida. El sistema está en modo solo lectura.'
                                    : 'Su suscripción ha vencido. El sistema está en modo solo lectura.'
                                }
                                <span className="hidden sm:inline ml-1">Contacte al soporte para restaurar el acceso completo.</span>
                            </div>
                        </div>
                    )}

                    {/* System Announcement Banner */}
                    {announcement && !dismissed && (
                        <div className={`${bannerColors[announcement.type]} text-white px-4 py-2 flex items-center justify-between shadow-md relative z-40`}>
                            <div className="flex items-center text-sm font-medium">
                                <Megaphone className="h-4 w-4 mr-2 animate-pulse" />
                                <span>{announcement.message}</span>
                            </div>
                            <button 
                                onClick={() => setDismissed(true)}
                                className="text-white/80 hover:text-white focus:outline-none"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    
                    <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-800">
                        <div className="container mx-auto px-4 sm:px-6 py-8">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
            <ToastContainer />
        </>
    );
};

export default MainLayout;