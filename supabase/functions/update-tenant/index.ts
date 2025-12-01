
// supabase/functions/update-tenant/index.ts
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
    const { tenantId, max_loans, max_users, subscription_end_date, status } = await req.json()
    if (!tenantId) throw new Error("Tenant ID is required.")

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const updateData: any = {};
    if (max_loans !== undefined) updateData.max_loans = max_loans;
    if (max_users !== undefined) updateData.max_users = max_users;
    if (subscription_end_date !== undefined) updateData.subscription_end_date = subscription_end_date;
    if (status !== undefined) updateData.status = status;

    const { error } = await adminClient
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId);

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Tenant updated successfully." }), {
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
