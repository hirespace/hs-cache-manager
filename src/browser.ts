/* eslint-disable max-classes-per-file */
export { default as CacheDriver } from './drivers/driver';
export type { Cached, Config } from './drivers/types';
// eslint-disable-next-line no-restricted-exports
export { default, type Driver } from './register';

// Browser-compatible drivers (real implementations)
export { default as PlainObjectDriver } from './drivers/plain-object';
export { default as MapDriver } from './drivers/map';
export { default as StorageDriver } from './drivers/storage';
export { default as NextCookieDriver } from './drivers/next-json-cookie/next-json-cookie';

// Server-only drivers (stubbed for browser compatibility)
export class FileDriver {
  constructor(..._args: any[]) {
    throw new Error(
      'FileDriver is not available in browser environments. Use PlainObjectDriver, MapDriver, or StorageDriver instead.'
    );
  }
}

export class RedisDriver {
  constructor(..._args: any[]) {
    throw new Error(
      'RedisDriver is not available in browser environments. Use PlainObjectDriver, MapDriver, or StorageDriver instead.'
    );
  }
}

export class UpstashRedisDriver {
  constructor(..._args: any[]) {
    throw new Error(
      'UpstashRedisDriver is not available in browser environments. Use PlainObjectDriver, MapDriver, or StorageDriver instead.'
    );
  }
}

export class VercelKvDriver {
  constructor(..._args: any[]) {
    throw new Error(
      'VercelKvDriver is not available in browser environments. Use PlainObjectDriver, MapDriver, or StorageDriver instead.'
    );
  }
}
