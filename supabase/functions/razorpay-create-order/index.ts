import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amountInPaise, metadata } = await req.json();

    if (!amountInPaise) {
      throw new Error('Missing amountInPaise');
    }

    // Call Razorpay API to create an order
    const authHeaders = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaders,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${user.id.substring(0,8)}_${Date.now()}`,
        notes: metadata || {},
      }),
    });

    const orderData = await response.json();

    if (!response.ok) {
      throw new Error(orderData.error?.description || 'Razorpay order creation failed');
    }

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id, 
        amount: orderData.amount,
        currency: orderData.currency,
        key: RAZORPAY_KEY_ID 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
