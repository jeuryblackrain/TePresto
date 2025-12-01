// supabase/functions/manage-announcements/index.ts
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
    const { action, message, type } = await req.json()
    
    // Create an admin client to bypass RLS and write to system tables
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'publish') {
        if (!message) throw new Error("Message is required for publishing.");

        // 1. Deactivate all active announcements
        await adminClient
            .from('system_announcements')
            .update({ is_active: false })
            .eq('is_active', true);

        // 2. Insert the new announcement
        const { error } = await adminClient
            .from('system_announcements')
            .insert({
                message,
                type: type || 'info',
                is_active: true
            });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: "Announcement published." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } 
    else if (action === 'clear') {
        // Deactivate all
        const { error } = await adminClient
            .from('system_announcements')
            .update({ is_active: false })
            .eq('is_active', true);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, message: "Announcements cleared." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    throw new Error(`Invalid action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})