import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.EXPO_PUBLIC_UPSTASH_URL || '',
  token: process.env.EXPO_PUBLIC_UPSTASH_TOKEN || '',
});
