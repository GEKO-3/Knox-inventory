# Knox POS System

A complete Point of Sale system for Knox Restaurant, built as a separate PWA from the main inventory system.

## Features

### 🍽️ Menu Management
- **Expandable Categories**: Recipes organized by category for easy navigation
- **Product Variations**: Support for items with multiple options (Normal, Special, etc.)
- **Variations Dialog**: Professional modal for selecting product variations
- **Real-time Pricing**: Shows selling price and profit margin for each item
- **Search Functionality**: Quick search through menu items (Ctrl+F)
- **Mobile Optimized**: Touch-friendly interface designed for mobile devices
- **Android Compatible**: Enhanced touch handling for Android devices

### 🛒 Order Management
- **Smart Cart**: Easy quantity adjustment with +/- buttons
- **Variation Support**: Cart shows selected variations (e.g., "Burger (Spicy)")
- **Live Calculations**: Real-time subtotal, tax, and total calculations in MVR
- **Sticky Buttons**: Save Order and Checkout buttons always visible at bottom
- **Order Saving**: All orders saved to Firebase database
- **Expandable Bills Panel**: Side navigation showing all saved bills
- **Order History**: View, search, and reload past orders

### 🧾 Receipt System
- **Professional Receipts**: Clean, printable receipt format in MVR currency
- **Variation Details**: Receipts show selected variations clearly
- **Auto Print Option**: Optional automatic printing after checkout
- **Receipt Reprinting**: View and reprint past receipts
- **Customizable Footer**: Personalized receipt messages

### ⚙️ Settings & Configuration
- **Tax Rate Configuration**: Adjustable tax percentage
- **Receipt Customization**: Custom footer messages
- **Auto-print Settings**: Toggle automatic receipt printing
- **Persistent Settings**: Settings saved locally
- **Currency Support**: Full MVR (Maldivian Rufiyaa) support
- **Pink Theme**: Matches main inventory system branding

## Technical Architecture

### PWA Features
- **Offline Capable**: Works without internet connection
- **Installable**: Can be installed as native app on mobile devices
- **Background Sync**: Sync offline orders when connection returns
- **Push Notifications**: Order updates and promotional notifications
- **Update Notifications**: Automatic app update prompts
- **Cross-Platform**: Optimized for both iOS and Android

### Database Integration
- **Firebase Realtime Database**: Real-time data synchronization
- **Order Tracking**: Complete order history with timestamps
- **Recipe Integration**: Automatically loads recipes with variations from inventory system
- **Variation Support**: Handles complex product variations seamlessly
- **Cost Calculations**: Shows profit margins for business insights
- **Bill Management**: Save, search, and reload orders

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
2. Tap menu items:
   - Items without variations: Add directly to cart
   - Items with "Options" badge: Opens variations dialog
3. For variations: Select Normal or special option, then "Add to Cart"
4. Adjust quantities using +/- buttons
5. Review order totals in cart panel (always visible at bottom)

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

### Managing Saved Bills
1. Tap hamburger menu (☰) in header to open bills panel
2. Search bills by ID or item names
3. Filter by All, Today, or This Week
4. Tap any bill to load it back into cart for editing
5. Use history icon (📋) for quick order history view

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
- **Product Variations**: Optional `variations` array with name, price, description
- **Cost Calculations**: Shows profit margins (selling price - total cost)
- **MVR Currency**: All prices displayed in Maldivian Rufiyaa

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

## Recent Updates (v1.1.0)

### ✨ New Features
- **Product Variations**: Full support for menu items with multiple options
- **Expandable Bills Panel**: Side navigation for saved orders management
- **Sticky Action Buttons**: Save Order and Checkout always visible
- **Android Compatibility**: Enhanced touch handling for Android devices
- **MVR Currency**: Complete Maldivian Rufiyaa integration
- **Pink Branding**: Updated to match inventory system theme

### 🔧 Technical Improvements
- **Event Delegation**: Better mobile event handling
- **Touch Optimization**: Improved tap targets and feedback
- **PWA Updates**: Automatic update notifications
- **Performance**: Faster loading and smoother interactions

## Future Enhancements

- Payment processing integration
- Customer management
- Sales analytics dashboard
- Inventory deduction on orders
- Multi-location support
- Staff management and permissions

---

**Knox POS System v1.1.0**  
Built for efficiency, designed for mobile, optimized for restaurants with product variations.