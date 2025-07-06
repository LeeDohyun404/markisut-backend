// File: api/index.js (Versi Final untuk Vercel)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;

// Konfigurasi CORS
const allowedOrigins = [
    'https://markisut-frontend.vercel.app',       // Untuk frontend utama
    'https://markisut-backend.vercel.app'     // <-- TAMBAHKAN INI (ganti jika nama proyek Anda berbeda)
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
app.use(express.urlencoded({ extended: true }));

const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

// Menggunakan folder /tmp yang bisa ditulis di Vercel
const DATA_DIR = path.join('/tmp', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Inisialisasi Data
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try { await fs.access(ORDERS_FILE); } catch { await fs.writeFile(ORDERS_FILE, JSON.stringify([])); }
        try { await fs.access(USERS_FILE); } catch {
            const defaultAdmin = { username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' };
            await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin]));
        }
    } catch (error) { console.error('Error initializing data:', error); }
}

// Fungsi Bantuan
async function readJSON(filePath) {
    try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch (error) { return []; }
}
async function writeJSON(filePath, data) {
    try { await fs.writeFile(filePath, JSON.stringify(data, null, 2)); return true; } catch (error) { return false; }
}

// Middleware Autentikasi
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

app.get('/', (req, res) => {
  res.send('<h1>Selamat Datang di Markisut Backend API</h1><p>Server berjalan dengan baik.</p>');
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GANTI SELURUH BLOK app.post('/api/login', ...) DENGAN INI
app.post('/api/login', async (req, res) => {
    try {
        // Langkah Pengaman: Pastikan file user ada, jika tidak, buat.
        try {
            await fs.access(USERS_FILE);
        } catch {
            console.log("File user tidak ditemukan, membuat ulang...");
            await initializeData(); // Panggil fungsi inisialisasi untuk membuat ulang file
        }

        // Lanjutan proses login seperti biasa
        if (!JWT_SECRET) throw new Error('JWT_SECRET not configured on the server.');

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

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const orders = await readJSON(ORDERS_FILE);
        const orderId = 'MKS' + Date.now().toString().slice(-8);
        const newOrder = { id: orderId, ...orderData, createdAt: new Date().toISOString(), status: 'Pending', updatedAt: new Date().toISOString() };
        orders.push(newOrder);
        await writeJSON(ORDERS_FILE, orders);
        res.status(201).json({ success: true, message: 'Order received successfully', order: newOrder });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// Jalankan inisialisasi data
initializeData();

// Ekspor aplikasi Express untuk Vercel
module.exports = app;