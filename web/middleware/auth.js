const jwt = require('jsonwebtoken');
const User = require('../models/user');

function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username,
            // Add timestamp to help with token rotation
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.JWT_EXPIRES_IN,
            algorithm: 'HS256' // Explicitly specify algorithm
        }
    );
}

async function verifyToken(req, res, next) {
    try {
        // First check session
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user) {
                req.user = user;
                return next();
            }
        }

        // Then check JWT
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '未登录' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'] // Only allow HS256 algorithm
        });

        // Check token age for rotation
        const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
        if (tokenAge > 12 * 60 * 60) { // 12 hours
            // Generate new token
            const user = await User.findById(decoded.id);
            if (user) {
                const newToken = generateToken(user);
                res.cookie('token', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });
            }
        }

        req.user = await User.findById(decoded.id);
        if (!req.user) {
            throw new Error('User not found');
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '登录已过期，请重新登录' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '无效的登录信息' });
        }
        console.error('Authentication error:', error);
        return res.status(401).json({ error: '认证失败' });
    }
}

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts
    message: { error: '登录尝试次数过多，请15分钟后重试' }
});

module.exports = {
    generateToken,
    verifyToken
};
