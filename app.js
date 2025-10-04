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
});

function initializeApp() {
    setupNavigation();
    setupModals();
    setupForms();
    setupKeyboardShortcuts();
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
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
                currentEditingId = null;
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
        document.getElementById('recipe-modal').style.display = 'block';
        document.getElementById('recipe-form').reset();
        setupRecipeItemInputs();
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
        const supplyRef = ref(window.db, 'supply');
        const snapshot = await get(supplyRef);
        supplyItems = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                supplyItems.push({ id: key, ...data[key] });
            });
        }
        
        renderSupplyTable();
    } catch (error) {
        console.error('Error loading supply data:', error);
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
    const item = supplyItems.find(item => item.id === id);
    if (!item) return;
    
    document.getElementById('supply-name').value = item.name;
    document.getElementById('supply-price').value = item.price;
    document.getElementById('supply-size').value = item.size;
    document.getElementById('supply-measure').value = item.measurePerProduct;
    
    currentEditingId = id;
    document.getElementById('supply-modal').style.display = 'block';
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
    
    const recipeData = {
        name,
        category,
        sellingPrice,
        totalCost,
        items,
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
    } catch (error) {
        console.error('Error loading recipe data:', error);
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
    
    setupRecipeItemInputs();
    calculateRecipeCost();
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
}

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