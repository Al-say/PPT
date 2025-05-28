// Username validation: 3-20 characters, letters, numbers, underscore, hyphen
const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
};

// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

// Password validation: minimum 6 characters
const validatePassword = (password) => {
    return typeof password === 'string' && password.length >= 6;
};

// Theme validation
const validateTheme = (theme) => {
    return ['light', 'dark'].includes(theme);
};

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '请先登录' });
    }
    next();
};

module.exports = {
    validateUsername,
    validateEmail,
    validatePassword,
    validateTheme,
    requireAuth
};
