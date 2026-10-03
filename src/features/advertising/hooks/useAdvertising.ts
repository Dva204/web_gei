'use client';
import { useSyncExternalStore } from 'react';
import { getAdvertisingSnapshot, subscribeAdvertising } from '../lib/store';
const serverSnapshot = () => null;
export function useAdvertising() {
  return useSyncExternalStore(
    subscribeAdvertising,
    getAdvertisingSnapshot,
    serverSnapshot,
  );
}
