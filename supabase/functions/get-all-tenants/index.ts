// supabase/functions/get-all-tenants/index.ts
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
    // Create an admin client to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 1. Fetch all tenants
    const { data: tenants, error: tenantsError } = await adminClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (tenantsError) throw tenantsError;

    // 2. Fetch the admin email for each tenant
    const tenantsWithAdminEmail = await Promise.all(
        tenants.map(async (tenant) => {
            const { data: adminProfile, error: profileError } = await adminClient
                .from('profiles')
                .select('email')
                .eq('tenant_id', tenant.id)
                .eq('role', 'admin')
                .single();

            return {
                ...tenant,
                admin_email: profileError ? null : adminProfile?.email,
            };
        })
    );

    return new Response(JSON.stringify({ tenants: tenantsWithAdminEmail }), {
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