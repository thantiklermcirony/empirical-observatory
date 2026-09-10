'use client';

import { useState } from 'react';

export default function UsagePreference() {
  const [message, setMessage] = useState('');
  const setEnabled = (enabled: boolean) => {
    try {
      if (enabled) localStorage.removeItem('observatory-usage-opt-out');
      else localStorage.setItem('observatory-usage-opt-out', '1');
      setMessage(
        `Usage counting is ${enabled ? 'on' : 'off'} on this device. Your browser's privacy signals still take precedence.`,
      );
    } catch {
      setMessage(
        'This browser blocks preference storage. Usage counting stays off.',
      );
    }
  };
  return (
    <div>
      <button type="button" onClick={() => setEnabled(false)}>
        Turn counting off
      </button>
      {' · '}
      <button type="button" onClick={() => setEnabled(true)}>
        Turn counting on
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
