import { getClient, query } from '../db.js';

export const getSalesHistory = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await query(
            `SELECT id, 
                    created_at AS "timestamp", 
                    item_name AS "itemName", 
                    unit, 
                    weight, 
                    quantity_sold AS "quantitySold", 
                    price_per_unit::float AS "pricePerUnit", 
                    total_value::float AS "totalValue" 
             FROM sales_history 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );
        return res.json(result.rows);
    } catch (err) {
        console.error('Get sales history error:', err);
        return res.status(500).json({ message: 'Internal server error fetching sales history.' });
    }
};

export const recordSales = async (req, res) => {
    const userId = req.user.id;
    const { sales } = req.body; // Expects array of { itemId: UUID, soldQty: Number }

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ message: 'Sales data array is required.' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN'); // Start Transaction for atomic sales processing

        const timestamp = new Date();
        const responseSales = [];

        for (const sale of sales) {
            const { itemId, soldQty } = sale;
            const quantityToSub = Number(soldQty);

            if (!itemId || isNaN(quantityToSub) || quantityToSub <= 0) {
                throw new Error('Invalid item ID or sold quantity.');
            }

            // Retrieve current item details and verify ownership
            const itemRes = await client.query(
                'SELECT name, unit, weight, quantity, price::float FROM stock_items WHERE id = $1 AND user_id = $2 FOR UPDATE',
                [itemId, userId]
            );

            if (itemRes.rows.length === 0) {
                throw new Error(`Item not found or unauthorized.`);
            }

            const item = itemRes.rows[0];

            if (item.quantity < quantityToSub) {
                throw new Error(`Insufficient stock for "${item.name}". Available: ${item.quantity}, Sold: ${quantityToSub}`);
            }

            const newQty = item.quantity - quantityToSub;

            // Update stock quantity.
            // Note: If you want to keep the product in the system even when sold out (recommended), we just set quantity to 0.
            await client.query(
                'UPDATE stock_items SET quantity = $1 WHERE id = $2',
                [newQty, itemId]
            );

            const totalValue = quantityToSub * item.price;

            // Log sales history entry
            await client.query(
                `INSERT INTO sales_history (user_id, item_name, unit, weight, quantity_sold, price_per_unit, total_value, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, item.name, item.unit, item.weight, quantityToSub, item.price, totalValue, timestamp]
            );

            responseSales.push({
                name: item.name,
                unit: item.unit,
                weight: item.weight,
                soldQty: quantityToSub,
                price: item.price,
                totalValue
            });
        }

        await client.query('COMMIT'); // Commit Transaction
        return res.json({
            message: 'Sales updated successfully!',
            sales: responseSales
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on any failure
        console.error('Record sales transaction error:', err);
        return res.status(400).json({ message: err.message || 'Failed to update sales.' });
    } finally {
        client.release();
    }
};
