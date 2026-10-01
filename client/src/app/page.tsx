'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const EMPTY: FormState = { name: '', email: '', phone: '', company: '', message: '' };

export default function HomePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      await api.post('/api/public/leads', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setSuccess(true);
      setForm(EMPTY);
      setErrors({});
    } catch (err) {
      setApiError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">LM</span>
          </div>
          <span className="text-gray-900 text-lg font-semibold tracking-tight">LeadFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#submit-lead" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
            Submit a Lead
          </a>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Team Login →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-20 pb-24 px-6 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
            Portfolio Project
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Lead Management Platform
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Capture leads, assign them to your team, track progress, and manage the entire lead lifecycle from one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                Explore Live Demo
              </Button>
            </Link>
            <a href="#submit-lead" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base h-12 px-8 bg-white/10 text-white border-white/20 hover:bg-white/20">
                Submit a Lead
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Core CRM Features</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Everything you need to manage the sales pipeline effectively.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'Public Lead Capture', desc: 'Accept leads automatically from this public landing page into the CRM.' },
            { title: 'Role-Based Authentication', desc: 'Secure login for Admins (manage team) and Members (manage assigned leads).' },
            { title: 'Lead Assignment', desc: 'Admins can assign leads to specific team members for focused follow-up.' },
            { title: 'Lead Status Pipeline', desc: 'Move leads through stages: New, Contacted, Qualified, Proposal, Won/Lost.' },
            { title: 'Notes & Activity', desc: 'Add context with notes and automatically track every status or assignment change.' },
            { title: 'Search & Pagination', desc: 'Quickly find leads across the entire database with server-side filtering.' },
          ].map((feature, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-6 bg-slate-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">A simple, effective lead progression workflow.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between relative max-w-4xl mx-auto">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 -z-10 -translate-y-1/2"></div>
            
            {[
              { status: 'NEW', color: 'bg-blue-100 text-blue-800 border-blue-200' },
              { status: 'CONTACTED', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
              { status: 'QUALIFIED', color: 'bg-purple-100 text-purple-800 border-purple-200' },
              { status: 'PROPOSAL', color: 'bg-orange-100 text-orange-800 border-orange-200' },
              { status: 'WON / LOST', color: 'bg-green-100 text-green-800 border-green-200' }
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center mb-8 md:mb-0 bg-slate-50 p-2">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold mb-3 border-2 ${step.color.split(' ')[0]} ${step.color.split(' ')[2]} text-sm`}>
                  {index + 1}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${step.color}`}>
                  {step.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Submit Lead Section */}
      <section id="submit-lead" className="py-24 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Test the Public Form</h2>
          <p className="text-gray-500">Submit a lead below, then log in to the demo to see it appear in the CRM.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Message sent!</h2>
              <p className="text-gray-500 mb-6">Thanks for reaching out. Our team will be in touch shortly.</p>
              <Button onClick={() => setSuccess(false)} variant="secondary">
                Send another message
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Get in touch</h2>
              <p className="text-sm text-gray-500 mb-6">Fill out the form and we&apos;ll get back to you.</p>

              {apiError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    id="name" label="Full name *" placeholder="Jane Smith"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={errors.name}
                  />
                  <Input
                    id="email" label="Work email *" type="email" placeholder="jane@company.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    error={errors.email}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    id="company" label="Company" placeholder="Acme Corp"
                    value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                  <Input
                    id="phone" label="Phone" placeholder="+1 555 000 0000"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <Textarea
                  id="message" label="Message" placeholder="Tell us how we can help..."
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <Button type="submit" loading={submitting} className="w-full justify-center" size="lg">
                  Send message
                </Button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-gray-100">
        <p className="text-sm text-gray-400">Lead Management Platform Demo Project</p>
      </footer>
    </div>
  );
}
