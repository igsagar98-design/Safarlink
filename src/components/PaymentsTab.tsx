import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getSubscription, getUsageTracking, createRazorpayOrder, verifyRazorpayPayment, type Subscription, type UsageTracking } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CreditCard, Zap, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentsTab() {
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use test Razorpay key initially. Replaced during token fetching.
  // We actually load the dynamically fetched key.
  
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subData, usageData, { data: historyData }] = await Promise.all([
        getSubscription(),
        getUsageTracking(),
        supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      setSub(subData);
      setUsage(usageData);
      setHistory(historyData || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load billing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubscribe = async (planType: string, amount: number) => {
    if (!user) return;
    try {
      const { orderId, key } = await createRazorpayOrder(amount, planType);

      const options = {
        key: key, 
        amount: amount * 100,
        currency: 'INR',
        name: 'SafarLink',
        description: `Upgrade to ${planType} plan`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_type: planType,
              amount: amount,
              trip_limit: planType === 'starter' ? 150 : planType === 'growth' ? 300 : planType === 'scale' ? -1 : 0
            });
            toast.success('Payment successful! Your plan has been upgraded.');
            loadData();
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#2563ea',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading billing details...</div>;
  }

  const isUnlimited = sub?.trip_limit === -1;
  const tripsUsed = usage?.trips_used || 0;
  const tripLimit = sub?.trip_limit || 0;
  const remaining = isUnlimited ? 'Unlimited' : Math.max(0, tripLimit - tripsUsed);
  const extraTrips = isUnlimited ? 0 : Math.max(0, tripsUsed - tripLimit);
  const extraCost = extraTrips * 7;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* USAGE CARD */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 mb-1">Current Plan: <span className="capitalize text-blue-600">{
            sub?.plan_type === 'free_trial' ? 'Free Trial' : 
            sub?.plan_type === 'payg' ? 'Pay As You Go' : 
            sub?.plan_type || 'Pay As You Go'
          }</span></h2>
          <p className="text-sm text-slate-500 mb-4">
            {sub?.status === 'expired' ? (
              <span className="text-red-500 font-medium">Subscription Expired. Please upgrade.</span>
            ) : (
              `Billing Cycle: ${sub?.start_date ? new Date(sub.start_date).toLocaleDateString() : 'N/A'} - ${sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Ongoing'}`
            )}
          </p>

          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-slate-500 mb-1">Trips Used / Limit</div>
              <div className="font-semibold text-lg">{tripsUsed} / {isUnlimited ? '∞' : tripLimit}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Remaining Trips</div>
              <div className="font-semibold text-lg text-emerald-600">{remaining}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Extra Trips Cost</div>
              <div className="font-semibold text-lg text-rose-600">₹{extraCost}</div>
            </div>
          </div>
        </div>
        
        {sub?.plan_type === 'payg' && extraCost > 0 && (
          <Button onClick={() => handleSubscribe('payg', extraCost)} className="bg-slate-900 text-white shrink-0">
            Pay Outstanding (₹{extraCost})
          </Button>
        )}
      </div>

      {/* UPGRADE PLANS */}
      <div>
        <h3 className="text-lg font-bold font-display mb-4">Upgrade Plan</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-2xl p-5 bg-white relative">
            <h4 className="font-bold text-lg">Starter</h4>
            <div className="mt-2 mb-4"><span className="text-2xl font-bold">₹499</span><span className="text-slate-500">/mo</span></div>
            <ul className="space-y-2 mb-6 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 150 trips included</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> ₹7 per extra trip</li>
            </ul>
            <Button className="w-full" variant={sub?.plan_type === 'starter' ? 'outline' : 'default'} disabled={sub?.plan_type === 'starter'} onClick={() => handleSubscribe('starter', 499)}>
              {sub?.plan_type === 'starter' ? 'Current Plan' : 'Upgrade to Starter'}
            </Button>
          </div>

          <div className="border-2 border-blue-600 shadow-md rounded-2xl p-5 bg-blue-50/50 relative">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">Popular</div>
            <h4 className="font-bold text-lg text-blue-900">Growth</h4>
            <div className="mt-2 mb-4"><span className="text-2xl font-bold text-blue-900">₹999</span><span className="text-blue-600/70">/mo</span></div>
            <ul className="space-y-2 mb-6 text-sm text-blue-800">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600"/> 300 trips included</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600"/> ₹7 per extra trip</li>
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={sub?.plan_type === 'growth'} onClick={() => handleSubscribe('growth', 999)}>
               {sub?.plan_type === 'growth' ? 'Current Plan' : 'Upgrade to Growth'}
            </Button>
          </div>

          <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900 text-white relative">
            <h4 className="font-bold text-lg">Scale</h4>
            <div className="mt-2 mb-4"><span className="text-2xl font-bold">₹2999</span><span className="text-slate-400">/mo</span></div>
            <ul className="space-y-2 mb-6 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Unlimited trips</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Priority Support</li>
            </ul>
            <Button className="w-full bg-white text-slate-900 hover:bg-slate-200" disabled={sub?.plan_type === 'scale'} onClick={() => handleSubscribe('scale', 2999)}>
               {sub?.plan_type === 'scale' ? 'Current Plan' : 'Go Unlimited'}
            </Button>
          </div>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Payment History</h3>
        </div>
        <div className="divide-y">
          {history.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No previous payments found.</div>
          ) : (
            history.map(item => (
              <div key={item.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-semibold text-sm text-slate-900 capitalize">{item.plan_type} Plan Subscription</div>
                  <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} • ID: {item.payment_id}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{item.amount}</div>
                  <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                    <ShieldCheck className="w-3 h-3"/> {item.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
