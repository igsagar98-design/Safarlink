import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface Props {
  onCreated: () => void;
}

export default function CreateTripDialog({ onCreated }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    transporter_name: '',
    customer_name: '',
    origin: '',
    destination: '',
    material: '',
    planned_arrival: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('trips').insert({
      user_id: user.id,
      ...form,
      planned_arrival: new Date(form.planned_arrival).toISOString(),
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to create trip: ' + error.message);
    } else {
      toast.success('Trip created!');
      setForm({
        vehicle_number: '',
        driver_name: '',
        driver_phone: '',
        transporter_name: '',
        customer_name: '',
        origin: '',
        destination: '',
        material: '',
        planned_arrival: '',
      });
      setOpen(false);
      onCreated();
    }
  };

  const fields: { key: string; label: string; type?: string; placeholder: string }[] = [
    { key: 'vehicle_number', label: 'Vehicle Number', placeholder: 'MH 12 AB 1234' },
    { key: 'driver_name', label: 'Driver Name', placeholder: 'Rajesh Kumar' },
    { key: 'driver_phone', label: 'Driver Phone', placeholder: '+91 98765 43210' },
    { key: 'transporter_name', label: 'Transporter Name', placeholder: 'ABC Transport' },
    { key: 'customer_name', label: 'Customer / Plant', placeholder: 'Tata Steel Jamshedpur' },
    { key: 'origin', label: 'Origin', placeholder: 'Mumbai' },
    { key: 'destination', label: 'Destination', placeholder: 'Jamshedpur' },
    { key: 'material', label: 'Material', placeholder: 'Steel coils' },
    { key: 'planned_arrival', label: 'Planned Arrival', type: 'datetime-local', placeholder: '' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-1" /> New Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 mt-2">
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
              <Input
                id={f.key}
                type={f.type || 'text'}
                value={(form as Record<string, string>)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                required
              />
            </div>
          ))}
          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Creating…' : 'Create Trip'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
