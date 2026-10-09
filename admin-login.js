// Admin credentials (hardcoded as specified)
const ADMIN_CREDENTIALS = {
    username: 'Rakesh',
    password: '998664'
};

// Handle form submission
function handleAdminLogin(event) {
    event.preventDefault();

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Clear previous messages
    clearMessages();

    // Validate credentials
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Show success message
        showSuccessMessage('✓ Login successful! Redirecting to dashboard...');
        
        // Disable button and show spinner
        disableLoginButton();

        // Store admin session
        sessionStorage.setItem('adminToken', 'authenticated');
        sessionStorage.setItem('adminUsername', username);
        if (rememberMe) {
            localStorage.setItem('rememberAdmin', 'true');
        }

        // Redirect after 1 second
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    } else {
        // Show error
        showErrorMessage('❌ Invalid username or password. Please try again.');
        enableLoginButton();
        
        // Clear password field for security
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();

        // Log attempt (for security purposes)
        console.warn('Invalid admin login attempt:', {
            username: username,
            timestamp: new Date().toISOString()
        });
    }
}

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

// Clear messages
function clearMessages() {
    document.getElementById('errorMessage').textContent = '';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').textContent = '';
    document.getElementById('successMessage').style.display = 'none';
}

// Disable login button and show spinner
function disableLoginButton() {
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    document.getElementById('loginBtnText').style.display = 'none';
    document.getElementById('loginSpinner').style.display = 'inline-block';
}

// Enable login button
function enableLoginButton() {
    const btn = document.getElementById('loginBtn');
    btn.disabled = false;
    document.getElementById('loginBtnText').style.display = 'inline';
    document.getElementById('loginSpinner').style.display = 'none';
}

// Check if already logged in and redirect
window.addEventListener('load', () => {
    if (sessionStorage.getItem('adminToken') === 'authenticated') {
        window.location.href = 'admin.html';
    }

    // Check if "Remember me" was set
    if (localStorage.getItem('rememberAdmin') === 'true') {
        const savedUsername = localStorage.getItem('adminUsername');
        if (savedUsername) {
            document.getElementById('adminUsername').value = savedUsername;
            document.getElementById('rememberMe').checked = true;
            document.getElementById('adminPassword').focus();
        }
    }
});

// Allow Enter key to submit form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminLoginForm');
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });
});
