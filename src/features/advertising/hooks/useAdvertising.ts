'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { getAdvertisingSnapshot, hydrateAdvertising, subscribeAdvertising } from '../lib/store';
const serverSnapshot = () => null;
export function useAdvertising() {
  const config = useSyncExternalStore(
    subscribeAdvertising,
    getAdvertisingSnapshot,
    serverSnapshot,
  );
  useEffect(() => { void hydrateAdvertising().catch(() => undefined); }, []);
  return config;
}
