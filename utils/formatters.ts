
/**
 * Formats a number as a currency string (e.g., USD).
 * @param value The number to format.
 * @returns A formatted currency string, or a formatted zero for invalid input.
 */
export const formatCurrency = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        // Using 'en-US' and 'USD' as per mock app settings.
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(0);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

/**
 * Formats a date string into a localized format (dd/mm/yyyy).
 * Handles timezone issues by parsing date parts as local.
 * @param dateString The ISO date string (e.g., "2023-10-01").
 * @returns A formatted date string, or an empty string for invalid input.
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '';
    }
    try {
        // Create date in local timezone by splitting parts to avoid UTC conversion.
        // Supabase date columns return 'YYYY-MM-DD'.
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        if (!year || !month || !day) return dateString;

        const date = new Date(year, month - 1, day);
        
        // Using 'es-ES' for dd/mm/yyyy format as seen in Spanish text in the app.
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch (error) {
        console.error("Invalid date string for formatDate:", dateString, error);
        return dateString; // Return original string if formatting fails
    }
};
