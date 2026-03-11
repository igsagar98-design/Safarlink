import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Truck, Route, Link2, MapPinned, ClipboardList, Radar, Building2, Users, PackageCheck } from 'lucide-react';

export default function Index() {
  const { user, accountType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_48%),radial-gradient(circle_at_82%_18%,_rgba(16,185,129,0.20),_transparent_38%)]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <AppLogo className="h-10 w-auto" alt="SafarLink" />
            <span className="font-display text-xl font-bold text-[#0F172A]">SafarLink</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-[#475569] hover:bg-[#EFF6FF] hover:text-[#0F172A]">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-[#2563EB] text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:bg-[#1D4ED8]">
              <Link to="/signup">Start Free</Link>
            </Button>
          </div>
        </header>

        <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center rounded-full border border-[#DCE7F5] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                Built for modern logistics teams
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#0F172A] sm:text-5xl">
                Smart Truck Tracking for Modern Transporters
              </h1>
              <p className="mt-5 max-w-xl text-base text-[#475569] sm:text-lg">
                SafarLink helps transporters create trips, share GPS links, and monitor fleet movement in real time with
                clear ETA visibility and delay alerts.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-[#2563EB] text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)] hover:bg-[#1D4ED8]">
                  <Link to={user ? (accountType === 'company' ? '/company-dashboard' : '/dashboard') : '/signup'}>
                    {user ? 'Go To Dashboard' : 'Start Free'}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-[#10B981]/50 bg-[#ECFDF5] text-[#047857] hover:border-[#10B981] hover:bg-[#D1FAE5]">
                  <Link to={user ? (accountType === 'company' ? '/company-dashboard' : '/dashboard') : '/login'}>
                    {user ? 'Open App' : 'Login'}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE7F5] bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.10)] backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#DCE7F5] bg-[#EFF6FF] p-4 shadow-sm">
                  <Truck className="mb-2 h-5 w-5 text-[#2563EB]" />
                  <p className="text-sm font-semibold text-[#0F172A]">Live Fleet Pulse</p>
                  <p className="mt-1 text-xs text-[#475569]">Track trucks, ETAs, and route progress instantly.</p>
                </div>
                <div className="rounded-xl border border-[#DCE7F5] bg-[#ECFDF5] p-4 shadow-sm">
                  <Radar className="mb-2 h-5 w-5 text-[#10B981]" />
                  <p className="text-sm font-semibold text-[#0F172A]">Delay Intelligence</p>
                  <p className="mt-1 text-xs text-[#475569]">Spot risk early with smart trip status signals.</p>
                </div>
                <div className="rounded-xl border border-[#DCE7F5] bg-white p-4 shadow-sm sm:col-span-2">
                  <ClipboardList className="mb-2 h-5 w-5 text-[#2563EB]" />
                  <p className="text-sm font-semibold text-[#0F172A]">Operations View</p>
                  <p className="mt-1 text-xs text-[#475569]">Single dashboard for trips, transporters, and customer visibility.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Features</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <MapPinned className="h-6 w-6 text-[#2563EB]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">Live Truck Tracking</h3>
            <p className="mt-2 text-sm text-[#475569]">See where each truck is, with latest location and movement updates.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <ClipboardList className="h-6 w-6 text-[#10B981]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">Trip Management</h3>
            <p className="mt-2 text-sm text-[#475569]">Create, monitor, and manage trips from one clean operations panel.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <Link2 className="h-6 w-6 text-[#2563EB]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">GPS Link Tracking</h3>
            <p className="mt-2 text-sm text-[#475569]">Share tracking links quickly and follow vehicle progress without friction.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#EFF6FF]/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">How It Works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5">
              <span className="text-xs font-semibold text-[#2563EB]">Step 1</span>
              <h3 className="mt-2 text-lg font-semibold text-[#0F172A]">Create Trip</h3>
              <p className="mt-2 text-sm text-[#475569]">Add trip details like origin, destination, driver, and vehicle.</p>
            </div>
            <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5">
              <span className="text-xs font-semibold text-[#10B981]">Step 2</span>
              <h3 className="mt-2 text-lg font-semibold text-[#0F172A]">Share GPS Link</h3>
              <p className="mt-2 text-sm text-[#475569]">Send the tracking link to driver or customer in a single click.</p>
            </div>
            <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5">
              <span className="text-xs font-semibold text-[#2563EB]">Step 3</span>
              <h3 className="mt-2 text-lg font-semibold text-[#0F172A]">Track Truck</h3>
              <p className="mt-2 text-sm text-[#475569]">View route progress, ETA, and location updates in real time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Who SafarLink Is For</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <Building2 className="h-6 w-6 text-[#2563EB]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">Transport Companies</h3>
            <p className="mt-2 text-sm text-[#475569]">Manage multiple shipments and improve customer visibility.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <Users className="h-6 w-6 text-[#10B981]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">Fleet Owners</h3>
            <p className="mt-2 text-sm text-[#475569]">Monitor active vehicles and reduce communication overhead.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE7F5] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <PackageCheck className="h-6 w-6 text-[#2563EB]" />
            <h3 className="mt-3 text-lg font-semibold text-[#0F172A]">Logistics Startups</h3>
            <p className="mt-2 text-sm text-[#475569]">Launch with modern shipment tracking from day one.</p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#10B981] px-6 py-10 text-center text-white shadow-[0_20px_50px_rgba(15,23,42,0.20)] sm:px-10">
            <h2 className="text-2xl font-bold sm:text-3xl">Start tracking your fleet today</h2>
            <p className="mt-3 text-sm text-white/90 sm:text-base">Scale shipment visibility with a workflow your team can adopt in minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-[#2563EB] hover:bg-white/90">
                <Link to="/signup">Start Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/80 bg-transparent text-white hover:border-white hover:bg-white/10">
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
