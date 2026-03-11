import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyProfile, getSession, signIn } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLogo, { AppLogoFallback } from '@/components/AppLogo';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const error = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      try {
        const profile = await getMyProfile();
        const role = profile?.role || profile?.account_type;
        navigate(role === 'company' ? '/company-dashboard' : '/dashboard');
      } catch {
        const session = await getSession();
        const fallbackType = session?.user?.user_metadata?.role || session?.user?.user_metadata?.account_type;
        navigate(fallbackType === 'company' ? '/company-dashboard' : '/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AppLogo className="h-20 w-auto" alt="Safarlink" />
            <AppLogoFallback label="Safarlink" />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Shipment visibility for small transporters</p>
        </div>

        <div className="card-elevated p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
