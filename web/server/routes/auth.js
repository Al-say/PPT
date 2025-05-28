const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query, transaction } = require('../config/database');
const { validateEmail, validatePassword, validateUsername } = require('../utils/validation');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate inputs
        if (!validateUsername(username)) {
            return res.status(400).json({ error: '用户名应为3-20个字符，只能包含字母、数字、下划线和连字符' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ error: '请输入有效的电子邮箱地址' });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({ error: '密码必须至少包含6个字符' });
        }

        // Check if username or email already exists
        const existingUser = await query(
            'SELECT username, email FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            if (existingUser.rows[0].username === username) {
                return res.status(400).json({ error: '用户名已被使用' });
            }
            return res.status(400).json({ error: '邮箱已被注册' });
        }

        // Hash password and create user
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await transaction(async (client) => {
            // Create user
            const result = await client.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                [username, email, passwordHash]
            );

            // Create user preferences with default theme
            await client.query(
                'INSERT INTO user_preferences (user_id, theme) VALUES ($1, $2)',
                [result.rows[0].id, 'light']
            );
        });

        res.status(201).json({ message: '注册成功' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get user from database
        const result = await query(
            'SELECT id, username, password_hash FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // Update last login time
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Get user preferences
        const prefsResult = await query(
            'SELECT theme FROM user_preferences WHERE user_id = $1',
            [user.id]
        );

        res.json({
            user: {
                id: user.id,
                username: user.username,
                theme: prefsResult.rows[0]?.theme || 'light'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: '退出登录失败，请稍后重试' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: '已成功退出登录' });
    });
});

// Check authentication status
router.get('/check', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const result = await query(
            'SELECT users.id, users.username, user_preferences.theme FROM users LEFT JOIN user_preferences ON users.id = user_preferences.user_id WHERE users.id = $1',
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            req.session.destroy();
            return res.status(401).json({ authenticated: false });
        }

        res.json({
            authenticated: true,
            user: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                theme: result.rows[0].theme || 'light'
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ error: '验证用户状态失败' });
    }
});

module.exports = router;
