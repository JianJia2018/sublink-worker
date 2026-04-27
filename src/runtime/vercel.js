import Redis from 'ioredis';
import { createFileAssetFetcher } from '../adapters/assets/fileAssetFetcher.js';
import { UpstashKVAdapter } from '../adapters/kv/upstashKv.js';
import { MemoryKVAdapter } from '../adapters/kv/memoryKv.js';
import { RedisKVAdapter } from '../adapters/kv/redisKv.js';

export function createVercelRuntime(env = process.env) {
    return {
        kv: resolveKv(env),
        assetFetcher: createFileAssetFetcher('public'),
        logger: console,
        config: {
            configTtlSeconds: undefined,
            shortLinkTtlSeconds: null
        }
    };
}

function resolveKv(env) {
    const redisAdapter = createRedisAdapter(env);
    if (redisAdapter) {
        return redisAdapter;
    }
    const kvUrl = env.KV_REST_API_URL || env.sub_KV_REST_API_URL;
    const kvToken = env.KV_REST_API_TOKEN || env.sub_KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
        return new UpstashKVAdapter({
            url: kvUrl,
            token: kvToken
        });
    }
    return new MemoryKVAdapter();
}

function createRedisAdapter(env) {
    const connection = buildRedisConnection(env);
    if (!connection) {
        return null;
    }
    const client = connection.url
        ? new Redis(connection.url, connection.options)
        : new Redis(connection.options);
    return new RedisKVAdapter({
        client,
        prefix: connection.prefix,
        manageConnection: true
    });
}

function buildRedisConnection(env) {
    const prefix = env.REDIS_KEY_PREFIX || undefined;
    const commonOptions = buildCommonRedisOptions(env);
    const redisUrl = env.REDIS_URL || env.sub_REDIS_URL;
    if (redisUrl) {
        return {
            url: redisUrl,
            prefix,
            options: commonOptions
        };
    }
    const redisHost = env.REDIS_HOST || env.sub_REDIS_HOST;
    const redisPort = env.REDIS_PORT || env.sub_REDIS_PORT;
    if (redisHost && redisPort) {
        return {
            prefix,
            options: {
                ...commonOptions,
                host: redisHost,
                port: Number(redisPort)
            }
        };
    }
    return null;
}

function buildCommonRedisOptions(env) {
    const options = {};
    if (env.REDIS_USERNAME) {
        options.username = env.REDIS_USERNAME;
    }
    if (env.REDIS_PASSWORD) {
        options.password = env.REDIS_PASSWORD;
    }
    if (env.REDIS_TLS === 'true') {
        options.tls = {};
    }
    return options;
}
