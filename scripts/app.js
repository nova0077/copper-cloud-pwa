const BASE_URL = 'https://centralarp.coppercloud.in/r2d2arp/pwabarcode?code=';

// Cache configuration
const CACHE_KEY = 'user_auth';
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

// Check authentication at the start of the app
function checkAuthentication() {
  const cachedData = localStorage.getItem(CACHE_KEY);

  if (cachedData) {
    const { username, timestamp } = JSON.parse(cachedData);
    const currentTime = Date.now();

    // Validate cached credentials and check expiration
    if (username === 'admin' && currentTime - timestamp < CACHE_EXPIRATION_MS) {
      console.log('User authenticated');
      return true;
    } else {
      console.log('Session expired. Clearing cache.');
      localStorage.removeItem(CACHE_KEY); // Clear expired cache
    }
  } else {
    console.log('No user authentication found.');
  }

  // Redirect to login page if not authenticated
  window.location.href = 'login.html';
  return false;
}

// Request notification permission
if ('Notification' in window) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted.');
    } else {
      console.log('Notification permission denied.');
    }
  });
}

let isScanning = false;
const STORAGE_KEY = 'scanned_items';
let isOnline = navigator.onLine;

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const scannerScreen = document.getElementById('scanner-screen');
const itemsScreen = document.getElementById('items-screen');
const scanCodeButton = document.getElementById('scan-code');
const viewItemsButton = document.getElementById('view-items');
const backToHomeButton = document.getElementById('back-to-home');
const backToHomeFromItemsButton = document.getElementById('back-to-home-from-items');
const statusHeader = document.getElementById('status-header');
const statusText = document.getElementById('status-text');
const startScannerButton = document.getElementById('start-scanner');
const itemsTableBody = document.getElementById('itemsTableBody');

let deferredPrompt; // Store the event for later

// Listen for the `beforeinstallprompt` event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired');
  e.preventDefault(); // Prevent the automatic prompt
  deferredPrompt = e; // Save the event for triggering later
});

// Navigation logic
scanCodeButton.addEventListener('click', () => {
  homeScreen.style.display = 'none';
  scannerScreen.style.display = 'block';
  itemsScreen.style.display = 'none';
  // Show the Add to Home Screen prompt (if available)
  if (deferredPrompt) {
    deferredPrompt.prompt(); // Show the native prompt
    // Wait for the user's response
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      deferredPrompt = null; // Reset the prompt after use
    });
  } else {
    console.log('Install prompt not available');
  }
});

async function syncItemsToShow() {
  const items = await getItemsFromIndexedDB(); // Get items from IndexedDB
  // Get the table where the items will be added
  const table = document.querySelector('#itemsTable');
  // Loop through each item and add it to the table
  items.forEach(item => {
    // Check if a row with this item's ID already exists
    const existingRow = table.querySelector(`#item-${item.id}`);
    // If the row doesn't exist, add it
    if (!existingRow) {
      const status = 'PENDING'; // Default to "PENDING" status if it's not synced
      addToTable(item, status); // Add the item to the table
    }
  });
}

let isTableUpToDate = false;
viewItemsButton.addEventListener('click', () => {
  homeScreen.style.display = 'none';
  scannerScreen.style.display = 'none';
  itemsScreen.style.display = 'block';
  syncItemsToShow();
});

document.getElementById('back-to-home').addEventListener('click', () => {
  showHomeScreen();
});

document.getElementById('back-to-home-from-items').addEventListener('click', () => {
  showHomeScreen();
});

function showHomeScreen() {
  homeScreen.style.display = 'block';
  scannerScreen.style.display = 'none';
  itemsScreen.style.display = 'none';
}

let hasSynced = false;
// Update online status and sync items
function updateOnlineStatus() {
  isOnline = navigator.onLine;

  if (!isOnline) {
    statusHeader.classList.remove('online');
    statusHeader.classList.add('offline');
    statusText.textContent = 'You are Offline';
    startScannerButton.textContent = 'Start Scanner (Offline Mode)';
    showOfflineMessage();
    hasSynced = false;
    sendPushNotification('You are offline', 'Network disconnected');
  } else {
    statusHeader.classList.remove('offline');
    statusHeader.classList.add('online');
    statusText.textContent = 'You are Online';
    startScannerButton.textContent = 'Start Scanner';
    hideOfflineMessage();
    if (!hasSynced) {
      syncItemsToServer();
    }
  }
}

function showOfflineMessage() {
  const existingMsg = document.getElementById('offline-msg');
  if (!existingMsg) {
    const msg = document.createElement('div');
    msg.id = 'offline-msg';
    msg.className = 'offline-warning';
    msg.textContent = 'Not connected to the Internet';
    startScannerButton.parentNode.insertBefore(msg, startScannerButton);
  }
}

function hideOfflineMessage() {
  const msg = document.getElementById('offline-msg');
  if (msg) msg.remove();
}

// Event listeners for online and offline status
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Push Notification
function sendPushNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: message,
        icon: '/icon.png'
      });
    });
  } else {
    console.log('Notification permission not granted');
  }
}

// Function to request camera and location permissions
async function requestPermissions() {
  // Request camera permission
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    console.log('Camera permission granted.');
  } catch (error) {
    throw new Error('Camera permission denied. Please allow access to the camera.');
  }

  // Request location permission
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by your browser.');
    return null; // Skip location if not supported
  }

  return new Promise((resolve, reject) => {
    if (!isOnline) {
      // Fallback for offline mode
      console.warn('Offline mode: Skipping live geolocation.');
      resolve({ latitude: 0, longitude: 0 }); // Return default or mock coordinates
    } else {
      // Fetch live geolocation when online
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location permission granted.');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location permission denied:', error.message);
          reject(new Error('Location permission denied.'));
        }
      );
    }
  });
}

startScannerButton.addEventListener('click', () => {
  if (isScanning) {
    Quagga.stop();
    startScannerButton.textContent = 'Start Scanner';
    isScanning = false;
  } else {
    startScanner();
    startScannerButton.textContent = 'Stop Scanner';
    isScanning = true;
  }
});

function startScanner() {
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector("#interactive"),
      constraints: {
        facingMode: "environment",
        width: 640,
        height: 300,
        aspectRatio: { min: 1, max: 2 }
      },
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"]
    }
  }, function (err) {
    if (err) {
      console.error(err);
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(function (result) {
    const code = result.codeResult.code;
    Quagga.stop();
    startScannerButton.textContent = 'Start Scanner';
    isScanning = false;
    // Process the detected code
    processDetectedCode(code);
  });
}

function addToTable(item, status) {
  const table = document.getElementById('itemsTableBody');
  const row = document.createElement('tr');
  row.id = `item-${item.id}`;
  const formattedTimestamp = new Date(item.timestamp).toLocaleString();
  row.innerHTML = `
        <td>${item.id}</td>
        <td>${formattedTimestamp}</td>
        <td>${item.username}</td>
        <td><span class="${status === "DONE" ? "status-done" : "status-pending"}">${status}</span></td>
    `;
  table.appendChild(row);
}

// Handle scanned barcode
async function processDetectedCode(barcode) {
  console.log('Processing barcode:', barcode);

  const cachedData = localStorage.getItem('user_auth');
  if (!cachedData) {
    console.error('User is not logged in!');
    return;
  }

  const { username } = JSON.parse(cachedData);

  // Prepare scanned item
  const scannedItem = {
    id: barcode,
    timestamp: new Date().toISOString(),
    location: isOnline ? await getCurrentLocation() : { latitude: 0, longitude: 0 }, // Fallback for location
    username,
  };

  if (isOnline) {
    try {
      const response = await fetch(`${BASE_URL}${barcode}`, {
        method: 'POST',
        body: JSON.stringify(scannedItem),
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        console.log(`Barcode ${barcode} processed successfully.`);
        let curStatus = 'DONE';
        if (isOnline)
          curStatus = 'DONE';
        else
          curStatus = 'PENDING';
        addToTable(scannedItem, 'DONE');
      } else {
        console.error('Failed to process barcode online. Saving to IndexedDB.');
        await saveItemToIndexedDB(scannedItem);
        addToTable(scannedItem, 'PENDING');
      }
    } catch (error) {
      console.error('Error sending barcode to the server:', error.message);
      await saveItemToIndexedDB(scannedItem);
      addToTable(scannedItem, 'PENDING');
    }
  } else {
    console.log('Offline mode: Saving barcode to IndexedDB.');
    await saveItemToIndexedDB(scannedItem);
    addToTable(scannedItem, 'PENDING');
  }
}

function saveItemToStorage(item) {
  const items = getStoredItems();
  const existingItemIndex = items.findIndex(i => i.id === item.id);

  if (existingItemIndex >= 0) {
    items[existingItemIndex] = item;
  } else {
    items.unshift(item); // Add new items to the beginning of the list
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function getCurrentLocation() {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by your browser.');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        console.warn('Error fetching location:', error.message);
        resolve(null);
      }
    );
  });
}

// IndexedDB functions
function openDatabase() {
  return idb.openDB('scanned-items-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
    }
  });
}

async function saveItemToIndexedDB(item) {
  const db = await openDatabase();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  await store.put(item);
  await tx.done;
}

async function getItemsFromIndexedDB() {
  const db = await openDatabase();
  const tx = db.transaction('items', 'readonly');
  const store = tx.objectStore('items');
  const items = await store.getAll();
  await tx.done;
  return items;
}

async function removeItemFromIndexedDB(id) {
  const db = await openDatabase();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  await store.delete(id);
  await tx.done;
}

function updateTableStatus(itemId, status) {
  const table = document.getElementById('items-table-body');
  const rows = table.getElementsByTagName('tr');

  for (let row of rows) {
    const idCell = row.cells[0];
    if (idCell && idCell.textContent === itemId) {
      const statusCell = row.cells[3];
      statusCell.innerHTML = `<span class="${newStatus === "DONE" ? "status-done" : "status-pending"
        }">${newStatus}</span>`;
    }
  }
}

// Sync items to server
async function syncItemsToServer() {
  if (!isOnline) return;

  const items = await getItemsFromIndexedDB();
  console.log(items);

  if (items.length === 0) {
    console.log('No items to sync.');
    return; // Nothing to sync, avoid notification
  }
  for (const item of items) {
    try {
      const response = await fetch(`${BASE_URL}?upc=${item.id}`, {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log(`Synced item ${item.id}`);
        await removeItemFromIndexedDB(item.id);
        updateTableStatus(item.id, 'DONE');
      } else {
        console.error('Failed to sync item:', item.id);
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}`, error);
    }
  }
  showNotification("All items have been synced with the server");
  hasSynced = true;
}

// Run authentication check before initializing the app
if (checkAuthentication()) {
  updateOnlineStatus();
  showHomeScreen();
} else {
  showNotification("Login is Required");
}