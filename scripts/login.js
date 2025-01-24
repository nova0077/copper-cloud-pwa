// Cache configuration
const CACHE_KEY = 'user_auth';
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault(); // Prevent form submission

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Validate login credentials
  if (username === 'admin' && password === 'admin') {
    // Save login details to cache with timestamp
    const loginData = {
      username: username,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(loginData));

    // Redirect to the home page
    window.location.href = 'index.html';
  } else {
    // Show error message for invalid login
    document.getElementById('error-message').textContent = 'Invalid username or password!';
  }
});

// Function to check if login credentials are valid
function checkAuthentication() {
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
        const { username, timestamp } = JSON.parse(cachedData);
        const currentTime = Date.now();

        // Validate cached credentials and check expiration
        if (username && currentTime - timestamp < CACHE_EXPIRATION_MS) {
            console.log('User authenticated via cache.');
            return true;
        } else {
            console.log('Session expired. Clearing cache.');
            localStorage.removeItem(CACHE_KEY); // Clear expired cache
        }
    } else {
        console.log('No valid user authentication found in cache.');
    }

    return false;
}

// Redirection Logic
if (checkAuthentication()) {
    window.location.href = 'index.html';
}