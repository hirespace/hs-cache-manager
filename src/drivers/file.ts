import fs from 'node:fs';
import valueOf from '../support/value-of';
import CacheDriver from './driver';
import type { Cached, Config } from './types';

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
    const file = fs.openSync(this.store, 'w');
    fs.writeSync(file, JSON.stringify({}));
    fs.closeSync(file);
  }

  public get<T>(key: string): T | null;
  public get<T, U extends T = T>(key: string, fallback: T): U;
  public get<T, U extends T = T>(key: string, fallback: () => T): U;
  public get<T>(key: string, fallback = null as unknown as T) {
    const store: Record<string, Cached | undefined> = JSON.parse(fs.readFileSync(this.store, { encoding: 'utf-8' }));
    const cached = store[this.key(key)];

    if (!cached) return valueOf(fallback);

    const { expires, value } = cached;

    if (expires && expires <= new Date()) return valueOf(fallback);

    return value;
  }

  public put<T>(key: string, value: T, expires: Date | null = null): T {
    const store: Record<string, Cached | undefined> = JSON.parse(fs.readFileSync(this.store, { encoding: 'utf-8' }));

    store[this.key(key)] = { expires: this.expires(expires), key, value };

    const file = fs.openSync(this.store, 'w');

    fs.writeSync(file, JSON.stringify(store));
    fs.closeSync(file);

    return value;
  }

  public remove(key: string): void {
    const store: Record<string, Cached | undefined> = JSON.parse(fs.readFileSync(this.store, { encoding: 'utf-8' }));

    delete store[this.key(key)];

    const file = fs.openSync(this.store, 'w');

    fs.writeSync(file, JSON.stringify(store));
    fs.closeSync(file);
  }
}
