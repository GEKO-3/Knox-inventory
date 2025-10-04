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

// Global variables
let supplyItems = [];
let stockItems = [];
let recipes = [];
let currentEditingId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    registerServiceWorker();
});

function initializeApp() {
    setupNavigation();
    setupModals();
    setupForms();
    setupKeyboardShortcuts();
    setupOfflineDetection();
    loadData();
}

// Navigation
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            
            // Remove active class from all buttons and pages
            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked button and corresponding page
            btn.classList.add('active');
            document.getElementById(`${targetPage}-page`).classList.add('active');
        });
    });
}

// Modal setup
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
            currentEditingId = null;
        });
    });
    
    // Close modal when clicking outside (with buffer zone)
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            // Only check if modal is visible
            if (modal.style.display === 'block') {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent && !modalContent.contains(e.target)) {
                    const rect = modalContent.getBoundingClientRect();
                    const buffer = 100; // 100px buffer zone
                    
                    const clickX = e.clientX;
                    const clickY = e.clientY;
                    
                    // Only close if click is outside the buffer zone around modal content
                    if (clickX < rect.left - buffer || 
                        clickX > rect.right + buffer || 
                        clickY < rect.top - buffer || 
                        clickY > rect.bottom + buffer) {
                        modal.style.display = 'none';
                        // Reset form if it's the recipe modal
                        if (modal.id === 'recipe-modal') {
                            resetRecipeForm();
                        }
                        currentEditingId = null;
                    }
                }
            }
        });
    });
    
    // Modal trigger buttons
    document.getElementById('add-supply-btn').addEventListener('click', () => {
        document.getElementById('supply-modal').style.display = 'block';
        document.getElementById('supply-form').reset();
        currentEditingId = null;
    });
    
    document.getElementById('add-stock-btn').addEventListener('click', () => {
        setupStockDropdown();
        document.getElementById('stock-modal').style.display = 'block';
        document.getElementById('stock-form').reset();
    });
    
    document.getElementById('add-recipe-btn').addEventListener('click', () => {
        resetRecipeForm();
        document.getElementById('recipe-modal').style.display = 'block';
        currentEditingId = null;
    });
    
    // Cancel buttons
    document.getElementById('cancel-supply').addEventListener('click', () => {
        document.getElementById('supply-modal').style.display = 'none';
        currentEditingId = null;
    });
    
    document.getElementById('cancel-stock').addEventListener('click', () => {
        document.getElementById('stock-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-recipe').addEventListener('click', () => {
        document.getElementById('recipe-modal').style.display = 'none';
        resetRecipeForm();
        currentEditingId = null;
    });
}

// Form setup
function setupForms() {
    // Supply form
    document.getElementById('supply-form').addEventListener('submit', handleSupplySubmit);
    
    // Stock form
    document.getElementById('stock-form').addEventListener('submit', handleStockSubmit);
    setupStockDropdown();
    
    // Recipe form
    document.getElementById('recipe-form').addEventListener('submit', handleRecipeSubmit);
    document.getElementById('add-recipe-item').addEventListener('click', addRecipeItem);
    document.getElementById('add-variation').addEventListener('click', addRecipeVariation);
    setupRecipeNameCapitalization();
}

// Keyboard shortcuts setup
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only trigger if no modal is open and not typing in an input field
        const isModalOpen = document.querySelector('.modal[style*="block"]') !== null;
        const isTypingInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
        
        if (isModalOpen || isTypingInInput) {
            return;
        }
        
        // Check if we're on the supply page
        const supplyPage = document.getElementById('supply-page');
        const isSupplyPageActive = supplyPage && supplyPage.classList.contains('active');
        
        if (e.key === 'Enter' && isSupplyPageActive) {
            e.preventDefault();
            document.getElementById('supply-modal').style.display = 'block';
            document.getElementById('supply-form').reset();
            currentEditingId = null;
            // Focus on the first input field
            setTimeout(() => {
                document.getElementById('supply-name').focus();
            }, 100);
        }
    });
}

// PWA Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered successfully:', registration);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    // PWA Install prompt
    setupPWAInstall();
}

function setupPWAInstall() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt triggered');
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        hideInstallButton();
        // You could show a thank you message here
    });
    
    function showInstallButton() {
        // Create install button if it doesn't exist
        if (!document.getElementById('install-btn')) {
            const installBtn = document.createElement('button');
            installBtn.id = 'install-btn';
            installBtn.className = 'btn-primary install-btn';
            installBtn.innerHTML = '📱 Install App';
            installBtn.title = 'Install Knox Inventory as an app';
            
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('PWA install outcome:', outcome);
                    deferredPrompt = null;
                    hideInstallButton();
                }
            });
            
            // Add to header
            const header = document.querySelector('header nav');
            if (header) {
                header.appendChild(installBtn);
            }
        }
    }
    
    function hideInstallButton() {
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.remove();
        }
    }
}

function showUpdateNotification() {
    // Create update notification
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>🔄 New version available!</span>
            <button onclick="reloadForUpdate()" class="btn-primary">Update</button>
            <button onclick="dismissUpdate(this)" class="btn-secondary">Later</button>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

function reloadForUpdate() {
    window.location.reload();
}

function dismissUpdate(button) {
    button.closest('.update-notification').remove();
}

// Recipe Name Capitalization Setup
function setupRecipeNameCapitalization() {
    const recipeNameInput = document.getElementById('recipe-name');
    
    if (recipeNameInput) {
        recipeNameInput.addEventListener('input', (e) => {
            const input = e.target;
            const value = input.value;
            
            if (value.length > 0) {
                // Capitalize first letter of each word while preserving user input
                const words = value.split(' ');
                const capitalizedWords = words.map(word => {
                    if (word.length > 0) {
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    }
                    return word;
                });
                
                const capitalizedValue = capitalizedWords.join(' ');
                
                // Only update if the value actually changed to avoid cursor jumping
                if (value !== capitalizedValue) {
                    const cursorPosition = input.selectionStart;
                    input.value = capitalizedValue;
                    // Restore cursor position
                    input.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        });
        
        // Also handle paste events
        recipeNameInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                const input = e.target;
                const value = input.value;
                
                if (value.length > 0) {
                    const words = value.split(' ');
                    const capitalizedWords = words.map(word => {
                        if (word.length > 0) {
                            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                        }
                        return word;
                    });
                    
                    input.value = capitalizedWords.join(' ');
                }
            }, 10); // Small delay to allow paste to complete
        });
    }
}

// Offline Detection
function setupOfflineDetection() {
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const indicator = document.getElementById('offline-indicator') || createOfflineIndicator();
        
        if (isOnline) {
            indicator.style.display = 'none';
            document.body.classList.remove('offline');
            
            // Trigger sync when coming back online
            if (window.offlineManager) {
                setTimeout(() => {
                    window.offlineManager.syncPendingChanges();
                }, 1000);
            }
        } else {
            const pendingCount = window.offlineManager ? window.offlineManager.getPendingChangesCount() : 0;
            updateOfflineIndicator(indicator, pendingCount);
            indicator.style.display = 'flex';
            document.body.classList.add('offline');
        }
    }
    
    function createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator';
        document.body.appendChild(indicator);
        return indicator;
    }
    
    function updateOfflineIndicator(indicator, pendingCount) {
        const pendingText = pendingCount > 0 ? ` • ${pendingCount} changes pending` : '';
        indicator.innerHTML = `
            <span>📡 You're offline${pendingText}</span>
            <small>Changes will sync when reconnected</small>
        `;
    }
    
    // Initial check
    updateOnlineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Update pending changes count periodically when offline
    setInterval(() => {
        if (!navigator.onLine && window.offlineManager) {
            const indicator = document.getElementById('offline-indicator');
            if (indicator && indicator.style.display !== 'none') {
                const pendingCount = window.offlineManager.getPendingChangesCount();
                updateOfflineIndicator(indicator, pendingCount);
            }
        }
    }, 5000);
}

// Recipe Form Reset Function
function resetRecipeForm() {
    // Reset the main form
    document.getElementById('recipe-form').reset();
    
    // Clear recipe items container and add one default item
    const recipeItemsContainer = document.getElementById('recipe-items');
    recipeItemsContainer.innerHTML = `
        <div class="recipe-item">
            <input type="text" class="recipe-item-input" placeholder="Select or type item..." list="recipe-items-datalist" autocomplete="off" required>
            <input type="number" class="recipe-measure" placeholder="Measure" step="0.01" autocomplete="off" required>
            <button type="button" class="btn-remove" onclick="removeRecipeItem(this)">Remove</button>
        </div>
    `;
    
    // Clear variations container completely
    const variationsContainer = document.getElementById('recipe-variations');
    variationsContainer.innerHTML = '';
    
    // Clear category suggestions
    const categorySuggestions = document.getElementById('category-suggestions');
    if (categorySuggestions) {
        categorySuggestions.style.display = 'none';
        categorySuggestions.innerHTML = '';
    }
    
    // Reset total cost display
    const totalCostElement = document.getElementById('recipe-total-cost');
    if (totalCostElement) {
        totalCostElement.textContent = '0.00';
    }
    
    // Re-setup the recipe item inputs for the default item
    setupRecipeItemInputs();
}

// Supply Management
async function handleSupplySubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('supply-name').value,
        price: parseFloat(document.getElementById('supply-price').value),
        size: parseFloat(document.getElementById('supply-size').value),
        measurePerProduct: parseFloat(document.getElementById('supply-measure').value),
        createdAt: new Date().toISOString()
    };
    
    // Calculate derived values
    formData.priceWithGST = formData.price * 1.08;
    formData.productsPerUnit = formData.size / formData.measurePerProduct;
    formData.pricePerProduct = formData.priceWithGST / formData.productsPerUnit;
    
    try {
        if (navigator.onLine) {
            // Online: Save to Firebase directly
            if (currentEditingId) {
                const supplyRef = ref(window.db, `supply/${currentEditingId}`);
                await update(supplyRef, formData);
            } else {
                const supplyRef = ref(window.db, 'supply');
                await push(supplyRef, formData);
            }
        } else {
            // Offline: Queue for sync and apply locally
            if (window.offlineManager) {
                const action = currentEditingId ? 'update' : 'create';
                window.offlineManager.queueChange('supply', action, formData, currentEditingId);
                window.offlineManager.applyLocalChange('supply', action, formData, currentEditingId);
            }
        }
        
        document.getElementById('supply-modal').style.display = 'none';
        currentEditingId = null;
        loadSupplyData();
    } catch (error) {
        console.error('Error saving supply item:', error);
        
        // If Firebase fails, fall back to offline mode
        if (window.offlineManager) {
            const action = currentEditingId ? 'update' : 'create';
            window.offlineManager.queueChange('supply', action, formData, currentEditingId);
            window.offlineManager.applyLocalChange('supply', action, formData, currentEditingId);
            
            document.getElementById('supply-modal').style.display = 'none';
            currentEditingId = null;
            loadSupplyData();
        } else {
            alert('Error saving supply item. Please try again.');
        }
    }
}

async function loadSupplyData() {
    try {
        // Check if we should use local data (offline or recent local data)
        if (window.offlineManager && window.offlineManager.shouldUseLocalData('supply')) {
            console.log('Loading supply data from local storage');
            supplyItems = window.offlineManager.getFromLocal('supply');
            
            // Ensure calculated properties are present
            supplyItems.forEach(item => {
                if (!item.priceWithGST || !item.pricePerProduct || !item.productsPerUnit) {
                    item.priceWithGST = item.price * 1.08;
                    item.productsPerUnit = item.size / item.measurePerProduct;
                    item.pricePerProduct = item.priceWithGST / item.productsPerUnit;
                }
            });
        } else {
            // Load from Firebase
            console.log('Loading supply data from Firebase');
            const supplyRef = ref(window.db, 'supply');
            const snapshot = await get(supplyRef);
            supplyItems = [];
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.keys(data).forEach(key => {
                    supplyItems.push({ id: key, ...data[key] });
                });
            }
            
            // Cache in local storage
            if (window.offlineManager) {
                window.offlineManager.saveToLocal('supply', supplyItems);
            }
        }
        
        renderSupplyTable();
    } catch (error) {
        console.error('Error loading supply data:', error);
        // Fallback to local data if Firebase fails
        if (window.offlineManager) {
            console.log('Falling back to local supply data');
            supplyItems = window.offlineManager.getFromLocal('supply');
            
            // Ensure calculated properties are present
            supplyItems.forEach(item => {
                if (!item.priceWithGST || !item.pricePerProduct || !item.productsPerUnit) {
                    item.priceWithGST = item.price * 1.08;
                    item.productsPerUnit = item.size / item.measurePerProduct;
                    item.pricePerProduct = item.priceWithGST / item.productsPerUnit;
                }
            });
            
            renderSupplyTable();
        }
    }
}

function renderSupplyTable() {
    const tbody = document.getElementById('supply-tbody');
    tbody.innerHTML = '';
    
    if (supplyItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No supply items found. Add your first item!</td></tr>';
        return;
    }
    
    // Sort items alphabetically with numbers before letters
    const sortedItems = [...supplyItems].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        // Check if names start with numbers
        const aStartsWithNumber = /^\d/.test(nameA);
        const bStartsWithNumber = /^\d/.test(nameB);
        
        // Numbers come before letters
        if (aStartsWithNumber && !bStartsWithNumber) return -1;
        if (!aStartsWithNumber && bStartsWithNumber) return 1;
        
        // Both are numbers or both are letters, sort alphabetically
        return nameA.localeCompare(nameB);
    });
    
    sortedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${item.priceWithGST.toFixed(2)}</td>
            <td>${item.pricePerProduct.toFixed(4)}</td>
            <td>${item.size}</td>
            <td>${item.measurePerProduct}</td>
            <td>${item.productsPerUnit.toFixed(2)}</td>
            <td>
                <button class="btn-secondary" onclick="editSupplyItem('${item.id}')">Edit</button>
                <button class="btn-remove" onclick="deleteSupplyItem('${item.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Render mobile tiles
    renderSupplyTiles(sortedItems);
}

function renderSupplyTiles(items) {
    const tilesContainer = document.getElementById('supply-tiles');
    tilesContainer.innerHTML = '';
    
    if (items.length === 0) {
        tilesContainer.innerHTML = '<div class="empty-state"><h3>No supply items found</h3><p>Add your first item!</p></div>';
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <div class="recipe-header" onclick="toggleSupplyDetails('${item.id}')">
                <h3>${item.name}</h3>
                <div class="recipe-summary">
                    <span>Price + GST: ${item.priceWithGST.toFixed(2)}</span>
                    <span>Per Product: ${item.pricePerProduct.toFixed(4)}</span>
                    <span>Size: ${item.size}</span>
                </div>
            </div>
            <div class="recipe-details" id="supply-details-${item.id}">
                <div class="recipe-items">
                    <h4>Details:</h4>
                    <div class="recipe-details-grid">
                        <div class="recipe-item-display">
                            <span>Base Price</span>
                            <span>Amount: ${item.price.toFixed(2)}</span>
                        </div>
                        <div class="recipe-item-display">
                            <span>Price per Product</span>
                            <span>Amount: ${item.pricePerProduct.toFixed(4)}</span>
                        </div>
                        <div class="recipe-item-display">
                            <span>Measure per Product</span>
                            <span>Amount: ${item.measurePerProduct}</span>
                        </div>
                        <div class="recipe-item-display">
                            <span>Products per Unit</span>
                            <span>Amount: ${item.productsPerUnit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="editSupplyItem('${item.id}')">Edit</button>
                    <button class="btn-remove" onclick="deleteSupplyItem('${item.id}')">Delete</button>
                </div>
            </div>
        `;
        tilesContainer.appendChild(card);
    });
}

function toggleSupplyDetails(id) {
    const details = document.getElementById(`supply-details-${id}`);
    details.classList.toggle('show');
}

function toggleStockDetails(id) {
    const details = document.getElementById(`stock-details-${id}`);
    details.classList.toggle('show');
}



async function editSupplyItem(id) {
    try {
        const item = supplyItems.find(item => item.id === id);
        if (!item) {
            console.error('Supply item not found with id:', id);
            alert('Supply item not found. Please refresh the page and try again.');
            return;
        }
        
        // Populate the form with existing data
        document.getElementById('supply-name').value = item.name || '';
        document.getElementById('supply-price').value = item.price || '';
        document.getElementById('supply-size').value = item.size || '';
        document.getElementById('supply-measure').value = item.measurePerProduct || '';
        
        currentEditingId = id;
        document.getElementById('supply-modal').style.display = 'block';
    } catch (error) {
        console.error('Error in editSupplyItem:', error);
        alert('Error opening edit form. Please try again.');
    }
}

async function deleteSupplyItem(id) {
    if (confirm('Are you sure you want to delete this supply item?')) {
        try {
            const supplyRef = ref(window.db, `supply/${id}`);
            await remove(supplyRef);
            loadSupplyData();
        } catch (error) {
            console.error('Error deleting supply item:', error);
            alert('Error deleting supply item. Please try again.');
        }
    }
}

// Stock Management
function setupStockDropdown() {
    const stockSelect = document.getElementById('stock-name');
    stockSelect.innerHTML = '<option value="">Select Supply Item...</option>';
    
    // Populate with supply items
    supplyItems.forEach(item => {
        stockSelect.innerHTML += `<option value="${item.id}">${item.name}</option>`;
    });
}

function getSupplyItemById(id) {
    return supplyItems.find(item => item.id === id);
}

// Category suggestions setup
function setupCategorySuggestions() {
    const categoryInput = document.getElementById('recipe-category');
    const suggestionsContainer = document.getElementById('category-suggestions');
    
    // Safety check - make sure elements exist
    if (!categoryInput || !suggestionsContainer) {
        console.warn('Category suggestion elements not found');
        return;
    }
    
    // Check if listeners are already attached
    if (categoryInput.hasAttribute('data-suggestions-setup')) {
        return;
    }
    
    categoryInput.addEventListener('input', handleCategoryInput);
    categoryInput.addEventListener('focus', handleCategoryFocus);
    categoryInput.setAttribute('data-suggestions-setup', 'true');
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!categoryInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
}

function handleCategoryInput(e) {
    const value = e.target.value.toLowerCase();
    const suggestionsContainer = document.getElementById('category-suggestions');
    showCategorySuggestions(value, suggestionsContainer);
}

function handleCategoryFocus(e) {
    const value = e.target.value.toLowerCase();
    const suggestionsContainer = document.getElementById('category-suggestions');
    showCategorySuggestions(value, suggestionsContainer);
}

function getExistingCategories() {
    const categories = new Set();
    console.log('Getting existing categories, recipes count:', recipes.length);
    recipes.forEach(recipe => {
        if (recipe.category && recipe.category.trim()) {
            categories.add(recipe.category.trim());
        }
    });
    const result = Array.from(categories).sort();
    console.log('Found categories:', result);
    return result;
}

function showCategorySuggestions(inputValue, container) {
    console.log('Showing category suggestions for:', inputValue);
    const existingCategories = getExistingCategories();
    const filteredCategories = existingCategories.filter(category => 
        category.toLowerCase().includes(inputValue)
    );
    
    console.log('Filtered categories:', filteredCategories);
    
    if (filteredCategories.length === 0 || (filteredCategories.length === 1 && filteredCategories[0].toLowerCase() === inputValue)) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    filteredCategories.forEach(category => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = category;
        suggestionItem.addEventListener('click', () => {
            document.getElementById('recipe-category').value = category;
            container.style.display = 'none';
        });
        container.appendChild(suggestionItem);
    });
    
    container.style.display = filteredCategories.length > 0 ? 'block' : 'none';
}

async function handleStockSubmit(e) {
    e.preventDefault();
    
    const supplyItemId = document.getElementById('stock-name').value;
    const amount = parseFloat(document.getElementById('stock-amount').value);
    
    if (!supplyItemId) {
        alert('Please select a supply item');
        return;
    }
    
    const supplyItem = getSupplyItemById(supplyItemId);
    if (!supplyItem) {
        alert('Supply item not found');
        return;
    }
    
    // Check if stock item already exists for this supply item
    const existingStock = stockItems.find(item => item.supplyItemId === supplyItemId);
    
    const currentDate = new Date().toISOString();
    const logEntry = {
        action: 'added',
        amount: amount,
        date: currentDate,
        note: `Added ${amount} units`
    };
    
    try {
        if (existingStock) {
            // Update existing stock
            const updatedAmount = existingStock.amountInStock + amount;
            const updatedLog = [...(existingStock.changeLog || []), logEntry];
            
            const stockRef = ref(window.db, `stock/${existingStock.id}`);
            await update(stockRef, {
                amountInStock: updatedAmount,
                lastUpdated: currentDate,
                changeLog: updatedLog
            });
        } else {
            // Create new stock item
            const stockRef = ref(window.db, 'stock');
            await push(stockRef, {
                supplyItemId: supplyItemId,
                supplyItemName: supplyItem.name,
                amountInStock: amount,
                amountUsed: 0,
                createdAt: currentDate,
                lastUpdated: currentDate,
                changeLog: [logEntry]
            });
        }
        
        document.getElementById('stock-modal').style.display = 'none';
        document.getElementById('stock-form').reset();
        loadStockData();
    } catch (error) {
        console.error('Error saving stock item:', error);
        alert('Error saving stock item. Please try again.');
    }
}

async function loadStockData() {
    try {
        // Check if we should use local data (offline or recent local data)
        if (window.offlineManager && window.offlineManager.shouldUseLocalData('stock')) {
            console.log('Loading stock data from local storage');
            stockItems = window.offlineManager.getFromLocal('stock');
        } else {
            // Load from Firebase
            console.log('Loading stock data from Firebase');
            const stockRef = ref(window.db, 'stock');
            const snapshot = await get(stockRef);
            stockItems = [];
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.keys(data).forEach(key => {
                    stockItems.push({ id: key, ...data[key] });
                });
            }
            
            // Cache in local storage
            if (window.offlineManager) {
                window.offlineManager.saveToLocal('stock', stockItems);
            }
        }
        
        renderStockTable();
    } catch (error) {
        console.error('Error loading stock data:', error);
        // Fallback to local data if Firebase fails
        if (window.offlineManager) {
            console.log('Falling back to local stock data');
            stockItems = window.offlineManager.getFromLocal('stock');
            renderStockTable();
        }
    }
}

function renderStockTable() {
    const tbody = document.getElementById('stock-tbody');
    tbody.innerHTML = '';
    
    if (stockItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No stock items found. Add your first order!</td></tr>';
        return;
    }
    
    // Sort stock items alphabetically by supply item name
    const sortedStockItems = [...stockItems].sort((a, b) => {
        const nameA = a.supplyItemName.toLowerCase();
        const nameB = b.supplyItemName.toLowerCase();
        
        const aStartsWithNumber = /^\d/.test(nameA);
        const bStartsWithNumber = /^\d/.test(nameB);
        
        if (aStartsWithNumber && !bStartsWithNumber) return -1;
        if (!aStartsWithNumber && bStartsWithNumber) return 1;
        
        return nameA.localeCompare(nameB);
    });
    
    sortedStockItems.forEach(item => {
        const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.supplyItemName}</td>
            <td>${item.amountInStock.toFixed(2)}</td>
            <td>${item.amountUsed.toFixed(2)}</td>
            <td>${lastUpdated}</td>
            <td>
                <button class="btn-minus" onclick="decreaseStock('${item.id}')">-</button>
                <button class="btn-secondary" onclick="viewStockLog('${item.id}')">Log</button>
                <button class="btn-remove" onclick="deleteStockItem('${item.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Render mobile tiles
    renderStockTiles(sortedStockItems);
}

function renderStockTiles(items) {
    const tilesContainer = document.getElementById('stock-tiles');
    tilesContainer.innerHTML = '';
    
    if (items.length === 0) {
        tilesContainer.innerHTML = '<div class="empty-state"><h3>No stock items found</h3><p>Add your first order!</p></div>';
        return;
    }
    
    items.forEach(item => {
        const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'Never';
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <div class="recipe-header" onclick="toggleStockDetails('${item.id}')">
                <h3>${item.supplyItemName}</h3>
                <div class="recipe-summary">
                    <span>In Stock: ${item.amountInStock.toFixed(2)}</span>
                    <span>Used: ${item.amountUsed.toFixed(2)}</span>
                    <span>Updated: ${lastUpdated}</span>
                </div>
            </div>
            <div class="recipe-details" id="stock-details-${item.id}">
                <div class="form-actions">
                    <button class="btn-secondary" onclick="decreaseStock('${item.id}')">Use Stock</button>
                    <button class="btn-secondary" onclick="viewStockLog('${item.id}')">View Log</button>
                    <button class="btn-remove" onclick="deleteStockItem('${item.id}')">Delete</button>
                </div>
            </div>
        `;
        tilesContainer.appendChild(card);
    });
}

async function decreaseStock(id) {
    const amount = prompt('Enter amount to decrease:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
    
    const item = stockItems.find(item => item.id === id);
    if (!item) return;
    
    const decreaseAmount = parseFloat(amount);
    if (decreaseAmount > item.amountInStock) {
        alert('Cannot decrease more than available stock');
        return;
    }
    
    const currentDate = new Date().toISOString();
    const logEntry = {
        action: 'used',
        amount: decreaseAmount,
        date: currentDate,
        note: `Used ${decreaseAmount} units`
    };
    
    const updatedLog = [...(item.changeLog || []), logEntry];
    
    try {
        const stockRef = ref(window.db, `stock/${id}`);
        await update(stockRef, {
            amountInStock: item.amountInStock - decreaseAmount,
            amountUsed: (item.amountUsed || 0) + decreaseAmount,
            lastUpdated: currentDate,
            changeLog: updatedLog
        });
        loadStockData();
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock. Please try again.');
    }
}

async function deleteStockItem(id) {
    if (confirm('Are you sure you want to delete this stock item?')) {
        try {
            const stockRef = ref(window.db, `stock/${id}`);
            await remove(stockRef);
            loadStockData();
        } catch (error) {
            console.error('Error deleting stock item:', error);
            alert('Error deleting stock item. Please try again.');
        }
    }
}

function viewStockLog(id) {
    const item = stockItems.find(item => item.id === id);
    if (!item || !item.changeLog) {
        alert('No log entries found for this item.');
        return;
    }
    
    let logText = `Stock Log for: ${item.supplyItemName}\n\n`;
    item.changeLog.forEach((entry, index) => {
        const date = new Date(entry.date).toLocaleString();
        logText += `${index + 1}. ${entry.note} on ${date}\n`;
    });
    
    alert(logText);
}

// Recipe Management
function setupRecipeItemInputs() {
    const datalist = document.getElementById('recipe-items-datalist');
    if (datalist) {
        datalist.innerHTML = '';
        supplyItems.forEach(item => {
            datalist.innerHTML += `<option value="${item.name}" data-id="${item.id}" data-price="${item.pricePerProduct}"></option>`;
        });
    }
    
    // Setup event listeners for existing inputs
    const inputs = document.querySelectorAll('.recipe-item-input');
    inputs.forEach(input => {
        setupRecipeItemInputListeners(input);
    });
}

function setupRecipeItemInputListeners(input) {
    input.addEventListener('input', (e) => {
        calculateRecipeCost();
    });
    
    input.addEventListener('change', (e) => {
        calculateRecipeCost();
    });
}

function addRecipeItem() {
    const container = document.getElementById('recipe-items');
    const newItem = document.createElement('div');
    newItem.className = 'recipe-item';
    newItem.innerHTML = `
        <input type="text" class="recipe-item-input" placeholder="Select or type item..." list="recipe-items-datalist" autocomplete="off" required>
        <input type="number" class="recipe-measure" placeholder="Measure" step="0.01" autocomplete="off" required>
        <button type="button" class="btn-remove" onclick="removeRecipeItem(this)">Remove</button>
    `;
    container.appendChild(newItem);
    
    // Add event listeners for cost calculation
    const input = newItem.querySelector('.recipe-item-input');
    const measure = newItem.querySelector('.recipe-measure');
    setupRecipeItemInputListeners(input);
    measure.addEventListener('input', calculateRecipeCost);
}

function removeRecipeItem(button) {
    button.parentElement.remove();
    calculateRecipeCost();
}

// Recipe Variations Management
function addRecipeVariation() {
    const container = document.getElementById('recipe-variations');
    const variationId = 'variation-' + Date.now();
    const variationDiv = document.createElement('div');
    variationDiv.className = 'recipe-variation';
    variationDiv.setAttribute('data-variation-id', variationId);
    
    variationDiv.innerHTML = `
        <button type="button" class="variation-remove" onclick="removeVariation(this)">&times;</button>
        <h4>Recipe Variation</h4>
        <div class="variation-header">
            <input type="text" class="variation-name" placeholder="Variation name (e.g., 'Extra Cheese', 'No Onions')" autocomplete="off" required>
            <input type="number" class="variation-price" placeholder="Selling Price" step="0.01" autocomplete="off" required>
        </div>
        <div class="variation-items">
            <label>Item Changes:</label>
            <div class="variation-changes">
                <div class="variation-item">
                    <select class="variation-action">
                        <option value="substitute">Substitute</option>
                        <option value="add">Add</option>
                        <option value="remove">Remove</option>
                    </select>
                    <input type="text" class="variation-original-item" placeholder="Original item (for substitute/remove)" list="recipe-items-datalist" autocomplete="off">
                    <input type="text" class="variation-new-item" placeholder="New item (for substitute/add)" list="recipe-items-datalist" autocomplete="off">
                    <input type="number" class="variation-measure" placeholder="Measure" step="0.01" autocomplete="off">
                    <button type="button" class="btn-remove" onclick="removeVariationItem(this)">Remove</button>
                </div>
            </div>
            <button type="button" class="btn-secondary" onclick="addVariationItem('${variationId}')">Add Item Change</button>
        </div>
        <div class="variation-cost">Cost Adjustment: <span class="variation-cost-value">0.00</span></div>
    `;
    
    container.appendChild(variationDiv);
    
    // Add event listeners for cost calculation
    const priceInput = variationDiv.querySelector('.variation-price');
    const measureInputs = variationDiv.querySelectorAll('.variation-measure');
    const actionSelects = variationDiv.querySelectorAll('.variation-action');
    
    priceInput.addEventListener('input', calculateVariationCosts);
    measureInputs.forEach(input => input.addEventListener('input', calculateVariationCosts));
    actionSelects.forEach(select => select.addEventListener('change', calculateVariationCosts));
}

function removeVariation(button) {
    button.parentElement.remove();
}

function addVariationItem(variationId) {
    const variation = document.querySelector(`[data-variation-id="${variationId}"]`);
    const changesContainer = variation.querySelector('.variation-changes');
    
    const newItem = document.createElement('div');
    newItem.className = 'variation-item';
    newItem.innerHTML = `
        <select class="variation-action">
            <option value="substitute">Substitute</option>
            <option value="add">Add</option>
            <option value="remove">Remove</option>
        </select>
        <input type="text" class="variation-original-item" placeholder="Original item (for substitute/remove)" list="recipe-items-datalist" autocomplete="off">
        <input type="text" class="variation-new-item" placeholder="New item (for substitute/add)" list="recipe-items-datalist" autocomplete="off">
        <input type="number" class="variation-measure" placeholder="Measure" step="0.01" autocomplete="off">
        <button type="button" class="btn-remove" onclick="removeVariationItem(this)">Remove</button>
    `;
    
    changesContainer.appendChild(newItem);
    
    // Add event listeners
    const measureInput = newItem.querySelector('.variation-measure');
    const actionSelect = newItem.querySelector('.variation-action');
    measureInput.addEventListener('input', calculateVariationCosts);
    actionSelect.addEventListener('change', calculateVariationCosts);
}

function removeVariationItem(button) {
    button.parentElement.remove();
    calculateVariationCosts();
}

function calculateVariationCosts() {
    const variations = document.querySelectorAll('.recipe-variation');
    variations.forEach(variation => {
        const costElement = variation.querySelector('.variation-cost-value');
        const variationItems = variation.querySelectorAll('.variation-item');
        let costAdjustment = 0;
        
        variationItems.forEach(item => {
            const action = item.querySelector('.variation-action').value;
            const originalItem = item.querySelector('.variation-original-item').value;
            const newItem = item.querySelector('.variation-new-item').value;
            const measure = parseFloat(item.querySelector('.variation-measure').value) || 0;
            
            if (action === 'substitute' && originalItem && newItem && measure > 0) {
                const originalSupplyItem = supplyItems.find(s => s.name.toLowerCase() === originalItem.toLowerCase());
                const newSupplyItem = supplyItems.find(s => s.name.toLowerCase() === newItem.toLowerCase());
                
                if (originalSupplyItem && newSupplyItem) {
                    const originalCost = parseFloat(originalSupplyItem.pricePerProduct || 0) * measure;
                    const newCost = parseFloat(newSupplyItem.pricePerProduct || 0) * measure;
                    costAdjustment += (newCost - originalCost);
                }
            } else if (action === 'add' && newItem && measure > 0) {
                const supplyItem = supplyItems.find(s => s.name.toLowerCase() === newItem.toLowerCase());
                if (supplyItem) {
                    costAdjustment += parseFloat(supplyItem.pricePerProduct || 0) * measure;
                }
            } else if (action === 'remove' && originalItem && measure > 0) {
                const supplyItem = supplyItems.find(s => s.name.toLowerCase() === originalItem.toLowerCase());
                if (supplyItem) {
                    costAdjustment -= parseFloat(supplyItem.pricePerProduct || 0) * measure;
                }
            }
        });
        
        costElement.textContent = (costAdjustment >= 0 ? '+' : '') + costAdjustment.toFixed(2);
    });
}

function calculateRecipeCost() {
    const recipeItems = document.querySelectorAll('.recipe-item');
    let totalCost = 0;
    
    recipeItems.forEach(item => {
        const input = item.querySelector('.recipe-item-input');
        const measure = item.querySelector('.recipe-measure');
        
        if (input.value && measure.value) {
            // Find the supply item by name
            const supplyItem = supplyItems.find(s => s.name.toLowerCase() === input.value.toLowerCase());
            if (supplyItem) {
                const pricePerProduct = parseFloat(supplyItem.pricePerProduct || 0);
                const measureValue = parseFloat(measure.value);
                totalCost += pricePerProduct * measureValue;
            }
        }
    });
    
    document.getElementById('recipe-total-cost').textContent = totalCost.toFixed(2);
}

async function handleRecipeSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('recipe-name').value;
    const category = document.getElementById('recipe-category').value;
    const sellingPrice = parseFloat(document.getElementById('recipe-selling-price').value);
    
    const items = [];
    const recipeItems = document.querySelectorAll('.recipe-item');
    
    recipeItems.forEach(item => {
        const input = item.querySelector('.recipe-item-input');
        const measure = item.querySelector('.recipe-measure');
        
        if (input.value && measure.value) {
            const supplyItem = supplyItems.find(s => s.name.toLowerCase() === input.value.toLowerCase());
            if (supplyItem) {
                items.push({
                    itemId: supplyItem.id,
                    itemName: supplyItem.name,
                    measure: parseFloat(measure.value),
                    cost: parseFloat(supplyItem.pricePerProduct) * parseFloat(measure.value)
                });
            }
        }
    });
    
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    
    // Collect variations data
    const variations = [];
    const variationElements = document.querySelectorAll('.recipe-variation');
    
    variationElements.forEach(variationElement => {
        const variationName = variationElement.querySelector('.variation-name').value;
        const variationPrice = parseFloat(variationElement.querySelector('.variation-price').value);
        
        if (variationName && variationPrice) {
            const changes = [];
            const variationItems = variationElement.querySelectorAll('.variation-item');
            
            variationItems.forEach(item => {
                const action = item.querySelector('.variation-action').value;
                const originalItem = item.querySelector('.variation-original-item').value;
                const newItem = item.querySelector('.variation-new-item').value;
                const measure = parseFloat(item.querySelector('.variation-measure').value) || 0;
                
                if ((action === 'substitute' && originalItem && newItem && measure > 0) ||
                    (action === 'add' && newItem && measure > 0) ||
                    (action === 'remove' && originalItem && measure > 0)) {
                    
                    changes.push({
                        action,
                        originalItem,
                        newItem,
                        measure
                    });
                }
            });
            
            // Calculate variation cost
            let variationCostAdjustment = 0;
            changes.forEach(change => {
                if (change.action === 'substitute' && change.originalItem && change.newItem) {
                    const originalSupplyItem = supplyItems.find(s => s.name.toLowerCase() === change.originalItem.toLowerCase());
                    const newSupplyItem = supplyItems.find(s => s.name.toLowerCase() === change.newItem.toLowerCase());
                    
                    if (originalSupplyItem && newSupplyItem) {
                        const originalCost = parseFloat(originalSupplyItem.pricePerProduct || 0) * change.measure;
                        const newCost = parseFloat(newSupplyItem.pricePerProduct || 0) * change.measure;
                        variationCostAdjustment += (newCost - originalCost);
                    }
                } else if (change.action === 'add' && change.newItem) {
                    const supplyItem = supplyItems.find(s => s.name.toLowerCase() === change.newItem.toLowerCase());
                    if (supplyItem) {
                        variationCostAdjustment += parseFloat(supplyItem.pricePerProduct || 0) * change.measure;
                    }
                } else if (change.action === 'remove' && change.originalItem) {
                    const supplyItem = supplyItems.find(s => s.name.toLowerCase() === change.originalItem.toLowerCase());
                    if (supplyItem) {
                        variationCostAdjustment -= parseFloat(supplyItem.pricePerProduct || 0) * change.measure;
                    }
                }
            });
            
            variations.push({
                name: variationName,
                sellingPrice: variationPrice,
                costAdjustment: variationCostAdjustment,
                totalCost: totalCost + variationCostAdjustment,
                changes
            });
        }
    });
    
    const recipeData = {
        name,
        category,
        sellingPrice,
        totalCost,
        items,
        variations,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (currentEditingId) {
            const recipeRef = ref(window.db, `recipes/${currentEditingId}`);
            await update(recipeRef, recipeData);
        } else {
            const recipeRef = ref(window.db, 'recipes');
            await push(recipeRef, recipeData);
        }
        
        document.getElementById('recipe-modal').style.display = 'none';
        resetRecipeForm();
        currentEditingId = null;
        loadRecipeData();
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Error saving recipe. Please try again.');
    }
}

async function loadRecipeData() {
    try {
        // Check if we should use local data (offline or recent local data)
        if (window.offlineManager && window.offlineManager.shouldUseLocalData('recipes')) {
            console.log('Loading recipe data from local storage');
            recipes = window.offlineManager.getFromLocal('recipes');
        } else {
            // Load from Firebase
            console.log('Loading recipe data from Firebase');
            const recipeRef = ref(window.db, 'recipes');
            const snapshot = await get(recipeRef);
            recipes = [];
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.keys(data).forEach(key => {
                    recipes.push({ id: key, ...data[key] });
                });
            }
            
            // Cache in local storage
            if (window.offlineManager) {
                window.offlineManager.saveToLocal('recipes', recipes);
            }
        }
        
        renderRecipeList();
        renderProductsTable();
        // Update category suggestions when recipe data changes
        setupCategorySuggestions();
    } catch (error) {
        console.error('Error loading recipe data:', error);
        // Fallback to local data if Firebase fails
        if (window.offlineManager) {
            console.log('Falling back to local recipe data');
            recipes = window.offlineManager.getFromLocal('recipes');
            renderRecipeList();
            renderProductsTable();
            setupCategorySuggestions();
        }
    }
}

function renderRecipeList() {
    const container = document.getElementById('recipe-list');
    container.innerHTML = '';
    
    if (recipes.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No recipes found</h3><p>Add your first recipe to get started!</p></div>';
        return;
    }
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <div class="recipe-header" onclick="toggleRecipeDetails('${recipe.id}')">
                <h3>${recipe.name}</h3>
                <div class="recipe-summary">
                    <span>Category: ${recipe.category}</span>
                    <span>Cost: ${recipe.totalCost.toFixed(2)}</span>
                    <span>Price: ${recipe.sellingPrice.toFixed(2)}</span>
                    <span>Profit: ${(recipe.sellingPrice - recipe.totalCost).toFixed(2)}</span>
                </div>
            </div>
            <div class="recipe-details" id="recipe-details-${recipe.id}">
                <div class="recipe-items">
                    <h4>Items:</h4>
                    <div class="recipe-details-grid">
                        ${recipe.items.map(item => `
                            <div class="recipe-item-display">
                                <span>${item.itemName}</span>
                                <span>Measure: ${item.measure} • Cost: ${item.cost.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${recipe.variations && recipe.variations.length > 0 ? `
                    <div class="recipe-variations-display">
                        <h4>Variations:</h4>
                        <div class="recipe-details-grid">
                            ${recipe.variations.map(variation => `
                                <div class="recipe-item-display">
                                    <span>${variation.name}</span>
                                    <span>Price: ${variation.sellingPrice.toFixed(2)} • Profit: ${(variation.sellingPrice - variation.totalCost).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button class="btn-secondary" onclick="editRecipe('${recipe.id}')">Edit</button>
                    <button class="btn-remove" onclick="deleteRecipe('${recipe.id}')">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleRecipeDetails(id) {
    const details = document.getElementById(`recipe-details-${id}`);
    details.classList.toggle('show');
}

async function editRecipe(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-category').value = recipe.category;
    document.getElementById('recipe-selling-price').value = recipe.sellingPrice;
    
    // Clear existing recipe items
    const container = document.getElementById('recipe-items');
    container.innerHTML = '';
    
    // Add recipe items
    recipe.items.forEach(item => {
        const newItem = document.createElement('div');
        newItem.className = 'recipe-item';
        newItem.innerHTML = `
            <input type="text" class="recipe-item-input" placeholder="Select or type item..." list="recipe-items-datalist" value="${item.itemName}" autocomplete="off" required>
            <input type="number" class="recipe-measure" placeholder="Measure" step="0.01" value="${item.measure}" autocomplete="off" required>
            <button type="button" class="btn-remove" onclick="removeRecipeItem(this)">Remove</button>
        `;
        container.appendChild(newItem);
        
        const input = newItem.querySelector('.recipe-item-input');
        const measure = newItem.querySelector('.recipe-measure');
        setupRecipeItemInputListeners(input);
        measure.addEventListener('input', calculateRecipeCost);
    });
    
    // Clear existing variations
    const variationsContainer = document.getElementById('recipe-variations');
    variationsContainer.innerHTML = '';
    
    // Add recipe variations if they exist
    if (recipe.variations && recipe.variations.length > 0) {
        recipe.variations.forEach(variation => {
            addRecipeVariation();
            const variationElements = document.querySelectorAll('.recipe-variation');
            const lastVariation = variationElements[variationElements.length - 1];
            
            lastVariation.querySelector('.variation-name').value = variation.name;
            lastVariation.querySelector('.variation-price').value = variation.sellingPrice;
            
            // Clear the default variation item and add the actual changes
            const changesContainer = lastVariation.querySelector('.variation-changes');
            changesContainer.innerHTML = '';
            
            variation.changes.forEach(change => {
                const changeItem = document.createElement('div');
                changeItem.className = 'variation-item';
                changeItem.innerHTML = `
                    <select class="variation-action">
                        <option value="substitute" ${change.action === 'substitute' ? 'selected' : ''}>Substitute</option>
                        <option value="add" ${change.action === 'add' ? 'selected' : ''}>Add</option>
                        <option value="remove" ${change.action === 'remove' ? 'selected' : ''}>Remove</option>
                    </select>
                    <input type="text" class="variation-original-item" placeholder="Original item" list="recipe-items-datalist" value="${change.originalItem || ''}" autocomplete="off">
                    <input type="text" class="variation-new-item" placeholder="New item" list="recipe-items-datalist" value="${change.newItem || ''}" autocomplete="off">
                    <input type="number" class="variation-measure" placeholder="Measure" step="0.01" value="${change.measure}" autocomplete="off">
                    <button type="button" class="btn-remove" onclick="removeVariationItem(this)">Remove</button>
                `;
                changesContainer.appendChild(changeItem);
                
                const measureInput = changeItem.querySelector('.variation-measure');
                const actionSelect = changeItem.querySelector('.variation-action');
                measureInput.addEventListener('input', calculateVariationCosts);
                actionSelect.addEventListener('change', calculateVariationCosts);
            });
        });
    }
    
    setupRecipeItemInputs();
    calculateRecipeCost();
    calculateVariationCosts();
    currentEditingId = id;
    document.getElementById('recipe-modal').style.display = 'block';
}

async function deleteRecipe(id) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        try {
            const recipeRef = ref(window.db, `recipes/${id}`);
            await remove(recipeRef);
            loadRecipeData();
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe. Please try again.');
        }
    }
}

// Products Overview
function renderProductsTable() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';
    
    if (recipes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No products found. Create recipes to see products here!</td></tr>';
        return;
    }
    
    recipes.forEach(recipe => {
        const profit = recipe.sellingPrice - recipe.totalCost;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${recipe.name}</td>
            <td>${recipe.totalCost.toFixed(2)}</td>
            <td>${recipe.sellingPrice.toFixed(2)}</td>
            <td style="color: ${profit >= 0 ? '#4CAF50' : '#f44336'}">${profit.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Render mobile tiles
    renderProductsTiles(recipes);
}

function renderProductsTiles(items) {
    const tilesContainer = document.getElementById('products-tiles');
    tilesContainer.innerHTML = '';
    
    if (items.length === 0) {
        tilesContainer.innerHTML = '<div class="empty-state"><h3>No products found</h3><p>Create recipes to see products here!</p></div>';
        return;
    }
    
    items.forEach(recipe => {
        const profit = recipe.sellingPrice - recipe.totalCost;
        const profitColor = profit >= 0 ? '#4CAF50' : '#f44336';
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <div class="recipe-header">
                <h3>${recipe.name}</h3>
                <div class="recipe-summary">
                    <span>Category: ${recipe.category}</span>
                    <span>Cost: ${recipe.totalCost.toFixed(2)}</span>
                    <span>Price: ${recipe.sellingPrice.toFixed(2)}</span>
                    <span style="color: ${profitColor}">Profit: ${profit.toFixed(2)}</span>
                </div>
            </div>
        `;
        tilesContainer.appendChild(card);
    });
}

// Load all data
async function loadData() {
    await loadSupplyData();
    await loadStockData();
    await loadRecipeData();
    // Setup category suggestions after recipe data is loaded
    setupCategorySuggestions();
}

// Make loadData globally available for offline manager
window.loadData = loadData;

// Make functions globally available
window.editSupplyItem = editSupplyItem;
window.deleteSupplyItem = deleteSupplyItem;
window.toggleSupplyDetails = toggleSupplyDetails;
window.toggleStockDetails = toggleStockDetails;
window.decreaseStock = decreaseStock;
window.deleteStockItem = deleteStockItem;
window.viewStockLog = viewStockLog;
window.removeRecipeItem = removeRecipeItem;
window.toggleRecipeDetails = toggleRecipeDetails;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.addRecipeVariation = addRecipeVariation;
window.removeVariation = removeVariation;
window.addVariationItem = addVariationItem;
window.removeVariationItem = removeVariationItem;