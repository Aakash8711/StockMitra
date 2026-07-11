const firstName = sessionStorage.getItem('firstName') || '';
const lastName = sessionStorage.getItem('lastName') || '';
const fullName = firstName + ' ' + lastName;
const usernameEl = document.getElementById('username');
const logoutBtn = document.getElementById('logoutBtn');

if (!sessionStorage.getItem('token')) {
    window.location.href = 'signup.html';
}

if (usernameEl) {
    usernameEl.textContent = fullName.trim() || 'User';
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = 'signup.html';
    });
}