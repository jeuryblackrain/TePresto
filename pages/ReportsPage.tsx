
import React, { useState } from 'react';
import GeneralSummary from '../components/reports/GeneralSummary.tsx';
import EmployeeReport from '../components/reports/EmployeeReport.tsx';
import RouteReport from '../components/reports/RouteReport.tsx';
import PaymentsReport from '../components/reports/PaymentsReport.tsx';
import CashReport from '../components/reports/CashReport.tsx';
import useAuth from '../hooks/useAuth.ts';
import { Role } from '../types.ts';

type ReportTab = 'summary' | 'employee' | 'route' | 'payments' | 'cash';

const ReportsPage: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportTab>('summary');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'summary':
                return <GeneralSummary />;
            case 'employee':
                return profile?.role === Role.ADMIN ? <EmployeeReport /> : null;
            case 'route':
                return profile?.role === Role.ADMIN ? <RouteReport /> : null;
            case 'payments':
                return <PaymentsReport />;
            case 'cash':
                return <CashReport />;
            default:
                return null;
        }
    };

    const getTabClass = (tabName: ReportTab) => {
        return `px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200 focus:outline-none ${
            activeTab === tabName
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-700/50'
        }`;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Reportes</h1>
            
            <div className="mb-6 overflow-x-auto">
                <div className="border-b border-gray-200 dark:border-gray-700 min-w-max">
                    <nav className="-mb-px flex space-x-4 pb-2" aria-label="Tabs">
                        <button onClick={() => setActiveTab('summary')} className={getTabClass('summary')}>
                            Resumen General
                        </button>
                        {profile?.role === Role.ADMIN && (
                            <>
                                <button onClick={() => setActiveTab('employee')} className={getTabClass('employee')}>
                                    Por Empleado
                                </button>
                                <button onClick={() => setActiveTab('route')} className={getTabClass('route')}>
                                    Por Ruta
                                </button>
                            </>
                        )}
                        <button onClick={() => setActiveTab('payments')} className={getTabClass('payments')}>
                            Pagos
                        </button>
                         <button onClick={() => setActiveTab('cash')} className={getTabClass('cash')}>
                            Cierre de Caja
                        </button>
                    </nav>
                </div>
            </div>

            <div>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ReportsPage;
