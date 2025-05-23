export { default as CacheDriver } from './drivers/driver';
export type { Cached, Config } from './drivers/types';
export { default as register, type Driver } from './register';

// Browser-compatible drivers only
export { default as PlainObjectDriver } from './drivers/plain-object';
export { default as MapDriver } from './drivers/map';
export { default as StorageDriver } from './drivers/storage';
export { default as NextCookieDriver } from './drivers/next-json-cookie/next-json-cookie';

// Server-only drivers are excluded from browser build
// - RedisDriver (requires 'redis' package)
// - FileDriver (requires 'fs' module)
// - UpstashRedisDriver (server-optimized)
// - VercelKvDriver (server-optimized)
