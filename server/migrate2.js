require('dotenv').config();
const pool = require('./db');

async function migrate2() {
    const client = await pool.connect();
    try {
        console.log('Running migration 2: max_count + team21...\n');

        // 1. Add max_count column to theme_quotas (default 2)
        await client.query(`
      ALTER TABLE theme_quotas
      ADD COLUMN IF NOT EXISTS max_count INT DEFAULT 2
    `);
        console.log('✓ Added max_count column (default 2) to theme_quotas.');

        // 2. Set FinTech quota to 3
        await client.query(`
      UPDATE theme_quotas SET max_count = 3 WHERE theme_name = 'FinTech'
    `);
        console.log('✓ FinTech max_count set to 3.');

        // 3. Re-sync is_full based on new max_count for all themes
        await client.query(`
      UPDATE theme_quotas SET is_full = (count >= max_count)
    `);
        console.log('✓ is_full re-synced against new max_count values.');

        // 4. Add team21
        const exists = await client.query(
            `SELECT 1 FROM teams WHERE login_id = 'team21'`
        );
        if (exists.rows.length === 0) {
            await client.query(`
        INSERT INTO teams (team_name, login_id, password, spin_completed)
        VALUES ('Team 21', 'team21', 'play@T21', FALSE)
      `);
            console.log('✓ Team 21 added (login_id: team21, password: play@T21).');
        } else {
            console.log('  ↳ team21 already exists, skipping.');
        }

        // 5. Show final state
        const result = await client.query(
            `SELECT theme_name, count, max_count, is_full FROM theme_quotas ORDER BY theme_name`
        );
        console.log('\nCurrent theme_quotas:');
        result.rows.forEach(r => {
            const status = r.is_full ? 'FULL' : `${r.count}/${r.max_count}`;
            console.log(`  ${r.theme_name.padEnd(25)} ${status}`);
        });

        console.log('\nMigration 2 complete!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate2();
