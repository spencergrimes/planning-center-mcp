interface RateLimiterOptions {
  tokensPerInterval: number;
  interval: number; // in milliseconds
  fireImmediately?: boolean;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly tokensPerInterval: number;
  private readonly interval: number;
  private readonly fireImmediately: boolean;

  constructor(options: RateLimiterOptions) {
    this.tokensPerInterval = options.tokensPerInterval;
    this.interval = options.interval;
    this.fireImmediately = options.fireImmediately ?? false;
    this.tokens = this.fireImmediately ? this.tokensPerInterval : 0;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastRefill;
    
    if (timeSinceLastRefill >= this.interval) {
      const tokensToAdd = Math.floor(timeSinceLastRefill / this.interval) * this.tokensPerInterval;
      this.tokens = Math.min(this.tokensPerInterval, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.refill();
    
    if (this.tokens <= 0) {
      const waitTime = this.interval - (Date.now() - this.lastRefill);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.refill();
      }
    }

    if (this.tokens <= 0) {
      throw new Error('Rate limit exceeded');
    }

    this.tokens--;
    return await fn();
  }

  getTokensRemaining(): number {
    this.refill();
    return this.tokens;
  }

  getTimeUntilRefill(): number {
    const timeSinceLastRefill = Date.now() - this.lastRefill;
    return Math.max(0, this.interval - timeSinceLastRefill);
  }
}