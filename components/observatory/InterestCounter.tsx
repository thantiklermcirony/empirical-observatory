'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { referralCategory } from '@/lib/interest';
import type { InterestEvent } from '@/lib/interest';

function disabled(): boolean {
  if (
    navigator.webdriver ||
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  )
    return true;
  try {
    const setting = new URLSearchParams(location.search).get('analytics');
    if (setting === 'off')
      localStorage.setItem('observatory-usage-opt-out', '1');
    if (setting === 'on') localStorage.removeItem('observatory-usage-opt-out');
    return localStorage.getItem('observatory-usage-opt-out') === '1';
  } catch {
    return true;
  }
}

export default function InterestCounter() {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);
  const firstPage = useRef(true);
  const lastRoom = useRef('');
  useEffect(() => {
    if (
      disabled() ||
      !['/', '/projects', '/privacy', '/cell'].includes(pathname)
    )
      return;
    const page: InterestEvent['page'] =
      pathname === '/projects' || pathname === '/cell'
        ? 'projects'
        : pathname === '/privacy'
          ? 'privacy'
          : 'home';
    const send = (
      event: InterestEvent['event'],
      entry: InterestEvent['entry'] = 'internal',
    ) => {
      if (disabled() || document.visibilityState !== 'visible') return;
      const body = JSON.stringify({ event, page, entry });
      void fetch('/api/interest', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        keepalive: true,
      }).catch(() => {});
    };
    const pageView = () => {
      if (
        document.visibilityState !== 'visible' ||
        lastPage.current === pathname
      )
        return;
      send(
        'page',
        firstPage.current
          ? referralCategory(document.referrer, location.origin)
          : 'internal',
      );
      firstPage.current = false;
      lastPage.current = pathname;
    };
    const roomView = () => {
      if (document.visibilityState !== 'visible') return;
      const room = location.hash.slice(1);
      if (
        pathname === '/' &&
        ['tao', 'quantum', 'behaviour', 'instrument', 'expeditions'].includes(
          room,
        )
      ) {
        if (room !== lastRoom.current) send('lab');
        lastRoom.current = room;
      } else lastRoom.current = '';
    };
    let lastClick = 0;
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || !event.isTrusted || Date.now() - lastClick < 1000) return;
      try {
        if (new URL(anchor.href).hostname === 'github.com') {
          send('source');
          lastClick = Date.now();
        }
      } catch {
        /* Not an ordinary outbound link. */
      }
    };
    pageView();
    roomView();
    const visible = () => {
      pageView();
      roomView();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('hashchange', roomView);
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('hashchange', roomView);
      document.removeEventListener('click', click);
    };
  }, [pathname]);
  return null;
}
