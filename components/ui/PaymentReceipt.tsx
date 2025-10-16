import React from 'react';
import { Payment, Loan, Client } from '../../types.ts';
import Button from './Button.tsx';
import { formatCurrency, formatDate } from '../../utils/formatters.ts';
import { useToast } from '../../hooks/useToast.ts';

// FIX: Add minimal TypeScript definitions for the Web Bluetooth API to resolve "Property 'bluetooth' does not exist on type 'Navigator'" and "Cannot find name 'BluetoothRemoteGATTCharacteristic'" errors.
interface BluetoothRemoteGATTCharacteristic {
    readonly properties: {
        readonly write: boolean;
        readonly writeWithoutResponse: boolean;
    };
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
}
interface BluetoothRemoteGATTService {
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}
interface BluetoothRemoteGATTServer {
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}
interface BluetoothDevice {
    readonly gatt?: BluetoothRemoteGATTServer;
    readonly name?: string;
}

declare global {
    interface Navigator {
        bluetooth: {
            requestDevice(options?: any): Promise<BluetoothDevice>;
        };
    }
}


interface PaymentReceiptProps {
    payment: Payment;
    loan: Loan;
    client: Client;
    tenantName: string;
    onClose: () => void;
    receiptContext: {
        employeeName?: string;
        remainingBalance?: number;
        installment_number?: number;
        isSettlement?: boolean;
    }
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ payment, loan, client, tenantName, onClose, receiptContext }) => {
    const { addToast } = useToast();

    const handlePrint = () => {
        window.print();
    };

    const generateReceiptText = (): string => {
        const lines = [];
        const divider = '--------------------------------';
        
        lines.push('\x1B\x40'); // Initialize printer
        lines.push('\x1B\x61\x01'); // Center alignment
        lines.push(tenantName);
        lines.push('Comprobante de Pago');
        lines.push('\x1B\x61\x00'); // Left alignment
        lines.push(divider);
        lines.push(`Recibo #: ${payment.id.split('-').pop()}`);
        lines.push(`Fecha   : ${formatDate(payment.payment_date)}`);
        lines.push(`Préstamo: ${loan.id.toUpperCase().split('-')[0]}`);
        lines.push(`Cliente : ${client.name}`);
        if (receiptContext.employeeName) {
            lines.push(`Atiende : ${receiptContext.employeeName}`);
        }
        lines.push(divider);
        
        const paymentDescription = receiptContext.isSettlement
            ? 'Pago de Saldo Completo'
            : `Pago Cuota #${receiptContext.installment_number}`;
        const paymentLine = paymentDescription.padEnd(20) + `${formatCurrency(payment.amount)}`.padStart(12);
        lines.push(paymentLine);
        lines.push(divider);

        const totalPaidLine = 'TOTAL PAGADO:'.padEnd(20) + `${formatCurrency(payment.amount)}`.padStart(12);
        lines.push(totalPaidLine);
        
        if (receiptContext.remainingBalance !== undefined && receiptContext.remainingBalance >= 0) {
             const balanceLine = 'Saldo Restante:'.padEnd(20) + `${formatCurrency(receiptContext.remainingBalance)}`.padStart(12);
             lines.push(balanceLine);
        }
        
        lines.push('');
        lines.push('\x1B\x61\x01'); // Center again
        lines.push('¡Gracias por su pago!');
        lines.push('\n\n\n\n');
        lines.push('\x1D\x56\x42\x00'); // Partial cut command

        return lines.join('\n');
    };

    const handleBluetoothPrint = async () => {
        if (!navigator.bluetooth) {
            addToast('Web Bluetooth no es compatible con este navegador.', 'error');
            return;
        }

        try {
            addToast('Buscando impresoras Bluetooth...', 'info');
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] // Common SPP-like service for BLE
            });

            if (!device.gatt) {
                 addToast('No se pudo conectar al servidor GATT del dispositivo.', 'error');
                 return;
            }
            
            addToast(`Conectando a ${device.name}...`, 'info');
            const server = await device.gatt.connect();
            const services = await server.getPrimaryServices();
            
            let writableChar: BluetoothRemoteGATTCharacteristic | null = null;
            // Iterate through services to find one with a writable characteristic
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                const char = characteristics.find(c => c.properties.writeWithoutResponse || c.properties.write);
                if (char) {
                    writableChar = char;
                    break;
                }
            }
            
            if (!writableChar) {
                await server.disconnect();
                throw new Error('No se encontró una característica de escritura en la impresora.');
            }

            const receiptText = generateReceiptText();
            const encoder = new TextEncoder();
            const data = encoder.encode(receiptText);
            
            // Send data in chunks, which is more reliable for Bluetooth LE
            const chunkSize = 20;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                // Use writeValueWithoutResponse for speed if available
                if (writableChar.properties.writeWithoutResponse) {
                    await writableChar.writeValueWithoutResponse(chunk);
                } else {
                    await writableChar.writeValue(chunk);
                }
            }
            
            addToast('Comprobante enviado a la impresora.', 'success');
            
            if (server.connected) {
                server.disconnect();
            }

        } catch (error: any) {
            console.error('Error de Bluetooth:', error);
            if (error.name === 'NotFoundError') {
                addToast('No se seleccionó ninguna impresora.', 'info');
            } else {
                addToast(`Error de Bluetooth: ${error.message}`, 'error');
            }
        }
    };


    const divider = '--------------------------------';

    return (
        <>
            <style>
                {`
                @media print {
                    body {
                        background-color: #fff;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #receipt-printable, #receipt-printable * {
                        visibility: visible;
                    }
                    #receipt-printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 58mm;
                        margin: 0;
                        padding: 2mm;
                        font-size: 10pt;
                        color: #000 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }
                `}
            </style>
            <div id="receipt-printable">
                <div className="font-mono text-xs text-black bg-white p-1">
                    <header className="text-center mb-2">
                        <h1 className="font-bold text-sm">{tenantName}</h1>
                        <p>Comprobante de Pago</p>
                    </header>
                    
                    <p className="text-center text-[10px]">{divider}</p>
                    
                    <section className="space-y-1 my-2">
                        <p>Recibo #: {payment.id.split('-').pop()}</p>
                        <p>Fecha   : {formatDate(payment.payment_date)}</p>
                        <p>Préstamo: {loan.id.toUpperCase().split('-')[0]}</p>
                        <p>Cliente : {client.name}</p>
                        {receiptContext.employeeName && <p>Atiende : {receiptContext.employeeName}</p>}
                    </section>
                    
                    <p className="text-center text-[10px]">{divider}</p>
                    
                    <section className="my-2">
                         <div className="flex justify-between">
                             <span>
                                {receiptContext.isSettlement
                                    ? 'Pago de Saldo Completo'
                                    : `Pago Cuota #${receiptContext.installment_number}`}
                            </span>
                            <span>{formatCurrency(payment.amount)}</span>
                        </div>
                    </section>

                    <p className="text-center text-[10px]">{divider}</p>

                    <section className="space-y-1 my-2">
                        <div className="flex justify-between font-bold">
                            <span>TOTAL PAGADO:</span>
                            <span>{formatCurrency(payment.amount)}</span>
                        </div>
                        {receiptContext.remainingBalance !== undefined && receiptContext.remainingBalance >= 0 && (
                             <div className="flex justify-between">
                                 <span>Saldo Restante:</span>
                                 <span>{formatCurrency(receiptContext.remainingBalance)}</span>
                             </div>
                         )}
                    </section>
                    
                    <footer className="text-center mt-3">
                        <p>¡Gracias por su pago!</p>
                    </footer>
                </div>
            </div>
            <div className="no-print mt-6 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button onClick={handlePrint}>Imprimir Ticket</Button>
                <Button onClick={handleBluetoothPrint} variant="secondary">Imprimir (Bluetooth)</Button>
            </div>
        </>
    );
};

export default PaymentReceipt;