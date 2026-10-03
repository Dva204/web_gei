'use client';
import { useSyncExternalStore } from 'react';
import { getAdvertisingSnapshot, subscribeAdvertising } from './store';
const serverSnapshot = () => null;
export function useAdvertising() {
  return useSyncExternalStore(
    subscribeAdvertising,
    getAdvertisingSnapshot,
    serverSnapshot,
  );
}
