const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/db-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/db.log' })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'presentation_db',
    port: process.env.DB_PORT || 5432,
    // Pool configuration
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients
    min: parseInt(process.env.DB_POOL_MIN || '4'), // Minimum number of idle clients
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
    maxUses: 7500, // Close and replace a connection after it has been used 7500 times
    // Connection retry configuration
    retry_strategy: {
        retries: 5,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 60000
    }
};

const pool = new Pool(poolConfig);

// Event handling
pool.on('connect', () => {
    logger.info('New client connected to the database');
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
});

pool.on('remove', () => {
    logger.info('Client removed from pool');
});

// Helper function to retry database operations
async function withRetry(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            logger.warn(`Database operation failed, attempt ${i + 1}/${maxRetries}`, { error: error.message });
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    throw lastError;
}

// Test database connection with retry mechanism
async function testConnection() {
    return withRetry(async () => {
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()');
            logger.info('Database connection successful');
        } finally {
            client.release();
        }
    });
}

// Healthcheck function
async function healthCheck() {
    try {
        const result = await withRetry(async () => {
            const client = await pool.connect();
            try {
                const start = Date.now();
                await client.query('SELECT 1');
                return Date.now() - start;
            } finally {
                client.release();
            }
        });
        return { status: 'healthy', responseTime: result };
    } catch (error) {
        logger.error('Database healthcheck failed', error);
        return { status: 'unhealthy', error: error.message };
    }
}

// Cleanup function for graceful shutdown
async function cleanup() {
    try {
        await pool.end();
        logger.info('Database pool has been closed');
    } catch (error) {
        logger.error('Error while closing database pool', error);
        throw error;
    }
}

module.exports = {
    pool,
    testConnection,
    healthCheck,
    cleanup,
    withRetry
};
