// File: api/index.js (Versi Final dengan Database Online & Semua Rute)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fetch = require('node-fetch');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
const JSONBASE_IO_KEY = process.env.JSONBASE_IO_KEY;
const DB_URL = `https://jsonbase.com/${JSONBASE_IO_KEY}`;

const allowedOrigins = [
    'https://markisut-frontend.vercel.app',
    'https://markisut-backend.vercel.app' // Ganti jika URL backend Vercel Anda berbeda
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

app.use(cors(corsOptions));
app.use(express.json());
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

// Fungsi Bantuan DB
async function readDB(key) {
    try {
        const response = await fetch(`${DB_URL}/${key}`);
        if (response.status === 404) return [];
        return response.json();
    } catch (error) { return []; }
}
async function writeDB(key, data) {
    try {
        await fetch(`${DB_URL}/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) { return false; }
}
async function initializeAdminUser() {
    const users = await readDB('users');
    if (users.length === 0) {
        const defaultAdmin = { username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' };
        await writeDB('users', [defaultAdmin]);
    }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// ====== RUTE-RUTE APLIKASI ======
app.get('/', (req, res) => res.send('<h1>Markisut Backend API</h1><p>Server berjalan.</p>'));
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.post('/api/login', async (req, res) => {
    try {
        await initializeAdminUser();
        if (!JWT_SECRET) throw new Error('JWT_SECRET not configured.');
        const { username, password } = req.body;
        const users = await readDB('users');
        const user = users.find(u => u.username === username);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, user: { username: user.username, role: user.role } });
    } catch (error) {
        console.error("Login Error:", error);
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
        res.status(201).json({ success: true, message: 'Order received', order: newOrder });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

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
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readDB('orders');
        const sortedOrders = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        res.json({ orders: sortedOrders });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

module.exports = app;