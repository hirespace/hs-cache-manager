import CacheTimeoutError from './cache-timeout-error';

/**
 * Wait for some cache work, and reject with a `CacheTimeoutError` if it has not settled by the deadline.
 *
 * THE WORK IS ABANDONED, NOT CANCELLED. A promise cannot be called off, so a node-redis command
 * that lost the race may still reach Redis, and a handshake that lost it keeps retrying in the
 * background. A rejection nothing waits for ends the process under Node's default
 * `--unhandled-rejections=throw`, so the abandoned work's late failure is swallowed here.
 *
 * The timer is always cleared, so a serverless function that answered is not kept alive by it.
 */
export default async function withinDeadline<T>(work: Promise<T>, what: string, limitMs: number): Promise<T> {
  work.catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new CacheTimeoutError(what, limitMs)), limitMs);
  });

  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
}
