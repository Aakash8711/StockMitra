import { API_BASE } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  const authError = document.getElementById('authError');
  const authErrorLogin = document.getElementById('authErrorLogin');

  const tabs = document.querySelectorAll('.auth-tab');
  const forms = {
    signup: document.getElementById('signupForm'),
    login: document.getElementById('loginForm'),
  };

  // ---- Helper: update page title ----
  function setPageTitle(formType) {
    if (formType === 'signup') {
      document.title = 'StockMitra Sign Up Page';
    } else if (formType === 'login') {
      document.title = 'StockMitra Login Page';
    }
  }

  // ---- Tab switching ----
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const formId = tab.dataset.form; // 'signup' or 'login'
      Object.keys(forms).forEach((key) => {
        forms[key].classList.toggle('active', key === formId);
      });

      // Update page title
      setPageTitle(formId);

      // Clear errors when switching
      authError.textContent = '';
      authErrorLogin.textContent = '';
    });
  });

  // ---- Set initial title ----
  setPageTitle('signup');

  // ---- Sign Up ----
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const storeName = document.getElementById('storeName').value.trim();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!storeName || !firstName || !lastName || !email || !password || !confirm) {
      authError.textContent = 'All fields are required.';
      return;
    }
    if (password.length < 6) {
      authError.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirm) {
      authError.textContent = 'Passwords do not match.';
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ storeName, firstName, lastName, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      // Save user session details
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('userEmail', data.user.email);
      sessionStorage.setItem('firstName', data.user.firstName);
      sessionStorage.setItem('lastName', data.user.lastName);
      sessionStorage.setItem('storeName', data.user.storeName);

      authError.textContent = '';
      window.location.href = 'dashboard.html';
    } catch (err) {
      authError.textContent = err.message || 'Network error. Please try again.';
      console.error('Signup error:', err);
    }
  });

  // ---- Log In ----
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      authErrorLogin.textContent = 'Please enter both email and password.';
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      // Save user session details
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('userEmail', data.user.email);
      sessionStorage.setItem('firstName', data.user.firstName);
      sessionStorage.setItem('lastName', data.user.lastName);
      sessionStorage.setItem('storeName', data.user.storeName);

      authErrorLogin.textContent = '';
      window.location.href = 'dashboard.html';
    } catch (err) {
      authErrorLogin.textContent = err.message || 'Network error. Please try again.';
      console.error('Login error:', err);
    }
  });
});
