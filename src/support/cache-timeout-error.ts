/**
 * The cache did not answer within its deadline.
 *
 * Its own type so a caller that treats an unreachable cache as a miss can tell this apart from a
 * cache that answered with an error.
 */
export default class CacheTimeoutError extends Error {
  constructor(what: string, limitMs: number) {
    super(`Cache gave up ${what} after ${limitMs}ms`);
    this.name = 'CacheTimeoutError';
  }
}
