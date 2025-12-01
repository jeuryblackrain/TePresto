
import React from 'react';
import Button from './Button.tsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalCount, pageSize, onPageChange }) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> a <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> de{' '}
                        <span className="font-medium">{totalCount}</span> resultados
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                            variant="secondary"
                            className="rounded-l-md rounded-r-none"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Anterior</span>
                        </Button>
                        <Button
                             variant="secondary"
                             className="rounded-r-md rounded-l-none border-l-0"
                             onClick={() => onPageChange(currentPage + 1)}
                             disabled={currentPage === totalPages}
                        >
                            <span className="sr-only">Siguiente</span>
                             <ChevronRight className="h-4 w-4" />
                        </Button>
                    </nav>
                </div>
            </div>
             {/* Mobile View */}
            <div className="flex items-center justify-between w-full sm:hidden">
                 <Button
                    variant="secondary"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    size="sm"
                >
                    Anterior
                </Button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    Pág. {currentPage} / {totalPages}
                </span>
                <Button
                     variant="secondary"
                     onClick={() => onPageChange(currentPage + 1)}
                     disabled={currentPage === totalPages}
                     size="sm"
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
};

export default Pagination;
