require('dotenv').config();
const pool = require('./db');

const THEMES = [
    'FinTech',
    'HealthTech',
    'EdTech',
    'CivicTech',
    'GameTech',
    'AI Systems',
    'Blockchain Systems',
    'AgriTech',
    'Sustainability Tech',
    'CareerTech',
];

async function migrate() {
    const client = await pool.connect();
    try {
        // Create theme_quotas table
        await client.query(`
      CREATE TABLE IF NOT EXISTS theme_quotas (
        theme_name TEXT PRIMARY KEY,
        count      INT     DEFAULT 0,
        is_full    BOOLEAN DEFAULT FALSE
      );
    `);
        console.log('Table theme_quotas ensured.');

        // Seed each theme (ignore if already exists)
        for (const theme of THEMES) {
            await client.query(
                `INSERT INTO theme_quotas (theme_name, count, is_full)
         VALUES ($1, 0, FALSE)
         ON CONFLICT (theme_name) DO NOTHING`,
                [theme]
            );
            console.log(`  ✓ ${theme}`);
        }

        // Re-sync counts from existing team data (in case teams already spun)
        console.log('\nSyncing counts from existing spins...');
        for (const theme of THEMES) {
            const res = await client.query(
                'SELECT COUNT(*) FROM teams WHERE assigned_theme = $1',
                [theme]
            );
            const count = parseInt(res.rows[0].count);
            const isFull = count >= 2;
            await client.query(
                'UPDATE theme_quotas SET count = $1, is_full = $2 WHERE theme_name = $3',
                [count, isFull, theme]
            );
            if (count > 0) console.log(`  ↳ ${theme}: ${count} team(s)${isFull ? ' — FULL' : ''}`);
        }

        console.log('\nMigration complete!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
