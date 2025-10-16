// supabase/functions/create-tenant/index.ts
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
    const { companyName, adminName, adminEmail, adminPassword } = await req.json();

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      throw new Error('Missing required fields for tenant creation.');
    }
    
    // Admin client to interact with database
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // The handle_new_user trigger will take care of creating the tenant and profile.
    // We just need to sign up the new user with the correct metadata.
    const { data, error: signUpError } = await adminClient.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
            data: {
                name: adminName,
                company_name: companyName, // The trigger will use this to create a new tenant
                role: 'admin', // The trigger will assign this role
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`,
            },
            // Since this is an admin action, we can auto-confirm the user's email.
            emailRedirectTo: `${Deno.env.get('SITE_URL')}/login`,
        }
    });

    if (signUpError) {
        // More specific error for duplicate emails
        if (signUpError.message.includes('unique constraint')) {
            throw new Error(`A user with the email ${adminEmail} already exists.`);
        }
        throw signUpError;
    }
    
    if (!data.user) {
        throw new Error('User was not created, but no error was thrown.');
    }
    
    // The trigger `handle_new_user` should have already created the tenant and profile.
    // Let's verify by fetching the new user's profile to get the tenant_id.
    const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', data.user.id)
        .single();
        
    if (profileError || !profileData?.tenant_id) {
        // Rollback: delete the user if profile/tenant creation failed
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw new Error('Failed to create associated tenant/profile for the new user. Operation rolled back.');
    }


    return new Response(JSON.stringify({ success: true, userId: data.user.id, tenantId: profileData.tenant_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
