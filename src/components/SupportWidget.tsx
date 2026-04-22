import { useState } from 'react';
import { MessageCircle, X, ChevronDown, ChevronRight, Send, Phone, Mail, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_METADATA } from '@/lib/constants';

const WHATSAPP_NUMBER = APP_METADATA.driver.supportWhatsapp;
const SUPPORT_EMAIL = APP_METADATA.driver.supportEmail;

const faqs = [
  {
    q: 'How do drivers share their location?',
    a: 'Drivers download the SafarLink Driver APK, sign in with their phone number, and location is automatically shared every 30 seconds once a trip is active.',
  },
  {
    q: 'Do customers need an account to track?',
    a: 'No. You simply share a tracking link with the customer — they can view live location and ETA without signing up.',
  },
  {
    q: 'How do I create a bulk trip?',
    a: 'From the dashboard, click "Create Trip" and switch to the Bulk tab. You can upload multiple trips at once using a CSV template.',
  },
  {
    q: 'Why is the driver location not updating?',
    a: 'Ensure the driver has the latest APK installed and location permissions are granted. The app should be running in the foreground or background tracking must be enabled in Android settings.',
  },
  {
    q: 'How do I add a company to my account?',
    a: 'Go to Profile → Company and fill in your company details. Once registered as a Company account, you get access to the Company Dashboard.',
  },
  {
    q: 'Where can I download the Driver APK?',
    a: 'The APK is available from the landing page. Share the download button link with your drivers via WhatsApp.',
  },
];

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'home' | 'faq' | 'contact'>('home');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: send to backend / support ticketing
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setMessage('');
      setTab('home');
    }, 3000);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        id="support-widget-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Open customer support"
        className={`
          fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center
          rounded-full shadow-2xl transition-all duration-300 hover:scale-110
          ${open
            ? 'bg-slate-700 shadow-slate-400/30 rotate-0'
            : 'bg-blue-600 shadow-blue-400/40 hover:bg-blue-700'}
        `}
      >
        {open
          ? <X className="h-5 w-5 text-white" />
          : <MessageCircle className="h-5 w-5 text-white" />
        }
        {!open && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        )}
      </button>

      {/* ── Panel ── */}
      <div
        className={`
          fixed bottom-24 right-6 z-[9998] w-[360px] max-w-[calc(100vw-2rem)]
          rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60
          transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">SafarLink Support</p>
              <p className="text-white/70 text-xs flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                We're online · typically reply in minutes
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1">
            {(['home', 'faq', 'contact'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`
                  flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all
                  ${tab === t ? 'bg-white text-blue-700' : 'text-white/70 hover:text-white hover:bg-white/10'}
                `}
              >
                {t === 'home' ? 'Home' : t === 'faq' ? 'FAQs' : 'Contact'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">

          {/* ── HOME TAB ── */}
          {tab === 'home' && (
            <div className="p-5 space-y-3">
              <p className="text-slate-500 text-sm leading-relaxed">
                Hi there 👋 How can we help you today?
              </p>

              {/* Quick actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setTab('faq')}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-blue-50 hover:border-blue-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <HelpCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Browse FAQs</p>
                      <p className="text-xs text-slate-400">Common questions answered</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi SafarLink team, I need help with...`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-emerald-50 hover:border-emerald-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Chat on WhatsApp</p>
                      <p className="text-xs text-slate-400">Instant support · Mon–Sat 9am–6pm</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </a>

                <button
                  onClick={() => setTab('contact')}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-violet-50 hover:border-violet-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Send a Message</p>
                      <p className="text-xs text-slate-400">We'll reply within 24 hours</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                </button>
              </div>

              {/* Quick links */}
              <div className="pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-widest">Quick links</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Download Driver APK', href: APP_METADATA.driver.apkUrl, download: true },
                    { label: 'Login', href: '/login' },
                    { label: 'Sign Up', href: '/signup' },
                  ].map(link => (
                    <a
                      key={link.label}
                      href={link.href}
                      {...(link.download ? { download: true } : {})}
                      className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FAQ TAB ── */}
          {tab === 'faq' && (
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">Frequently Asked Questions</p>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`rounded-xl border transition-all duration-200 ${openFaq === i ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm font-semibold text-slate-800 pr-3 leading-snug">{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="px-4 pb-4 text-sm text-slate-500 leading-relaxed border-t border-blue-100 pt-3">{faq.a}</p>
                  )}
                </div>
              ))}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-400">Can't find your answer?</p>
                <button onClick={() => setTab('contact')} className="text-xs font-semibold text-blue-600 hover:underline mt-0.5">
                  Send us a message →
                </button>
              </div>
            </div>
          )}

          {/* ── CONTACT TAB ── */}
          {tab === 'contact' && (
            <div className="p-5">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Send className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">Message sent!</p>
                  <p className="text-xs text-slate-400">We'll get back to you within 24 hours on <strong>{email}</strong>.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Send us a message</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                    <input
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ramesh Kumar"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Your Message</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Describe your issue or question..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl h-10">
                    <Send className="h-3.5 w-3.5 mr-2" /> Send Message
                  </Button>
                  <div className="flex items-center gap-2 justify-center pt-1">
                    <span className="text-xs text-slate-400">Or reach us at</span>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs font-semibold text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 rounded-b-2xl bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">© SafarLink Support</p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 hover:underline"
          >
            <Phone className="h-3 w-3" /> WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
