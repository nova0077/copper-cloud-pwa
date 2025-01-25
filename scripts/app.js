const BASE_URL = 'https://upc.up.railway.app';
console.log('App is running'); 

const startScannerButton = document.getElementById('start-scanner');
const itemDetails = document.getElementById('item-details');

let isScanning = false;

const STORAGE_KEY = 'scanned_items';
let isOnline = navigator.onLine;

// Add these event listeners for online/offline status
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    isOnline = navigator.onLine;
    startScannerButton.disabled = !isOnline;
    if (!isOnline) {
        startScannerButton.textContent = 'Start Scanner';
        Quagga.stop();
        isScanning = false;
        showOfflineMessage();
    } else {
        startScannerButton.textContent = 'Start Scanner';
        hideOfflineMessage();
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
    }, function(err) {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        Quagga.stop();
        startScannerButton.textContent = 'Start Scanner';
        isScanning = false;
        // Process the detected code
        lookupProduct(code);
    });
}

async function lookupProduct(barcode) {
    console.log('Looking up product:', barcode);
    try {
        if (!isOnline) {
            throw new Error('No internet connection');
        }

        const response = await fetch(`${BASE_URL}?upc=${barcode}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            const scannedItem = {
                id: barcode,
                title: item.title,
                brand: item.brand,
                description: item.description,
                timestamp: new Date().toISOString()
            };
            
            // Store the item locally
            saveItemToStorage(scannedItem);
            
            // Display all items including the new one
            displayScannedItems();
        } else {
            itemDetails.innerHTML = `<p>No product found for barcode: ${barcode}</p>`;
        }
    } catch (error) {
        itemDetails.innerHTML = `<p>Error looking up product: ${error.message}</p>`;
        displayScannedItems(); // Still show stored items even if lookup fails
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

function getStoredItems() {
    const items = localStorage.getItem(STORAGE_KEY);
    return items ? JSON.parse(items) : [];
}

function displayScannedItems() {
    const items = getStoredItems();
    
    itemDetails.innerHTML = items.length ? 
        items.map(item => `
            <div class="scanned-item">
                <p><strong>Title:</strong> ${item.title || 'N/A'}</p>
                <p><strong>Brand:</strong> ${item.brand || 'N/A'}</p>
                <p><strong>Description:</strong> ${item.description || 'N/A'}</p>
                <p><strong>UPC:</strong> ${item.id}</p>
                <p><strong>Scanned:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
            </div>
        `).join('<hr>') :
        '<p>No items scanned yet</p>';
}

// Call these when the page loads
updateOnlineStatus();
displayScannedItems(); 