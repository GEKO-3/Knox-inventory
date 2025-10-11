# Knox Inventory System v1.2.1 - Progressive Web App

A comprehensive web-based inventory management system built with Firebase, featuring supply management, stock tracking, recipe creation, and product profitability analysis. Now available as a Progressive Web App (PWA) for installation on any device!

## 🚀 PWA Features

- **📱 Installable**: Install directly from your browser on any device
- **⚡ Offline Support**: Core functionality works offline with service worker caching
- **🔄 Auto-Updates**: Automatic updates when new versions are available
- **📲 Native Feel**: Runs like a native app when installed
- **🏠 Home Screen**: Add to home screen on mobile devices
- **🎨 Themed**: Matches your device's theme and status bar

## Features

### 📦 Supply Management (Page 1)
- Add and manage supply items with automatic calculations
- **Item Name**: Enter the name of your supply item
- **Price**: Base price of the item (without GST)
- **Price + GST**: Automatically calculated (Price + 8%)
- **Size**: Total size/quantity of the supply unit
- **Measure per Product**: How much is used per individual product
- **Products per Unit**: Automatically calculated (Size ÷ Measure per Product)
- **Price per Product**: Automatically calculated (Price + GST ÷ Products per Unit)

### 📊 Stock Management (Page 2)
- Track inventory levels and usage
- **Item Name**: Enter item name with auto-suggestions from existing items
- **Price (No GST)**: Base price without tax
- **Amount In Stock**: Current available quantity
- **Amount Used**: Total quantity consumed
- **Add New Order**: Dialog to add stock (existing items are updated, new items are created)
- **Decrease Stock**: Minus button to reduce available stock and track usage

### 🍽️ Recipe Management (Page 3)
- Create and manage product recipes
- **Product Name**: Name of the final product
- **Category**: Product category for organization
- **Cost**: Automatically calculated from all ingredient costs
- **Selling Price**: Set your desired selling price
- **Recipe Items**: Add multiple ingredients with measures
- **Cost Calculation**: Real-time cost calculation based on supply prices

### 💰 Products Overview (Page 4)
- View profitability analysis for all products
- **Product Name**: From recipe data
- **Cost**: Total ingredient cost
- **Selling Price**: Your set price
- **Profit**: Automatically calculated (Selling Price - Cost)
- Color-coded profit display (green for positive, red for negative)

## Design Theme

The system uses a beautiful color scheme based on **#D58A94** (dusty rose) and **white**, with complementary tones for a cohesive, professional appearance.

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Firebase Realtime Database
- **Styling**: Custom CSS with responsive design
- **Icons**: Modern button designs with hover effects

## Getting Started

1. **Setup**: Open `index.html` in a web browser
2. **Firebase**: The system is pre-configured with your Firebase project
3. **Data Storage**: All data is automatically saved to Firebase Firestore

## How to Use

### Initial Setup
1. Start by adding supply items in the **Supply** page
2. Add stock orders in the **Stock** page
3. Create recipes using your supply items in the **Recipe** page
4. View profitability in the **Products** page

### Supply Management
1. Click "Add Supply Item"
2. Enter item name, price, size, and measure per product
3. System automatically calculates GST, products per unit, and price per product
4. Edit or delete items as needed

### Stock Management
1. Click "Add New Order"
2. Type item name (get suggestions from existing items)
3. Enter price and amount
4. System adds to existing stock or creates new items
5. Use minus button to decrease stock and track usage

### Recipe Creation
1. Click "Add Recipe"
2. Enter product name, category, and selling price
3. Add multiple ingredients from your supply items
4. Enter measures for each ingredient
5. System calculates total cost automatically
6. Click recipe cards to expand and see details

### Products Analysis
- Automatically populated from your recipes
- View cost, selling price, and profit for each product
- Identify most/least profitable products

## File Structure

```
knox-inventory/
├── index.html          # Main application interface
├── styles.css          # Responsive styling and design
├── firebase-config.js  # Firebase configuration and initialization
├── app.js             # Main application logic and Firebase operations
└── README.md          # This documentation
```

## Firebase Database Structure

The system uses three main Realtime Database nodes:

- **supply**: Supply items with pricing and calculation data
- **stock**: Stock levels and usage tracking
- **recipes**: Product recipes with ingredients and costs

## Features in Detail

### Automatic Calculations
- **GST Calculation**: Adds 8% to base price
- **Products per Unit**: Size ÷ Measure per Product
- **Price per Product**: (Price + GST) ÷ Products per Unit
- **Recipe Cost**: Sum of (Ingredient Measure × Price per Product)
- **Profit**: Selling Price - Total Cost

### Smart Suggestions
- Stock item names auto-suggest from existing items
- Recipe ingredients populated from supply items
- Prevents duplicate entries and ensures consistency

### Real-time Updates
- All data synced with Firebase Realtime Database
- Calculations update automatically when values change
- Changes reflected across all pages immediately

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Touch-friendly interface for mobile use
- Optimized table layouts for different screen sizes

## 📱 PWA Installation

### Desktop (Chrome, Edge, Safari)
1. Visit the app in your browser
2. Look for the "📱 Install App" button in the navigation
3. Click "Install" to add to your desktop

### Mobile (iOS Safari)
1. Visit the app in Safari
2. Tap the Share button (square with arrow up)
3. Tap "Add to Home Screen"
4. Tap "Add" to install

### Mobile (Android Chrome)
1. Visit the app in Chrome
2. Tap the menu (three dots) or look for install prompt
3. Tap "Add to Home screen" or "Install app"
4. Tap "Install" to add to your home screen

## 🌐 Browser Compatibility

- Chrome/Chromium (full PWA support)
- Firefox (partial PWA support)
- Safari (iOS PWA support)
- Edge (full PWA support)

## 📊 Offline Capabilities

- Browse existing cached data
- View previously loaded inventory items
- UI remains fully functional offline
- Automatic sync when connection restored
- Visual offline indicator with status

## Version History

### v1.2.1 (Current)
- 🔧 **Recipe Loading Fix**: Fixed TypeError when recipes missing items property
- 🛡️ **Enhanced Error Handling**: Added safe array checks and fallbacks
- 📊 **Data Validation**: Better handling of malformed recipe data
- 🐛 **Bug Fixes**: Resolved recipe loading crashes and improved stability

### v1.2.0
- 🥘 **Prep Products**: Added intermediate products made from supply items
- 🧮 **Enhanced Calculations**: Automatic cost calculations with measure per product
- 📱 **PWA Support**: Full Progressive Web App functionality
- 🔄 **Auto-Updates**: Service worker with automatic update notifications

### v1.1.0
- 📊 **Recipe System**: Complete recipe management with cost analysis
- 💰 **Profit Calculations**: Selling price and profit margin tracking
- 🎯 **Category Management**: Organized products by categories
- 📈 **Enhanced UI**: Improved user interface and navigation

### v1.0.0
- 🚀 **Initial Release**: Supply and stock management system
- 🔥 **Firebase Integration**: Real-time database synchronization
- 📱 **Mobile Responsive**: Touch-friendly interface for all devices

## Support

For questions or issues, please refer to the Firebase console for your project: `knox-inventory`

---

**Knox Inventory System v1.2.1** - Professional inventory management made simple.