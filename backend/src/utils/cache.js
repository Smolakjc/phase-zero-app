/**
 * Cache em memória com TTL e deduplicação de chamadas simultâneas.
 *
 * O frontend refaz a análise a cada clique em um filtro; sem cache cada clique
 * baixaria de novo granules de centenas de MB. Guardamos a *promessa*, então
 * duas requisições iguais ao mesmo tempo compartilham o mesmo trabalho.
 * Falhas nunca ficam em cache.
 */
export function createCache({ ttlMs, maxEntries = 64 }) {
  const entries = new Map(); // chave -> { promise, expiresAt }

  return {
    getOrLoad(key, loader) {
      const now = Date.now();
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now) return hit.promise;

      const promise = loader();
      entries.set(key, { promise, expiresAt: now + ttlMs });
      promise.catch(() => entries.delete(key));

      // Remove o item mais antigo quando passa do limite (Map preserva a ordem de inserção).
      if (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value);
      }
      return promise;
    },
  };
}
