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


const sendSubscriptionToServer = async (subscription) => {
  console.log("Sending subscription to server:", subscription);
  const SERVER_URL = 'https://be-cc-pwa.onrender.com/save-subscription'
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  })
  if(!response.ok){
    console.error('Failed to send subscription to server:', response);
  }
  return response.json()
}


function configurePushSub() {
  console.log('Configuring push subscription');
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((swreg) => {
      swreg.pushManager.getSubscription()
        .then((sub) => {
            if (sub === null) {
            // Create a new subscription
            console.log("Creating new subscription");
            var vapidPublicKey = 'BG4aMBe5B1Eu6nYGI0HISjTFmkeX4KcMrQP1Nsin-Igwmheooi1fUSBP6lbGSSrKKj1dwYH1bz6WAsl5kJQGeBs';
            const options = {
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
            };
            return swreg.pushManager.subscribe(options);
            } else {
            // We have a subscription 
            console.log("Subscription already exists:", sub);
            return null; // Prevent sending to the next then promises
            }
        })
        .then((newSub) => {
          if(newSub === null) return;
          return sendSubscriptionToServer(newSub);
        })
        .then((response) => {
          if(response.ok)
            console.log('Subscription sent to server:', response);
        })
        .catch(error => {
          console.error('Error while getting subscription:', error);
        });
    })
    .catch(error => {
      console.error('Service worker is not ready:', error);
    });
}


function askForNotificationPermission(){
  // Request notification permission
  if ('Notification' in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        configurePushSub();
      } else {
        console.log('Notification permission denied.');
      }
    });
  }
}