
import React from 'react';
import Modal from './Modal.tsx';
import Button from './Button.tsx';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, isConfirming = false }) => {
    if (!isOpen) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <div className="mt-2">
                        <p className="text-sm text-gray-500">{message}</p>
                    </div>
                </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Button variant="danger" onClick={onConfirm} className="w-full sm:w-auto sm:ml-3" disabled={isConfirming}>
                    {isConfirming ? 'Confirmando...' : 'Confirmar'}
                </Button>
                <Button variant="secondary" onClick={onClose} className="mt-3 w-full sm:mt-0 sm:w-auto" disabled={isConfirming}>
                    Cancelar
                </Button>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
