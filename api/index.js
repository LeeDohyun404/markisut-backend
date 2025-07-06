// File: api/index.js (Versi Final dengan Database Online)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fetch = require('node-fetch'); // Perlu untuk komunikasi dengan database

// Inisialisasi aplikasi Express
const app = express();

// Konfigurasi dari Environment Variables Vercel
const JWT_SECRET = process.env.JWT_SECRET;
const JSONBASE_IO_KEY = process.env.JSONBASE_IO_KEY; // Kunci rahasia database kita
const DB_URL = `https://jsonbase.com/${JSONBASE_IO_KEY}`;

// Konfigurasi CORS
const allowedOrigins = [
    'https://markisut-frontend.vercel.app'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Akses ditolak oleh kebijakan CORS'));
    }
  }
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

// Fungsi Bantuan untuk Baca/Tulis ke Database JSON
async function readDB(key) {
    try {
        const response = await fetch(`${DB_URL}/${key}`);
        if (response.status === 404) return []; // Jika belum ada data, kembalikan array kosong
        return response.json();
    } catch (error) {
        console.error(`Error reading from DB for key: ${key}`, error);
        return [];
    }
}

async function writeDB(key, data) {
    try {
        await fetch(`${DB_URL}/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) {
        console.error(`Error writing to DB for key: ${key}`, error);
        return false;
    }
}

// Inisialisasi User Admin Jika Belum Ada
async function initializeAdminUser() {
    const users = await readDB('users');
    if (users.length === 0) {
        console.log("No admin user found, creating default admin...");
        const defaultAdmin = { username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' };
        await writeDB('users', [defaultAdmin]);
    }
}

// Middleware Autentikasi
function authenticateToken(req, res, next) {
    // ... (kode ini tetap sama)
}

// ====== RUTE-RUTE APLIKASI ======

app.get('/', (req, res) => {
  res.send('<h1>Selamat Datang di Markisut Backend API v2</h1><p>Server berjalan dengan baik.</p>');
});

app.post('/api/login', async (req, res) => {
    try {
        await initializeAdminUser(); // Pastikan admin user ada
        const { username, password } = req.body;
        const users = await readDB('users');
        const user = users.find(u => u.username === username);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, user: { username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        let orders = await readDB('orders');
        const orderId = 'MKS' + Date.now().toString().slice(-8);
        const newOrder = { id: orderId, ...orderData, createdAt: new Date().toISOString(), status: 'Pending', updatedAt: new Date().toISOString() };
        orders.push(newOrder);
        await writeDB('orders', orders);
        res.status(201).json({ success: true, message: 'Order received successfully', order: newOrder });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});
// Rute untuk mendapatkan statistik dashboard
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const orders = await readDB('orders');
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o && o.status === 'Pending').length,
            completedOrders: orders.filter(o => o && o.status === 'Completed').length,
            totalRevenue: orders
                .filter(o => o && o.status === 'Completed' && o.finalTotal)
                .reduce((sum, order) => sum + (parseFloat(order.finalTotal) || 0), 0),
            recentOrders: orders
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 5)
        };
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});
// Rute untuk mendapatkan semua pesanan
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readDB('orders');
        // Untuk saat ini kita kembalikan semua, tanpa filter & pagination
        const sortedOrders = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json({
            orders: sortedOrders,
            total: sortedOrders.length
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// Ekspor aplikasi Express untuk Vercel
module.exports = app;