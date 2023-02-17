import { Config as BaseConfig } from '../../types';

export default interface Config extends BaseConfig {
  maxConnectAttempts: number,
}
