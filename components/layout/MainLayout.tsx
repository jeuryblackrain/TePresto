import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';
import ToastContainer from '../ui/ToastContainer.tsx';

const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // Prevent body scroll when mobile sidebar is open for a better user experience.
        if (isSidebarOpen && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup function to restore scrolling when the component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isSidebarOpen]);

    return (
        <>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">
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