# cache-manager

I guess coming from a Laravel background I enjoyed/am used to using their syntax for interacting with cache and wanted to continue that in the browser/Node.

Current drivers out of the box are (simply because these are the ones I use): 
- Plain object (browser/server)
- Map (browser/server)
- Local storage (browser)
- Session storage (browser)
- Redis (server)

Any others you'll have to write yourself, feel free to open a PR if you want to have another provider included.

## Installation

Create/add registry scope to your `.npmrc` file.

```
@jaspargupta:registry=https://npm.pkg.github.com/
```

Install the package via `npm`.

```
npm i @jaspargupta/cache-manager
```

## Usage

```typescript
// cache.ts
import register from '@jaspargupta/cache-manager';
import PlainObjectDriver from '@jaspargupta/cache-manager/dist/drivers/plain-object';
import MapDriver from '@jaspargupta/cache-manager/dist/drivers/map';
import StorageDriver from './@jaspargupta/cache-manager/dist/drivers/storage';

/**
 * Create your cache manager by registering cache drivers.
 * Set the default driver as the second argument.
 */
const cache = register({
  main: new PlainObjectDriver(),
  secondary: new PlainObjectDriver(),
  map: new MapDriver(),
  localStorage: new StorageDriver(window.localStorage),
  sessionStorage: new StorageDriver(window.sessionStorage),
}, 'main');

export default cache;
```

```typescript
// example.ts
import insufferablySlowFunction from 'third-party';
import addHours from 'date-fns/addHours';
import cache from './cache';

// Cache result indefinitely.
const standard = cache().remember('cache.key', () => {
  return insufferablySlowFunction();
});

// Cache result for 24 hours.
const expires = cache().remember('cache.key', () => {
  return insufferablySlowFunction();
}, addHours(Date.now(), 24));

// Cache result for 24 hours, and if there is an error then don't save anything, catch the error and provide the fallback value to the code.
const fallback = cache().remember('cache.key', () => {
  return insufferablySlowFunction();
}, addHours(Date.now(), 24), []);

// Cache result indefinitely using secondary driver.
const swapDriver = cache('secondary').remember('cache.key', () => {
  return insufferablySlowFunction();
});

// Supports `async` callbacks.
const asynchrounous = await cache().remember('cache.key', async () => {
  return insufferablySlowFunction();
});
```

### [Config](./src/drivers/types/config.ts)

You can pass optional config to your cache drivers.

 - `prefix` allows you to prefix your cache keys with the given value. By default it will place a dot (`.`) between the given prefix and the cache key. This will automatically be overridden if your prefix ends with a non-alphanumeric character.

```
// Config: { prefix: 'foo' }
cache().put('bar', true); // => Cached under "foo.bar"

// Config: { prefix: 'foo-' }
cache().put('bar', true); // => Cached under "foo-bar"
```

 - `ttl` allows you to set a default cache time. By default all keys are cached indefinitely. It will accept either a `number` which represents the amount of seconds the key will be cached for. Or it will accept a `callback` which must return a `Date` instance of the time of expiration.

```
// Config: { ttl: 1000 * 60 * 5 } => Cache everything by default for 5 minutes.

// Config: { ttl: () => endOfToday() } => Use date-fns function to cache everything by default until the end of the current day.
```

## `RedisDriver`

If you want to use the `RedisDriver` you'll have to `npm i redis` and create a [redis](https://www.npmjs.com/package/redis) client to pass to the driver yourself.

```typescript
import { createClient } from 'redis';
import RedisDriver from '@jaspargupta/cache-manager/dist/drivers/redis';

const client = createClient();

const redisDriver = new RedisDriver(client);
```

## Writing your own drivers.

Each driver extends the `CacheDriver` base class, write the implementation for each of the abstract methods and voila!

```typescript
// my-cache-driver.ts
import CacheDriver from '@jaspargupta/cache-manager/dist/drivers/driver';

export default class MyCacheDriver extends CacheDriver {
  public flush() {
    // 🚽
  }

  public get() {
    // 🫱
  }

  public put() {
    // ⛳️
  }

  public remove() {
    // 🗑
  }
}

// cache.ts
const cache = register({
  main: new MyCacheDriver(),
}, 'main');

export default cache;
```

## API

### `register` function

```
const cache = register(drivers: Record<string, CacheDriver>, defaultDriver: string): (driver: string) => CacheDriver;
```

### `CacheDriver` instance

| Method                                    | Description                                                                                                                              |
|-------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `driver.api()`                            | Returns the underlying cache API.                                                                                                        |
| `driver.decrement(key, count)`            | Decrement the cache value. Optionally provide the amount to increment by. Sets cache to `0` if cache doesn't already exist.              |
| `driver.flush()`                          | Removed all cached items.                                                                                                                |
| `driver.get(key, fallback)`               | Retrieves a cached item by the provided key. Optionally provide default value if no cache is found.                                      |
| `driver.has(key)`                         | Returns whether cache exists.                                                                                                            |
| `driver.increment(key, count)`            | Increment the cache value. Optionally provide the amount to increment by. Sets cache to `0` if cache doesn't already exist.              |
| `driver.put(key, value, expires)`         | Store an item in the cache. Optionally set expires at argument.                                                                          |
| `driver.remember(key, callback, expires)` | Stores the return value of the callback in the cache for the provided key. Optionally set expires at argument. Supports async callbacks. |
| `driver.remove(key)`                      | Remove a cached item for the provided key.                                                                                               |
