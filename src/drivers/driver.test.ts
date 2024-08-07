/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-explicit-any,class-methods-use-this,@typescript-eslint/no-unused-vars */
import valueOf from '../support/value-of';
import CacheDriver from './driver';
import { Promisable } from './types';

class TestDriver extends CacheDriver<any> {
  flush(): void {
    //
  }

  get<T>(key: string | number): Promisable<T | null>;
  get<T>(key: string | number, fallback: T): Promisable<T>;
  get<T>(key: string | number, fallback: T = null as unknown as T): Promisable<T | null> {
    return null;
  }

  put<T>(key: string | number, value: T, date: Date | null = null): Promise<T> | T {
    return value;
  }

  remove(key: string): void {
    //
  }
}

describe('driver', () => {
  let driver: TestDriver;

  beforeEach(() => {
    driver = new TestDriver();
  });

  describe('decrement', () => {
    test('decrements the cache value for the given key by "1" if no count value is give', () => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(0);
      const spyPut = jest.spyOn(driver, 'put');

      expect(driver.decrement('foo')).toBe(-1);
      expect(spyGet).toHaveBeenCalledWith('foo', 0);
      expect(spyPut).toHaveBeenCalledWith('foo', -1);

      spyGet.mockRestore();
      spyPut.mockRestore();
    });

    test.each([
      [0, 1, -1],
      [7, 1, 6],
      [2, 3, -1],
    ])('decrements the cache value for the given key with the given count', (initial, count, expected) => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(initial);
      const spyPut = jest.spyOn(driver, 'put');

      expect(driver.decrement('foo', count)).toBe(expected);
      expect(spyGet).toHaveBeenCalledWith('foo', 0);
      expect(spyPut).toHaveBeenCalledWith('foo', expected);

      spyGet.mockRestore();
      spyPut.mockRestore();
    });
  });

  describe('has', () => {
    test.each<[boolean, any]>([
      [false, null],
      [true, false],
      [true, 0],
      [true, 'foo'],
      [false, Promise.resolve(null)],
      [true, Promise.resolve(false)],
      [true, Promise.resolve(0)],
      [true, Promise.resolve('foo')],
    ])('returns whether a cache item exists for the provided key', (expected, cache) => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(cache);

      cache instanceof Promise
        ? expect(driver.has('key')).resolves.toBe(expected)
        : expect(driver.has('key')).toBe(expected);

      spyGet.mockRestore();
    });
  });

  describe('increment', () => {
    test('increments the cache value for the given key by "1" if no count value is give', () => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(0);
      const spyPut = jest.spyOn(driver, 'put');

      expect(driver.increment('foo')).toBe(1);
      expect(spyGet).toHaveBeenCalledWith('foo', 0);
      expect(spyPut).toHaveBeenCalledWith('foo', 1);

      spyGet.mockRestore();
      spyPut.mockRestore();
    });

    test.each([
      [0, 1, 1],
      [7, 1, 8],
      [2, 3, 5],
    ])('increments the cache value for the given key with the given count', (initial, count, expected) => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(initial);
      const spyPut = jest.spyOn(driver, 'put');

      expect(driver.increment('foo', count)).toBe(expected);
      expect(spyGet).toHaveBeenCalledWith('foo', 0);
      expect(spyPut).toHaveBeenCalledWith('foo', expected);

      spyGet.mockRestore();
      spyPut.mockRestore();
    });
  });

  describe('remember', () => {
    test('caches the callback value if key does not exist', () => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(null);
      const spyPut = jest.spyOn(driver, 'put');

      const callback = jest.fn().mockReturnValue('bar');

      const actual = driver.remember('foo', callback);

      expect(actual).toBe('bar');
      expect(spyGet).toHaveBeenCalledWith('foo');
      expect(spyPut).toHaveBeenCalledWith('foo', 'bar', null);
      expect(callback).toHaveBeenCalled();

      spyGet.mockRestore();
      spyPut.mockRestore();
    });

    test('if the callback value gives null, then return the fallback value', () => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(null);
      const spyPut = jest.spyOn(driver, 'put');

      const callback = jest.fn().mockReturnValue(null);

      const actual = driver.remember('foo', callback, null, 'fizz');

      expect(actual).toBe('fizz');
      expect(spyGet).toHaveBeenCalledWith('foo');
      expect(spyPut).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();

      spyGet.mockRestore();
      spyPut.mockRestore();
    });

    test('caches the callback value when result is a "Promise" if key does not exist', async () => {
      const spyGet = jest.spyOn(driver, 'get').mockReturnValue(null);
      const spyPut = jest.spyOn(driver, 'put');

      const callback = jest.fn().mockResolvedValue('bar');

      const actual = await driver.remember('foo', callback);

      expect(actual).toBe('bar');
      expect(spyGet).toHaveBeenCalledWith('foo');
      expect(spyPut).toHaveBeenCalledWith('foo', 'bar', null);
      expect(callback).toHaveBeenCalled();

      spyGet.mockRestore();
      spyPut.mockRestore();
    });
  });

  describe('expires', () => {
    test('returns null if given value is null and ttl is not set', () => {
      // @ts-ignore
      driver.config.ttl = null;

      // @ts-ignore
      expect(driver.expires(null)).toBeNull();
    });

    test('returns given value if not null', () => {
      // @ts-ignore
      driver.config.ttl = null;

      const expires = new Date();

      // @ts-ignore
      expect(driver.expires(expires)).toBe(expires);
    });

    test.each<[number, number | (() => Date)]>([
      [60000, 60],
      [new Date(2023, 9, 4, 10, 33).getTime(), () => new Date(2023, 9, 4, 10, 33)]
    ])('%# returns date of expiration if null is given and ttl is set', (expected, seconds) => {
      // @ts-ignore
      driver.config.ttl = seconds;

      const spyNow = jest.spyOn(Date, 'now').mockImplementation(() => 0);

      // @ts-ignore
      expect(driver.expires(null).getTime()).toBe(expected);

      spyNow.mockRestore();
    });
  });

  describe('key', () => {
    test.each([
      ['foo', 'foo'],
      [10, '10']
    ])('converts the given key to a string value', (value, expected) => {
      // @ts-ignore
      expect(driver.key(value)).toBe(expected);
    });

    test.each<[string, string]>([
      ['', 'test'],
      ['prefix', 'prefix.test'],
      ['prefix.', 'prefix.test'],
      ['prefix:', 'prefix:test'],
      ['prefix-', 'prefix-test'],
      ['prefix_', 'prefix_test'],
    ])('applies prefix to given key', (prefix, expected) => {
      // @ts-ignore
      driver.config.prefix = prefix;

      // @ts-ignore
      expect(driver.key('test')).toBe(expected);
    });
  });
});
