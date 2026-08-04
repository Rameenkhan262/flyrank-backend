require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect()
    .then(client => {
        console.log("✅ Connected to PostgreSQL!");

        client.release();
    })
    .catch(err => {
    console.error("❌ PostgreSQL connection failed:");
    console.error(err);
});

    async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            done BOOLEAN DEFAULT FALSE
        )
    `);

    const result = await pool.query(
    "SELECT COUNT(*) FROM tasks"
);

const count = Number(result.rows[0].count);

console.log(count);

if (count === 0) {

    await pool.query(
        "INSERT INTO tasks (title, done) VALUES ($1, $2)",
        ["Learn Express", false]
    );

    await pool.query(
        "INSERT INTO tasks (title, done) VALUES ($1, $2)",
        ["Build CRUD API", false]
    );

    await pool.query(
        "INSERT INTO tasks (title, done) VALUES ($1, $2)",
        ["Test with Swagger", true]
    );

    console.log("✅ Sample tasks inserted.");
}

    console.log("✅ Tasks table is ready.");
}

async function startDatabase() {
    let retries = 10;

    while (retries > 0) {
        try {
            await initializeDatabase();
            console.log("Database initialized successfully.");
            return;
        } catch (err) {
            retries--;

            console.log(
                `Database not ready. Retrying in 3 seconds... (${retries} left)`
            );

            await new Promise(resolve =>
                setTimeout(resolve, 3000)
            );
        }
    }

    console.error("Could not connect to PostgreSQL.");
}

startDatabase();

module.exports = pool;