// File: api/index.js (Versi Final dengan CORS Lengkap)

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

// --- KONFIGURASI CORS YANG DIPERBAIKI ---
const allowedOrigins = [
    'https://markisut-frontend.vercel.app',  // Untuk form pemesanan
    'https://markisut-backend.vercel.app'    // GANTI DENGAN URL BACKEND ANDA
];

const corsOptions = {
  origin: function (origin, callback) {
    // Izinkan jika origin ada di daftar, atau jika tidak ada origin (untuk Postman, dll)
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
async function readDB(key) { /* ... (fungsi ini tetap sama) ... */ }
async function writeDB(key, data) { /* ... (fungsi ini tetap sama) ... */ }
async function initializeAdminUser() { /* ... (fungsi ini tetap sama) ... */ }
function authenticateToken(req, res, next) { /* ... (fungsi ini tetap sama) ... */ }

// ====== RUTE-RUTE APLIKASI ======

app.get('/', (req, res) => res.send('<h1>Markisut Backend API</h1><p>Server berjalan.</p>'));

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
        res.json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ... (semua rute lain yang sudah kita perbaiki) ...

// Rute lain yang sudah kita tambahkan
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
app.post('/api/orders', async (req, res) => { /* ... kode tetap sama ... */ });
app.get('/api/dashboard', authenticateToken, async (req, res) => { /* ... kode tetap sama ... */ });
app.get('/api/orders', authenticateToken, async (req, res) => { /* ... kode tetap sama ... */ });
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'Admin-Panel.html')));

module.exports = app;