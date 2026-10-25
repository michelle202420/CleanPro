// Admin Login Functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous error
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';

        // Get form data
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Basic validation
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token in localStorage (backend returns token in data.data.token)
                const token = data.data?.token || data.token;
                localStorage.setItem('adminToken', token);
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            } else {
                const errorMsg = data.error?.message || data.error || 'Login failed. Please try again.';
                showError(errorMsg);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMsg = error.message || 'Connection error. Please check that the server is running and try again.';
            showError(errorMsg);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
        // Verify token is still valid
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = 'index.html';
            } else {
                localStorage.removeItem('adminToken');
            }
        })
        .catch(() => {
            localStorage.removeItem('adminToken');
        });
    }
});

// Made with Bob
