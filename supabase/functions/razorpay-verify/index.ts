import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import crypto from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_type, amount, trip_limit } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing Razorpay payment parameters');
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Connect with a service role to bypass RLS for secure inserts/updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Record the payment
    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      amount: amount, // amount in INR
      status: 'success',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      plan_type: plan_type || 'payg_topup'
    });

    if (paymentError) throw paymentError;

    if (plan_type) {
      // Update or insert subscription
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error: subError } = await supabaseAdmin.from('subscriptions').upsert({
        user_id: user.id,
        plan_type: plan_type,
        trip_limit: trip_limit,
        price: amount,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (subError) throw subError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
