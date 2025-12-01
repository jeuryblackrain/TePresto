
// supabase/functions/verify-super-admin/index.ts
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password } = await req.json()
    // NOTE: You must set SUPER_ADMIN_PASSWORD in your Supabase project secrets
    const correctPassword = Deno.env.get('SUPER_ADMIN_PASSWORD')

    if (!correctPassword) {
        console.error('SUPER_ADMIN_PASSWORD is not set in backend environment.');
        // Fallback for development if not set, but warn
        throw new Error('Server configuration error: Password secret missing.');
    }

    if (password === correctPassword) {
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } else {
        // Sleep to prevent timing attacks / brute force speed
        await new Promise(r => setTimeout(r, 500));
        return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
