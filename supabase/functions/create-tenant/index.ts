
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
      throw new Error('Faltan campos obligatorios para crear la empresa.');
    }
    
    // VALIDACIÓN CRÍTICA DE CONFIGURACIÓN
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
        console.error("Faltan variables de entorno en el backend.");
        throw new Error('Error de configuración del servidor: SUPABASE_SERVICE_ROLE_KEY no está definida en Secrets.');
    }

    // Crear cliente Admin (Service Role) para saltarse las reglas de seguridad
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // PASO 1: Crear el Tenant explícitamente primero
    // Esto asegura que el ID del tenant exista antes de crear el usuario
    const { data: tenantData, error: tenantError } = await adminClient
        .from('tenants')
        .insert({ name: companyName, status: 'active' })
        .select()
        .single();

    if (tenantError) throw new Error(`Error creando empresa: ${tenantError.message}`);
    const newTenantId = tenantData.id;

    // PASO 2: Crear el Usuario en Auth
    // Usamos admin.createUser para confirmar el email automáticamente y no depender de signups públicos
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Confirmamos automáticamente al admin
        user_metadata: {
            name: adminName,
            tenant_id: newTenantId,
            role: 'admin',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`,
        }
    });

    if (signUpError) {
        // ROLLBACK: Si falla crear el usuario, borramos el tenant creado en el paso 1
        console.error("Error creando usuario, revirtiendo tenant...", signUpError);
        await adminClient.from('tenants').delete().eq('id', newTenantId);
        throw new Error(`Error creando usuario (posiblemente email duplicado): ${signUpError.message}`);
    }

    const newUserId = authData.user.id;

    // PASO 3: Crear/Enlazar el Perfil explícitamente
    // Aunque haya un trigger, usamos UPSERT para asegurar que los datos sean correctos
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newUserId,
            tenant_id: newTenantId,
            email: adminEmail,
            name: adminName,
            role: 'admin',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`
        });

    if (profileError) {
        // ROLLBACK CRÍTICO: Si falla el perfil, borramos usuario y tenant
        console.error("Error creando perfil, revirtiendo todo...", profileError);
        await adminClient.auth.admin.deleteUser(newUserId);
        await adminClient.from('tenants').delete().eq('id', newTenantId);
        throw new Error(`Error creando perfil: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        userId: newUserId, 
        tenantId: newTenantId,
        message: "Tenant y Administrador creados correctamente."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Create Tenant Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
