import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, HandCoins, FileText, UserCog, Building, Users, Map, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth.ts';
import { Role } from '../../types.ts';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const { profile } = useAuth();

    const commonLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/loans', icon: HandCoins, label: 'Préstamos' },
        { to: '/clients', icon: Users, label: 'Clientes' },
        { to: '/routes', icon: Map, label: 'Rutas' },
        { to: '/reports', icon: FileText, label: 'Reportes' },
    ];

    const adminLinks = [
        { to: '/admin', icon: UserCog, label: 'Admin' },
    ];
    
    const activeLinkClass = "flex items-center px-4 py-2 text-white bg-primary-700 rounded-lg";
    const inactiveLinkClass = "flex items-center px-4 py-2 text-gray-200 hover:bg-primary-800 hover:text-white rounded-lg transition-colors duration-200";

    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => isActive ? activeLinkClass : inactiveLinkClass;

    const handleLinkClick = () => {
        if (window.innerWidth < 768) { // md breakpoint
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>

            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-900 text-white flex flex-col transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-20 flex items-center justify-between px-4 border-b border-primary-800">
                     <div className="flex items-center">
                        <Building className="h-8 w-8 mr-3 text-primary-300" />
                        <span className="text-lg font-semibold">Prestamos Diarios SRL</span>
                     </div>
                     <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-300 hover:text-white">
                         <X className="h-6 w-6"/>
                     </button>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    {commonLinks.map(link => (
                        <NavLink key={link.to} to={link.to} className={getNavLinkClass} onClick={handleLinkClick}>
                            <link.icon className="h-5 w-5 mr-3" />
                            {link.label}
                        </NavLink>
                    ))}
                    {profile?.role === Role.ADMIN && adminLinks.map(link => (
                         <NavLink key={link.to} to={link.to} className={getNavLinkClass} onClick={handleLinkClick}>
                            <link.icon className="h-5 w-5 mr-3" />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;