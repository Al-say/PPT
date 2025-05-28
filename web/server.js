require('dotenv').config();
const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const vhost = require('vhost');

// 创建主应用和子应用
const mainApp = express();
const app = express();

// Rate limiting configurations
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log('Rate limit exceeded:', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
});

const authLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for auth routes
    message: { error: '登录尝试次数过多，请30分钟后重试' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log('Auth rate limit exceeded:', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({ error: '登录尝试次数过多，请30分钟后重试' });
    }
});

require('dotenv').config();

// Configure security headers
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
};

// 配置子应用
app.use(compression());

// Apply security headers
app.use(helmet(helmetConfig));

// Set up additional security options for express
app.set('trust proxy', 1); // trust first proxy if using one
app.disable('x-powered-by'); // disable X-Powered-By header

// Basic request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Security middleware
app.use(express.json({ limit: '10kb' })); // limit request body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// Apply rate limiting
app.use(generalLimiter); // Apply to all routes
app.use('/api/login', authLimiter); // Stricter limits on login
app.use('/api/register', authLimiter); // Stricter limits on register

// Serve static files with enhanced caching
app.use(express.static(__dirname, {
    maxAge: '7d', // Cache static files for 7 days
    etag: true,
    lastModified: true,
    immutable: true,
    cacheControl: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // Shorter cache for HTML files
            res.setHeader('Cache-Control', 'public, max-age=0');
        } else if (path.match(/\.(css|js|jpg|png|gif|svg)$/)) {
            // Longer cache for static assets
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));


const PORT = process.env.PORT || 3000;
const APP_HOST = process.env.APP_HOST || 'ppt.local';

// 将子应用挂载到主应用的虚拟主机
mainApp.use(vhost(APP_HOST, app));

// 设置默认路由处理
mainApp.use((req, res) => {
    res.redirect(`http://${APP_HOST}:${PORT}`);
});

// 监听所有主机
const server = mainApp.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://${APP_HOST}:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EACCES') {
        console.error(`Error: Port ${PORT} requires elevated privileges`);
    } else if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Starting graceful shutdown...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
});
