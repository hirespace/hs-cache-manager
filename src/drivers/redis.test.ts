import { createClient } from 'redis';

describe('RedisDriver', () => {
  describe('flush', () => {
    test('removes all keys from redis', async () => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyFlushAll = jest.spyOn(driver.api(), 'flushAll').mockImplementation();
      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());

      await driver.flush();

      // @ts-ignore
      expect(driver.api().flushAll).toHaveBeenCalled();

      spyFlushAll.mockRestore();
      spyConnect.mockRestore();
    });
  });

  describe('get', () => {
    test('returns "null" if no key is found and no fallback is provided', async () => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      const spyHas = jest.spyOn(driver, 'has').mockResolvedValue(false);

      expect(await driver.get('foo')).toBeNull();

      spyConnect.mockRestore();
      spyHas.mockRestore();
    });

    test('returns given fallback value if given key is not found', async () => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      const spyHas = jest.spyOn(driver, 'has').mockResolvedValue(false);

      expect(await driver.get('foo', 'baz')).toBe('baz');

      spyConnect.mockRestore();
      spyHas.mockRestore();
    });

    test('returns given fallback callback value if given key is not found', async () => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      const spyHas = jest.spyOn(driver, 'has').mockResolvedValue(false);
      const fallback = jest.fn(async () => 'baz');

      expect(await driver.get('foo', fallback)).toBe('baz');
      expect(fallback).toHaveBeenCalled();

      spyConnect.mockRestore();
      spyHas.mockRestore();
    });

    test('returns cache for given key', async () => {
      const expected = { test: true };

      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      const spyHas = jest.spyOn(driver, 'has').mockResolvedValue(true);
      // @ts-ignore
      const spyApiGet = jest.spyOn(driver.api(), 'get').mockResolvedValue(JSON.stringify(expected));
      const fallback = jest.fn(async () => 'bar');

      expect(await driver.get('foo', fallback)).toEqual(expected);
      expect(fallback).not.toHaveBeenCalled();

      spyConnect.mockRestore();
      spyHas.mockRestore();
      spyApiGet.mockRestore();
    });
  });

  describe('has', () => {
    test.each([true, false])('[%p] returns whether a key exists in the cache', async (exists) => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      // @ts-ignore
      const spyApiExists = jest.spyOn(driver.api(), 'exists').mockResolvedValue(exists);

      expect(await driver.has('foo')).toBe(exists);
      expect(spyApiExists).toHaveBeenCalledWith('foo');

      spyConnect.mockRestore();
      spyApiExists.mockRestore();
    });
  });

  describe('put', () => {
    test.each([null, new Date()])('%# stores an item in the cache with the given key', async (expires) => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      // @ts-ignore
      const spySet = jest.spyOn(driver.api(), 'set').mockResolvedValue('OK');
      // @ts-ignore

      const actual = await driver.put('foo', 'bar', expires);

      expect(actual).toBe('bar');
      expect(spySet).toHaveBeenCalledWith('foo', JSON.stringify('bar'), expires ? { PXAT: expires.getTime() } : {});

      spyConnect.mockRestore();
      spySet.mockRestore();
    });
  });

  describe('remember', () => {
    test.each<[string | null, string]>([
      [null, 'baz'],
      ['bar', 'bar']
    ])('%# returns the cached item if it exists else return the value of the callback', async (cache, expected) => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyGet = jest.spyOn(driver, 'get').mockResolvedValue(cache);
      const spyPut = jest.spyOn(driver, 'put').mockImplementation((_key, value, _expires) => Promise.resolve(value));

      const callback = jest.fn(() => 'baz');

      const actual = await driver.remember('foo', callback);

      expect(actual).toBe(expected);
      expect(spyGet).toHaveBeenCalledWith('foo');

      if (cache === null) {
        expect(spyPut).toHaveBeenCalledWith('foo', 'baz', null);
        expect(callback).toHaveBeenCalled();
      } else {
        expect(spyPut).not.toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
      }

      spyGet.mockRestore();
      spyPut.mockRestore();
    });
  });

  describe('remove', () => {
    test('removes a key from the cache', async () => {
      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyConnect = jest.spyOn(driver, 'connect').mockImplementation(callback => callback());
      // @ts-ignore
      const spyDel = jest.spyOn(driver.api(), 'del').mockImplementation();

      await driver.remove('foo');

      expect(spyDel).toHaveBeenCalledWith('foo');

      spyConnect.mockRestore();
      spyDel.mockRestore();
    });
  });

  describe('connect', () => {
    test('connects to Redis if not already connected and return given callback value', async () => {      
      jest.useFakeTimers({
        advanceTimers: 0,
        legacyFakeTimers: false,
        now: new Date('2020-01-01'),
        timerLimit: 1000,
      });

      const { default: RedisDriver } = await import('./redis');
      const driver = new RedisDriver(createClient());

      // @ts-ignore
      const spyIsOpen = jest.spyOn(driver.store, 'isOpen', 'get').mockReturnValue(false);

      // @ts-ignore
      const spyConnect = jest.spyOn(driver.store, 'connect').mockImplementation(async () => {
        // @ts-ignore
        spyIsOpen.mockReset().mockReturnValue(true);
        // driver.store.isOpen = true;
      });
      // @ts-ignore
      const spyQuit = jest.spyOn(driver.store, 'quit').mockImplementation(async () => {
        // @ts-ignore
        spyIsOpen.mockReset().mockReturnValue(false);
        // driver.store.isOpen = false;
      });

      const callback = jest.fn().mockResolvedValue('foo');

      // @ts-ignore
      await driver.connect(callback);

      expect(spyConnect).toHaveBeenCalled();
      // @ts-ignore
      expect(driver.store.isOpen).toBe(true);
      expect(callback).toHaveBeenCalled();

      // Fast forward time to ensure all set timeouts are executed
      jest.advanceTimersByTime(60_000); // Advance time by a minute

      expect(spyQuit).toHaveBeenCalled();
      // @ts-ignore
      expect(driver.store.isOpen).toBe(false);

      jest.useRealTimers();
      spyConnect.mockRestore();
      spyQuit.mockRestore();
    });
  });
});

/*
 * HS-20198. node-redis sets `isOpen` as soon as `connect()` starts and queues commands until
 * `isReady`, retries a refused handshake for ever and has no command timeout, so a Redis that
 * would not answer held hs-360 requests until Vercel killed them at 700 seconds.
 */
describe('RedisDriver, against a Redis that does not answer', () => {
  const never = <T>() => new Promise<T>(() => { /* never settles */ });

  /* Lets the awaits between the steps of `connect` run, which fake timers do not advance. */
  const settle = async () => {
    for (let turn = 0; turn < 50; turn += 1) await Promise.resolve();
  };

  const setup = async ({ isOpen, isReady }: { isOpen: boolean; isReady: boolean }) => {
    const { default: RedisDriver, COMMAND_DEADLINE_MS } = await import('./redis');
    const { default: CacheTimeoutError } = await import('../support/cache-timeout-error');
    const client = createClient();
    const driver = new RedisDriver(client);
    const state = { isOpen, isReady };

    jest.spyOn(client, 'isOpen', 'get').mockImplementation(() => state.isOpen);
    jest.spyOn(client, 'isReady', 'get').mockImplementation(() => state.isReady);
    const connect = jest.spyOn(client, 'connect');
    const exists = jest.spyOn(client, 'exists');
    jest.spyOn(client, 'quit').mockImplementation(async () => 'OK');

    return { client, driver, state, connect, exists, COMMAND_DEADLINE_MS, CacheTimeoutError };
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('runs a command on a ready client without opening it again', async () => {
    const { driver, connect, exists } = await setup({ isOpen: true, isReady: true });
    exists.mockResolvedValue(1);

    await expect(driver.has('foo')).resolves.toBe(true);
    expect(connect).not.toHaveBeenCalled();
  });

  test('waits for a client that is open but still connecting, rather than sending into its queue', async () => {
    const { client, driver, state, connect, exists } = await setup({ isOpen: true, isReady: false });
    exists.mockResolvedValue(0);

    const outcome = driver.has('foo');
    await settle();
    expect(exists).not.toHaveBeenCalled();

    state.isReady = true;
    client.emit('ready');

    await expect(outcome).resolves.toBe(false);
    expect(connect).not.toHaveBeenCalled();
    expect(client.listenerCount('ready')).toBe(0);
  });

  test('gives a client that never finishes connecting up at the deadline, and stops listening for it', async () => {
    const { client, driver, exists, COMMAND_DEADLINE_MS, CacheTimeoutError } = await setup({ isOpen: true, isReady: false });

    const outcome = driver.has('foo');
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS);

    await expect(outcome).rejects.toBeInstanceOf(CacheTimeoutError);
    expect(exists).not.toHaveBeenCalled();
    expect(client.listenerCount('ready')).toBe(0);
  });

  test('gives a handshake that never completes up at the deadline', async () => {
    const { driver, connect, exists, COMMAND_DEADLINE_MS, CacheTimeoutError } = await setup({ isOpen: false, isReady: false });
    connect.mockImplementation(never);

    const outcome = driver.has('foo');
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS);

    await expect(outcome).rejects.toBeInstanceOf(CacheTimeoutError);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(exists).not.toHaveBeenCalled();
  });

  /* A write that may have landed must not be repeated: a second INCRBY would count twice. */
  test('gives a command that never answers up at the deadline, and does not send it again', async () => {
    const { client, driver, COMMAND_DEADLINE_MS, CacheTimeoutError } = await setup({ isOpen: true, isReady: true });
    const incrBy = jest.spyOn(client, 'incrBy').mockImplementation(never);

    const outcome = driver.increment('foo', 25);
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS);

    await expect(outcome).rejects.toBeInstanceOf(CacheTimeoutError);
    expect(incrBy).toHaveBeenCalledTimes(1);
  });

  /* The fallback is the caller's own work, not a Redis command, so the deadline must not cut it short. */
  test('lets a slow fallback for a missing key take as long as it needs', async () => {
    const { driver, exists, COMMAND_DEADLINE_MS } = await setup({ isOpen: true, isReady: true });
    exists.mockResolvedValue(0);
    const fallback = () => new Promise<string>(resolve => { setTimeout(() => resolve('computed'), COMMAND_DEADLINE_MS + 100); });

    const outcome = driver.get('foo', fallback);
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS + 100);

    await expect(outcome).resolves.toBe('computed');
  });

  /* Otherwise a command that timed out leaves an idle connection nothing ever closes. */
  test('still quits the idle client after a command that timed out', async () => {
    const { client, driver, COMMAND_DEADLINE_MS, CacheTimeoutError } = await setup({ isOpen: true, isReady: true });
    jest.spyOn(client, 'exists').mockImplementation(never);

    const outcome = driver.has('foo');
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS);
    await expect(outcome).rejects.toBeInstanceOf(CacheTimeoutError);

    jest.advanceTimersByTime(5_000);
    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  /* `get` runs `has` inside its own connect: two arms must leave one timer, not an orphan. */
  test('leaves a single idle timer after a nested read', async () => {
    const { client, driver } = await setup({ isOpen: true, isReady: true });
    jest.spyOn(client, 'exists').mockResolvedValue(1);
    jest.spyOn(client, 'get').mockResolvedValue(JSON.stringify('bar'));

    await expect(driver.get('foo')).resolves.toBe('bar');
    expect(jest.getTimerCount()).toBe(1);
  });

  test('takes an answer that arrives just inside the deadline', async () => {
    const { driver, exists, COMMAND_DEADLINE_MS } = await setup({ isOpen: true, isReady: true });
    exists.mockImplementation(() => new Promise(resolve => { setTimeout(() => resolve(1), COMMAND_DEADLINE_MS - 1); }));

    const outcome = driver.has('foo');
    await settle();
    jest.advanceTimersByTime(COMMAND_DEADLINE_MS - 1);

    await expect(outcome).resolves.toBe(true);
  });
});
