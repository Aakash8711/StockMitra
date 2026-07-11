import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';
const hasSslOption = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('.neon.tech'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (isProduction || hasSslOption) ? { rejectUnauthorized: false } : false,
    max: 20, // Max clients in pool, key for scaling to 100k engagements
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increase connection timeout to 10 seconds
});

pool.on('error', (err) => {
    console.error('Unexpected database client error:', err);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export const initDb = async () => {
    const createTablesQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_name VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stock_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'Other',
            unit VARCHAR(50) NOT NULL,
            weight VARCHAR(50),
            quantity INTEGER NOT NULL DEFAULT 0,
            price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            min_stock INTEGER NOT NULL DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_name VARCHAR(255) NOT NULL,
            unit VARCHAR(50) NOT NULL,
            weight VARCHAR(50),
            quantity_sold INTEGER NOT NULL,
            price_per_unit NUMERIC(12, 2) NOT NULL,
            total_value NUMERIC(12, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_stock_items_user_id ON stock_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_sales_history_user_id ON sales_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_stock_items_lookup ON stock_items(user_id, LOWER(name), LOWER(category), LOWER(unit), price);
    `;

    try {
        await pool.query(createTablesQuery);
        console.log('PostgreSQL database initialized and tables/indexes verified.');
    } catch (err) {
        console.error('Failed to initialize database tables:', err);
        throw err;
    }
};

export default pool;
