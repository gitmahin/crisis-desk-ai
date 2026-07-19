import { createClient, type RedisClientType } from "redis";

export const createRedisClient = (
    REDIS_USERNAME: string, REDIS_PASS: string, REDIS_HOST: string, REDIS_PORT: number
): RedisClientType => {

    return createClient({
        username: REDIS_USERNAME,
        password: REDIS_PASS,
        disableOfflineQueue: true, // disable queuing data when connection is down.
        socket: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
            reconnectStrategy: (retries) => {
                // Generate a random jitter between 0 – 100 ms:
                const jitter = Math.floor(Math.random() * 100);

                // Delay is an exponential backoff, (2^retries) * 50 ms, with a
                // maximum value of 3000 ms:
                const delay = Math.min(Math.pow(2, retries) * 50, 3000);

                return delay + jitter;
            },
            connectTimeout: 10000, // in milliseconds

            // tls: true,
            // key: fs.readFileSync('./redis_user_private.key'),
            // cert: fs.readFileSync('./redis_user.crt'),
            // ca: [fs.readFileSync('./redis_ca.pem')]
        },
    });

}

