type Bucket = { timestamps: number[] };

/** Lightweight process-local limiter. Production should use a shared store when horizontally scaled. */
export class MarketplaceRateLimiter {
  private static buckets = new Map<string, Bucket>();

  static async acquire(key: string, limit = 10, windowMs = 1000): Promise<void> {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);
    if (bucket.timestamps.length >= limit) {
      const waitMs = windowMs - (now - bucket.timestamps[0]);
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, waitMs)));
      return this.acquire(key, limit, windowMs);
    }
    bucket.timestamps.push(Date.now());
    this.buckets.set(key, bucket);
  }
}
