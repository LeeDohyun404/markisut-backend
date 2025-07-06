document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const loginFormElement = document.getElementById('loginFormElement');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminNameSpan = document.getElementById('adminName');

    // Cek status login saat halaman dimuat
    if (localStorage.getItem('adminToken')) {
        initDashboard();
    } else {
        loginForm.style.display = 'flex';
        dashboard.style.display = 'none';
    }

    // Event Listener untuk Login
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            localStorage.setItem('adminToken', data.token);
            initDashboard();
        } catch (error) {
            alert('Login Gagal: ' + error.message);
        }
    });

    // Event Listener untuk Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        loginForm.style.display = 'flex';
        dashboard.style.display = 'none';
    });
    
    function initDashboard() {
        loginForm.style.display = 'none';
        dashboard.style.display = 'grid';
        // Di sini Anda bisa menambahkan fungsi untuk memuat data pesanan, dll.
    }
});