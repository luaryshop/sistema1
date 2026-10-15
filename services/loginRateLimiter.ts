type Bucket = { attempts: number; windowStartedAt: number };

/**
 * Limitador de tentativas de login — diferente do MarketplaceRateLimiter
 * (que enfileira e espera), este REJEITA com erro após o limite, porque
 * pra brute-force de senha o objetivo é bloquear, não só atrasar.
 *
 * Processo local (Map em memória). Se a aplicação rodar em múltiplas
 * instâncias (mais de um servidor atrás de um load balancer), cada
 * instância guarda sua própria contagem — para um limite compartilhado
 * de verdade nesse cenário, trocar por um store compartilhado (Redis).
 */
export class LoginRateLimiter {
  private static buckets = new Map<string, Bucket>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60_000; // 15 minutos

  /** Lança erro se o identificador (ex.: IP) já esgotou as tentativas na janela atual. */
  static checkAndConsume(key: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt > this.WINDOW_MS) {
      this.buckets.set(key, { attempts: 1, windowStartedAt: now });
      return;
    }

    if (bucket.attempts >= this.MAX_ATTEMPTS) {
      const waitMinutes = Math.ceil((this.WINDOW_MS - (now - bucket.windowStartedAt)) / 60_000);
      throw new Error(`Muitas tentativas de login. Tente novamente em ${waitMinutes} minuto(s).`);
    }

    bucket.attempts += 1;
  }

  /** Chamar após um login bem-sucedido, para não penalizar o próximo acesso legítimo. */
  static reset(key: string): void {
    this.buckets.delete(key);
  }
}
