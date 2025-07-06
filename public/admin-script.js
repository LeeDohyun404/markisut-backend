document.addEventListener('DOMContentLoaded', () => {
    // Definisi elemen-elemen utama
    const loginFormContainer = document.getElementById('loginForm');
    const dashboardContainer = document.getElementById('dashboard');
    const loginFormElement = document.getElementById('loginFormElement');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminNameSpan = document.getElementById('adminName');
    const sections = document.querySelectorAll('.content-section');
    const navItems = document.querySelectorAll('.nav-item');

    // Fungsi untuk membuat request ke API
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showLogin();
            throw new Error('No token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            // Menggunakan path relatif karena script ini disajikan dari domain yang sama dengan API
            const response = await fetch(`/api${endpoint}`, config);
            
            if (response.status === 401 || response.status === 403) {
                logout(); // Token tidak valid, logout otomatis
                throw new Error('Sesi tidak valid atau telah berakhir. Silakan login kembali.');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Gagal memproses respons server.' }));
                throw new Error(errorData.error || 'API request failed');
            }
            if (response.status === 204) return null; // Handle No Content response
            return response.json();
        } catch (error) {
            console.error(`API Request Error to ${endpoint}:`, error);
            throw error;
        }
    }

    // ===============================================
    // FUNGSI TAMPILAN & LOGIN/LOGOUT
    // ===============================================

    function showDashboard() {
        loginFormContainer.style.display = 'none';
        dashboardContainer.style.display = 'grid';
        const user = JSON.parse(localStorage.getItem('adminUser'));
        if (user) {
            adminNameSpan.textContent = user.username;
        }
        loadDashboardStats(); // Muat statistik saat dashboard ditampilkan
    }

    function showLogin() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        loginFormContainer.style.display = 'flex';
        dashboardContainer.style.display = 'none';
    }

    logoutBtn.addEventListener('click', showLogin);

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
            if (!response.ok) throw new Error(data.error || 'Login failed');
            
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user)); // Simpan info user
            showDashboard();
        } catch (error) {
            alert('Login Gagal: ' + error.message);
        }
    });

    // ===============================================
    // FUNGSI NAVIGASI
    // ===============================================

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;

            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${sectionId}Section`).classList.add('active');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            if (sectionId === 'dashboard') loadDashboardStats();
            if (sectionId === 'orders') loadOrders();
        });
    });

    // ===============================================
    // FUNGSI MEMUAT DATA
    // ===============================================

    async function loadDashboardStats() {
        try {
            const stats = await apiRequest('/dashboard');
            document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('pendingOrders').textContent = stats.pendingOrders || 0;
            document.getElementById('completedOrders').textContent = stats.completedOrders || 0;
            const revenue = stats.totalRevenue || 0;
            document.getElementById('totalRevenue').textContent = `Rp ${revenue.toLocaleString('id-ID')}`;
            
            const recentOrdersBody = document.getElementById('recentOrdersBody');
            recentOrdersBody.innerHTML = '';
            (stats.recentOrders || []).forEach(order => {
                recentOrdersBody.innerHTML += `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName || ''}</td>
                        <td>${order.productType || 'N/A'}</td>
                        <td>Rp ${(order.finalTotal || 0).toLocaleString('id-ID')}</td>
                        <td><span class="status-badge status-${(order.status || 'unknown').toLowerCase()}">${order.status || 'Unknown'}</span></td>
                        <td>${new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                    </tr>
                `;
            });
        } catch (error) {
            alert('Gagal memuat statistik dashboard: ' + error.message);
        }
    }

    async function loadOrders() {
        try {
            const data = await apiRequest('/orders');
            const ordersBody = document.getElementById('ordersBody');
            ordersBody.innerHTML = '';
            
            if (!data.orders || data.orders.length === 0) {
                ordersBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada pesanan.</td></tr>';
                return;
            }

            data.orders.forEach(order => {
                ordersBody.innerHTML += `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.customerName || ''}<br><small>${order.email || ''}</small></td>
                        <td>${order.productType || 'N/A'} - ${order.quantity} pcs</td>
                        <td>Rp ${(order.finalTotal || 0).toLocaleString('id-ID')}</td>
                        <td><span class="status-badge status-${(order.status || 'unknown').toLowerCase()}">${order.status || 'Unknown'}</span></td>
                        <td>${new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                        <td class="action-buttons">
                            <button class="btn-action btn-view">View</button>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            alert('Gagal memuat data pesanan: ' + error.message);
        }
    }

    // ===============================================
    // INISIALISASI HALAMAN
    // ===============================================
    if (localStorage.getItem('adminToken')) {
        showDashboard();
    } else {
        showLogin();
    }
});