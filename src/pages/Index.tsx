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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_45%),radial-gradient(circle_at_80%_20%,_rgba(34,197,94,0.18),_transparent_35%)]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <AppLogo className="h-10 w-auto" alt="SafarLink" />
            <span className="font-display text-xl font-bold text-primary">SafarLink</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-700 hover:text-slate-900">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/signup">Start Free</Link>
            </Button>
          </div>
        </header>

        <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Built for modern logistics teams
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Smart Truck Tracking for Modern Transporters
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
                SafarLink helps transporters create trips, share GPS links, and monitor fleet movement in real time with
                clear ETA visibility and delay alerts.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                  <Link to={user ? (accountType === 'company' ? '/company-dashboard' : '/dashboard') : '/signup'}>
                    {user ? 'Go To Dashboard' : 'Start Free'}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Link to={user ? (accountType === 'company' ? '/company-dashboard' : '/dashboard') : '/login'}>
                    {user ? 'Open App' : 'Login'}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-xl backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Truck className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Live Fleet Pulse</p>
                  <p className="mt-1 text-xs text-slate-600">Track trucks, ETAs, and route progress instantly.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Radar className="mb-2 h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold">Delay Intelligence</p>
                  <p className="mt-1 text-xs text-slate-600">Spot risk early with smart trip status signals.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                  <ClipboardList className="mb-2 h-5 w-5 text-sky-600" />
                  <p className="text-sm font-semibold">Operations View</p>
                  <p className="mt-1 text-xs text-slate-600">Single dashboard for trips, transporters, and customer visibility.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Features</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <MapPinned className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Live Truck Tracking</h3>
            <p className="mt-2 text-sm text-slate-600">See where each truck is, with latest location and movement updates.</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            <h3 className="mt-3 text-lg font-semibold">Trip Management</h3>
            <p className="mt-2 text-sm text-slate-600">Create, monitor, and manage trips from one clean operations panel.</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Link2 className="h-6 w-6 text-sky-600" />
            <h3 className="mt-3 text-lg font-semibold">GPS Link Tracking</h3>
            <p className="mt-2 text-sm text-slate-600">Share tracking links quickly and follow vehicle progress without friction.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">How It Works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-slate-50 p-5">
              <span className="text-xs font-semibold text-primary">Step 1</span>
              <h3 className="mt-2 text-lg font-semibold">Create Trip</h3>
              <p className="mt-2 text-sm text-slate-600">Add trip details like origin, destination, driver, and vehicle.</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-5">
              <span className="text-xs font-semibold text-emerald-600">Step 2</span>
              <h3 className="mt-2 text-lg font-semibold">Share GPS Link</h3>
              <p className="mt-2 text-sm text-slate-600">Send the tracking link to driver or customer in a single click.</p>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-5">
              <span className="text-xs font-semibold text-sky-600">Step 3</span>
              <h3 className="mt-2 text-lg font-semibold">Track Truck</h3>
              <p className="mt-2 text-sm text-slate-600">View route progress, ETA, and location updates in real time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Who SafarLink Is For</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5">
            <Building2 className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Transport Companies</h3>
            <p className="mt-2 text-sm text-slate-600">Manage multiple shipments and improve customer visibility.</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <Users className="h-6 w-6 text-emerald-600" />
            <h3 className="mt-3 text-lg font-semibold">Fleet Owners</h3>
            <p className="mt-2 text-sm text-slate-600">Monitor active vehicles and reduce communication overhead.</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <PackageCheck className="h-6 w-6 text-sky-600" />
            <h3 className="mt-3 text-lg font-semibold">Logistics Startups</h3>
            <p className="mt-2 text-sm text-slate-600">Launch with modern shipment tracking from day one.</p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-primary to-emerald-600 px-6 py-10 text-center text-white shadow-xl sm:px-10">
            <h2 className="text-2xl font-bold sm:text-3xl">Start tracking your fleet today</h2>
            <p className="mt-3 text-sm text-white/90 sm:text-base">Scale shipment visibility with a workflow your team can adopt in minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/signup">Start Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
