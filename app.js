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

// Global scroll detection variables for Android
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let isScrolling = false;
let scrollTimeout = null;

// Early function declarations for Android compatibility
window.editSupplyItem = null;
window.deleteSupplyItem = null;
window.toggleSupplyDetails = null;

// Initialize the app
// Enhanced DOM ready detection for Android compatibility
function initWhenReady() {
    console.log('DOM loaded, initializing app...');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is Android:', /Android/i.test(navigator.userAgent));
    console.log('Firebase db available:', !!window.db);
    console.log('Touch support:', 'ontouchstart' in window);
    
    // Add small delay for Android devices to ensure everything is ready
    const delay = /Android/i.test(navigator.userAgent) ? 300 : 100;
    console.log('Using initialization delay:', delay + 'ms');
    
    setTimeout(() => {
        initializeApp();
        registerServiceWorker();
    }, delay);
}

// Multiple event listeners for better Android compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}

// Fallback for older Android browsers
window.addEventListener('load', function() {
    if (!window.appInitialized) {
        initWhenReady();
    }
});

function initializeApp() {
    if (window.appInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    
    console.log('Initializing app...');
    
    // Make functions globally available FIRST
    setupGlobalFunctions();
    
    setupNavigation();
    setupModals();
    setupForms();
    setupKeyboardShortcuts();
    setupEventDelegation(); // Add event delegation for Android
    loadData();
    
    window.appInitialized = true;
    console.log('App initialization complete');
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

// Offline detection functions removed

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
        if (currentEditingId) {
            const supplyRef = ref(window.db, `supply/${currentEditingId}`);
            await update(supplyRef, formData);
        } else {
            const supplyRef = ref(window.db, 'supply');
            await push(supplyRef, formData);
        }
        
        document.getElementById('supply-modal').style.display = 'none';
        currentEditingId = null;
        loadSupplyData();
    } catch (error) {
        console.error('Error saving supply item:', error);
        alert('Error saving supply item. Please try again.');
    }
}

async function loadSupplyData() {
    try {
        console.log('Loading supply data...');
        const supplyRef = ref(window.db, 'supply');
        const snapshot = await get(supplyRef);
        supplyItems = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('Firebase data:', data);
            Object.keys(data).forEach(key => {
                supplyItems.push({ id: key, ...data[key] });
            });
        }
        
        console.log('Final supplyItems:', supplyItems);
        renderSupplyTable();
    } catch (error) {
        console.error('Error loading supply data:', error);
    }
}

function renderSupplyTable() {
    console.log('=== RENDERING SUPPLY TABLE ===');
    console.log('Rendering supply table with items:', supplyItems.length);
    console.log('Supply items being rendered:', supplyItems.map(item => ({ id: item.id, name: item.name, type: typeof item.id })));
    
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
                <button class="btn-secondary edit-supply-btn" data-supply-id="${item.id}" data-action="edit">Edit</button>
                <button class="btn-remove delete-supply-btn" data-supply-id="${item.id}" data-action="delete">Delete</button>
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
            <div class="recipe-header toggle-supply-details" data-supply-id="${item.id}" data-action="toggle">
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
                    <button class="btn-secondary edit-supply-btn" data-supply-id="${item.id}" data-action="edit">Edit</button>
                    <button class="btn-remove delete-supply-btn" data-supply-id="${item.id}" data-action="delete">Delete</button>
                </div>
            </div>
        `;
        tilesContainer.appendChild(card);
    });
}

function toggleSupplyDetails(id) {
    console.log('Toggling supply details for id:', id);
    const details = document.getElementById(`supply-details-${id}`);
    const header = document.querySelector(`[data-supply-id="${id}"][data-action="toggle"]`);
    
    if (!details) {
        console.error('Details element not found for id:', id);
        return;
    }
    
    // Add touch feedback for Android
    if (header) {
        header.classList.add('touching');
        setTimeout(() => {
            header.classList.remove('touching');
        }, 150);
    }
    
    // Handle the toggle with proper Android support
    const isCurrentlyShown = details.classList.contains('show');
    console.log('Current state - isShown:', isCurrentlyShown);
    console.log('Details element:', details);
    console.log('Current classes:', details.className);
    console.log('Current max-height:', getComputedStyle(details).maxHeight);
    
    if (isCurrentlyShown) {
        details.classList.remove('show');
        console.log('Hiding details for:', id);
        console.log('After hide - classes:', details.className);
    } else {
        // First force any existing animation to complete
        details.style.transition = 'none';
        details.offsetHeight; // Force reflow
        
        // Re-enable transitions
        details.style.transition = '';
        
        // Add the show class
        details.classList.add('show');
        console.log('Showing details for:', id);
        console.log('After show - classes:', details.className);
        
        // Force reflow for Android compatibility
        details.offsetHeight;
        
        // Check if animation is working
        setTimeout(() => {
            console.log('After timeout - max-height:', getComputedStyle(details).maxHeight);
            console.log('After timeout - classes:', details.className);
        }, 100);
        
        // Ensure smooth scrolling on Android
        setTimeout(() => {
            if (details.classList.contains('show')) {
                details.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }, 300);
    }
}

function toggleStockDetails(id) {
    console.log('Toggling stock details for id:', id);
    const details = document.getElementById(`stock-details-${id}`);
    const header = document.querySelector(`[data-stock-id="${id}"][data-action="toggle"]`);
    
    if (!details) {
        console.error('Stock details element not found for id:', id);
        return;
    }
    
    // Add touch feedback for Android
    if (header) {
        header.classList.add('touching');
        setTimeout(() => {
            header.classList.remove('touching');
        }, 150);
    }
    
    // Handle the toggle with proper Android support
    const isCurrentlyShown = details.classList.contains('show');
    
    if (isCurrentlyShown) {
        details.classList.remove('show');
        console.log('Hiding stock details for:', id);
    } else {
        details.classList.add('show');
        console.log('Showing stock details for:', id);
        
        // Force reflow for Android compatibility
        details.offsetHeight;
        
        // Ensure smooth animation on Android
        setTimeout(() => {
            details.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'nearest'
            });
        }, 100);
    }
}

async function editSupplyItem(id) {
    console.log('=== EDIT SUPPLY ITEM DEBUG ===');
    console.log('Called with id:', id, 'Type:', typeof id);
    console.log('Total supplyItems:', supplyItems.length);
    console.log('All supply IDs:', supplyItems.map(item => ({ id: item.id, name: item.name, type: typeof item.id })));
    
    const item = supplyItems.find(item => {
        console.log('Comparing:', item.id, '(type:', typeof item.id, ') with', id, '(type:', typeof id, ')');
        return item.id === id || item.id === String(id) || String(item.id) === String(id);
    });
    
    console.log('Found item:', item);
    if (!item) {
        console.error('❌ SUPPLY ITEM NOT FOUND!');
        console.error('Searched for ID:', id);
        console.error('Available IDs:', supplyItems.map(i => i.id));
        console.error('Available items:', supplyItems);
        alert(`Supply item not found! ID: ${id}\nAvailable IDs: ${supplyItems.map(i => i.id).join(', ')}`);
        return;
    }
    
    // Ensure modal elements exist before trying to access them
    const modal = document.getElementById('supply-modal');
    const nameField = document.getElementById('supply-name');
    const priceField = document.getElementById('supply-price');
    const sizeField = document.getElementById('supply-size');
    const measureField = document.getElementById('supply-measure');
    
    if (!modal || !nameField || !priceField || !sizeField || !measureField) {
        console.error('Modal elements not found');
        return;
    }
    
    nameField.value = item.name;
    priceField.value = item.price;
    sizeField.value = item.size;
    measureField.value = item.measurePerProduct;
    
    currentEditingId = id;
    modal.style.display = 'block';
    
    // Focus on first field for better mobile experience
    setTimeout(() => {
        nameField.focus();
    }, 100);
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
        const stockRef = ref(window.db, 'stock');
        const snapshot = await get(stockRef);
        stockItems = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                stockItems.push({ id: key, ...data[key] });
            });
        }
        
        renderStockTable();
    } catch (error) {
        console.error('Error loading stock data:', error);
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
                <button class="btn-minus decrease-stock-btn" data-stock-id="${item.id}" data-action="decrease-stock">-</button>
                <button class="btn-secondary view-log-btn" data-stock-id="${item.id}" data-action="view-log">Log</button>
                <button class="btn-remove delete-stock-btn" data-stock-id="${item.id}" data-action="delete-stock">Delete</button>
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
            <div class="recipe-header toggle-stock-details" data-stock-id="${item.id}" data-action="toggle-stock">
                <h3>${item.supplyItemName}</h3>
                <div class="recipe-summary">
                    <span>In Stock: ${item.amountInStock.toFixed(2)}</span>
                    <span>Used: ${item.amountUsed.toFixed(2)}</span>
                    <span>Updated: ${lastUpdated}</span>
                </div>
            </div>
            <div class="recipe-details" id="stock-details-${item.id}">
                <div class="form-actions">
                    <button class="btn-secondary decrease-stock-btn" data-stock-id="${item.id}" data-action="decrease-stock">Use Stock</button>
                    <button class="btn-secondary view-log-btn" data-stock-id="${item.id}" data-action="view-log">View Log</button>
                    <button class="btn-remove delete-stock-btn" data-stock-id="${item.id}" data-action="delete-stock">Delete</button>
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
        const recipeRef = ref(window.db, 'recipes');
        const snapshot = await get(recipeRef);
        recipes = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                recipes.push({ id: key, ...data[key] });
            });
        }
        
        renderRecipeList();
        renderProductsTable();
        // Update category suggestions when recipe data changes
        setupCategorySuggestions();
    } catch (error) {
        console.error('Error loading recipe data:', error);
    }
}

function renderRecipeList() {
    console.log('=== RENDERING RECIPE LIST ===');
    console.log('Rendering recipe list with items:', recipes.length);
    console.log('Recipes being rendered:', recipes.map(recipe => ({ id: recipe.id, name: recipe.name, type: typeof recipe.id })));
    
    const container = document.getElementById('recipe-list');
    container.innerHTML = '';
    
    if (recipes.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No recipes found</h3><p>Add your first recipe to get started!</p></div>';
        return;
    }
    
    // Group recipes by category and sort alphabetically
    const recipesByCategory = {};
    
    recipes.forEach(recipe => {
        const category = recipe.category || 'Uncategorized';
        if (!recipesByCategory[category]) {
            recipesByCategory[category] = [];
        }
        recipesByCategory[category].push(recipe);
    });
    
    // Sort categories alphabetically and sort recipes within each category
    const sortedCategories = Object.keys(recipesByCategory).sort();
    
    sortedCategories.forEach(categoryName => {
        // Sort recipes within category alphabetically by name
        const sortedRecipes = recipesByCategory[categoryName].sort((a, b) => 
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <h2 class="category-title">${categoryName}</h2>
            <span class="category-count">(${sortedRecipes.length} recipe${sortedRecipes.length !== 1 ? 's' : ''})</span>
        `;
        container.appendChild(categoryHeader);
        
        // Create category container
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'category-recipes';
        
        sortedRecipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-header toggle-recipe-details" data-recipe-id="${recipe.id}" data-action="toggle-recipe">
                    <h3>${recipe.name}</h3>
                    <div class="recipe-summary">
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
                        <button class="btn-secondary edit-recipe-btn" data-recipe-id="${recipe.id}" data-action="edit-recipe">Edit</button>
                        <button class="btn-remove delete-recipe-btn" data-recipe-id="${recipe.id}" data-action="delete-recipe">Delete</button>
                    </div>
                </div>
            `;
            categoryContainer.appendChild(card);
        });
        
        container.appendChild(categoryContainer);
    });
}

function toggleRecipeDetails(id) {
    const details = document.getElementById(`recipe-details-${id}`);
    details.classList.toggle('show');
}

async function editRecipe(id) {
    console.log('=== EDIT RECIPE DEBUG ===');
    console.log('Called with id:', id, 'Type:', typeof id);
    console.log('Total recipes:', recipes.length);
    console.log('All recipe IDs:', recipes.map(recipe => ({ id: recipe.id, name: recipe.name, type: typeof recipe.id })));
    
    const recipe = recipes.find(r => {
        console.log('Comparing recipe:', r.id, '(type:', typeof r.id, ') with', id, '(type:', typeof id, ')');
        return r.id === id || r.id === String(id) || String(r.id) === String(id);
    });
    
    console.log('Found recipe:', recipe);
    if (!recipe) {
        console.error('❌ RECIPE NOT FOUND!');
        console.error('Searched for ID:', id);
        console.error('Available recipe IDs:', recipes.map(r => r.id));
        console.error('Available recipes:', recipes);
        alert(`Recipe not found! ID: ${id}\nAvailable IDs: ${recipes.map(r => r.id).join(', ')}`);
        return;
    }
    
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
            
            // Check if changes exist before iterating
            if (variation.changes && Array.isArray(variation.changes)) {
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
            }
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
    console.log('=== LOADING ALL DATA ===');
    await loadSupplyData();
    await loadStockData();
    await loadRecipeData();
    
    console.log('=== DATA LOAD COMPLETE ===');
    console.log('Final data counts:');
    console.log('- Supply items:', supplyItems.length);
    console.log('- Stock items:', stockItems.length);
    console.log('- Recipes:', recipes.length);
    
    // Setup category suggestions after recipe data is loaded
    setupCategorySuggestions();
    
    // Debug: Test if functions are available
    console.log('Function availability:');
    console.log('- editSupplyItem:', typeof window.editSupplyItem);
    console.log('- editRecipe:', typeof window.editRecipe);
    console.log('- deleteSupplyItem:', typeof window.deleteSupplyItem);
    console.log('- deleteRecipe:', typeof window.deleteRecipe);
    
    // Auto-run data debug after load
    setTimeout(() => {
        if (window.debugData) window.debugData();
    }, 1000);
}

// Setup global functions for Android compatibility
function setupGlobalFunctions() {
    console.log('Setting up global functions...');
    
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
    
    // Test functions for debugging
    window.testEditFunction = function() {
        console.log('Test function called');
        console.log('supplyItems length:', supplyItems.length);
        if (supplyItems.length > 0) {
            console.log('Testing edit with first item:', supplyItems[0]);
            editSupplyItem(supplyItems[0].id);
        } else {
            console.log('No supply items found');
        }
    };
    
    window.simpleTest = function() {
        alert('Simple test function works!');
        console.log('Simple test called');
    };
    
    // Test specific edit functions
    window.testEdit = function(type, id) {
        console.log(`=== TESTING ${type.toUpperCase()} EDIT ===`);
        console.log('ID:', id, 'Type:', typeof id);
        
        switch(type.toLowerCase()) {
            case 'supply':
                if (window.editSupplyItem) {
                    window.editSupplyItem(id);
                } else {
                    console.error('editSupplyItem not available');
                }
                break;
            case 'recipe':
                if (window.editRecipe) {
                    window.editRecipe(id);
                } else {
                    console.error('editRecipe not available');
                }
                break;
            default:
                console.error('Unknown type:', type);
        }
    };
    
    // Add CSS debugging function
    window.debugCSS = function(id) {
        const details = document.getElementById(`supply-details-${id}`);
        if (details) {
            const styles = getComputedStyle(details);
            console.log('CSS Debug for', id, ':', {
                maxHeight: styles.maxHeight,
                padding: styles.padding,
                overflow: styles.overflow,
                transition: styles.transition,
                display: styles.display,
                height: styles.height,
                classes: details.className
            });
        }
    };
    
    // Add comprehensive data debugging function
    window.debugData = function() {
        console.log('=== COMPLETE DATA DEBUG ===');
        console.log('Supply Items:', supplyItems.length, supplyItems);
        console.log('Stock Items:', stockItems.length, stockItems);
        console.log('Recipes:', recipes.length, recipes);
        console.log('Supply IDs:', supplyItems.map(i => ({ id: i.id, type: typeof i.id, name: i.name })));
        console.log('Recipe IDs:', recipes.map(r => ({ id: r.id, type: typeof r.id, name: r.name })));
        console.log('Stock IDs:', stockItems.map(s => ({ id: s.id, type: typeof s.id, name: s.supplyItemName })));
        
        // Test if buttons exist in DOM
        const supplyButtons = document.querySelectorAll('[data-supply-id]');
        const recipeButtons = document.querySelectorAll('[data-recipe-id]');
        const stockButtons = document.querySelectorAll('[data-stock-id]');
        
        console.log('DOM Buttons:');
        console.log('Supply buttons:', supplyButtons.length, Array.from(supplyButtons).map(b => ({
            id: b.getAttribute('data-supply-id'),
            action: b.getAttribute('data-action'),
            text: b.textContent.trim()
        })));
        console.log('Recipe buttons:', recipeButtons.length, Array.from(recipeButtons).map(b => ({
            id: b.getAttribute('data-recipe-id'),
            action: b.getAttribute('data-action'),
            text: b.textContent.trim()
        })));
        console.log('Stock buttons:', stockButtons.length, Array.from(stockButtons).map(b => ({
            id: b.getAttribute('data-stock-id'),
            action: b.getAttribute('data-action'),
            text: b.textContent.trim()
        })));
    };
    
    console.log('Global functions setup complete');
}

// Event delegation for better Android compatibility
function setupEventDelegation() {
    console.log('Setting up event delegation for Android...');
    
    // Add scroll detection to prevent tile expansion during scrolling
    document.addEventListener('scroll', function() {
        isScrolling = true;
        console.log('Scroll detected, blocking tile expansion');
        
        // Clear any existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // Reset isScrolling after scroll ends
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            console.log('Scroll ended, allowing tile expansion');
        }, 150);
    }, { passive: true });
    
    // Also listen for scroll on window for better coverage
    window.addEventListener('scroll', function() {
        isScrolling = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);
    }, { passive: true });
    
    // Listen for wheel events (mouse wheel, trackpad, momentum scrolling)
    document.addEventListener('wheel', function() {
        isScrolling = true;
        console.log('Wheel/momentum scroll detected');
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 200);
    }, { passive: true });
    
    // Add touchmove detection at document level for broader coverage
    document.addEventListener('touchmove', function(e) {
        isScrolling = true;
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);
    }, { passive: true });
    
    // Use event delegation with data attributes for better Android touch support
    document.body.addEventListener('click', function(e) {
        const target = e.target;
        const action = target.getAttribute('data-action');
        const supplyId = target.getAttribute('data-supply-id');
        const recipeId = target.getAttribute('data-recipe-id');
        const stockId = target.getAttribute('data-stock-id');
        
        // Check if we have any valid action and ID
        if (!action || (!supplyId && !recipeId && !stockId)) return;
        
        const itemId = supplyId || recipeId || stockId;
        
        // Multiple checks to prevent expansion during scrolling
        if (isScrolling) {
            console.log('Ignoring click due to active scrolling');
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // Check if we're still in a potential scroll state
        const timeSinceTouch = Date.now() - touchStartTime;
        if (timeSinceTouch < 100) {
            console.log('Ignoring click - too soon after touch start');
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        console.log('=== EVENT DELEGATION DEBUG ===');
        console.log('Action:', action);
        console.log('Item ID:', itemId, 'Type:', typeof itemId);
        console.log('Target element:', target);
        console.log('Target className:', target.className);
        console.log('All data attributes:', {
            'data-action': target.getAttribute('data-action'),
            'data-supply-id': target.getAttribute('data-supply-id'),
            'data-recipe-id': target.getAttribute('data-recipe-id'),
            'data-stock-id': target.getAttribute('data-stock-id')
        });
        
        switch(action) {
            case 'edit':
                console.log('Event delegation: calling editSupplyItem with', itemId);
                if (window.editSupplyItem) {
                    window.editSupplyItem(itemId);
                } else {
                    console.error('editSupplyItem function not available');
                }
                break;
                
            case 'delete':
                console.log('Event delegation: calling deleteSupplyItem with', itemId);
                if (window.deleteSupplyItem) {
                    window.deleteSupplyItem(itemId);
                } else {
                    console.error('deleteSupplyItem function not available');
                }
                break;
                
            case 'edit-recipe':
                console.log('Event delegation: calling editRecipe with', itemId);
                if (window.editRecipe) {
                    window.editRecipe(itemId);
                } else {
                    console.error('editRecipe function not available');
                }
                break;
                
            case 'delete-recipe':
                console.log('Event delegation: calling deleteRecipe with', itemId);
                if (window.deleteRecipe) {
                    window.deleteRecipe(itemId);
                } else {
                    console.error('deleteRecipe function not available');
                }
                break;
                
            case 'toggle':
                console.log('Event delegation: calling toggleSupplyDetails with', itemId);
                if (window.toggleSupplyDetails) {
                    // Prevent rapid firing by checking if already animating
                    const details = document.getElementById(`supply-details-${itemId}`);
                    if (details && !details.classList.contains('animating')) {
                        details.classList.add('animating');
                        setTimeout(() => {
                            details.classList.remove('animating');
                        }, 600); // Match animation duration
                        
                        // Add small delay for Android touch processing
                        setTimeout(() => {
                            window.toggleSupplyDetails(itemId);
                        }, 50);
                    } else {
                        console.log('Animation already in progress, ignoring toggle');
                    }
                } else {
                    console.error('toggleSupplyDetails function not available');
                }
                break;
                
            case 'toggle-recipe':
                console.log('Event delegation: calling toggleRecipeDetails with', itemId);
                if (window.toggleRecipeDetails) {
                    // Prevent rapid firing by checking if already animating
                    const details = document.getElementById(`recipe-details-${itemId}`);
                    if (details && !details.classList.contains('animating')) {
                        details.classList.add('animating');
                        setTimeout(() => {
                            details.classList.remove('animating');
                        }, 600); // Match animation duration
                        
                        // Add small delay for Android touch processing
                        setTimeout(() => {
                            window.toggleRecipeDetails(itemId);
                        }, 50);
                    } else {
                        console.log('Recipe animation already in progress, ignoring toggle');
                    }
                } else {
                    console.error('toggleRecipeDetails function not available');
                }
                break;
                
            case 'decrease-stock':
                console.log('Event delegation: calling decreaseStock with', itemId);
                if (window.decreaseStock) {
                    window.decreaseStock(itemId);
                } else {
                    console.error('decreaseStock function not available');
                }
                break;
                
            case 'view-log':
                console.log('Event delegation: calling viewStockLog with', itemId);
                if (window.viewStockLog) {
                    window.viewStockLog(itemId);
                } else {
                    console.error('viewStockLog function not available');
                }
                break;
                
            case 'delete-stock':
                console.log('Event delegation: calling deleteStockItem with', itemId);
                if (window.deleteStockItem) {
                    window.deleteStockItem(itemId);
                } else {
                    console.error('deleteStockItem function not available');
                }
                break;
                
            case 'toggle-stock':
                console.log('Event delegation: calling toggleStockDetails with', itemId);
                if (window.toggleStockDetails) {
                    // Prevent rapid firing by checking if already animating
                    const details = document.getElementById(`stock-details-${itemId}`);
                    if (details && !details.classList.contains('animating')) {
                        details.classList.add('animating');
                        setTimeout(() => {
                            details.classList.remove('animating');
                        }, 600); // Match animation duration
                        
                        // Add small delay for Android touch processing
                        setTimeout(() => {
                            window.toggleStockDetails(itemId);
                        }, 50);
                    } else {
                        console.log('Stock animation already in progress, ignoring toggle');
                    }
                } else {
                    console.error('toggleStockDetails function not available');
                }
                break;
        }
    });
    
    // Handle touch events specifically for Android
    document.body.addEventListener('touchstart', function(e) {
        const target = e.target.closest('[data-action]') || e.target;
        if (target.hasAttribute('data-action')) {
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isScrolling = false;
            
            target.classList.add('touching');
            console.log('Touch start on:', target.getAttribute('data-action'));
        }
    }, { passive: true });
    
    // Detect scrolling vs tapping
    document.body.addEventListener('touchmove', function(e) {
        const target = e.target.closest('[data-action]') || e.target;
        if (target.hasAttribute('data-action') && touchStartTime > 0) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = Math.abs(touchX - touchStartX);
            const deltaY = Math.abs(touchY - touchStartY);
            
            // If user moved more than 5px in any direction, consider it scrolling
            if (deltaX > 5 || deltaY > 5) {
                isScrolling = true;
                target.classList.remove('touching');
                console.log('Scrolling detected, cancelling touch action');
            }
        }
    }, { passive: true });
    
    document.body.addEventListener('touchend', function(e) {
        const target = e.target.closest('[data-action]') || e.target;
        if (target.hasAttribute('data-action')) {
            target.classList.remove('touching');
            
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            console.log('Touch end on:', target.getAttribute('data-action'), {
                duration: touchDuration,
                isScrolling: isScrolling
            });
            
            // Only trigger action if:
            // 1. Not scrolling
            // 2. Touch duration is reasonable (50ms - 500ms)
            // 3. Not too quick (prevents accidental triggers)
            if (!isScrolling && touchDuration >= 50 && touchDuration <= 500) {
                console.log('Valid tap detected, triggering action');
                
                // Prevent double-firing on Android
                e.preventDefault();
                
                // Small delay to ensure touch is processed properly on Android
                setTimeout(() => {
                    const clickEvent = new Event('click', { bubbles: true, cancelable: true });
                    target.dispatchEvent(clickEvent);
                }, 50);
            } else {
                console.log('Invalid tap detected:', {
                    reason: isScrolling ? 'scrolling' : touchDuration < 50 ? 'too quick' : 'too long',
                    duration: touchDuration
                });
            }
            
            // Reset tracking variables
            touchStartTime = 0;
            isScrolling = false;
        }
    }, { passive: false });
    
    // Handle touch cancel for Android
    document.body.addEventListener('touchcancel', function(e) {
        const target = e.target.closest('[data-action]') || e.target;
        if (target.hasAttribute('data-action')) {
            target.classList.remove('touching');
            console.log('Touch cancelled on:', target.getAttribute('data-action'));
            
            // Reset tracking variables
            touchStartTime = 0;
            isScrolling = false;
        }
    }, { passive: true });
    
    console.log('Event delegation setup complete');
    
    // Add touch feedback styles
    const style = document.createElement('style');
    style.textContent = `
        .touching {
            opacity: 0.7;
            transform: scale(0.98);
            transition: all 0.1s ease;
        }
        
        [data-action] {
            cursor: pointer;
            -webkit-tap-highlight-color: rgba(0,0,0,0.1);
        }
        
        /* Improve scroll performance on Android */
        .recipe-card {
            -webkit-overflow-scrolling: touch;
            transform: translateZ(0);
        }
        
        /* Prevent text selection during scroll */
        .recipe-header {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            /* Prevent scrolling interference */
            touch-action: manipulation;
        }
        
        /* Improve scrolling on containers */
        body {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
        }
        
        .page {
            -webkit-overflow-scrolling: touch;
        }
    `;
    document.head.appendChild(style);
}