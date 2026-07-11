import { API_BASE } from './config.js';

const historyTbody = document.getElementById('historyTableBody');
const tbody = document.getElementById('stockTableBody');
const totalMsg = document.getElementById('totalItemsMsg');
const form = document.getElementById('itemForm');

let stockItems = [];
const token = sessionStorage.getItem('token');

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/stock`, { headers: getHeaders() });
        if (response.ok) {
            stockItems = await response.json();
            renderTable();
        } else {
            console.error('Failed to load stock data:', response.statusText);
        }
        await renderHistory();
    } catch (err) {
        console.error('Error fetching dashboard records:', err);
    }
}

function renderTable() {
    let rowIndex = 1;
    let totalValueSum = 0;
    tbody.innerHTML = '';

    if (stockItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">No items added yet. Start adding your stock above!</td></tr>`;
        totalMsg.textContent = 'Total items: 0  |  Total Stock Value: ₹0.00';
        return;
    }

    stockItems.forEach((item, index) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const totalValue = qty * price;
        totalValueSum += totalValue;
        const minStock = Number(item.minStock) || 0;
        const isLowStock = (qty <= minStock);

        const row = document.createElement('tr');
        if (isLowStock) row.classList.add('low-stock');
        row.style.cursor = 'pointer';
        
        row.addEventListener('click', function (e) {
            if (e.target.closest('.delete-btn')) return;
            window.location.href = `sales.html?index=${index}`;
        });

        row.innerHTML = `
            <td>${rowIndex}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td>${item.weight ? escapeHtml(item.weight) : '-'}</td>
            <td>${qty}</td>
            <td>${price > 0 ? '₹' + price.toFixed(2) : '-'}</td>
            <td class="stock-value">${totalValue > 0 ? '₹' + totalValue.toFixed(2) : '₹0.00'}</td>
            <td>${minStock}</td>
            <td style="text-align:center;">
                <button class="delete-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}">🗑 Delete</button>
            </td>
        `;

        tbody.appendChild(row);
        rowIndex++;
    });

    totalMsg.textContent = `Total items: ${stockItems.length}  |  Total Stock Value: ₹${totalValueSum.toFixed(2)}`;

    // Bind event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            deleteItem(id, name);
        });
    });
}

async function deleteItem(id, name) {
    const confirmed = await window.showConfirm(`Are you sure you want to delete "${name}"?`, 'Delete Item');
    if (!confirmed) {
        window.showToast('Deletion cancelled.', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/stock/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        const data = await response.json();
        if (response.ok) {
            window.showToast(data.message || `"${name}" deleted.`, 'success');
            await loadDashboardData();
        } else {
            window.showToast(data.message || 'Failed to delete item.', 'error');
        }
    } catch (err) {
        console.error('Delete item fetch error:', err);
        window.showToast('Network error, failed to delete item.', 'error');
    }
}

async function renderHistory() {
    try {
        const response = await fetch(`${API_BASE}/sales`, { headers: getHeaders() });
        if (!response.ok) {
            console.error('Failed to fetch sales history:', response.statusText);
            return;
        }

        const history = await response.json();
        historyTbody.innerHTML = '';

        if (history.length === 0) {
            historyTbody.innerHTML = `<tr><td colspan="5" class="history-empty">No sales recorded yet. Update your first sale!</td></tr>`;
            return;
        }

        history.forEach(record => {
            const row = document.createElement('tr');
            const formattedDate = new Date(record.timestamp).toLocaleString();
            row.innerHTML = `
                <td>${escapeHtml(formattedDate)}</td>
                <td><strong>${escapeHtml(record.itemName)}</strong></td>
                <td>${escapeHtml(record.unit)}</td>
                <td>${record.quantitySold}</td>
                <td>₹${record.totalValue ? record.totalValue.toFixed(2) : '0.00'}</td>
            `;
            historyTbody.appendChild(row);
        });
    } catch (err) {
        console.error('Render sales history error:', err);
    }
}

// Form submit: Create new item or merge with existing one
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const unit = document.getElementById('measureUnit').value;
    const weight = document.getElementById('netWeight').value.trim();
    const quantity = document.getElementById('quantity').value.trim();
    const price = document.getElementById('price').value.trim();
    const minStock = document.getElementById('minStock').value.trim();

    if (!name) { window.showToast('Please enter an item name.', 'warning'); return; }
    if (!quantity || isNaN(quantity) || Number(quantity) < 0) { window.showToast('Please enter a valid quantity.', 'warning'); return; }

    const newItem = {
        name,
        category: category || 'Other',
        unit,
        weight: weight || '',
        quantity: Number(quantity),
        price: price ? Number(price) : 0,
        minStock: minStock ? Number(minStock) : 5,
    };

    try {
        const response = await fetch(`${API_BASE}/stock`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(newItem)
        });

        const data = await response.json();
        if (response.ok) {
            window.showToast(data.message || 'Item updated successfully!', 'success');
            await loadDashboardData();

            document.getElementById('itemName').value = '';
            document.getElementById('netWeight').value = '';
            document.getElementById('quantity').value = '';
            document.getElementById('price').value = '';
            document.getElementById('minStock').value = '5';
            document.getElementById('itemName').focus();
        } else {
            window.showToast(data.message || 'Failed to save item.', 'error');
        }
    } catch (err) {
        console.error('Add stock fetch error:', err);
        window.showToast('Network error, failed to add item.', 'error');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        loadDashboardData();
    }
});
