import { API_BASE } from './config.js';

const container = document.getElementById('itemsList');
const submitBtn = document.getElementById('submitSalesBtn');

const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const clearSearchAllBtn = document.getElementById('clearSearchAllBtn');
const visibleCount = document.getElementById('visibleCount');
const totalCount = document.getElementById('totalCount');
const searchStatus = document.getElementById('searchStatus');

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

const urlParams = new URLSearchParams(window.location.search);
const highlightIndex = urlParams.get('index') !== null ? parseInt(urlParams.get('index')) : -1;

async function loadSalesPageData() {
    try {
        const response = await fetch(`${API_BASE}/stock`, { headers: getHeaders() });
        if (response.ok) {
            stockItems = await response.json();
            renderItems('');
        } else {
            console.error('Failed to load stock data:', response.statusText);
            container.innerHTML = `<div class="empty-msg">Error loading products. Make sure you are logged in.</div>`;
        }
    } catch (err) {
        console.error('Error fetching sales stock details:', err);
        container.innerHTML = `<div class="empty-msg">Network error loading products.</div>`;
    }
}

function renderItems(filterText = '') {
    if (stockItems.length === 0) {
        container.innerHTML = `<div class="empty-msg">No items in stock. Please add items from the Dashboard first.</div>`;
        submitBtn.disabled = true;
        updateStatus(0, 0);
        return;
    }

    submitBtn.disabled = false;

    const filterLower = filterText.trim().toLowerCase();
    let visibleItems = stockItems;
    let total = stockItems.length;

    if (filterLower !== '') {
        visibleItems = stockItems.filter(item =>
            item.name.toLowerCase().includes(filterLower)
        );
    }

    updateStatus(visibleItems.length, total);

    let html = '';
    visibleItems.forEach((item, index) => {
        const originalIndex = stockItems.indexOf(item);
        const currentQty = item.quantity || 0;
        const isHighlighted = (originalIndex === highlightIndex);
        const highlightClass = isHighlighted ? ' highlight-card' : '';

        html += `
            <div class="item-card${highlightClass}" data-id="${item.id}" data-index="${originalIndex}" ${isHighlighted ? 'id="highlighted-item"' : ''}>
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-detail">
                    ${escapeHtml(item.unit)} | 
                    Weight: ${item.weight ? escapeHtml(item.weight) : '-'} | 
                    ₹${item.price ? item.price.toFixed(2) : '0.00'}/unit
                </div>
                <div class="stock-left">In Stock: ${currentQty}</div>
                <div class="counter-wrapper">
                    <label for="sold_qty_${originalIndex}">Sold:</label>
                    <button type="button" class="counter-btn" onclick="adjustQty(${originalIndex}, -1)">−</button>
                    <input type="number" id="sold_qty_${originalIndex}" class="counter-input" 
                           min="0" max="${currentQty}" value="0"
                           onchange="validateInput(${originalIndex}, this)">
                    <button type="button" class="counter-btn" onclick="adjustQty(${originalIndex}, 1)">+</button>
                    <span style="font-size:13px; color:#888; margin-left:4px;">/ ${currentQty}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    if (highlightIndex >= 0 && highlightIndex < stockItems.length) {
        const highlighted = document.getElementById('highlighted-item');
        if (highlighted) {
            highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlighted.classList.add('flash-highlight');
            const input = document.getElementById(`sold_qty_${highlightIndex}`);
            if (input) setTimeout(() => input.focus(), 300);
        }
    }

    if (filterLower !== '') {
        clearSearchAllBtn.classList.remove('hidden');
    } else {
        clearSearchAllBtn.classList.add('hidden');
    }
}

function updateStatus(visible, total) {
    visibleCount.textContent = visible;
    totalCount.textContent = total;
}

function updateDropdown(filterText) {
    const filterLower = filterText.trim().toLowerCase();
    if (filterLower === '') {
        searchDropdown.classList.remove('open');
        return;
    }

    const matches = stockItems.filter(item =>
        item.name.toLowerCase().includes(filterLower)
    );

    if (matches.length === 0) {
        searchDropdown.innerHTML = `<div class="no-match">No matching items</div>`;
        searchDropdown.classList.add('open');
        return;
    }

    let dropdownHtml = '';
    matches.forEach(item => {
        const originalIndex = stockItems.indexOf(item);
        dropdownHtml += `
            <div class="dropdown-item" data-index="${originalIndex}">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-meta">
                    ${escapeHtml(item.unit)} · ₹${item.price ? item.price.toFixed(2) : '0.00'}
                    <span class="stock-badge">${item.quantity || 0}</span>
                </span>
            </div>
        `;
    });
    searchDropdown.innerHTML = dropdownHtml;
    searchDropdown.classList.add('open');

    searchDropdown.querySelectorAll('.dropdown-item').forEach(el => {
        el.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            const item = stockItems[idx];
            if (item) {
                searchInput.value = item.name;
                searchDropdown.classList.remove('open');
                renderItems(item.name);
                clearSearchBtn.classList.add('visible');
            }
        });
    });
}

searchInput.addEventListener('input', function() {
    const val = this.value;
    if (val.trim() !== '') {
        clearSearchBtn.classList.add('visible');
    } else {
        clearSearchBtn.classList.remove('visible');
    }
    updateDropdown(val);
    renderItems(val);
});

clearSearchBtn.addEventListener('click', function() {
    searchInput.value = '';
    searchDropdown.classList.remove('open');
    clearSearchBtn.classList.remove('visible');
    renderItems('');
    clearSearchAllBtn.classList.add('hidden');
});

clearSearchAllBtn.addEventListener('click', function() {
    searchInput.value = '';
    searchDropdown.classList.remove('open');
    clearSearchBtn.classList.remove('visible');
    renderItems('');
    clearSearchAllBtn.classList.add('hidden');
});

document.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.search-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        searchDropdown.classList.remove('open');
    }
});

function adjustQty(index, delta) {
    const input = document.getElementById(`sold_qty_${index}`);
    if (!input) return;
    let currentVal = parseInt(input.value) || 0;
    const max = parseInt(input.max) || 0;
    let newVal = currentVal + delta;
    if (newVal < 0) newVal = 0;
    if (newVal > max) newVal = max;
    input.value = newVal;
}

function validateInput(index, input) {
    let val = parseInt(input.value);
    const max = parseInt(input.max) || 0;
    if (isNaN(val) || val < 0) val = 0;
    if (val > max) val = max;
    input.value = val;
}

window.adjustQty = adjustQty;
window.validateInput = validateInput;

submitBtn.addEventListener('click', async function () { 
    const salesData = [];
    const payloadSales = [];
    let hasSales = false;

    stockItems.forEach((item, index) => {
        const input = document.getElementById(`sold_qty_${index}`);
        if (!input) return;
        const soldQty = parseInt(input.value) || 0;
        if (soldQty > 0) {
            hasSales = true;
            salesData.push({
                name: item.name,
                unit: item.unit,
                soldQty: soldQty,
                totalAmount: (item.price || 0) * soldQty
            });
            payloadSales.push({
                itemId: item.id,
                soldQty: soldQty
            });
        }
    });

    if (!hasSales) {
        window.showToast('You haven\'t marked any items as sold. Please enter a quantity or go back.', 'warning');
        return;
    }

    const confirmMsg = salesData.map(s =>
        `${s.name}: ${s.soldQty} ${s.unit} (₹${s.totalAmount.toFixed(2)})`
    ).join('\n');

    const confirmed = await window.showConfirm(`Confirm sales?\n\n${confirmMsg}`, 'Update Sales');
    if (!confirmed) {
        window.showToast('Sale cancelled.', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ sales: payloadSales })
        });

        const data = await response.json();
        if (response.ok) {
            window.showToast('Sales updated successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            window.showToast(data.message || 'Failed to update sales.', 'error');
        }
    } catch (err) {
        console.error('Update sales fetch error:', err);
        window.showToast('Network error, failed to submit sales.', 'error');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        loadSalesPageData();
    }
});