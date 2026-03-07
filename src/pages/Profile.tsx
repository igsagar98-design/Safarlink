import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createCompany, listCompanies, type Company, updateMyProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, accountType, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (accountType === 'company') {
      navigate('/company-profile');
    }
  }, [authLoading, user, accountType, navigate]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || profile.display_name || '');
    setPhone(profile.phone || '');
    setCompanyId(profile.company_id || '');
  }, [profile]);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await listCompanies('transporter');
        setCompanies(rows);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load transporter companies';
        toast.error(message);
      }
    };

    void load();
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) || null,
    [companies, companyId]
  );

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) {
      toast.error('Enter a transporter company name');
      return;
    }

    setCreatingCompany(true);
    try {
      const created = await createCompany(name, 'transporter');
      setCompanies((prev) => [created, ...prev].sort((a, b) => a.company_name.localeCompare(b.company_name)));
      setCompanyId(created.id);
      setNewCompanyName('');
      toast.success('Transporter company created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create company';
      toast.error(message);
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyId) {
      toast.error('Select your transporter company');
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        company_id: companyId,
      });
      toast.success('Profile updated');
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
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
            <UserIcon className="w-4 h-4" />
            <span className="font-display font-bold text-sm">Transporter Profile</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
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
            <Label>Transporter Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select transporter company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.company_name}{company.company_code ? ` (${company.company_code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="new-company">Add Transporter Company</Label>
              <Input
                id="new-company"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="FastMove Logistics"
              />
            </div>
            <Button type="button" variant="outline" onClick={handleCreateCompany} disabled={creatingCompany}>
              {creatingCompany ? 'Adding...' : 'Add Company'}
            </Button>
          </div>

          <div className="rounded-md border p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>
              Company code: {selectedCompany?.company_code || 'Not assigned yet'}
            </span>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </main>
    </div>
  );
}
