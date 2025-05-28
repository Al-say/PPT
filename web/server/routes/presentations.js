const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../utils/validation');

// Get all presentations
router.get('/', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, title, slug, description, thumbnail_url, created_at FROM presentations ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching presentations:', error);
        res.status(500).json({ error: '获取演示文稿列表失败' });
    }
});

// Get presentation by slug
router.get('/:slug', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, title, slug, description, thumbnail_url, created_at FROM presentations WHERE slug = $1',
            [req.params.slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '演示文稿不存在' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching presentation:', error);
        res.status(500).json({ error: '获取演示文稿失败' });
    }
});

// Get user's view history
router.get('/history/user', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                p.id,
                p.title,
                p.slug,
                p.description,
                p.thumbnail_url,
                vh.viewed_at
            FROM view_history vh
            JOIN presentations p ON vh.presentation_id = p.id
            WHERE vh.user_id = $1
            ORDER BY vh.viewed_at DESC
            LIMIT 10
        `, [req.session.userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching view history:', error);
        res.status(500).json({ error: '获取浏览历史失败' });
    }
});

// Record view history
router.post('/history/:presentationId', requireAuth, async (req, res) => {
    try {
        // Check if presentation exists
        const presentation = await query(
            'SELECT id FROM presentations WHERE id = $1',
            [req.params.presentationId]
        );

        if (presentation.rows.length === 0) {
            return res.status(404).json({ error: '演示文稿不存在' });
        }

        // Record view
        await query(`
            INSERT INTO view_history (user_id, presentation_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, presentation_id, viewed_at)
            DO UPDATE SET viewed_at = CURRENT_TIMESTAMP
        `, [req.session.userId, req.params.presentationId]);

        res.json({ message: '浏览记录已保存' });
    } catch (error) {
        console.error('Error recording view history:', error);
        res.status(500).json({ error: '保存浏览记录失败' });
    }
});

// Get most viewed presentations
router.get('/popular/views', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                p.id,
                p.title,
                p.slug,
                p.description,
                p.thumbnail_url,
                COUNT(vh.id) as view_count
            FROM presentations p
            LEFT JOIN view_history vh ON p.id = vh.presentation_id
            GROUP BY p.id
            ORDER BY view_count DESC, p.created_at DESC
            LIMIT 5
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching popular presentations:', error);
        res.status(500).json({ error: '获取热门演示文稿失败' });
    }
});

// Get recent presentations
router.get('/recent/created', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                id,
                title,
                slug,
                description,
                thumbnail_url,
                created_at
            FROM presentations
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent presentations:', error);
        res.status(500).json({ error: '获取最新演示文稿失败' });
    }
});

module.exports = router;
