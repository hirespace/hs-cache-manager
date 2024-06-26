import type CacheDriver from './drivers/driver';

export interface Driver<Drivers extends Record<string, CacheDriver<unknown>>, Fallback extends keyof Drivers> {
  (): Drivers[Fallback],
  <Store extends keyof Drivers>(store: Store): Drivers[Store],
}

export default function register<
  Drivers extends Record<string, CacheDriver<unknown>>,
  Fallback extends keyof Drivers
>(drivers: Drivers, fallback: Fallback): Driver<Drivers, Fallback> {
  return function cache<Store extends keyof Drivers>(store?: Store) {
    const driver = drivers[store ?? fallback];

    if (!driver) throw new Error(`Cache driver for [${store as string}] not found`);

    return driver;
  };
}
