
// supabase/functions/create-tenant/index.ts
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
    
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
        throw new Error('Error de configuración del servidor: Faltan credenciales (Service Role).');
    }

    // Configuración optimizada para Edge Functions (sin persistencia de sesión)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 0. VERIFICACIÓN PREVIA: Chequear si el email ya existe para evitar errores genéricos de DB
    // Esto es un "hack" útil porque admin.createUser a veces devuelve error 500 en lugar de 422 en duplicados
    const { data: existingUsers } = await adminClient
        .from('profiles') // Chequeamos en profiles primero que es publico/accesible
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();
    
    if (existingUsers) {
        throw new Error('El correo electrónico ya está registrado en el sistema.');
    }
    
    // 1. Crear el Tenant
    const { data: tenantData, error: tenantError } = await adminClient
        .from('tenants')
        .insert({ name: companyName, status: 'active' })
        .select()
        .single();

    if (tenantError) throw new Error(`Error creando empresa: ${tenantError.message}`);
    const newTenantId = tenantData.id;

    // 2. Crear el Usuario en Auth
    // Importante: Pasamos tenant_id en metadata para que si hay triggers LEGACY, intenten usarlo.
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
            name: adminName,
            tenant_id: newTenantId,
            role: 'admin',
            company_name: companyName, // Redundancia útil para triggers
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}`,
        }
    });

    if (signUpError) {
        console.error("Fallo al crear usuario Auth:", signUpError);
        // ROLLBACK: Borrar el tenant
        await adminClient.from('tenants').delete().eq('id', newTenantId);
        
        // Traducir error común de base de datos a algo legible
        if (signUpError.message.includes("Database error saving new user")) {
            throw new Error("Error de base de datos al guardar usuario. Posible conflicto con un Trigger existente o contraseña muy débil.");
        }
        throw new Error(`Error creando usuario: ${signUpError.message}`);
    }

    const newUserId = authData.user.id;

    // 3. Crear/Enlazar el Perfil
    // Usamos UPSERT para que si un Trigger ya creó el perfil (y no falló), nosotros lo actualicemos con los datos correctos
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
        console.error("Fallo al crear perfil:", profileError);
        // ROLLBACK TOTAL
        await adminClient.auth.admin.deleteUser(newUserId);
        await adminClient.from('tenants').delete().eq('id', newTenantId);
        throw new Error(`Error configurando perfil de usuario: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        userId: newUserId, 
        tenantId: newTenantId,
        message: "Cuenta creada exitosamente."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Create Tenant Global Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});