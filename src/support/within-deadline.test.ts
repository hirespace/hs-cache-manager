import CacheTimeoutError from './cache-timeout-error';
import withinDeadline from './within-deadline';

const never = <T>() => new Promise<T>(() => { /* never settles */ });

describe('withinDeadline', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('hands back what the work answered, and leaves no timer behind', async () => {
    await expect(withinDeadline(Promise.resolve('foo'), 'reading', 100)).resolves.toBe('foo');
    expect(jest.getTimerCount()).toBe(0);
  });

  test('passes the work\'s own failure through unchanged', async () => {
    const failure = new Error('ERR wrong type');

    await expect(withinDeadline(Promise.reject(failure), 'reading', 100)).rejects.toBe(failure);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('rejects with a CacheTimeoutError naming the step once the deadline passes', async () => {
    const outcome = withinDeadline(never(), 'opening the client', 100);

    jest.advanceTimersByTime(100);

    await expect(outcome).rejects.toThrow(new CacheTimeoutError('opening the client', 100));
    await expect(outcome).rejects.toBeInstanceOf(CacheTimeoutError);
  });

  test('does not give up a moment early', async () => {
    const work = new Promise<string>(resolve => { setTimeout(() => resolve('late but in time'), 99); });
    const outcome = withinDeadline(work, 'reading', 100);

    jest.advanceTimersByTime(99);

    await expect(outcome).resolves.toBe('late but in time');
  });
});
