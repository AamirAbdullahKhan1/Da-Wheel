require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors({
  origin: ['https://da-wheel.vercel.app', 'http://localhost:5173']
}));
app.use(express.json());

// GET /themes — returns all themes with count + is_full + max_count
app.get('/themes', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT theme_name, count, max_count, is_full FROM theme_quotas ORDER BY theme_name'
        );
        return res.json(result.rows);
    } catch (err) {
        console.error('Themes error:', err);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// POST /login
app.post('/login', async (req, res) => {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
        return res.status(400).json({ error: 'login_id and password are required.' });
    }
    try {
        const result = await pool.query(
            'SELECT team_name, login_id, spin_completed, assigned_theme FROM teams WHERE login_id = $1 AND password = $2',
            [login_id, password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid Team ID or password.' });
        }
        const team = result.rows[0];
        return res.json({
            team_name: team.team_name,
            login_id: team.login_id,
            spin_completed: team.spin_completed,
            assigned_theme: team.assigned_theme,
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Server error.' });
    }
});

// POST /spin
app.post('/spin', async (req, res) => {
    const { login_id, theme } = req.body;
    if (!login_id || !theme) {
        return res.status(400).json({ error: 'login_id and theme are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check team hasn't already spun
        const teamCheck = await client.query(
            'SELECT spin_completed FROM teams WHERE login_id = $1',
            [login_id]
        );
        if (teamCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Team not found.' });
        }
        if (teamCheck.rows[0].spin_completed) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'This team has already spun the wheel.' });
        }

        // 2. Check theme quota — use max_count from DB (varies per theme)
        const quotaCheck = await client.query(
            'SELECT count, max_count, is_full FROM theme_quotas WHERE theme_name = $1',
            [theme]
        );
        if (quotaCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid theme.' });
        }
        if (quotaCheck.rows[0].is_full) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'This theme is already full. Please spin again.' });
        }

        // 3. Save team's theme and mark spin complete
        await client.query(
            'UPDATE teams SET spin_completed = TRUE, assigned_theme = $1, assigned_at = NOW() WHERE login_id = $2',
            [theme, login_id]
        );

        // 4. Increment theme count; mark full if count reaches max_count
        const newCount = quotaCheck.rows[0].count + 1;
        const isFull = newCount >= quotaCheck.rows[0].max_count;
        await client.query(
            'UPDATE theme_quotas SET count = $1, is_full = $2 WHERE theme_name = $3',
            [newCount, isFull, theme]
        );

        await client.query('COMMIT');
        return res.json({ success: true, assigned_theme: theme, theme_count: newCount, theme_full: isFull });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Spin error:', err);
        return res.status(500).json({ error: 'Server error.' });
    } finally {
        client.release();
    }
});

// Catch unhandled errors so the process never silently exits
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`DevPlay'26 server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
