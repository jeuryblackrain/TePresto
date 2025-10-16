import { createClient } from '@supabase/supabase-js';

// =================================================================================
// This file is configured to use environment variables for security.
// Create a file named .env in the root of your project and add your keys there:
// VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
// VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
// =================================================================================
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
// =================================================================================

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = "Configuration Error: Supabase URL and Anon Key are missing. Please create a .env file with your project credentials.";
    
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `<div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff1f2; color: #9f1239; border: 1px solid #fecaca;">
            <h1 style="font-size: 1.5rem; font-weight: bold;">Configuration Error</h1>
            <p>${errorMessage}</p>
        </div>`;
    }
    throw new Error(errorMessage);
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);