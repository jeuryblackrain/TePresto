
import { GoogleGenAI, Type } from "@google/genai";
import { Loan, Client, Profile, Payment, LoanSchedule, ScheduleStatus } from '../types.ts';

// Lazy initialization holder
let aiInstance: GoogleGenAI | null = null;

// Function to get or create the AI instance securely
const getAiClient = () => {
    if (!aiInstance) {
        // Fallback to import.meta.env for Vite if process.env.API_KEY is empty (though vite.config.js should map it)
        const apiKey = process.env.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
            console.warn("Gemini API Key is missing. AI features will not work.");
            throw new Error("API Key no configurada.");
        }
        
        // Initialize strictly using the guidelines
        aiInstance = new GoogleGenAI({ apiKey: apiKey });
    }
    return aiInstance;
};

interface ReportData {
    loans: Loan[];
    clients: Client[];
    employees: Profile[];
    payments: Payment[];
}

type LoanWithSchedules = Loan & {
    loan_schedules: LoanSchedule[];
};

interface RiskAnalysisResult {
    risk_level: 'Bajo' | 'Medio' | 'Alto';
    summary: string;
}

/**
 * Generates a summary of the provided report data using the Gemini API.
 * @param data The report data.
 * @returns A string containing the generated summary.
 */
export const generateReportSummary = async (data: ReportData): Promise<string> => {
    try {
        const ai = getAiClient();
        
        const totalLoanAmount = data.loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
        const totalPaymentsAmount = data.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        
        const prompt = `
            Eres un analista financiero experto. A continuación se presentan datos de una empresa de préstamos.
            Resume el estado actual del negocio en un párrafo conciso y amigable.
            Incluye el número total de préstamos, el monto total prestado y el total de pagos recibidos.
            Menciona el número de clientes activos.

            Datos Clave:
            - ${data.loans.length} préstamos en total.
            - ${data.clients.length} clientes en total.
            - ${data.employees.length} empleados.
            - ${data.payments.length} pagos registrados.
            - Monto total prestado: ${totalLoanAmount.toFixed(2)}
            - Monto total en pagos recibidos: ${totalPaymentsAmount.toFixed(2)}

            Por favor, genera un resumen en español, usando un tono profesional pero fácil de entender.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text || "No se pudo generar el texto.";

    } catch (error) {
        console.error("Error generating report summary with Gemini:", error);
        if (error instanceof Error) {
            return `Error al generar el resumen con IA: ${error.message}`;
        }
        return "Ocurrió un error inesperado al generar el resumen con IA.";
    }
};


/**
 * Analyzes a client's loan history to determine their risk profile.
 * @param client The client to analyze.
 * @param loans The client's loans, including their schedules.
 * @returns A structured risk analysis object.
 */
export const generateClientRiskAnalysis = async (client: Client, loans: LoanWithSchedules[]): Promise<RiskAnalysisResult> => {
    if (loans.length === 0) {
        return {
            risk_level: 'Bajo',
            summary: 'El cliente no tiene historial de préstamos, por lo que el riesgo no puede ser evaluado. Proceder con precaución estándar.'
        };
    }

    try {
        const ai = getAiClient();

        const historySummary = loans.map(loan => {
            const paidInstallments = loan.loan_schedules.filter(s => s.status === ScheduleStatus.PAGADO);
            const overdueInstallments = loan.loan_schedules.filter(s => s.status === ScheduleStatus.VENCIDO);
            
            const onTimePayments = paidInstallments.filter(s => s.payment_date && new Date(s.payment_date) <= new Date(s.due_date)).length;
            const latePayments = paidInstallments.length - onTimePayments;

            return `- Préstamo de ${loan.amount} con estado ${loan.status}. ${loan.loan_schedules.length} cuotas en total.
              - Cuotas pagadas: ${paidInstallments.length}.
              - Cuotas vencidas actualmente: ${overdueInstallments.length}.
              - De las pagadas, ${onTimePayments} fueron a tiempo y ${latePayments} fueron con retraso.`;
        }).join('\n');

        const prompt = `
            Analiza el siguiente historial de préstamos para el cliente "${client.name}" y determina su nivel de riesgo para un nuevo préstamo.

            Historial del Cliente:
            ${historySummary}

            Basado en este historial, evalúa lo siguiente:
            1.  Puntualidad de los pagos (¿Paga a tiempo, con retraso?).
            2.  Historial de finalización de préstamos (¿Ha pagado préstamos completos?).
            3.  Situación actual (¿Tiene préstamos atrasados en este momento?).

            Concluye con un nivel de riesgo ("Bajo", "Medio", "Alto") y un resumen conciso de tu razonamiento.
            El resumen debe tener entre 25 y 40 palabras.

            Formato de respuesta JSON requerido:
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        risk_level: {
                            type: Type.STRING,
                            description: 'El nivel de riesgo, que puede ser "Bajo", "Medio", o "Alto".'
                        },
                        summary: {
                            type: Type.STRING,
                            description: 'Un resumen conciso explicando el porqué del nivel de riesgo asignado.'
                        }
                    },
                    required: ['risk_level', 'summary']
                },
            }
        });
        
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response from AI");
        
        return JSON.parse(jsonText) as RiskAnalysisResult;

    } catch (error) {
        console.error("Error generating client risk analysis with Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Error al generar el análisis con IA: ${error.message}`);
        }
        throw new Error("Ocurrió un error inesperado al generar el análisis con IA.");
    }
};
