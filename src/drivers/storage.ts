import valueOf from '../support/value-of';
import CacheDriver from './driver';
import type { Cached as BaseCached, Config as BaseConfig } from './types';
import MapDriver from './map';

type Cached = Omit<BaseCached, 'expires'> & { expires: number | null };
type Config = BaseConfig & { enableMemory?: boolean };

class StorageDriver extends CacheDriver<Storage> {
  private memory?: MapDriver;

  constructor(protected store: Storage, config: Partial<Config> = {}) {
    super(store, config);

    if (config.enableMemory) {
      this.memory = new MapDriver(new Map(), config);
    }
  }

  public flush(): void {
    this.store.clear();
    this.memory?.flush();
  }

  public get<T>(key: string): T | null;
  public get<T, U extends T = T>(key: string, fallback: T): U;
  public get<T, U extends T = T>(key: string, fallback: () => T): U;
  public get<T>(key: string, fallback: T = null as unknown as T) {
    if (this.has(key)) {
      try {
        const { expires, value }: Cached = JSON.parse(this.store.getItem(this.key(key)) as string);

        return this.memory?.remember(
          key,
          () => value,
          expires ? new Date(expires) : null
        ) ?? value;
      } catch (error) {
        return valueOf(fallback);
      }
    }

    return valueOf(fallback);
  }

  public has(key: string): boolean {
    const cache = this.store.getItem(this.key(key));

    return !!cache && !this.expired(JSON.parse(cache));
  }

  public put<T>(key: string, value: T, expires: Date | null = null): T {
    const cached: Cached = {
      expires: expires ? this.expires(expires).getTime() : null,
      key,
      value
    };

    this.store.setItem(this.key(key), JSON.stringify(cached));
    this.memory?.put(key, value, cached.expires ? new Date(cached.expires) : null);

    return value;
  }

  /**
   * Remove older items based on a key prefix.
   */
  public popByPrefix(prefix: string, count: number): number {
    return Object
      .entries(this.store)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, item]) => [key, JSON.parse(item)])
      .filter(([_key, item]) => !!item.expires)
      .slice(0, count)
      .reduce((popped, [key]) => {
        try {
          /**
           * As we are iterating through all the entries of localStorage we know that
           * if `this.has()` returns false it is because the item has expired.
           */
          if (!this.has(key)) {
            return popped + 1;
          }
        } catch (e) {
          // Noop.
        }

        return popped;
      }, 0);
  }

  /**
   * Remove expired cache items.
   */
  public prune(): number {
    return Object.entries(this.store).reduce((pruned, [key]) => {
      /**
       * The underlying logic performs a JSON.parse(), unless a prefix has been provided this will iterate
       * over and prune all local/session storage items whether cached via the cache manager or not.
       * So wrapping in try/catch just in case we encounter a non JSON parsable value.
       */
      try {
        /**
         * As we are iterating through all the entries of localStorage we know that
         * if `this.has()` returns false it is because the item has expired.
         */
        if (!this.has(key.slice(this.key('').length))) {
          return pruned + 1;
        }
      } catch (e) {
        // Noop.
      }

      return pruned;
    }, 0);
  }

  public remove(key: string): void {
    this.store.removeItem(this.key(key));
    this.memory?.remove(key);
  }

  /**
   * Determines if the given cache item has expired.
   * If it has expired it removes the cache item from storage.
   */
  private expired(item: Cached): boolean {
    if (!item.expires) {
      return false;
    }

    const expired = new Date(item.expires) <= new Date();

    if (expired) this.remove(item.key);

    return expired;
  }
}

export default StorageDriver;
