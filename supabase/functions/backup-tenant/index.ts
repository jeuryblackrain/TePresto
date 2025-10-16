// supabase/functions/backup-tenant/index.ts
// FIX: Add Deno namespace declaration to resolve "Cannot find name 'Deno'" error.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { tenantId } = await req.json()
    if (!tenantId) throw new Error("Tenant ID is required.")

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all data related to the tenant in parallel
    const [profiles, clients, routes, loans, loan_schedules, payments] = await Promise.all([
      adminClient.from('profiles').select('*').eq('tenant_id', tenantId),
      adminClient.from('clients').select('*').eq('tenant_id', tenantId),
      adminClient.from('routes').select('*').eq('tenant_id', tenantId),
      adminClient.from('loans').select('*').eq('tenant_id', tenantId),
      adminClient.from('loan_schedules').select('*').eq('tenant_id', tenantId),
      adminClient.from('payments').select('*').eq('tenant_id', tenantId),
    ])
    
    const backup = {
      profiles: profiles.data,
      clients: clients.data,
      routes: routes.data,
      loans: loans.data,
      loan_schedules: loan_schedules.data,
      payments: payments.data,
    };

    return new Response(JSON.stringify({ backup }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
