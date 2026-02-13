// src/components/mensajeria-badge.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getMensajesNoLeidos } from '@/app/actions/mensajes';

interface MensajeriaBadgeProps {
  className?: string;
}

export function MensajeriaBadge({ className }: MensajeriaBadgeProps) {
  const [count, setCount] = useState(0);
  const { data: session } = useSession();

  const fetchCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await getMensajesNoLeidos(String(session.user.id));
      if (response.success && response.data && response.data.count > 0) {
        setCount(response.data.count);
      } else {
        setCount(0);
      }
    } catch (error) {
      // Silently fail - badge is non-critical
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchCount();

    // Poll every 15 seconds
    const interval = setInterval(fetchCount, 15000);

    return () => clearInterval(interval);
  }, [fetchCount]);

  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full animate-pulse ${className || ''}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Header-level unread messages indicator with icon
 */
export function MensajeriaHeaderBadge() {
  const [count, setCount] = useState(0);
  const { data: session } = useSession();

  const fetchCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await getMensajesNoLeidos(String(session.user.id));
      if (response.success && response.data && response.data.count > 0) {
        setCount(response.data.count);
      } else {
        setCount(0);
      }
    } catch (error) {
      // Silently fail
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  if (count === 0) return null;

  return (
    <span
      className="absolute -right-1 -top-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-blue-500 rounded-full shadow-lg"
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
