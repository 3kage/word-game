// Service Worker for PWA
const CACHE_NAME = 'word-game-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/themes.css',
    '/animations.css',
    '/env-config.js',
    '/config.js',
    '/words.js',
    '/enhancements.js',
    '/game.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://telegram.org/js/telegram-web-app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap'
];

// Install SW
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
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
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});

// Activate SW
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline analytics
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Send cached analytics or game data when online
    try {
        const cache = await caches.open('offline-data');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                await fetch(request);
                await cache.delete(request);
            } catch (error) {
                console.log('Failed to sync:', error);
            }
        }
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// Push notifications (if needed in future)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: 'icons/icon-192x192.png',
            badge: 'icons/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Грати зараз',
                    icon: 'icons/checkmark.png'
                },
                {
                    action: 'close',
                    title: 'Закрити',
                    icon: 'icons/xmark.png'
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
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
