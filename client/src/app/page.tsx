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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">LM</span>
          </div>
          <span className="text-white text-lg font-semibold">LeadFlow</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          Team Login →
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-start">
        {/* Hero */}
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
            Built for sales teams
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Turn leads into<br />
            <span className="text-blue-400">customers faster</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            LeadFlow helps small sales teams capture, track, and close leads
            efficiently — with clear visibility at every stage of the pipeline.
          </p>
          <div className="space-y-3">
            {['Centralized lead inbox', 'Real-time status tracking', 'Team assignment & notes', 'Full activity timeline'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-slate-300">
                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
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
      </div>
    </div>
  );
}
