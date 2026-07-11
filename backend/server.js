import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { login, signup } from './controllers/authController.js';
import { addStockItem, deleteStockItem, getStock } from './controllers/stockController.js';
import { getSalesHistory, recordSales } from './controllers/salesController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting to handle heavy loads and prevent abuse (part of scaling design)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', apiLimiter);

// --- Auth Routes ---
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// --- Stock Routes ---
app.get('/api/stock', requireAuth, getStock);
app.post('/api/stock', requireAuth, addStockItem);
app.delete('/api/stock/:id', requireAuth, deleteStockItem);

// --- Sales Routes ---
app.get('/api/sales', requireAuth, getSalesHistory);
app.post('/api/sales', requireAuth, recordSales);

// Healthcheck route
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ message: 'Internal server error occurred.' });
});

// Initialize DB and start server
const startServer = async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`StockMitra backend running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
