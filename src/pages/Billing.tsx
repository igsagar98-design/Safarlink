import PaymentsTab from '@/components/PaymentsTab';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function BillingPage() {
  const navigate = useNavigate();
  const { accountType } = useAuth();
  
  const handleBack = () => {
    if (accountType === 'company') {
      navigate('/company-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <AppLogo className="h-8 w-auto" alt="Safarlink Billing" />
              <span className="font-display font-bold text-lg text-slate-900">Billing & Payments</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <PaymentsTab />
      </main>
    </div>
  );
}
