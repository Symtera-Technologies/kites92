'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { whatsappLink } from '@/lib/utils';

export function TrackForm({ whatsappNumber }: { whatsappNumber: string }) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, phone }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'We could not find that order.');
        return;
      }
      router.push(`/order/${data.trackingToken}`);
    } catch {
      setError('We could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full rounded-xl border border-navy-900/15 bg-cream px-3.5 py-3 text-sm focus:border-royal focus:outline-none';
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy-900/55';

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-vibrant/10 px-3.5 py-2.5 text-sm text-vibrant-600">
          {error}
        </p>
      )}

      <label htmlFor="orderNumber" className={label}>
        Order number
      </label>
      <input
        id="orderNumber"
        required
        value={orderNumber}
        onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
        placeholder="K92-XXXXXX"
        className={`${field} font-mono`}
      />

      <label htmlFor="trackPhone" className={`${label} mt-4`}>
        Mobile number
      </label>
      <input
        id="trackPhone"
        required
        inputMode="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="0300 1234567"
        className={field}
      />

      <button type="submit" disabled={loading} className="btn-primary mt-5 w-full py-3.5">
        {loading ? 'Looking…' : 'Find my order'}
      </button>

      {whatsappNumber && (
        <p className="mt-4 text-center text-xs text-navy-900/55">
          Lost your order number?{' '}
          <a
            href={whatsappLink(whatsappNumber, 'Hello! I need help finding my Kites92 order.')}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-royal hover:underline"
          >
            Message us on WhatsApp
          </a>
        </p>
      )}
    </form>
  );
}
