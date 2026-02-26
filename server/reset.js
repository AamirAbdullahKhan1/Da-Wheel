require('dotenv').config();
const pool = require('./db');

async function reset() {
    const args = process.argv.slice(2);

    // Usage: node reset.js            → reset ALL teams + all theme quotas
    //        node reset.js team20     → reset just team20 + re-sync quotas
    //        node reset.js team01 team02 team03  → reset multiple + re-sync quotas

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (args.length === 0) {
            // Reset ALL teams
            const result = await client.query(
                'UPDATE teams SET spin_completed = FALSE, assigned_theme = NULL, assigned_at = NULL'
            );
            console.log(`✓ Reset ALL ${result.rowCount} teams.`);

            // Reset ALL theme quotas to 0
            await client.query(
                'UPDATE theme_quotas SET count = 0, is_full = FALSE'
            );
            console.log('✓ Reset ALL theme quotas to 0.');
        } else {
            // Reset specific teams
            for (const login_id of args) {
                const result = await client.query(
                    'UPDATE teams SET spin_completed = FALSE, assigned_theme = NULL, assigned_at = NULL WHERE login_id = $1',
                    [login_id]
                );
                if (result.rowCount === 0) {
                    console.log(`  ✗ ${login_id} not found.`);
                } else {
                    console.log(`  ✓ Reset ${login_id}`);
                }
            }

            // Re-sync ALL theme quotas from current team data
            console.log('\nRe-syncing theme quotas...');
            const themes = await client.query('SELECT theme_name, max_count FROM theme_quotas');
            for (const row of themes.rows) {
                const countRes = await client.query(
                    'SELECT COUNT(*) FROM teams WHERE assigned_theme = $1',
                    [row.theme_name]
                );
                const count = parseInt(countRes.rows[0].count);
                const isFull = count >= row.max_count;
                await client.query(
                    'UPDATE theme_quotas SET count = $1, is_full = $2 WHERE theme_name = $3',
                    [count, isFull, row.theme_name]
                );
                if (count > 0) console.log(`  ↳ ${row.theme_name}: ${count}/${row.max_count}${isFull ? ' — FULL' : ''}`);
            }
            console.log('✓ Theme quotas synced.');
        }

        await client.query('COMMIT');
        console.log('\nDone!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Reset error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

reset();
