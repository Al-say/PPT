const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, validateTheme } = require('../utils/validation');

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.created_at,
                u.last_login,
                up.theme
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id = $1
        `, [req.session.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const user = result.rows[0];
        delete user.password_hash;

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// Update user preferences
router.put('/preferences', requireAuth, async (req, res) => {
    try {
        const { theme } = req.body;

        if (!validateTheme(theme)) {
            return res.status(400).json({ error: '无效的主题设置' });
        }

        await query(`
            INSERT INTO user_preferences (user_id, theme)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET theme = $2, updated_at = CURRENT_TIMESTAMP
        `, [req.session.userId, theme]);

        res.json({ message: '设置已更新', theme });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: '更新设置失败' });
    }
});

// Get user statistics
router.get('/statistics', requireAuth, async (req, res) => {
    try {
        const viewsResult = await query(`
            SELECT COUNT(*) as total_views
            FROM view_history
            WHERE user_id = $1
        `, [req.session.userId]);

        const uniquePresentationsResult = await query(`
            SELECT COUNT(DISTINCT presentation_id) as unique_presentations
            FROM view_history
            WHERE user_id = $1
        `, [req.session.userId]);

        const recentViewsResult = await query(`
            SELECT 
                p.title,
                vh.viewed_at
            FROM view_history vh
            JOIN presentations p ON vh.presentation_id = p.id
            WHERE vh.user_id = $1
            ORDER BY vh.viewed_at DESC
            LIMIT 5
        `, [req.session.userId]);

        res.json({
            totalViews: parseInt(viewsResult.rows[0].total_views),
            uniquePresentations: parseInt(uniquePresentationsResult.rows[0].unique_presentations),
            recentViews: recentViewsResult.rows
        });
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({ error: '获取用户统计信息失败' });
    }
});

// Get user view history summary
router.get('/history/summary', requireAuth, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                DATE_TRUNC('day', vh.viewed_at) as date,
                COUNT(*) as views
            FROM view_history vh
            WHERE vh.user_id = $1
            AND vh.viewed_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', vh.viewed_at)
            ORDER BY date DESC
        `, [req.session.userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching view history summary:', error);
        res.status(500).json({ error: '获取浏览历史统计失败' });
    }
});

// Clear user view history
router.delete('/history', requireAuth, async (req, res) => {
    try {
        await query('DELETE FROM view_history WHERE user_id = $1', [req.session.userId]);
        res.json({ message: '浏览历史已清除' });
    } catch (error) {
        console.error('Error clearing view history:', error);
        res.status(500).json({ error: '清除浏览历史失败' });
    }
});

module.exports = router;
