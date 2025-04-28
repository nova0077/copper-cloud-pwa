const BASE_URL = 'https://be-cc-pwa.onrender.com';


// Cache configuration for Auth
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
const installAppButton = document.getElementById('install-app');

let deferredPrompt; // Store the event for later

// Listen for the `beforeinstallprompt` event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired');
  e.preventDefault(); // Prevent the automatic prompt
  deferredPrompt = e; // Save the event for triggering later
  installAppButton.style.display = 'block'; // Display the install button
});


document.getElementById('install-app').addEventListener('click', (e) => {
  if (!deferredPrompt) {
    console.warn("Install prompt not available");
    return;
  }
  // Hide the app provided install promotion
  document.getElementById('install-app').style.display = 'none';
  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
  });
});


// Navigation logic
scanCodeButton.addEventListener('click', () => {
  homeScreen.style.display = 'none';
  scannerScreen.style.display = 'block';
  itemsScreen.style.display = 'none';
  scanCodeButton.style.display = 'none';
  startScannerButton.style.display = 'block';
});

async function syncServerItemsToShow() {
  try {
    const response = await fetch(`${BASE_URL}/get-barcodes`);
    if (!response.ok) throw new Error("Failed to fetch barcodes");

    const serverItems = await response.json();
    const table = document.querySelector("#itemsTable");

    serverItems.forEach((item) => {
      // Check if item is already in table
      let barcodeData = item.barcodeData;
      const existingRow = table.querySelector(`#item-${barcodeData.id}`);
      if (!existingRow) {
        addToTable(barcodeData, "DONE");
      }
    });
  } catch (error) {
    console.error("Error fetching barcodes:", error);
  }
}


async function syncItemsToShow() {
  const items = await getItemsFromIndexedDB("scanned-items");
  const table = document.querySelector("#itemsTable");

  items.forEach((item) => {
    // Check if a row with this item's ID already exists
    const existingRow = table.querySelector(`#item-${item.id}`);
    if (!existingRow) {
      addToTable(item, "PENDING"); // Mark as "PENDING" if not yet synced
    }
  });
}


let isTableUpToDate = false;
viewItemsButton.addEventListener('click', async () => {
  homeScreen.style.display = 'none';
  scannerScreen.style.display = 'none';
  itemsScreen.style.display = 'block';
  scanCodeButton.style.display = 'block';

  await syncServerItemsToShow();  // Step 1: Fetch and add items from the server
  await syncItemsToShow();         // Step 2: Fetch and add pending items from IndexedDB
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
  scanCodeButton.style.display = 'block';
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
    sendPushNotification('You are offline, Network connection lost');
  } else {
    statusHeader.classList.remove('offline');
    statusHeader.classList.add('online');
    statusText.textContent = 'You are Online';
    startScannerButton.textContent = 'Start Scanner';
    hideOfflineMessage();
    sendPushNotification('You are Back Online!');
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
    // msg.textContent = 'Not connected to the Internet';
    startScannerButton.parentNode.insertBefore(msg, startScannerButton);
  }
}


function hideOfflineMessage() {
  const msg = document.getElementById('offline-msg');
  if (msg) msg.remove();
}


startScannerButton.addEventListener('click', async () => {
  try {
    await requestPermissions();
    if (isScanning) {
      startScannerButton.textContent = 'Start Scanner';
      isScanning = false;
    } else {
      startScanner();
      startScannerButton.style.display = 'none';
      isScanning = true;
    }
  } catch (error) {
    console.error('Error starting scanner:', error);
    showSnackbar('Error starting scanner');
  }
});


async function startScanner() {
  try {
    function onScanSuccess(decodedText, decodedResult) {
      processDetectedCode(decodedText);
      console.log(`Code matched = ${decodedText}`, decodedResult);
    }

    let config = {
      fps: 10,
      qrbox: { width: 200, height: 200 },
      facingMode: "environment",
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA,]
    };

    let html5QrcodeScanner = new Html5QrcodeScanner(
      "my-qr-reader", config, /* verbose= */ false);
    html5QrcodeScanner.render(onScanSuccess);
  } catch (error) {
    alert(error.message);
    console.error('Error starting scanner:', error);
    showSnackbar('Error starting scanner');
  }
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
  const parsedData = JSON.parse(cachedData);
  const name = parsedData.username;

  // Prepare scanned item
  const scannedItem = {
    id: barcode,
    timestamp: new Date().toISOString(),
    location: isOnline ? await getCurrentLocation() : { latitude: 0, longitude: 0 },
    username: name,
  };

  if (isOnline) {
    try {

      console.log('Sending payload:', JSON.stringify(scannedItem));
      const response = await fetch(`${BASE_URL}/save-barcode`, {
        method: 'POST',
        body: JSON.stringify(scannedItem),
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        console.log(`Barcode ${barcode} processed successfully.`);
        addToTable(scannedItem, 'DONE');
      } else {
        console.error('Failed to process barcode online. Saving to IndexedDB.', await response.json());
        await saveItemToIndexedDB(scannedItem, 'scanned-items');
      }
    } catch (error) {
      console.error('Error sending barcode to the server:', error.message);
      await saveItemToIndexedDB(scannedItem, 'scanned-items');
    }
  } else {
    console.log('Offline mode: Saving barcode to IndexedDB.');
    await saveItemToIndexedDB(scannedItem, 'scanned-items');
  }
}


function updateTableStatus(itemId, newStatus) {
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

  const items = await getItemsFromIndexedDB('scanned-items');
  console.log(items);

  if (items.length === 0) {
    console.log('No items to sync.');
    sendPushNotification('Back Online', 'All items are synced');
    return; // Nothing to sync
  }

  for (const item of items) {
    try {
      const response = await fetch(`${BASE_URL}/save-barcode`, {
        method: 'POST',
        body: JSON.stringify(item),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`Synced item ${item.id}`);
        await removeItemFromIndexedDB(item.id, 'scaned-items');
        updateTableStatus(item.id, 'DONE');
      } else {
        console.error('Failed to sync item:', item.id);
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}`, error);
    }
  }
  sendPushNotification("All items have been synced with the server");
  hasSynced = true;
}


// Event listeners for online and offline status
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
askForNotificationPermission();

// Run authentication check before initializing the app
if (checkAuthentication()) {
  updateOnlineStatus();
  showHomeScreen();
} else {
  sendPushNotification("Please login");
}