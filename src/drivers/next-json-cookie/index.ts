import nextCookies from 'cookies-next';
import { CookieSerializeOptions } from 'cookie';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import CacheDriver from '../driver';
import { CookieValueTypes, OptionsType } from 'cookies-next/lib/types';
import DEFAULT_COOKIE_OPTIONS from './default-cookie-options';
import { decryptCookie, encryptCookie } from './encrypt-cookie';
import JSONValue from '../types/json';

interface Config extends CookieSerializeOptions {
  crypto?: typeof AES,
  encoder?: typeof Utf8,
  prefix?: string,
}

class NextCookieDriver<TmpCookiesObj> extends CacheDriver<typeof nextCookies> {

  #config?: CookieSerializeOptions;
  #crypto?: typeof AES;
  #encoder?: typeof Utf8;
  #prefix?: string;

  constructor(protected store: typeof nextCookies, config: Config = {}) {
    super();

    const { 
      crypto, 
      encoder, 
      prefix = 'hs_cache_', 
      ...cookieOptions 
    } = config;

    this.#config = cookieOptions;
    this.#crypto = crypto;
    this.#encoder = encoder;
    this.#prefix = prefix;
  }

  public flush(options?: OptionsType): void {
    Object.keys(this.getAll()).forEach(this.store.deleteCookie);
  }

  public get<T = JSONValue>(key: string, fallback: T | null = null, options?: OptionsType): T | null {
    if (this.has(key)) {
      try {
        const cookieValue = this.store.getCookie(`${CACHE_MANAGER_COOKIE_NAMESPACE}${key}`, options) as string;
        return decryptCookie(cookieValue, this.#crypto, this.#encoder) as unknown as T;
      } catch (error) {
        return fallback;
      }
    }

    return fallback;
  }

  public getAll<T = JSONValue>() {
    return Object.entries(this.store.getCookies()).reduce((cookies, [name, value]) => {
      return { ...cookies, [name.substring(CACHE_MANAGER_COOKIE_NAMESPACE.length)]: decryptCookie(value ?? '', this.#crypto, this.#encoder) as unknown as T };
    }, {});
  }

  public has(key: string, options?: OptionsType): boolean {
    return this.store.hasCookie(`${CACHE_MANAGER_COOKIE_NAMESPACE}${key}`, options);
  }

  public put<T = CookieValueTypes>(key: string, value: T, expires?: Date | null, options?: OptionsType): T {
    const cookieValue = encryptCookie(value, this.#crypto, this.#encoder);
    this.store.setCookie(`${CACHE_MANAGER_COOKIE_NAMESPACE}${key}`,cookieValue, expires
      ? { ...DEFAULT_COOKIE_OPTIONS, ...this.#config, ...options, expires  }
      : { ...DEFAULT_COOKIE_OPTIONS, ...this.#config, ...options }
    );
    return value;
  }

  public remove(key: string): void {
    this.store.deleteCookie(`${CACHE_MANAGER_COOKIE_NAMESPACE}${key}`);
  }

}

export default NextCookieDriver;