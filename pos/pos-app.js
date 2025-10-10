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
const APP_VERSION = '1.2.0';
console.log('Knox POS System v' + APP_VERSION + ' - Category Display & Bill Management');

// Global variables
let recipes = [];
let cart = [];
let currentVariationProduct = null;
let deferredPrompt;
let selectedVariation = null;
let settings = {
    taxRate: 12,
    receiptFooter: 'Thank you for dining with Knox Restaurant! - MVR Currency',
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
        setupMenuClickHandlers();
        
        console.log('POS System initialized successfully');
        
        // Check PWA installability
        setTimeout(checkPWAInstallability, 2000);
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
                ${sortedRecipes.map(recipe => {
                    const hasVariations = recipe.variations && recipe.variations.length > 0;
                    const variationBadge = hasVariations ? '<span class="menu-variation-badge">Options</span>' : '';
                    
                    return `
                        <div class="menu-item" data-recipe-id="${recipe.id}" data-has-variations="${hasVariations}">
                            <div class="menu-item-name">${recipe.name} ${variationBadge}</div>
                            <div class="menu-item-price">MVR ${recipe.sellingPrice.toFixed(2)}</div>
                            <div class="menu-item-profit">Profit: MVR ${(recipe.sellingPrice - recipe.totalCost).toFixed(2)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        container.appendChild(categorySection);
    });
    
    // Re-setup click handlers after rendering
    setupMenuClickHandlers();
}

// Setup menu item click handlers (Android-compatible)
function setupMenuClickHandlers() {
    const menuContainer = document.getElementById('menu-categories');
    
    // Remove existing listeners
    menuContainer.removeEventListener('click', handleMenuClick);
    menuContainer.removeEventListener('touchend', handleMenuClick);
    
    // Add both click and touchend for Android compatibility
    menuContainer.addEventListener('click', handleMenuClick, { passive: false });
    menuContainer.addEventListener('touchend', handleMenuClick, { passive: false });
}

// Handle menu item clicks
function handleMenuClick(e) {
    // Prevent default behavior and stop propagation
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    
    const menuItem = e.target.closest('.menu-item');
    if (!menuItem) return;
    
    const recipeId = menuItem.dataset.recipeId;
    const hasVariations = menuItem.dataset.hasVariations === 'true';
    
    console.log('Menu item clicked:', recipeId, 'Has variations:', hasVariations, 'Event type:', e.type);
    
    // Add visual feedback immediately
    menuItem.style.transform = 'scale(0.95)';
    
    // Handle click with slight delay for Android compatibility
    setTimeout(() => {
        if (hasVariations) {
            console.log('Attempting to show variations modal...');
            showVariationsModal(recipeId);
        } else {
            console.log('Adding to cart directly...');
            addToCart(recipeId);
        }
        
        // Reset visual feedback
        menuItem.style.transform = '';
    }, 50);
    
    return false;
}

// Toggle category expansion
window.toggleCategory = function(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
};

// Show variations modal
window.showVariationsModal = function(recipeId) {
    console.log('showVariationsModal called for:', recipeId);
    
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
        console.error('Recipe not found:', recipeId);
        alert('Recipe not found: ' + recipeId);
        return;
    }
    
    console.log('Recipe found:', recipe.name, 'Has variations:', recipe.variations?.length || 0);
    
    // Force create variations for testing if none exist
    if (!recipe.variations || recipe.variations.length === 0) {
        console.log('No variations found, creating test variations');
        recipe.variations = [
            {
                name: 'Large',
                price: recipe.sellingPrice * 1.5,
                description: 'Large size portion'
            },
            {
                name: 'Extra Spicy',
                price: recipe.sellingPrice + 5,
                description: 'Extra spicy preparation',
                isSpecial: true
            }
        ];
    }
    
    currentVariationProduct = recipe;
    selectedVariation = null;
    
    // Update modal content
    document.getElementById('variation-product-name').textContent = recipe.name;
    document.getElementById('variation-description').textContent = 
        `Choose your preferred option for ${recipe.name}`;
    
    // Create variations list
    const variationsList = document.getElementById('variations-list');
    
    // Get the base price - check multiple possible properties
    const basePrice = recipe.sellingPrice || recipe.price || recipe.costPerUnit || 0;
    console.log('Base price for', recipe.name, ':', basePrice);
    
    // Add base/normal option
    const normalOption = `
        <div class="variation-option" data-variation="normal">
            <div class="variation-info">
                <div class="variation-name">Normal</div>
                <div class="variation-price">MVR ${(basePrice || 0).toFixed(2)}</div>
                <div class="variation-description-text">Standard preparation</div>
            </div>
            <div class="variation-badge">Default</div>
        </div>
    `;
    
    // Add variations if they exist
    let variationsHtml = normalOption;
    if (recipe.variations && recipe.variations.length > 0) {
        recipe.variations.forEach((variation, index) => {
            const variationPrice = variation.price || variation.sellingPrice || basePrice || 0;
            console.log('Variation', variation.name, 'price:', variationPrice);
            variationsHtml += `
                <div class="variation-option" data-variation="${index}">
                    <div class="variation-info">
                        <div class="variation-name">${variation.name || 'Variation ' + (index + 1)}</div>
                        <div class="variation-price">MVR ${(variationPrice).toFixed(2)}</div>
                        <div class="variation-description-text">${variation.description || 'Special preparation'}</div>
                    </div>
                    ${variation.isSpecial ? '<div class="variation-badge">Special</div>' : ''}
                </div>
            `;
        });
    }
    
    variationsList.innerHTML = variationsHtml;
    
    // Setup variation click handlers
    setupVariationClickHandlers();
    
    // Show modal
    const modal = document.getElementById('variations-modal');
    if (!modal) {
        console.error('Variations modal element not found!');
        alert('Modal not found in DOM');
        return;
    }
    
    console.log('Modal element found, displaying...');
    modal.style.display = 'block';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.zIndex = '99999';
    modal.classList.add('show');
    console.log('Modal styles applied:', modal.style.cssText);
    console.log('Modal classes:', modal.className);
    console.log('Modal computed style:', window.getComputedStyle(modal).display);
    
    // Reset add button
    const addBtn = document.getElementById('add-variation');
    if (addBtn) {
        addBtn.disabled = true;
    } else {
        console.error('Add variation button not found!');
    }
    
    // Force focus on modal for better accessibility
    setTimeout(() => {
        const firstVariation = modal.querySelector('.variation-option');
        if (firstVariation) {
            firstVariation.focus();
        }
        console.log('Modal should be fully visible now');
    }, 100);
};

// Setup variation click handlers (Android-compatible)
function setupVariationClickHandlers() {
    const variationsList = document.getElementById('variations-list');
    
    // Remove existing listeners
    variationsList.removeEventListener('click', handleVariationClick);
    variationsList.removeEventListener('touchend', handleVariationClick);
    
    // Add both click and touchend for Android compatibility
    variationsList.addEventListener('click', handleVariationClick, { passive: false });
    variationsList.addEventListener('touchend', handleVariationClick, { passive: false });
}

// Handle variation clicks
function handleVariationClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const variationOption = e.target.closest('.variation-option');
    if (!variationOption) return;
    
    const variationIndex = variationOption.dataset.variation;
    
    console.log('Variation selected:', variationIndex);
    
    // Remove previous selection
    document.querySelectorAll('.variation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked option
    variationOption.classList.add('selected');
    
    selectedVariation = variationIndex;
    document.getElementById('add-variation').disabled = false;
}

// Select variation (legacy function for compatibility)
window.selectVariation = function(variationIndex) {
    console.log('Legacy selectVariation called:', variationIndex);
    
    // Remove previous selection
    document.querySelectorAll('.variation-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Find and select the option
    const option = document.querySelector(`[data-variation="${variationIndex}"]`);
    if (option) {
        option.classList.add('selected');
        selectedVariation = variationIndex;
        document.getElementById('add-variation').disabled = false;
    }
};

// Add item to cart (with or without variation)
window.addToCart = function(recipeId, variationData = null) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const category = recipe.category || 'Other';
    let itemName = `[${category}] ${recipe.name}`;
    let itemPrice = recipe.sellingPrice || recipe.price || recipe.costPerUnit || 0;
    let itemId = recipeId;
    
    // Handle variation
    if (variationData) {
        if (variationData.type === 'variation' && recipe.variations) {
            const variation = recipe.variations[variationData.index];
            itemName = `[${category}] ${recipe.name} (${variation.name})`;
            itemPrice = variation.price || variation.sellingPrice || itemPrice || 0;
            itemId = `${recipeId}_var_${variationData.index}`;
        } else if (variationData.type === 'normal') {
            itemName = `[${category}] ${recipe.name} (Normal)`;
            itemId = `${recipeId}_normal`;
        }
    }
    
    const existingItem = cart.find(item => item.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: itemId,
            baseId: recipeId,
            name: itemName,
            price: itemPrice,
            quantity: 1,
            variation: variationData
        });
    }
    
    updateCartDisplay();
    
    // Add visual feedback
    if (!variationData) {
        const menuItem = event.target.closest('.menu-item');
        if (menuItem) {
            menuItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                menuItem.style.transform = '';
            }, 150);
        }
    }
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
        const safePrice = item.price || 0;
        const itemTotal = safePrice * item.quantity;
        subtotal += itemTotal;
        
        // Parse category and item name for better display
        const categoryMatch = item.name.match(/^\[([^\]]+)\]\s*(.+)$/);
        let displayName;
        if (categoryMatch) {
            const [, category, itemName] = categoryMatch;
            displayName = `<span class="item-category">[${category}]</span> ${itemName}`;
        } else {
            displayName = item.name;
        }
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${displayName}</div>
                    <div class="cart-item-price">MVR ${safePrice.toFixed(2)} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn ${item.quantity === 1 ? 'qty-btn-remove' : ''}" onclick="updateQuantity('${item.id}', -1)" title="${item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}">-</button>
                    <span class="cart-quantity">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" title="Increase quantity">+</button>
                    <div class="cart-total">MVR ${itemTotal.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const tax = subtotal * (settings.taxRate / 100);
    const total = subtotal + tax;
    
    subtotalEl.textContent = `MVR ${subtotal.toFixed(2)}`;
    taxEl.textContent = `MVR ${tax.toFixed(2)}`;
    totalEl.textContent = `MVR ${total.toFixed(2)}`;
}

// Update item quantity  
window.updateQuantity = function(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;
    
    // If decreasing quantity and it would go to 0, remove item directly
    if (change < 0 && item.quantity === 1) {
        cart = cart.filter(cartItem => cartItem.id !== itemId);
        updateCartDisplay();
        
        // Show removal feedback
        showItemRemovedNotification(item.name);
        return;
    }
    
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
                <span>MVR ${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="receipt-summary-row">
                <span>Tax (${order.taxRate}%):</span>
                <span>MVR ${order.tax.toFixed(2)}</span>
            </div>
            <div class="receipt-summary-row receipt-total">
                <span>TOTAL:</span>
                <span>MVR ${order.total.toFixed(2)}</span>
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
    
    // Navigation
    document.getElementById('nav-toggle').addEventListener('click', toggleBillsNav);
    document.getElementById('close-bills-nav').addEventListener('click', closeBillsNav);
    document.getElementById('nav-overlay').addEventListener('click', closeBillsNav);
    
    // Bills search and filter
    document.getElementById('bills-search').addEventListener('input', (e) => {
        filterBills(e.target.value);
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterBillsByPeriod(e.target.dataset.filter);
        });
    });
    
    // Cart actions
    document.getElementById('clear-cart').addEventListener('click', clearCart);
    document.getElementById('save-order').addEventListener('click', saveCurrentOrder);
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
    
    // Variations modal
    document.getElementById('close-variations').addEventListener('click', closeVariationsModal);
    document.getElementById('cancel-variation').addEventListener('click', closeVariationsModal);
    document.getElementById('add-variation').addEventListener('click', addSelectedVariation);
    
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
            if (e.target.id === 'variations-modal') {
                closeVariationsModal();
            } else {
                e.target.style.display = 'none';
            }
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
            if (document.getElementById('variations-modal').style.display === 'block') {
                closeVariationsModal();
            } else {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        }
    });
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./pos-sw.js')
        .then(registration => {
            console.log('POS Service Worker registered:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch(error => {
            console.error('POS Service Worker registration failed:', error);
        });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            showUpdateNotification();
        }
    });
}

// PWA Install Prompt Handler
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt triggered');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button or notification
    showInstallPrompt();
});

// Check PWA installation criteria
function checkPWAInstallability() {
    console.log('=== PWA Installation Check ===');
    console.log('Protocol:', window.location.protocol);
    console.log('Is HTTPS or localhost:', window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    console.log('Service Worker supported:', 'serviceWorker' in navigator);
    console.log('Manifest link present:', !!document.querySelector('link[rel="manifest"]'));
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is running in standalone mode (already installed)');
    } else {
        console.log('App is running in browser mode');
    }
    
    // Check for beforeinstallprompt support
    console.log('Install prompt available:', !!deferredPrompt);
}

// Show install prompt
function showInstallPrompt() {
    const notification = document.createElement('div');
    notification.className = 'install-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span>📱 Install Knox POS as an app for better experience!</span>
            <div class="notification-actions">
                <button onclick="installPWA()" class="btn-install">Install</button>
                <button onclick="dismissInstallPrompt(this)" class="btn-dismiss">Not now</button>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

// Install PWA
window.installPWA = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the PWA install prompt');
            } else {
                console.log('User dismissed the PWA install prompt');
            }
            deferredPrompt = null;
        });
    }
    // Remove notification
    const notification = document.querySelector('.install-notification');
    if (notification) {
        notification.remove();
    }
};

// Dismiss install prompt
window.dismissInstallPrompt = function(button) {
    const notification = button.closest('.install-notification');
    if (notification) {
        notification.remove();
    }
};

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>🚀 Update available! New features and improvements.</span>
            <button onclick="updateApp()" class="update-btn">Update Now</button>
            <button onclick="dismissUpdate(this)" class="dismiss-btn">Later</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            dismissUpdate(notification);
        }
    }, 10000);
}

// Update the app
window.updateApp = function() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
    }
};

// Dismiss update notification
window.dismissUpdate = function(element) {
    const notification = element.closest ? element.closest('.update-notification') : element;
    if (notification && notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            notification.parentNode.removeChild(notification);
        }, 300);
    }
};

// Bills Navigation Functions
let savedBills = [];
let filteredBills = [];

function toggleBillsNav() {
    const nav = document.getElementById('bills-nav');
    const overlay = document.getElementById('nav-overlay');
    
    if (nav.classList.contains('open')) {
        closeBillsNav();
    } else {
        loadSavedBills();
        nav.classList.add('open');
        overlay.classList.add('active');
    }
}

function closeBillsNav() {
    const nav = document.getElementById('bills-nav');
    const overlay = document.getElementById('nav-overlay');
    
    nav.classList.remove('open');
    overlay.classList.remove('active');
}

async function loadSavedBills() {
    try {
        const ordersRef = ref(window.db, 'pos-orders');
        const snapshot = await get(ordersRef);
        
        savedBills = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                savedBills.push({ id: child.key, ...child.val() });
            });
        }
        
        // Sort by timestamp descending (newest first)
        savedBills.sort((a, b) => b.timestamp - a.timestamp);
        filteredBills = [...savedBills];
        
        displayBills(filteredBills);
    } catch (error) {
        console.error('Error loading saved bills:', error);
        document.getElementById('bills-list').innerHTML = '<div class="error">Error loading bills</div>';
    }
}

function displayBills(bills) {
    const container = document.getElementById('bills-list');
    
    if (bills.length === 0) {
        container.innerHTML = '<div class="loading-bills"><p>No bills found</p></div>';
        return;
    }
    
    container.innerHTML = bills.map(bill => {
        const date = new Date(bill.timestamp);
        const itemsText = bill.items.map(item => `${item.name} x${item.quantity}`).join(', ');
        const isPaid = bill.paid || false;
        
        return `
            <div class="bill-item ${isPaid ? 'paid' : 'unpaid'}" onclick="loadBill('${bill.id}')">
                <div class="bill-header">
                    <span class="bill-id">#${bill.id.slice(-6).toUpperCase()}</span>
                    <span class="bill-total">MVR ${bill.total.toFixed(2)}</span>
                    <span class="bill-status ${isPaid ? 'status-paid' : 'status-unpaid'}">${isPaid ? 'PAID' : 'UNPAID'}</span>
                </div>
                <div class="bill-date">${date.toLocaleString()}</div>
                <div class="bill-items">${itemsText}</div>
                <div class="bill-actions" onclick="event.stopPropagation()">
                    ${!isPaid ? `<button class="btn-pay" onclick="markAsPaid('${bill.id}')">Mark as Paid</button>` : ''}
                    <button class="btn-delete" onclick="deleteBill('${bill.id}')" title="Delete Bill">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterBills(searchQuery) {
    if (!searchQuery.trim()) {
        filteredBills = [...savedBills];
    } else {
        const query = searchQuery.toLowerCase();
        filteredBills = savedBills.filter(bill => {
            const billId = bill.id.toLowerCase();
            const itemsText = bill.items.map(item => item.name.toLowerCase()).join(' ');
            return billId.includes(query) || itemsText.includes(query);
        });
    }
    
    displayBills(filteredBills);
}

function filterBillsByPeriod(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filteredBills = savedBills.filter(bill => bill.timestamp >= startDate.getTime());
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredBills = savedBills.filter(bill => bill.timestamp >= startDate.getTime());
            break;
        case 'paid':
            filteredBills = savedBills.filter(bill => bill.paid === true);
            break;
        case 'unpaid':
            filteredBills = savedBills.filter(bill => !bill.paid);
            break;
        case 'all':
        default:
            filteredBills = [...savedBills];
            break;
    }
    
    displayBills(filteredBills);
}

// Apply current filter (helper function for refreshing display)
function applyCurrentFilter() {
    const activeFilter = document.querySelector('.filter-btn.active');
    const currentFilter = activeFilter ? activeFilter.dataset.filter : 'all';
    filterBillsByPeriod(currentFilter);
}

// Mark bill as paid
window.markAsPaid = function(billId) {
    const bill = savedBills.find(b => b.id === billId);
    if (bill) {
        bill.paid = true;
        bill.paidAt = Date.now();
        
        // Update in Firebase
        const billsRef = database.ref('orders');
        billsRef.child(billId).update({
            paid: true,
            paidAt: bill.paidAt
        }).then(() => {
            console.log('Bill marked as paid in Firebase');
            // Update the display
            applyCurrentFilter();
        }).catch((error) => {
            console.error('Error updating bill in Firebase:', error);
        });
    }
};

// Delete bill
window.deleteBill = function(billId) {
    if (confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
        // Remove from local array
        savedBills = savedBills.filter(bill => bill.id !== billId);
        
        // Remove from Firebase
        const billsRef = database.ref('orders');
        billsRef.child(billId).remove().then(() => {
            console.log('Bill deleted from Firebase');
            // Update the display
            applyCurrentFilter();
        }).catch((error) => {
            console.error('Error deleting bill from Firebase:', error);
        });
    }
};

window.loadBill = function(billId) {
    const bill = savedBills.find(b => b.id === billId);
    if (!bill) return;
    
    // Load bill items into cart
    cart = bill.items.map(item => ({ ...item }));
    updateCartDisplay();
    closeBillsNav();
    
    // Show confirmation
    showSuccessNotification(`✅ Bill #${billId.slice(-6).toUpperCase()} loaded into cart`);
};

// Close variations modal
function closeVariationsModal() {
    document.getElementById('variations-modal').style.display = 'none';
    currentVariationProduct = null;
    selectedVariation = null;
}

// Add selected variation to cart
function addSelectedVariation() {
    if (!currentVariationProduct || selectedVariation === null) return;
    
    let variationData;
    if (selectedVariation === 'normal') {
        variationData = { type: 'normal' };
    } else {
        variationData = { type: 'variation', index: selectedVariation };
    }
    
    addToCart(currentVariationProduct.id, variationData);
    closeVariationsModal();
    
    // Show success feedback
    showSuccessNotification('✅ Added to cart');
}

// Show item removed notification
function showItemRemovedNotification(itemName) {
    showSuccessNotification(`🗑️ Removed ${itemName} from cart`, '#dc3545');
}

// Generic success notification function
function showSuccessNotification(message, backgroundColor = '#D58A94') {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div style="background: ${backgroundColor}; color: white; padding: 10px 16px; border-radius: 8px; margin: 10px; box-shadow: 0 4px 12px rgba(213, 138, 148, 0.3); font-size: 0.9rem; position: fixed; top: 80px; right: 20px; z-index: 10001;">
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}

async function saveCurrentOrder() {
    if (cart.length === 0) {
        alert('Cart is empty! Add items before saving.');
        return;
    }
    
    try {
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
            status: 'saved' // Different from completed orders
        };
        
        const ordersRef = ref(window.db, 'pos-orders');
        const orderRef = await push(ordersRef, order);
        
        // Show success message
        alert(`Order saved as #${orderRef.key.slice(-6).toUpperCase()}`);
        
        // Optionally clear cart after saving
        if (confirm('Clear cart after saving?')) {
            cart = [];
            updateCartDisplay();
        }
        
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Error saving order. Please try again.');
    }
}