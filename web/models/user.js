const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

class User {
    static async createTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                email VARCHAR(100) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        try {
            await pool.query(createTableSQL);
            console.log('Users table created or already exists');
        } catch (error) {
            console.error('Error creating users table:', error);
            throw error;
        }
    }

    static validatePassword(password) {
        // At least 8 characters, containing letters and numbers
        const hasMinLength = password.length >= 8;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (!hasMinLength) throw new Error('密码长度至少为8位');
        if (!hasLetter || !hasNumber) throw new Error('密码必须包含字母和数字');
        
        return true;
    }

    static async create({ username, password, email }) {
        try {
            // Validate password complexity
            this.validatePassword(password);

            // Hash password with bcrypt
            const hashedPassword = await bcrypt.hash(password, 12); // Using 12 rounds for better security

            // Insert user
            const result = await pool.query(
                'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id',
                [username, hashedPassword, email]
            );
            
            return result.rows[0].id;
        } catch (error) {
            if (error.constraint === 'users_username_key') {
                throw new Error('用户名已存在');
            }
            if (error.constraint === 'users_email_key') {
                throw new Error('邮箱已被注册');
            }
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const result = await pool.query(
                'SELECT id, username, email, created_at FROM users WHERE id = $1',
                [id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error finding user by id:', error);
            throw error;
        }
    }

    static async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;
