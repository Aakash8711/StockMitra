import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_stockmitra_123';

export const signup = async (req, res) => {
    const { storeName, firstName, lastName, email, password } = req.body;

    if (!storeName || !firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        // Check if user already exists
        const checkUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const result = await query(
            `INSERT INTO users (store_name, first_name, last_name, email, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, store_name, first_name, last_name, email`,
            [storeName.trim(), firstName.trim(), lastName.trim(), email.toLowerCase().trim(), passwordHash]
        );

        const newUser = result.rows[0];

        // Sign JWT token
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
            token,
            user: {
                id: newUser.id,
                storeName: newUser.store_name,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                email: newUser.email
            }
        });
    } catch (err) {
        console.error('Signup controller error:', err);
        return res.status(500).json({ message: 'Internal server error during registration.' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Fetch user
        const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Sign JWT token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            token,
            user: {
                id: user.id,
                storeName: user.store_name,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login controller error:', err);
        return res.status(500).json({ message: 'Internal server error during login.' });
    }
};
