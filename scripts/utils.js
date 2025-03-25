function sendPushNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      var options = {
        body: message,
        icon: 'icons/icon.png',
        dir: 'ltr',
        lang: 'en-US',
        vibrate: [100, 50, 100],
        badge: 'icons/icon.png',
        tag: 'confirm-notification',
        renotify: true,
        actions: [
          { action: 'confirm', title: 'Okay', icon: 'icons/icon.png' },
          { action: 'cancel', title: 'Cancel', icon: 'icons/icon.png' }
        ]
      }
      registration.showNotification(title, options);
    });
  } else {
    console.log('Notification permission not granted');
  }
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


const urlB64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}