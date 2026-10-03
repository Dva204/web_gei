import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};
beforeEach(() => {
  vi.resetModules();
  values.clear();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('frontend advertising storage', () => {
  it('provides a stable snapshot and persists modifications with audit', async () => {
    const store = await import('./store');
    const first = store.getAdvertisingSnapshot();
    expect(store.getAdvertisingSnapshot()).toBe(first);
    const callback = vi.fn();
    const unsubscribe = store.subscribeAdvertising(callback);
    store.updateAdvertising((current) => ({ ...current, enabled: false }), {
      userId: 'admin-demo',
      summary: 'Tắt thử',
    });
    expect(store.getAdvertisingSnapshot()?.enabled).toBe(false);
    expect(store.getAdvertisingSnapshot()?.audit[0].summary).toBe('Tắt thử');
    expect(JSON.parse(values.get(store.ADVERTISING_KEY)!).enabled).toBe(false);
    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
  });
  it('handles malformed or incompatible persisted data without crashing', async () => {
    const store = await import('./store');
    values.set(store.ADVERTISING_KEY, '{invalid');
    expect(store.getAdvertisingSnapshot()?.slots).toHaveLength(7);
    values.set(store.ADVERTISING_KEY, '{"version":1}');
    expect(store.getAdvertisingSnapshot()?.products).toHaveLength(3);
  });
  it('reports a failed save and preserves the prior snapshot', async () => {
    const store = await import('./store');
    const first = store.getAdvertisingSnapshot();
    vi.stubGlobal('localStorage', {
      getItem: storage.getItem,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() =>
      store.updateAdvertising((current) => ({ ...current, enabled: false })),
    ).toThrow('Không thể lưu');
    expect(store.getAdvertisingSnapshot()).toBe(first);
    expect(store.getAdvertisingSnapshot()?.enabled).toBe(true);
  });
  it('does not interrupt reading if telemetry cannot be persisted', async () => {
    const store = await import('./store');
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Blocked');
      },
      setItem: () => {
        throw new Error('Blocked');
      },
    });
    expect(store.getAdvertisingSnapshot()?.enabled).toBe(true);
    expect(() =>
      store.recordAdEvent('network-demo', 'home-between', 'click'),
    ).not.toThrow();
  });
  it('returns no browser config during server rendering', async () => {
    const store = await import('./store');
    vi.stubGlobal('window', undefined);
    expect(store.getAdvertisingSnapshot()).toBeNull();
  });
  it('notifies other-tab changes and caps local event history', async () => {
    const store = await import('./store');
    const callback = vi.fn();
    const unsubscribe = store.subscribeAdvertising(callback);
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: store.ADVERTISING_KEY });
    window.dispatchEvent(event);
    expect(callback).toHaveBeenCalledOnce();
    unsubscribe();
    store.updateAdvertising((current) => ({
      ...current,
      events: Array.from({ length: 3000 }, (_, i) => ({
        id: String(i),
        creativeId: 'sample',
        placement: 'home-between',
        kind: 'click',
        at: '2026-10-03T00:00:00Z',
      })),
    }));
    store.recordAdEvent('next', 'home-between', 'click');
    expect(store.getAdvertisingSnapshot()?.events).toHaveLength(3000);
    expect(store.getAdvertisingSnapshot()?.events.at(-1)?.creativeId).toBe(
      'next',
    );
  });
});
