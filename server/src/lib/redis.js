const redis = require('redis');
const logger = require('../config/logger');
require('dotenv').config();

let redisClient = null;
let redisUnavailable = false;

const getRedisClient = async () => {
  if (redisUnavailable) return null;
  if (redisClient) return redisClient;

  try {
    let redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      const host = process.env.REDIS_HOST || '127.0.0.1';
      const port = process.env.REDIS_PORT || '6379';
      const password = process.env.REDIS_PASSWORD;
      if (password) {
        redisUrl = `redis://:${password}@${host}:${port}`;
      } else {
        redisUrl = `redis://${host}:${port}`;
      }
    }
    console.log("Redis URL:", redisUrl);

    redisClient = redis.createClient({ 
      url: redisUrl, 
      socket: { 
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis reconnection limit reached, disabling Redis cache');
            redisUnavailable = true;
            return new Error('Redis connection retry limit reached');
          }
          return 1000;
        }
      } 
    });
    
    redisClient.on('error', (err) => {
      logger.debug('Redis client error event triggered');
    });
    
    await redisClient.connect();
    console.log("Redis Connected");
    logger.info('Connected to Redis successfully');
  } catch (error) {
    logger.warn('Redis is not available. Caching fallback to database.');
    redisClient = null;
    redisUnavailable = true;
  }
  return redisClient;
};

module.exports = {
  getRedisClient
};
