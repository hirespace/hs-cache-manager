import fs from 'node:fs';
import valueOf from '../support/value-of';
import CacheDriver from './driver';
import type { Cached as BaseCached, Config } from './types';

type Cached = Omit<BaseCached, 'expires'> & { expires: number | null };

export default class FileDriver extends CacheDriver<string> {
  constructor(path: string, config: Partial<Config> = {}) {
    super(path, config);

    const file = fs.openSync(path, 'w');

    if (!fs.existsSync(path)) {
      fs.writeSync(file, JSON.stringify({}));
    }

    fs.closeSync(file);
  }

  public flush(): void {
    void this.write(() => ({}));
  }

  public get<T>(key: string): T | null;
  public get<T, U extends T = T>(key: string, fallback: T): U;
  public get<T, U extends T = T>(key: string, fallback: () => T): U;
  public get<T>(key: string, fallback = null as unknown as T) {
    const store = this.read();
    const cached = store[this.key(key)];

    if (!cached) return valueOf(fallback);

    const { expires, value } = cached;

    if (expires && new Date(expires) <= new Date()) {
      this.remove(key);

      return valueOf(fallback);
    }

    return value;
  }

  public put<T>(key: string, value: T, expires: Date | null = null): T {
    // eslint-disable-next-line arrow-body-style
    void this.write(store => {
      return {
        ...store,
        [this.key(key)]: {
          expires: expires ? this.expires(expires).getTime() : null,
          key,
          value
        }
      };
    });

    return value;
  }

  public remove(key: string): void {
    void this.write(({ ...store }) => {
      // eslint-disable-next-line no-param-reassign
      delete store[this.key(key)];

      return store;
    });
  }

  private read(): Partial<Record<string, Cached>> {
    return JSON.parse(fs.readFileSync(this.store, { encoding: 'utf-8' }));
  }

  private write(callback: (store: Partial<Record<string, Cached>>) => Partial<Record<string, Cached>>) {
    const file = fs.openSync(this.store, 'w');
    const store = callback(this.read());

    fs.writeSync(file, JSON.stringify(store));
    fs.closeSync(file);

    return store;
  }
}
