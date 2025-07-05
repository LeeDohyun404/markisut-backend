// File: api/index.js (Versi dengan Halaman Utama)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-vercel-yang-aman-123';

// Ganti placeholder dengan URL frontend Vercel Anda yang sebenarnya
const allowedOrigins = [
    'https://markisut-frontend.vercel.app', 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Izinkan request jika berasal dari daftar di atas, atau jika tidak ada origin (seperti dari Postman/Thunder Client)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Akses ditolak oleh kebijakan CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mengarahkan ke folder 'public' dan 'data' di lingkungan Vercel
const publicPath = path.resolve(process.cwd(), 'public');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Middleware untuk menyajikan file statis dari folder public
app.use(express.static(publicPath));

// Inisialisasi Data
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(ORDERS_FILE);
        } catch {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([]));
        }
        try {
            await fs.access(USERS_FILE);
        } catch {
            const defaultAdmin = {
                username: 'admin',
                password: await bcrypt.hash('admin123', 10),
                role: 'admin'
            };
            await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin]));
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Fungsi Bantuan untuk Baca/Tulis JSON
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        console.error(`Error reading file: ${filePath}`, error);
        return [];
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing file: ${filePath}`, error);
        return false;
    }
}

// Middleware untuk Autentikasi Token
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

// =================================================================
// RUTE-RUTE APLIKASI
// =================================================================

// Rute untuk halaman utama
app.get('/', (req, res) => {
  res.send('<h1>Selamat Datang di Markisut Backend API</h1><p>Server berjalan dengan baik.</p>');
});

// Rute untuk health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rute untuk login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, user: { username: user.username, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rute untuk membuat pesanan
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orders = await readJSON(ORDERS_FILE);
        const orderId = 'MKS' + Date.now().toString().slice(-8);
        const newOrder = { id: orderId, ...orderData, createdAt: new Date().toISOString(), status: 'Pending', updatedAt: new Date().toISOString() };
        orders.push(newOrder);
        await writeJSON(ORDERS_FILE, orders);
        res.status(201).json({ success: true, message: 'Order received successfully', orderId, order: newOrder });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// ... (semua rute lain seperti GET /api/orders, GET /api/dashboard, dll bisa ditambahkan di sini dengan diawali 'authenticateToken') ...

// Handler untuk halaman admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// Jalankan server hanya setelah data diinisialisasi
initializeData();

// Ekspor aplikasi Express untuk Vercel
module.exports = app;