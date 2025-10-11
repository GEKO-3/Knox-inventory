const CACHE_NAME = 'knox-pos-v1.3.1';
const urlsToCache = [
    './',
    './pos.html',
    './pos-styles.css',
    './pos-app.js',
    './pos-manifest.json',
    './README.md',
    'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js'
];

// Install event
self.addEventListener('install', event => {
    console.log('POS Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('POS Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('POS Service Worker: Installation complete');
                return self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('POS Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('knox-pos-')) {
                        console.log('POS Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('POS Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone response for cache
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./pos.html');
                }
            })
    );
});

// Handle messages from the app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync for offline orders (if supported)
if ('sync' in self.registration) {
    self.addEventListener('sync', event => {
        if (event.tag === 'sync-orders') {
            event.waitUntil(syncOfflineOrders());
        }
    });
}

async function syncOfflineOrders() {
    // Implementation for syncing offline orders when back online
    console.log('POS Service Worker: Syncing offline orders...');
    // This would typically read from IndexedDB and sync to Firebase
}

// Push notifications (for order updates, promotions, etc.)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || './icons/icon-192x192.png',
            badge: './icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey || 1
            },
            actions: [
                {
                    action: 'explore',
                    title: 'View Order',
                    icon: './icons/checkmark.png'
                },
                {
                    action: 'close',
                    title: 'Close',
                    icon: './icons/close.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        // Open POS app to specific order
        event.waitUntil(
            clients.openWindow('./pos.html')
        );
    }
});

console.log('Knox POS Service Worker loaded');