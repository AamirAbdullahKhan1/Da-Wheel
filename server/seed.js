require('dotenv').config();
const pool = require('./db');

async function seed() {
    const client = await pool.connect();
    try {
        // Create table if it doesn't exist
        await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_name TEXT,
        login_id TEXT UNIQUE,
        password TEXT,
        spin_completed BOOLEAN DEFAULT FALSE,
        assigned_theme TEXT,
        assigned_at TIMESTAMP
      );
    `);

        console.log('Table ensured.');

        for (let i = 1; i <= 20; i++) {
            const num = String(i).padStart(2, '0');
            const login_id = `team${num}`;
            const password = `play@T${num}`;
            const team_name = `Team ${num}`;

            await client.query(
                `INSERT INTO teams (team_name, login_id, password, spin_completed)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (login_id) DO NOTHING`,
                [team_name, login_id, password]
            );
            console.log(`  ✓ Inserted ${login_id}`);
        }

        console.log('\nSeeded 20 teams successfully.');
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
