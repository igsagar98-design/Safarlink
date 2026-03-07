import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getCompanyById,
  listTransporterCompaniesForShipper,
  updateCompany,
  updateMyProfile,
  type Company,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CompanyProfile() {
  const { user, profile, accountType, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [transporters, setTransporters] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (accountType !== 'company') {
      navigate('/profile');
    }
  }, [authLoading, user, accountType, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.company_id) return;
      setFullName(profile.full_name || profile.display_name || '');
      setPhone(profile.phone || '');

      try {
        const [companyRow, transporterRows] = await Promise.all([
          getCompanyById(profile.company_id),
          listTransporterCompaniesForShipper(profile.company_id),
        ]);

        setCompany(companyRow);
        setCompanyName(companyRow?.company_name || '');
        setCompanyCode(companyRow?.company_code || '');
        setTransporters(transporterRows);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load company profile';
        toast.error(message);
      }
    };

    void load();
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast.error('Company mapping is missing for this account.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        updateMyProfile({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        }),
        updateCompany(profile.company_id, {
          company_name: companyName.trim(),
          company_code: companyCode.trim() || null,
        }),
      ]);
      toast.success('Company profile updated');
      navigate('/company-dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update company profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="font-display font-bold text-sm">Company Profile</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/company-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <form onSubmit={handleSave} className="card-elevated p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="full-name">Full Name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxx" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Company ID</Label>
              <Input value={company?.id || ''} readOnly />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company-code">Company Code</Label>
              <Input id="company-code" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save Company Profile'}
          </Button>
        </form>

        <section className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            <h2 className="font-display font-semibold text-sm">Associated Transporters</h2>
          </div>

          {transporters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transporter companies associated yet.</p>
          ) : (
            <div className="space-y-2">
              {transporters.map((transporter) => (
                <div key={transporter.id} className="border rounded-md p-3">
                  <p className="text-sm font-medium">{transporter.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {transporter.company_code || 'No code'} • {transporter.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
