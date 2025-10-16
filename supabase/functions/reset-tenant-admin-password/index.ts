// supabase/functions/reset-tenant-admin-password/index.ts
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
    const { tenantId, newPassword } = await req.json()
    if (!tenantId || !newPassword) throw new Error("Tenant ID and new password are required.")

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the admin user for this tenant
    const { data: adminProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .single()
    
    if (profileError || !adminProfile) throw new Error(`Admin user not found for tenant ${tenantId}.`)
    
    // Update the user's password using their ID
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      adminProfile.id,
      { password: newPassword }
    )
    if (updateError) throw updateError

    return new Response(JSON.stringify({ message: "Password updated successfully." }), {
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
