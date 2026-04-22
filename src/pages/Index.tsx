import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Globe, Smartphone, Download, CheckCircle2, Star, Navigation, Bell, Shield, Wifi, Play, ArrowRight, MapPinned, Radar, ClipboardList, Link2, Building2, Users, PackageCheck, Truck } from 'lucide-react';
import { APP_METADATA } from '@/lib/constants';

export default function Index() {
  const { user, accountType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-t-blue-600 border-blue-200 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading SafarLink…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-x-hidden font-sans">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <AppLogo className="h-9 w-auto" alt="SafarLink" />
            <span className="font-bold text-xl text-slate-900 tracking-tight">SafarLink</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#driver-app" className="hover:text-blue-600 transition-colors">Driver App</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
            <a href="#for-who" className="hover:text-blue-600 transition-colors">For who</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-200 px-5">
              <Link to="/signup">Start Free →</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-b from-blue-50 via-white to-white pt-20 pb-28 overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-20 w-[360px] h-[360px] rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Built for Indian logistics teams · Now with Driver APK
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-slate-900 mb-6">
              Smart Truck Tracking
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                for Modern Fleets
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              SafarLink gives transporters real-time GPS visibility, delay alerts, and a
              dedicated driver mobile app — all in one platform your team can adopt in minutes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-8 h-12 text-base font-semibold">
                <Link to={user ? (accountType === 'company' ? '/company-dashboard' : '/dashboard') : '/signup'}>
                  {user ? 'Go to Dashboard' : 'Start Free'} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-8 h-12 text-base font-medium shadow-sm">
                <a href="#driver-app">
                  <Download className="mr-2 h-4 w-4 text-emerald-500" /> Get Driver APK
                </a>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-slate-400 text-xs font-medium">
              {['Real-time GPS', 'Driver Mobile App', 'Instant Tracking Links', 'ETA Intelligence'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero feature cards */}
          <div className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
            {[
              { icon: <MapPinned className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50 border-blue-100', label: 'Live GPS Tracking', desc: 'See exact truck location on map, updated every 30 secs' },
              { icon: <Radar className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-100', label: 'Delay Intelligence', desc: 'Smart ETA predictions with proactive delay alerts' },
              { icon: <Smartphone className="h-5 w-5 text-violet-600" />, bg: 'bg-violet-50 border-violet-100', label: 'Driver Mobile App', desc: 'Android APK for drivers to stream location automatically' },
            ].map(({ icon, bg, label, desc }) => (
              <div key={label} className={`rounded-2xl border ${bg} p-5 text-left shadow-sm`}>
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Everything your team needs</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto text-base">One platform for fleet management, live tracking, and driver coordination.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <MapPinned className="h-5 w-5 text-blue-600" />, title: 'Live Truck Tracking', desc: 'See where every truck is on an interactive map with live location updates every 30 seconds.', iconBg: 'bg-blue-50', badge: 'Core' },
              { icon: <ClipboardList className="h-5 w-5 text-emerald-600" />, title: 'Trip Management', desc: 'Create, assign, and monitor trips from one clean dashboard — single or bulk at once.', iconBg: 'bg-emerald-50', badge: 'Core' },
              { icon: <Link2 className="h-5 w-5 text-violet-600" />, title: 'Instant GPS Links', desc: 'Share shareable tracking links with customers in one click. No login required for them.', iconBg: 'bg-violet-50', badge: 'Sharing' },
              { icon: <Radar className="h-5 w-5 text-amber-600" />, title: 'ETA Intelligence', desc: 'Automated ETA calculation via Google Routes API, updated every 2 minutes.', iconBg: 'bg-amber-50', badge: 'Smart' },
              { icon: <Bell className="h-5 w-5 text-red-500" />, title: 'Delay Alerts', desc: 'Proactive notifications when a truck is running behind schedule or off-route.', iconBg: 'bg-red-50', badge: 'Alerts' },
              { icon: <Building2 className="h-5 w-5 text-cyan-600" />, title: 'Company Portal', desc: 'Dedicated company dashboard to manage transporters, vehicles, and full operations.', iconBg: 'bg-cyan-50', badge: 'Enterprise' },
            ].map(({ icon, title, desc, iconBg, badge }) => (
              <div key={title} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">{badge}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DRIVER APK SECTION ── */}
      <section id="driver-app" className="py-24 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-50 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">

              {/* Left content */}
              <div className="p-10 lg:p-14">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                  <Smartphone className="h-3.5 w-3.5" />
                  SafarLink Driver App · Android
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-5 leading-tight">
                  The Driver App that<br />
                  <span className="text-emerald-600">powers your fleet</span>
                </h2>

                <p className="text-slate-500 text-base mb-8 leading-relaxed">
                  Drivers install our lightweight Android APK, sign in with their phone number,
                  and instantly start streaming live GPS location — no Play Store required.
                </p>

                <ul className="space-y-3.5 mb-10">
                  {[
                    { icon: <Navigation className="h-4 w-4 text-emerald-600" />, text: 'Auto location sharing every 30 seconds', bg: 'bg-emerald-50' },
                    { icon: <Shield className="h-4 w-4 text-blue-600" />, text: 'Secure phone number + password login', bg: 'bg-blue-50' },
                    { icon: <Wifi className="h-4 w-4 text-violet-600" />, text: 'Background tracking, offline resilient', bg: 'bg-violet-50' },
                    { icon: <Bell className="h-4 w-4 text-amber-600" />, text: 'Trip alerts and status updates in-app', bg: 'bg-amber-50' },
                    { icon: <Star className="h-4 w-4 text-emerald-600" />, text: 'Lightweight APK under 10 MB', bg: 'bg-emerald-50' },
                  ].map(({ icon, text, bg }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                      <span className={`flex-shrink-0 h-7 w-7 rounded-lg ${bg} flex items-center justify-center`}>{icon}</span>
                      {text}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={APP_METADATA.driver.apkUrl}
                    download
                    id="download-apk-btn"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 shadow-lg shadow-emerald-200 transition-all duration-200 hover:scale-[1.02] text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download APK for Android
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-medium px-6 py-3 transition-all duration-200 text-sm"
                  >
                    <Play className="h-4 w-4" /> See how it works
                  </a>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  ⓘ Enable "Install from unknown sources" in Android Settings before installing.
                </p>
              </div>

              {/* Right — feature tiles */}
              <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-10 lg:p-14 flex items-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    { icon: <Smartphone className="h-5 w-5 text-emerald-600" />, label: 'Simple UI', desc: 'Designed for drivers on the road', bg: 'bg-white border-emerald-100' },
                    { icon: <Navigation className="h-5 w-5 text-blue-600" />, label: 'GPS Streaming', desc: 'Live location sent to dashboard', bg: 'bg-white border-blue-100' },
                    { icon: <Shield className="h-5 w-5 text-violet-600" />, label: 'Secure Login', desc: 'Phone + password auth', bg: 'bg-white border-violet-100' },
                    { icon: <Globe className="h-5 w-5 text-amber-600" />, label: 'Any Android', desc: 'Android 8.0 and above', bg: 'bg-white border-amber-100' },
                    { icon: <Bell className="h-5 w-5 text-red-500" />, label: 'Notifications', desc: 'Trip assigned & status alerts', bg: 'bg-white border-red-100' },
                    { icon: <Wifi className="h-5 w-5 text-cyan-600" />, label: 'Background Mode', desc: 'Runs while screen is off', bg: 'bg-white border-cyan-100' },
                  ].map(({ icon, label, desc, bg }) => (
                    <div key={label} className={`rounded-2xl border ${bg} p-4 shadow-sm bg-white`}>
                      <div className="mb-2">{icon}</div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Up and running in minutes</h2>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto text-base">No complex setup. Your team can be live in under 10 minutes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { step: '01', title: 'Create a Trip', desc: 'Add origin, destination, driver, and vehicle details in seconds.', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', dot: 'bg-blue-600' },
              { step: '02', title: 'Driver Opens APK', desc: 'Driver installs the SafarLink app and signs in with their phone number.', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-600' },
              { step: '03', title: 'Share GPS Link', desc: 'Send the tracking link to customers or companies in one tap.', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100', dot: 'bg-violet-600' },
              { step: '04', title: 'Track Live', desc: 'View live location, ETA, route progress and delay alerts.', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500' },
            ].map(({ step, title, desc, color, bg, dot }) => (
              <div key={step} className={`rounded-2xl border ${bg} p-7`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-widest ${color}`}>Step {step}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="for-who" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Use Cases</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Who SafarLink is built for</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: <Building2 className="h-6 w-6 text-blue-600" />, title: 'Transport Companies', desc: 'Manage multiple shipments and give customers real-time visibility into every delivery.', badge: 'Company Portal', iconBg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: <Users className="h-6 w-6 text-emerald-600" />, title: 'Fleet Owners', desc: 'Monitor all active trucks from one place and reduce calls to and from drivers.', badge: 'Fleet Dashboard', iconBg: 'bg-emerald-50', border: 'border-emerald-100' },
              { icon: <PackageCheck className="h-6 w-6 text-violet-600" />, title: 'Logistics Startups', desc: 'Launch with enterprise-grade tracking from day one, without enterprise-grade cost.', badge: 'Scale Fast', iconBg: 'bg-violet-50', border: 'border-violet-100' },
            ].map(({ icon, title, desc, badge, iconBg, border }) => (
              <div key={title} className={`rounded-2xl border ${border} bg-white p-8 shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} mb-5`}>{icon}</div>
                <span className="inline-block mb-3 text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">{badge}</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Simple Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Choose the plan that fits you</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto items-stretch">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col">
              <h3 className="font-bold text-lg mb-2">Pay As You Go</h3>
              <div className="text-3xl font-bold mb-4 font-display">₹7<span className="text-sm font-normal text-slate-500"> / trip</span></div>
              <ul className="text-sm space-y-3 mb-6 text-slate-600 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400"/> Infinite scalability</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400"/> No monthly commitments</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400"/> Pay at the end of month</li>
              </ul>
              <Button variant="outline" asChild className="w-full bg-white text-slate-900"><Link to="/signup">Start Free</Link></Button>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
              <h3 className="font-bold text-lg mb-2">Starter</h3>
              <div className="text-3xl font-bold mb-4 font-display">₹499<span className="text-sm font-normal text-slate-500"> / mo</span></div>
              <ul className="text-sm space-y-3 mb-6 text-slate-600 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 150 trips included</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400"/> ₹7 per extra trip</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-400"/> Basic support</li>
              </ul>
              <Button variant="default" asChild className="w-full bg-slate-900 hover:bg-slate-800"><Link to="/signup">Get Starter</Link></Button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-blue-600 bg-blue-50/50 shadow-md relative flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">Most Popular</div>
              <h3 className="font-bold text-lg mb-2 text-blue-900">Growth</h3>
              <div className="text-3xl font-bold mb-4 font-display text-blue-900">₹999<span className="text-sm font-normal text-blue-600/70"> / mo</span></div>
              <ul className="text-sm space-y-3 mb-6 text-blue-800 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600"/> 300 trips included</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600/70"/> ₹7 per extra trip</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600/70"/> Priority email support</li>
              </ul>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Link to="/signup">Get Growth</Link></Button>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 text-white flex flex-col">
              <h3 className="font-bold text-lg mb-2 text-white">Scale</h3>
              <div className="text-3xl font-bold mb-4 font-display text-white">₹2999<span className="text-sm font-normal text-slate-400"> / mo</span></div>
              <ul className="text-sm space-y-3 mb-6 text-slate-300 flex-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Unlimited trips included</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Dedicated Account Manager</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> API Access</li>
              </ul>
              <Button variant="outline" asChild className="w-full border-slate-700 hover:bg-slate-800 hover:text-white text-white"><Link to="/signup">Go Unlimited</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 p-12 sm:p-16 text-center shadow-2xl shadow-blue-200/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Start tracking your fleet today
              </h2>
              <p className="text-white/80 text-base mb-10 max-w-xl mx-auto leading-relaxed">
                Get real-time GPS visibility, smart ETAs, and a driver app your team can
                start using immediately. No complex setup required.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 h-12 text-base shadow-lg">
                  <Link to="/signup">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <a
                  href={APP_METADATA.driver.apkUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 h-12 text-base transition-all duration-200"
                >
                  <Download className="h-4 w-4" /> Download Driver APK
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Truck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-700">SafarLink</span>
              <span className="text-slate-300 text-sm">·</span>
              <span className="text-slate-400 text-xs">© 2025 All rights reserved</span>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium text-slate-400">
              <Link to="/login" className="hover:text-slate-700 transition-colors">Login</Link>
              <Link to="/signup" className="hover:text-slate-700 transition-colors">Sign Up</Link>
              <a href="#driver-app" className="hover:text-slate-700 transition-colors">Driver APK</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
