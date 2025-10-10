// Import Firebase functions
import { 
    ref,
    push,
    set,
    get,
    update,
    remove,
    onValue,
    child
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// App version
const APP_VERSION = '1.0.0';
console.log('Knox POS System v' + APP_VERSION);

// Global variables
let recipes = [];
let cart = [];
let settings = {
    taxRate: 12,
    receiptFooter: 'Thank you for dining with Knox Restaurant!',
    autoPrint: true
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePOS);

async function initializePOS() {
    console.log('Initializing POS System...');
    
    try {
        await loadRecipes();
        loadSettings();
        setupEventListeners();
        renderMenu();
        updateCartDisplay();
        
        console.log('POS System initialized successfully');
    } catch (error) {
        console.error('Error initializing POS:', error);
        alert('Error loading POS system. Please check your connection.');
    }
}

// Load recipes from Firebase
async function loadRecipes() {
    try {
        console.log('Loading recipes for POS...');
        const recipeRef = ref(window.db, 'recipes');
        const snapshot = await get(recipeRef);
        recipes = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                const recipe = { id: key, ...data[key] };
                // Only include recipes with selling price
                if (recipe.sellingPrice && recipe.sellingPrice > 0) {
                    recipes.push(recipe);
                }
            });
        }
        
        console.log('Loaded recipes for POS:', recipes.length);
    } catch (error) {
        console.error('Error loading recipes:', error);
        throw error;
    }
}

// Render menu by categories
function renderMenu() {
    const container = document.getElementById('menu-categories');
    container.innerHTML = '';
    
    if (recipes.length === 0) {
        container.innerHTML = '<div class="empty-menu"><h3>No menu items available</h3><p>Add recipes with selling prices in the inventory system.</p></div>';
        return;
    }
    
    // Group recipes by category
    const recipesByCategory = {};
    recipes.forEach(recipe => {
        const category = recipe.category || 'Other';
        if (!recipesByCategory[category]) {
            recipesByCategory[category] = [];
        }
        recipesByCategory[category].push(recipe);
    });
    
    // Sort categories alphabetically
    const sortedCategories = Object.keys(recipesByCategory).sort();
    
    sortedCategories.forEach(categoryName => {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        
        // Sort recipes within category alphabetically
        const sortedRecipes = recipesByCategory[categoryName].sort((a, b) => 
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        
        categorySection.innerHTML = `
            <div class="category-header" onclick="toggleCategory(this)">
                <h3 class="category-title">${categoryName}</h3>
                <span class="category-toggle">▼</span>
            </div>
            <div class="category-items">
                ${sortedRecipes.map(recipe => `
                    <div class="menu-item" onclick="addToCart('${recipe.id}')">
                        <div class="menu-item-name">${recipe.name}</div>
                        <div class="menu-item-price">₱${recipe.sellingPrice.toFixed(2)}</div>
                        <div class="menu-item-profit">Profit: ₱${(recipe.sellingPrice - recipe.totalCost).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(categorySection);
    });
}

// Toggle category expansion
window.toggleCategory = function(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
};

// Add item to cart
window.addToCart = function(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const existingItem = cart.find(item => item.id === recipeId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: recipeId,
            name: recipe.name,
            price: recipe.sellingPrice,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    
    // Add visual feedback
    const menuItem = event.target.closest('.menu-item');
    menuItem.style.transform = 'scale(0.95)';
    setTimeout(() => {
        menuItem.style.transform = '';
    }, 150);
};

// Update cart display
function updateCartDisplay() {
    const container = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <p>No items in cart</p>
                <small>Tap menu items to add</small>
            </div>
        `;
        subtotalEl.textContent = '₱0.00';
        taxEl.textContent = '₱0.00';
        totalEl.textContent = '₱0.00';
        return;
    }
    
    let html = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₱${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="cart-quantity">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <div class="cart-total">₱${itemTotal.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const tax = subtotal * (settings.taxRate / 100);
    const total = subtotal + tax;
    
    subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    taxEl.textContent = `₱${tax.toFixed(2)}`;
    totalEl.textContent = `₱${total.toFixed(2)}`;
}

// Update item quantity
window.updateQuantity = function(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== itemId);
    }
    
    updateCartDisplay();
};

// Clear cart
function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCartDisplay();
    }
}

// Search menu items
function searchMenu(query) {
    const items = document.querySelectorAll('.menu-item');
    const categories = document.querySelectorAll('.category-section');
    
    if (!query.trim()) {
        // Show all items and categories
        items.forEach(item => item.style.display = 'block');
        categories.forEach(category => {
            category.style.display = 'block';
            category.classList.remove('collapsed');
        });
        return;
    }
    
    query = query.toLowerCase();
    
    categories.forEach(category => {
        const categoryItems = category.querySelectorAll('.menu-item');
        let hasVisibleItems = false;
        
        categoryItems.forEach(item => {
            const name = item.querySelector('.menu-item-name').textContent.toLowerCase();
            if (name.includes(query)) {
                item.style.display = 'block';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        if (hasVisibleItems) {
            category.style.display = 'block';
            category.classList.remove('collapsed');
        } else {
            category.style.display = 'none';
        }
    });
}

// Checkout and generate receipt
async function checkout() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    
    try {
        const order = await saveOrder();
        generateReceipt(order);
        document.getElementById('receipt-modal').style.display = 'block';
    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Error processing order. Please try again.');
    }
}

// Save order to database
async function saveOrder() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * (settings.taxRate / 100);
    const total = subtotal + tax;
    
    const order = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        items: [...cart],
        subtotal: subtotal,
        tax: tax,
        taxRate: settings.taxRate,
        total: total,
        status: 'completed'
    };
    
    try {
        const ordersRef = ref(window.db, 'pos-orders');
        const orderRef = await push(ordersRef, order);
        order.id = orderRef.key;
        
        console.log('Order saved:', order.id);
        return order;
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

// Generate receipt HTML
function generateReceipt(order) {
    const receiptEl = document.getElementById('receipt');
    const date = new Date(order.timestamp);
    
    receiptEl.innerHTML = `
        <div class="receipt-header">
            <div class="receipt-title">KNOX RESTAURANT</div>
            <div class="receipt-address">Point of Sale Receipt</div>
            <div class="receipt-date">${date.toLocaleString()}</div>
            <div class="receipt-order">Order #: ${order.id.slice(-8).toUpperCase()}</div>
        </div>
        
        <div class="receipt-items">
            ${order.items.map(item => `
                <div class="receipt-item">
                    <span class="receipt-item-name">${item.name}</span>
                    <span class="receipt-item-qty">x${item.quantity}</span>
                    <span class="receipt-item-total">₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="receipt-summary">
            <div class="receipt-summary-row">
                <span>Subtotal:</span>
                <span>₱${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="receipt-summary-row">
                <span>Tax (${order.taxRate}%):</span>
                <span>₱${order.tax.toFixed(2)}</span>
            </div>
            <div class="receipt-summary-row receipt-total">
                <span>TOTAL:</span>
                <span>₱${order.total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="receipt-footer">
            ${settings.receiptFooter}
            <br><br>
            Powered by Knox POS System
        </div>
    `;
}

// Print receipt
function printReceipt() {
    window.print();
}

// Finish order
function finishOrder() {
    cart = [];
    updateCartDisplay();
    document.getElementById('receipt-modal').style.display = 'none';
    
    // Show success message
    const originalContent = document.querySelector('.empty-cart');
    if (originalContent) {
        originalContent.innerHTML = '<p>✅ Order completed!</p><small>Ready for next order</small>';
        setTimeout(() => {
            if (cart.length === 0) {
                originalContent.innerHTML = '<p>No items in cart</p><small>Tap menu items to add</small>';
            }
        }, 3000);
    }
}

// Load order history
async function loadOrderHistory() {
    try {
        const ordersRef = ref(window.db, 'pos-orders');
        const snapshot = await get(ordersRef);
        const historyContainer = document.getElementById('order-history');
        
        if (!snapshot.exists()) {
            historyContainer.innerHTML = '<div class="empty-history"><p>No orders found</p></div>';
            return;
        }
        
        const orders = [];
        snapshot.forEach(child => {
            orders.push({ id: child.key, ...child.val() });
        });
        
        // Sort by timestamp descending (newest first)
        orders.sort((a, b) => b.timestamp - a.timestamp);
        
        historyContainer.innerHTML = orders.map(order => {
            const date = new Date(order.timestamp);
            return `
                <div class="history-item" onclick="viewOrderDetails('${order.id}')">
                    <div class="history-header">
                        <span class="history-date">${date.toLocaleString()}</span>
                        <span class="history-total">₱${order.total.toFixed(2)}</span>
                    </div>
                    <div class="history-items">
                        ${order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading order history:', error);
        document.getElementById('order-history').innerHTML = '<div class="error">Error loading order history</div>';
    }
}

// View order details (reprint receipt)
window.viewOrderDetails = function(orderId) {
    // Implementation for viewing/reprinting order details
    console.log('View order details:', orderId);
    // You can implement reprint functionality here
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('knox-pos-settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        
        // Update UI
        document.getElementById('tax-rate').value = settings.taxRate;
        document.getElementById('receipt-footer').value = settings.receiptFooter;
        document.getElementById('auto-print').checked = settings.autoPrint;
    }
}

// Save settings to localStorage
function saveSettings() {
    settings.taxRate = parseFloat(document.getElementById('tax-rate').value) || 12;
    settings.receiptFooter = document.getElementById('receipt-footer').value;
    settings.autoPrint = document.getElementById('auto-print').checked;
    
    localStorage.setItem('knox-pos-settings', JSON.stringify(settings));
    
    // Update cart display with new tax rate
    updateCartDisplay();
    
    // Close modal
    document.getElementById('settings-modal').style.display = 'none';
    
    alert('Settings saved successfully!');
}

// Setup event listeners
function setupEventListeners() {
    // Search
    document.getElementById('menu-search').addEventListener('input', (e) => {
        searchMenu(e.target.value);
    });
    
    // Cart actions
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    document.getElementById('save-order').addEventListener('click', () => {
        // Save order without checkout (for later completion)
        alert('Save order feature - to be implemented');
    });
    document.getElementById('checkout').addEventListener('click', checkout);
    
    // Receipt actions
    document.getElementById('print-receipt').addEventListener('click', printReceipt);
    document.getElementById('finish-order').addEventListener('click', finishOrder);
    
    // Header actions
    document.getElementById('orders-history-btn').addEventListener('click', () => {
        loadOrderHistory();
        document.getElementById('history-modal').style.display = 'block';
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'block';
    });
    
    // Settings
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Modal close buttons
    document.getElementById('close-history').addEventListener('click', () => {
        document.getElementById('history-modal').style.display = 'none';
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'f':
                case 'F':
                    e.preventDefault();
                    document.getElementById('menu-search').focus();
                    break;
                case 'Enter':
                    if (cart.length > 0) {
                        e.preventDefault();
                        checkout();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            // Close any open modal
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./pos-sw.js')
        .then(registration => {
            console.log('POS Service Worker registered:', registration);
        })
        .catch(error => {
            console.error('POS Service Worker registration failed:', error);
        });
}