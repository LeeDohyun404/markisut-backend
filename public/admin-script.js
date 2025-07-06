// Fixed Admin Panel JavaScript
const API_BASE_URL = 'https://markisut-backend.vercel.app';

// Authentication variables
let authToken = localStorage.getItem('adminToken');
let currentOrders = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const loginFormElement = document.getElementById('loginFormElement');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking auth status...');
    checkAuthStatus();
    initEventListeners();
});

function checkAuthStatus() {
    console.log('Current token:', authToken);
    if (authToken) {
        console.log('Token found, showing dashboard...');
        showDashboard();
        loadOrdersData();
    } else {
        console.log('No token found, showing login form...');
        showLoginForm();
    }
}

function showLoginForm() {
    console.log('Showing login form');
    if (loginForm) loginForm.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function showDashboard() {
    console.log('Showing dashboard');
    if (loginForm) loginForm.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
}

function initEventListeners() {
    console.log('Initializing event listeners...');
    
    // Login form
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', handleLogin);
        console.log('Login form listener added');
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('Logout button listener added');
    }
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // Refresh buttons
    const refreshStats = document.getElementById('refreshStats');
    if (refreshStats) {
        refreshStats.addEventListener('click', loadOrdersData);
    }
    
    const refreshOrders = document.getElementById('refreshOrders');
    if (refreshOrders) {
        refreshOrders.addEventListener('click', loadOrdersData);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validation
    if (!username || !password) {
        showToast('Username dan password harus diisi', 'error');
        return;
    }
    
    console.log('Attempting login with username:', username);
    
    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    try {
        console.log('Sending login request to:', `${API_BASE_URL}/api/login`);
        
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                username: username.trim(), 
                password: password.trim() 
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server tidak merespon dengan format JSON yang valid');
        }
        
        // Handle 500 error specifically
        if (response.status === 500) {
            const errorText = await response.text();
            console.log('500 Error response:', errorText);
            
            showToast('Server mengalami masalah. Silakan coba lagi dalam beberapa menit.', 'error');
            return;
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok && data.success && data.token) {
            console.log('Login successful, storing token...');
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            
            // Update admin name if element exists
            const adminNameElement = document.getElementById('adminName');
            if (adminNameElement && data.user) {
                adminNameElement.textContent = data.user.username || username;
            }
            
            showDashboard();
            await loadOrdersData();
            showToast('Login berhasil!', 'success');
            
            // Clear form
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
        } else {
            console.log('Login failed:', data.error || data.message);
            showToast('Login gagal: ' + (data.error || data.message || 'Kredensial tidak valid'), 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error types
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
        } else if (error.message.includes('JSON')) {
            showToast('Server error: Response tidak valid', 'error');
        } else {
            showToast('Terjadi kesalahan saat login: ' + error.message, 'error');
        }
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
}

function handleLogout() {
    console.log('Logging out...');
    authToken = null;
    localStorage.removeItem('adminToken');
    currentOrders = [];
    showLoginForm();
    showToast('Logout berhasil', 'success');
}

function switchSection(sectionName) {
    console.log('Switching to section:', sectionName);
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Update content
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionName + 'Section') {
            section.classList.add('active');
        }
    });
    
    // Load data based on section
    if (sectionName === 'orders') {
        displayOrders();
    } else if (sectionName === 'dashboard') {
        updateDashboardStats();
    }
}

async function loadOrdersData() {
    if (!authToken) {
        console.log('No auth token, cannot load orders');
        return;
    }
    
    console.log('Loading orders data...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Orders response status:', response.status);
        
        if (response.status === 401) {
            console.log('Token expired, redirecting to login...');
            handleLogout();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Orders data:', data);
        
        if (data.success && Array.isArray(data.orders)) {
            currentOrders = data.orders;
            console.log('Loaded', currentOrders.length, 'orders');
            updateDashboardStats();
            displayOrders();
            showToast('Data berhasil dimuat', 'success');
        } else {
            console.log('Invalid orders data structure:', data);
            showToast('Format data tidak valid dari server', 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('Tidak dapat terhubung ke server untuk memuat data', 'error');
        } else {
            showToast('Terjadi kesalahan saat memuat data: ' + error.message, 'error');
        }
    }
}

function updateDashboardStats() {
    console.log('Updating dashboard stats...');
    
    const totalOrders = currentOrders.length;
    const pendingOrders = currentOrders.filter(o => o.status === 'Pending').length;
    const completedOrders = currentOrders.filter(o => o.status === 'Completed').length;
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.finalTotal || order.totalPrice || 0), 0);
    
    // Update stats
    const totalOrdersElement = document.getElementById('totalOrders');
    if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
    
    const pendingOrdersElement = document.getElementById('pendingOrders');
    if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
    
    const completedOrdersElement = document.getElementById('completedOrders');
    if (completedOrdersElement) completedOrdersElement.textContent = completedOrders;
    
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) totalRevenueElement.textContent = `Rp ${totalRevenue.toLocaleString()}`;
    
    // Update recent orders table
    const recentOrders = currentOrders.slice(-5).reverse();
    const tbody = document.getElementById('recentOrdersBody');
    if (tbody) {
        tbody.innerHTML = recentOrders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customerName}</td>
                <td>${getProductName(order)}</td>
                <td>Rp ${(order.finalTotal || order.totalPrice || 0).toLocaleString()}</td>
                <td><span class="status-badge ${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span></td>
                <td>${formatDate(order.createdAt)}</td>
            </tr>
        `).join('');
    }
}

function displayOrders() {
    console.log('Displaying orders...');
    
    const tbody = document.getElementById('ordersBody');
    if (!tbody) {
        console.log('Orders table body not found');
        return;
    }
    
    tbody.innerHTML = currentOrders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>
                <div class="customer-info">
                    <strong>${order.customerName}</strong><br>
                    ${order.phoneNumber}<br>
                    ${order.email}
                </div>
            </td>
            <td>
                <div class="product-info">
                    <strong>${getProductName(order)}</strong><br>
                    Bahan: ${order.materialName}<br>
                    Ukuran: ${order.size}, Warna: ${order.colorName}<br>
                    Jumlah: ${order.quantity} pcs
                </div>
            </td>
            <td>Rp ${(order.finalTotal || order.totalPrice || 0).toLocaleString()}</td>
            <td>
                <span class="status-badge ${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn-view" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getProductName(order) {
    if (order.productType === 'kaos') return 'Kaos Custom';
    if (order.productType === 'jaket') return 'Jaket Custom';
    if (order.productType === 'lusinan' || order.productType === 'jaket_lusinan') return 'Paket Lusinan';
    return 'Produk Custom';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function viewOrderDetails(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('orderModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="order-details">
                <h4>Informasi Pesanan</h4>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Tanggal:</strong> ${formatDate(order.createdAt)}</p>
                <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
                
                <h4>Informasi Produk</h4>
                <p><strong>Produk:</strong> ${getProductName(order)}</p>
                <p><strong>Bahan:</strong> ${order.materialName}</p>
                <p><strong>Ukuran:</strong> ${order.size}</p>
                <p><strong>Warna:</strong> ${order.colorName}</p>
                <p><strong>Jumlah:</strong> ${order.quantity} pcs</p>
                
                <h4>Informasi Customer</h4>
                <p><strong>Nama:</strong> ${order.customerName}</p>
                <p><strong>Phone:</strong> ${order.phoneNumber}</p>
                <p><strong>Email:</strong> ${order.email}</p>
                <p><strong>Alamat:</strong> ${order.address}</p>
                
                <h4>Pengiriman</h4>
                <p><strong>Metode:</strong> ${order.shippingMethod}</p>
                <p><strong>Biaya Kirim:</strong> Rp ${(order.shippingCost || 0).toLocaleString()}</p>
                
                <h4>Total Pembayaran</h4>
                <p><strong>Subtotal:</strong> Rp ${(order.totalPrice || 0).toLocaleString()}</p>
                <p><strong>Biaya Kirim:</strong> Rp ${(order.shippingCost || 0).toLocaleString()}</p>
                <p><strong>Total:</strong> Rp ${(order.finalTotal || order.totalPrice || 0).toLocaleString()}</p>
                
                ${order.customerNotes ? `<h4>Catatan Customer</h4><p>${order.customerNotes}</p>` : ''}
            </div>
        `;
    }
    
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showToast(message, type = 'info') {
    // Create toast element if container exists
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    } else {
        // Fallback to console log and alert
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message);
    }
}

// Modal functionality
document.addEventListener('click', (e) => {
    const modal = document.getElementById('orderModal');
    if (modal && (e.target === modal || e.target.classList.contains('close') || e.target.classList.contains('btn-cancel'))) {
        modal.style.display = 'none';
    }
});

// Export functions (simplified)
function exportToCSV() {
    if (currentOrders.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    const csvContent = convertToCSV(currentOrders);
    downloadFile(csvContent, 'orders.csv', 'text/csv');
    showToast('Data berhasil diexport ke CSV', 'success');
}

function exportToJSON() {
    if (currentOrders.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    const jsonContent = JSON.stringify(currentOrders, null, 2);
    downloadFile(jsonContent, 'orders.json', 'application/json');
    showToast('Data berhasil diexport ke JSON', 'success');
}

function convertToCSV(orders) {
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Email', 'Product', 'Material', 'Size', 'Color', 'Quantity', 'Total Price', 'Status', 'Created At'];
    const rows = orders.map(order => [
        order.id,
        order.customerName,
        order.phoneNumber,
        order.email,
        getProductName(order),
        order.materialName,
        order.size,
        order.colorName,
        order.quantity,
        order.finalTotal || order.totalPrice || 0,
        order.status || 'Pending',
        formatDate(order.createdAt)
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

// Add export event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const exportCSVBtn = document.getElementById('exportCSV');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    const exportJSONBtn = document.getElementById('exportJSON');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', exportToJSON);
    }
});

console.log('Admin script loaded successfully');