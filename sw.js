const CACHE_NAME = 'c4-maestro-2026';

// Se instala el Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Fuerza la activación inmediata
});

// Se activa el Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Toma el control de la página rápido
});

// ESTO ES OBLIGATORIO PARA QUE GOOGLE CHROME DEJE INSTALAR LA APP
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Si no hay internet, no hace nada grave, pero cumple el requisito.
            // En C4, el código del HTML ya se encarga del Búfer Offline de evidencia.
            return new Response("Sistema C4 - Estás sin conexión. Búfer Offline guardando evidencia.");
        })
    );
});
