import { ClientClosedError, type createClient } from 'redis';
import CacheDriver from './driver';
import { Config } from './types';
import valueOf from '../support/value-of';
import withinDeadline from '../support/within-deadline';

/**
 * How long opening the client, or one command on it, may take before the driver gives up.
 *
 * A healthy cold TLS handshake to Redis takes a few hundred milliseconds and a command a few, so
 * this leaves room for a slow one. It is short because every caller pays it while Redis is down.
 */
export const COMMAND_DEADLINE_MS = 2_000;

export default class RedisDriver<Client extends ReturnType<typeof createClient>> extends CacheDriver<Client> {
  private timer?: NodeJS.Timer;

  constructor(client: Client, config: Partial<Config> = {}) {
    super(client, config);
  }

  public async decrement(key: string, count = 1): Promise<number> {
    return this.connect(() => {
      const sanatised = this.key(key);

      return count > 1 ? this.store.decrBy(sanatised, count) : this.store.decr(sanatised);
    });
  }

  public async flush(): Promise<void> {
    await this.connect(() => this.store.flushAll());
  }

  public async get<T>(key: string | number): Promise<T | null>;
  public async get<T, U extends T = T>(key: string | number, fallback: T): Promise<U>;
  public async get<T, U extends T = T>(key: string | number, fallback: () => T): Promise<U>;
  public async get<T>(key: string | number, fallback: T = null as unknown as T) {
    return this.connect(async () => {
      if (await this.has(key)) {
        const cache = await this.store.get(this.key(key));

        try {
          return JSON.parse(cache!);
        } catch (error) {
          return cache;
        }
      }

      return valueOf(fallback);
    });
  }

  public async getMany<T = any>(keys: string[] | number[], fallback: T[] = []): Promise<T[]> {
    return this.connect(async () => {
      const response = await this.api().mGet(keys.map(this.key));

      return response.length > 0
        ? response
          .filter((item): item is string => item !== null)
          .map(item => JSON.parse(item))
        : fallback;
    });
  }

  public async has(key: string | number): Promise<boolean> {
    return !!(await this.connect(() => this.store.exists(this.key(key))));
  }

  public async increment(key: string, count = 1): Promise<number> {
    return this.connect(() => {
      const sanatised = this.key(key);

      return count > 1 ? this.store.incrBy(sanatised, count) : this.store.incr(sanatised);
    });
  }

  public async put<T>(key: string | number, value: T, expires: Date | null = null): Promise<T> {
    return this.connect(async () => {
      try {
        void await this.store.set(
          this.key(key),
          JSON.stringify(value),
          expires ? { PXAT: this.expires(expires).getTime() } : {}
        );
      } catch (error) {
        console.error(error);
      }

      return value;
    });
  }

  public async remove(key: string | number): Promise<void> {
    await this.connect(() => this.store.del(this.key(key)));
  }

  /**
   * Open the client if it is not ready, run one command on it, and give either step up at
   * `COMMAND_DEADLINE_MS` with a `CacheTimeoutError` (HS-20198).
   *
   * Without the deadlines a Redis that would not answer stopped the request outright: node-redis
   * retries a refused handshake for ever, and has no command timeout of its own, so a serverless
   * request waited until the platform killed it. With them, a caller that can do without the cache
   * gets a failure in time to treat it as a miss.
   *
   * A command that missed its deadline is NOT sent again. It may still reach Redis, and repeating
   * an `INCRBY` or a `SET` that landed would count or write it twice.
   */
  private async connect<T>(callback: () => T): Promise<T> {
    clearTimeout(this.timer);

    await this.open();

    const result = await withinDeadline(Promise.resolve().then(callback), 'waiting for a command', COMMAND_DEADLINE_MS);

    this.initDisconnect();

    return result;
  }

  /**
   * Make the client ready to answer, within the deadline.
   *
   * READY, NOT OPEN. node-redis sets `isOpen` the moment `connect()` STARTS, before the handshake,
   * and queues every command sent before `isReady` in its offline queue. So a client that another
   * caller has begun to open, or that is reconnecting after a dropped socket, reports itself open
   * while nothing it is sent will be answered. Checking `isOpen` alone sent such commands straight
   * into that queue, with no deadline, which is how a Redis that never finished a handshake held
   * hs-360 requests for 700 seconds (HS-20191). `connect()` cannot be called again on a socket that
   * is already opening (node-redis throws "Socket already opened"), so that case waits for `ready`.
   */
  private async open(): Promise<void> {
    if (this.store.isReady) return;

    if (!this.store.isOpen) {
      void await withinDeadline(this.store.connect(), 'opening the client', COMMAND_DEADLINE_MS);
      return;
    }

    await this.untilReady();
  }

  /**
   * Wait for a client that is already opening to become ready.
   *
   * The listener is removed however the wait ends: one left behind by every request that timed out
   * would pile up on a client that never opens, and Node warns past ten.
   */
  private async untilReady(): Promise<void> {
    const signal: { resolve?: () => void } = {};
    const ready = new Promise<void>(resolve => { signal.resolve = resolve; });
    const onReady = () => signal.resolve?.();

    this.store.once('ready', onReady);

    try {
      await withinDeadline(ready, 'waiting for the client to finish opening', COMMAND_DEADLINE_MS);
    } finally {
      this.store.off('ready', onReady);
    }
  }

  private initDisconnect() {
    this.timer = setTimeout(() => {
      if (this.store.isOpen) {
        try {
          this.store.quit();
        } catch (e) {
          if (e instanceof ClientClosedError) return;

          throw e;
        }
      }
    }, 5e3);
  }
}
