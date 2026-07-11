import { query } from '../db.js';

export const getStock = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await query(
            'SELECT id, name, category, unit, weight, quantity, price::float, min_stock AS "minStock" FROM stock_items WHERE user_id = $1 ORDER BY name ASC',
            [userId]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error('Get stock controller error:', err);
        return res.status(500).json({ message: 'Internal server error fetching stock.' });
    }
};

export const addStockItem = async (req, res) => {
    const userId = req.user.id;
    const { name, category, unit, weight, quantity, price, minStock } = req.body;

    if (!name || quantity === undefined || quantity === null) {
        return res.status(400).json({ message: 'Item name and quantity are required.' });
    }

    const qtyVal = Number(quantity);
    const priceVal = price ? Number(price) : 0.00;
    const minStockVal = minStock !== undefined ? Number(minStock) : 5;
    const weightVal = weight ? weight.trim() : '';
    const categoryVal = category ? category.trim() : 'Other';
    const unitVal = unit ? unit.trim() : '';

    if (isNaN(qtyVal) || qtyVal < 0) {
        return res.status(400).json({ message: 'Quantity must be a valid positive number.' });
    }

    try {
        // Check if matching item exists for this user (same name, category, unit, weight, and price)
        // using case-insensitive checks for text fields
        const matchResult = await query(
            `SELECT id, quantity FROM stock_items 
             WHERE user_id = $1 
               AND LOWER(name) = LOWER($2) 
               AND LOWER(category) = LOWER($3) 
               AND LOWER(unit) = LOWER($4) 
               AND (weight = $5 OR (weight IS NULL AND $5 = ''))
               AND price = $6`,
            [userId, name.trim(), categoryVal, unitVal, weightVal, priceVal]
        );

        if (matchResult.rows.length > 0) {
            // Merge: increment existing item quantity
            const existingItem = matchResult.rows[0];
            const newQty = existingItem.quantity + qtyVal;

            const updateResult = await query(
                `UPDATE stock_items 
                 SET quantity = $1 
                 WHERE id = $2 
                 RETURNING id, name, category, unit, weight, quantity, price::float, min_stock AS "minStock"`,
                [newQty, existingItem.id]
            );

            return res.json({
                message: 'Item already exists. Quantity merged.',
                item: updateResult.rows[0]
            });
        } else {
            // Create: insert new stock item
            const insertResult = await query(
                `INSERT INTO stock_items (user_id, name, category, unit, weight, quantity, price, min_stock)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, name, category, unit, weight, quantity, price::float, min_stock AS "minStock"`,
                [userId, name.trim(), categoryVal, unitVal, weightVal, qtyVal, priceVal, minStockVal]
            );

            return res.status(201).json({
                message: 'Item added to stock.',
                item: insertResult.rows[0]
            });
        }
    } catch (err) {
        console.error('Add stock item error:', err);
        return res.status(500).json({ message: 'Internal server error adding stock item.' });
    }
};

export const deleteStockItem = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const result = await query(
            'DELETE FROM stock_items WHERE id = $1 AND user_id = $2 RETURNING name',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Stock item not found or unauthorized.' });
        }

        return res.json({ message: `Item "${result.rows[0].name}" deleted successfully.` });
    } catch (err) {
        console.error('Delete stock item error:', err);
        return res.status(500).json({ message: 'Internal server error deleting stock item.' });
    }
};
