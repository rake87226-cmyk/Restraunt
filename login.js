/* ===================== LOGIN FUNCTIONALITY ===================== */

let currentEmail = '';
let otpTimer = null;
let resendCountdown = 0;
let lastGeneratedOtp = null; // Store OTP for demo purposes

/* ===================== PAGE INITIALIZATION ===================== */

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    initializeGoogleSignIn();
});

function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    const userEmail = localStorage.getItem('userEmail');
    
    if (token && userEmail) {
        // User is already logged in, redirect to home
        window.location.href = 'index.html';
    }
}

// ===================== EVENT LISTENERS =====================

function setupEventListeners() {
    // Email form
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);
    
    // OTP form
    document.getElementById('otpForm').addEventListener('submit', handleOtpSubmit);
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', goBackToEmail);
    
    // Resend button
    document.getElementById('resendBtn').addEventListener('click', resendOtp);
    
    // OTP input auto-advance
    setupOtpInputs();
}

// ===================== EMAIL SUBMISSION =====================

async function handleEmailSubmit(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const emailError = document.getElementById('emailError');
    const emailBtn = document.querySelector('#emailForm .btn-primary');
    const emailBtnText = document.getElementById('emailBtnText');
    const emailSpinner = document.getElementById('emailSpinner');
    
    // Clear previous errors
    emailError.textContent = '';
    
    // Validate email
    if (!isValidEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        return;
    }
    
    // Disable button and show spinner
    emailBtn.disabled = true;
    emailBtnText.style.display = 'none';
    emailSpinner.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentEmail = email;
            lastGeneratedOtp = data.otp; // Store OTP for display
            switchToOtpSection();
            
            // Display OTP for testing if provided
            if (data.otp) {
                const otpDisplay = document.createElement('div');
                otpDisplay.style.cssText = 'background: #f0fff4; border: 2px solid #9ae6b4; border-radius: 8px; padding: 12px; margin-bottom: 15px; color: #22543d; text-align: center; font-weight: 600; font-size: 18px; letter-spacing: 3px;';
                otpDisplay.textContent = `Demo OTP: ${data.otp}`;
                document.querySelector('.otp-info').insertBefore(otpDisplay, document.querySelector('.otp-info').firstChild);
                console.log('[OTP] Displayed OTP:', data.otp);
            }
            
            startResendTimer();
        } else {
            emailError.textContent = data.message || 'Failed to send OTP. Please try again.';
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        emailError.textContent = 'Network error. Please try again.';
    } finally {
        emailBtn.disabled = false;
        emailBtnText.style.display = 'inline';
        emailSpinner.style.display = 'none';
    }
}

// ===================== OTP SUBMISSION =====================

async function handleOtpSubmit(e) {
    e.preventDefault();
    
    const otpInputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    const otpError = document.getElementById('otpError');
    const otpBtn = document.querySelector('#otpForm .btn-primary');
    const otpBtnText = document.getElementById('otpBtnText');
    const otpSpinner = document.getElementById('otpSpinner');
    
    // Clear previous errors
    otpError.textContent = '';
    
    // Validate OTP
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        otpError.textContent = 'Please enter a valid 6-digit OTP';
        return;
    }
    
    // Disable button and show spinner
    otpBtn.disabled = true;
    otpBtnText.style.display = 'none';
    otpSpinner.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: currentEmail, otp })
        });
        
        console.log('[OTP VERIFY] Sending email:', currentEmail, 'OTP:', otp);
        
        const data = await response.json();
        console.log('[OTP VERIFY] Response:', data);
        
        if (data.success) {
            // Save token and email to localStorage
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userName', data.name || 'User');
            
            console.log('[LOGIN] User authenticated, redirecting to index.html');
            
            // Show success animation
            showSuccessAnimation();
            
            // Redirect to home page immediately
            setTimeout(() => {
                console.log('[LOGIN] Redirecting to index.html');
                window.location.href = 'index.html';
            }, 500);
        } else {
            otpError.textContent = data.message || 'Invalid OTP. Please try again.';
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        otpError.textContent = 'Network error. Please try again.';
    } finally {
        otpBtn.disabled = false;
        otpBtnText.style.display = 'inline';
        otpSpinner.style.display = 'none';
    }
}

// ===================== OTP INPUT HANDLING =====================

function setupOtpInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Allow only digits
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Auto-advance to next input
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Clear error when user starts typing
            document.getElementById('otpError').textContent = '';
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6 - index);
            
            for (let i = 0; i < pastedData.length; i++) {
                if (/[0-9]/.test(pastedData[i])) {
                    otpInputs[index + i].value = pastedData[i];
                }
            }
        });
    });
}

// ===================== SECTION SWITCHING =====================

function switchToOtpSection() {
    const emailSection = document.getElementById('emailSection');
    const otpSection = document.getElementById('otpSection');
    
    emailSection.classList.remove('active');
    otpSection.classList.add('active');
    
    document.getElementById('emailDisplay').textContent = currentEmail;
    
    // Focus on first OTP input
    setTimeout(() => {
        document.querySelector('.otp-input').focus();
    }, 300);
}

function goBackToEmail() {
    const emailSection = document.getElementById('emailSection');
    const otpSection = document.getElementById('otpSection');
    
    otpSection.classList.remove('active');
    emailSection.classList.add('active');
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    document.getElementById('otpError').textContent = '';
    
    // Clear timer
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    
    // Focus on email input
    setTimeout(() => {
        document.getElementById('email').focus();
    }, 300);
}

// ===================== RESEND OTP =====================

async function resendOtp() {
    const resendBtn = document.getElementById('resendBtn');
    
    if (resendCountdown > 0) {
        return; // Resend not available yet
    }
    
    try {
        const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: currentEmail })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            lastGeneratedOtp = data.otp;
            
            // Show success message with OTP if available
            document.getElementById('otpError').textContent = '';
            const successMsg = document.createElement('div');
            successMsg.textContent = data.otp ? `✓ OTP resent! Code: ${data.otp}` : '✓ OTP resent successfully!';
            successMsg.style.color = '#22543d';
            successMsg.style.fontSize = '0.9rem';
            successMsg.style.background = '#f0fff4';
            successMsg.style.padding = '8px';
            successMsg.style.borderRadius = '4px';
            successMsg.style.marginBottom = '10px';
            successMsg.style.animation = 'slideUp 0.3s ease-out';
            successMsg.style.fontWeight = 'bold';
            document.querySelector('.otp-info').prepend(successMsg);
            
            setTimeout(() => successMsg.remove(), 3000);
            
            startResendTimer();
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        document.getElementById('otpError').textContent = 'Failed to resend OTP. Please try again.';
    }
}

function startResendTimer() {
    resendCountdown = 60;
    const resendBtn = document.getElementById('resendBtn');
    const timerSpan = document.getElementById('timer');
    
    resendBtn.disabled = true;
    
    otpTimer = setInterval(() => {
        resendCountdown--;
        timerSpan.textContent = resendCountdown;
        
        if (resendCountdown <= 0) {
            clearInterval(otpTimer);
            resendBtn.disabled = false;
            otpTimer = null;
        }
    }, 1000);
}

// ===================== DEMO LOGIN =====================

async function loginAsDemo(email) {
    const emailInput = document.getElementById('email');
    emailInput.value = email;
    
    // Trigger email form submission
    document.getElementById('emailForm').dispatchEvent(new Event('submit'));
}

// ===================== VALIDATION =====================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===================== SUCCESS ANIMATION =====================

function showSuccessAnimation() {
    const loginCard = document.querySelector('.login-card');
    loginCard.style.animation = 'none';
    
    // Trigger success effect
    loginCard.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    loginCard.style.transform = 'scale(1.02)';
    
    const successMessage = document.createElement('div');
    successMessage.innerHTML = '✓ Login Successful!';
    successMessage.style.position = 'absolute';
    successMessage.style.top = '50%';
    successMessage.style.left = '50%';
    successMessage.style.transform = 'translate(-50%, -50%)';
    successMessage.style.color = 'white';
    successMessage.style.fontSize = '1.5rem';
    successMessage.style.fontWeight = 'bold';
    successMessage.style.animation = 'popIn 0.5s ease-out';
    
    loginCard.appendChild(successMessage);
}

// ===================== LOGOUT FUNCTION =====================

function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.location.href = 'login.html';
}

// ===================== GOOGLE SIGN-IN =====================

function initializeGoogleSignIn() {
    // Check if Google Sign-In is available
    if (window.google && window.google.accounts) {
        console.log('[GOOGLE] Google Sign-In library loaded successfully');
        
        // Optional: Customize the Google button appearance
        if (window.google.accounts.id) {
            window.google.accounts.id.initialize({
                client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
                callback: handleGoogleSignIn,
                ux_mode: 'popup'
            });
        }
    } else {
        console.warn('[GOOGLE] Google Sign-In library not loaded');
    }
}

/**
 * Handle Google Sign-In callback
 * @param {Object} response - Google Sign-In response with credential (JWT)
 */
async function handleGoogleSignIn(response) {
    if (!response || !response.credential) {
        console.error('[GOOGLE] No credential in response');
        return;
    }

    const googleToken = response.credential;
    console.log('[GOOGLE] Sign-In successful, token received');

    try {
        // Send the Google token to backend for verification
        const backendResponse = await fetch('/api/auth/google-signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ googleToken })
        });

        const data = await backendResponse.json();

        if (data.success) {
            // Save token and user info to localStorage
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userName', data.name || data.email.split('@')[0]);

            console.log('[GOOGLE] User authenticated:', data.email);

            // Show success animation
            showSuccessAnimation();

            // Redirect to home page
            setTimeout(() => {
                console.log('[LOGIN] Redirecting to index.html');
                window.location.href = 'index.html';
            }, 500);
        } else {
            console.error('[GOOGLE] Backend verification failed:', data.message);
            alert(data.message || 'Google Sign-In failed. Please try again.');
        }
    } catch (error) {
        console.error('[GOOGLE] Error during sign-in:', error);
        alert('Error during Google Sign-In. Please try again.');
    }
}

// Make handleGoogleSignIn globally available
window.handleGoogleSignIn = handleGoogleSignIn;
