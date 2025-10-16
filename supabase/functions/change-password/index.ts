// supabase/functions/change-password/index.ts
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
    const { oldPassword, newPassword } = await req.json()
    if (!oldPassword || !newPassword) {
      throw new Error('Se requieren tanto la contraseña antigua como la nueva.')
    }

    // Create a client with the user's auth token to verify their identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('Usuario no encontrado.')

    // Verify the old password is correct by trying to sign in with it.
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email!,
      password: oldPassword,
    })

    if (signInError) {
      return new Response(JSON.stringify({ error: 'La contraseña actual es incorrecta.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    
    // If old password was correct, create a powerful admin client to perform the update.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    )
    
    if (updateError) throw updateError

    return new Response(JSON.stringify({ message: 'Contraseña actualizada exitosamente.' }), {
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
