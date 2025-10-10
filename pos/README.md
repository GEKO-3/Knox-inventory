# Knox POS System

A complete Point of Sale system for Knox Restaurant, built as a separate PWA from the main inventory system.

## Features

### 🍽️ Menu Management
- **Expandable Categories**: Recipes organized by category for easy navigation
- **Real-time Pricing**: Shows selling price and profit margin for each item
- **Search Functionality**: Quick search through menu items (Ctrl+F)
- **Mobile Optimized**: Touch-friendly interface designed for mobile devices

### 🛒 Order Management
- **Smart Cart**: Easy quantity adjustment with +/- buttons
- **Live Calculations**: Real-time subtotal, tax, and total calculations
- **Order Saving**: All orders saved to Firebase database
- **Order History**: View past orders and receipts

### 🧾 Receipt System
- **Professional Receipts**: Clean, printable receipt format
- **Auto Print Option**: Optional automatic printing after checkout
- **Receipt Reprinting**: View and reprint past receipts
- **Customizable Footer**: Personalized receipt messages

### ⚙️ Settings & Configuration
- **Tax Rate Configuration**: Adjustable tax percentage
- **Receipt Customization**: Custom footer messages
- **Auto-print Settings**: Toggle automatic receipt printing
- **Persistent Settings**: Settings saved locally

## Technical Architecture

### PWA Features
- **Offline Capable**: Works without internet connection
- **Installable**: Can be installed as native app on mobile devices
- **Background Sync**: Sync offline orders when connection returns
- **Push Notifications**: Order updates and promotional notifications

### Database Integration
- **Firebase Realtime Database**: Real-time data synchronization
- **Order Tracking**: Complete order history with timestamps
- **Recipe Integration**: Automatically loads recipes from inventory system
- **Cost Calculations**: Shows profit margins for business insights

### Mobile Optimization
- **Touch Gestures**: Optimized for touch interaction
- **Responsive Design**: Works on all screen sizes
- **Fast Loading**: Cached resources for quick startup
- **Keyboard Shortcuts**: Ctrl+F for search, Ctrl+Enter for checkout

## File Structure

```
pos/
├── pos.html            # Main POS interface
├── pos-styles.css      # Complete CSS styling
├── pos-app.js          # Main application logic
├── pos-sw.js           # Service worker for PWA
├── pos-manifest.json   # PWA manifest
└── README.md           # This documentation
```

## Usage Instructions

### Starting a New Order
1. Browse menu categories (tap to expand/collapse)
2. Tap menu items to add to cart
3. Adjust quantities using +/- buttons
4. Review order totals in cart panel

### Completing an Order
1. Tap "Checkout" when ready
2. Review receipt details
3. Print receipt if needed
4. Tap "Finish Order" to complete

### Managing Settings
1. Tap settings icon (⚙️) in header
2. Adjust tax rate as needed
3. Customize receipt footer message
4. Enable/disable auto-printing
5. Save settings

### Viewing Order History
1. Tap history icon (📋) in header
2. Browse past orders
3. Tap any order to view/reprint receipt

## Keyboard Shortcuts

- **Ctrl+F**: Focus search bar
- **Ctrl+Enter**: Checkout (if items in cart)
- **Escape**: Close any open modal

## Installation

### As PWA (Recommended)
1. Open POS system in mobile browser
2. Tap "Add to Home Screen" when prompted
3. Access as native app from home screen

### Manual Setup
1. Ensure Firebase database is configured
2. Add recipes with selling prices in inventory system
3. Open pos/pos.html in web browser
4. Start taking orders!

## Data Requirements

The POS system requires:
- **Recipes with Selling Prices**: Only recipes with `sellingPrice > 0` appear in menu
- **Recipe Categories**: Used for menu organization
- **Cost Calculations**: Shows profit margins (selling price - total cost)

## Browser Support

- **Mobile**: iOS Safari, Android Chrome (primary targets)
- **Desktop**: Chrome, Firefox, Safari, Edge
- **PWA Support**: All modern browsers with service worker support

## Integration with Inventory System

The POS system is designed to work alongside the main Knox Inventory System:
- Loads recipes from same Firebase database
- Maintains separate order history
- Independent PWA installation
- Complementary business workflow

## Future Enhancements

- Payment processing integration
- Customer management
- Sales analytics dashboard
- Inventory deduction on orders
- Multi-location support
- Staff management and permissions

---

**Knox POS System v1.0.0**  
Built for efficiency, designed for mobile, optimized for restaurants.