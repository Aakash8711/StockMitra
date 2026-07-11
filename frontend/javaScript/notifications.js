const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info', duration = 4000) {
    if (!toastContainer) return;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });


    const timeout = setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }, duration);

    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    });
}

// confirm message======================

const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');

let confirmResolve = null;

function showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmModal.classList.add('active');

        confirmResolve = resolve;
    });
}

confirmOk.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
});

confirmCancel.addEventListener('click', () => {
    confirmModal.classList.remove('active');
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('active');
        if (confirmResolve) {
            confirmResolve(false);
            confirmResolve = null;
        }
    }
});

window.showToast = showToast;
window.showConfirm = showConfirm;