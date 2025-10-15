import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get IP address from request
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Priority: CF-Connecting-IP > X-Real-IP > X-Forwarded-For
    const ipAddress = cfConnectingIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown';
    
    // Get user agent
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { action, userId } = await req.json();

    console.log('IP Check Request:', { action, ipAddress, userAgent, userId });

    if (action === 'check') {
      // Check if IP is allowed to register
      const { data, error } = await supabaseClient.rpc('check_ip_registration', {
        _ip_address: ipAddress,
        _user_agent: userAgent
      });

      if (error) {
        console.error('Error checking IP:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('IP Check Result:', data);

      return new Response(
        JSON.stringify({
          ...data,
          ip: ipAddress,
          userAgent
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'record') {
      // Record IP after successful registration
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required for recording' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error } = await supabaseClient.rpc('record_ip_registration', {
        _ip_address: ipAddress,
        _user_id: userId,
        _user_agent: userAgent
      });

      if (error) {
        console.error('Error recording IP:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('IP Recorded Successfully:', { ipAddress, userId });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "check" or "record"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in check-ip function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});