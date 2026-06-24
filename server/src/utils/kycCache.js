const logger = require('../config/logger');

// In-memory cache map
const cache = new Map();
const MAX_CACHE_SIZE = 500;

// Background garbage collection to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let evictedCount = 0;
  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) {
      cache.delete(key);
      evictedCount++;
    }
  }
  if (evictedCount > 0) {
    logger.info(`KYC status cache background GC: Evicted ${evictedCount} expired entries`);
  }
}, 60000);

// Prevent cleanup timer from blocking process exit in test or server shutdown
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

class KycCache {
  /**
   * Get cached KYC status data for a user
   * @param {number} userId 
   * @returns {object|null}
   */
  static get(userId) {
    const key = `kyc_status_${userId}`;
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }

    logger.info(`KYC status cache hit for user ID: ${userId}`);
    return entry.data;
  }

  /**
   * Set cached KYC status data for a user (expires in 60s)
   * Evicts oldest entry if cache exceeds MAX_CACHE_SIZE (FIFO)
   * @param {number} userId 
   * @param {object} data 
   */
  static set(userId, data) {
    const key = `kyc_status_${userId}`;
    
    // Eviction policy: Maximum cache size = 500 users
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
        logger.warn(`KYC status cache size limit reached. Evicting oldest entry: ${oldestKey}`);
      }
    }

    cache.set(key, {
      data,
      expiry: Date.now() + 60 * 1000 // 60 seconds
    });
    logger.info(`KYC status cache populated for user ID: ${userId}`);
  }

  /**
   * Invalidate cached entry for a user
   * @param {number} userId 
   */
  static invalidate(userId) {
    const key = `kyc_status_${userId}`;
    if (cache.has(key)) {
      cache.delete(key);
      logger.info(`KYC status cache invalidated for user ID: ${userId}`);
    }
  }

  /**
   * Clear all cache entries
   */
  static clear() {
    cache.clear();
    logger.info('KYC status cache cleared completely');
  }
}

module.exports = KycCache;
