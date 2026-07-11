import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_stockmitra_123');
        
        // Fetch user from DB to make sure user still exists
        const result = await query(
            'SELECT id, store_name, first_name, last_name, email FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'User no longer exists.' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        console.error('Auth verification error:', err);
        return res.status(401).json({ message: 'Invalid or expired authorization token.' });
    }
};
