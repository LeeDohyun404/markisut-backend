// Perbaikan konfigurasi CORS di index.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// PERBAIKAN: Konfigurasi CORS yang lebih fleksibel
const allowedOrigins = [
    'https://markisut-frontend.vercel.app',
    'https://markisut-frontend.vercel.app', // Ganti dengan domain frontend Anda yang sebenarnya
    'http://localhost:3000', // Untuk development
    'http://localhost:5000', // Untuk development
    'https://localhost:3000', // Untuk development dengan HTTPS
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("REQUEST ORIGIN: ", origin);
    
    // Izinkan request tanpa origin (misalnya dari mobile app atau Postman)
    if (!origin) return callback(null, true);
    
    // Izinkan jika origin ada dalam daftar yang diizinkan
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS BLOCKED: Origin not allowed:", origin);
      callback(new Error('Akses ditolak oleh kebijakan CORS'));
    }
  },
  credentials: true, // Jika Anda menggunakan cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// ALTERNATIF: Jika masih bermasalah, gunakan CORS yang lebih permisif (hanya untuk testing)
// const corsOptions = {
//   origin: true, // Mengizinkan semua origin
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
// };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tambahkan middleware untuk logging requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Sisa kode tetap sama...
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

const DATA_DIR = path.join('/tmp', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Fungsi inisialisasi dan helper functions tetap sama
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

async function readJSON(filePath) {
    try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch (error) { return []; }
}
async function writeJSON(filePath, data) {
    try { await fs.writeFile(filePath, JSON.stringify(data, null, 2)); return true; } catch (error) { return false; }
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

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Selamat Datang di Markisut Backend API',
        status: 'Server berjalan dengan baik',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
    try {
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

// PERBAIKAN: Endpoint orders dengan logging yang lebih baik
app.post('/api/orders', async (req, res) => {
    try {
        console.log('Received order data:', req.body);
        
        const orderData = req.body;
        if (!orderData || Object.keys(orderData).length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Order data is required' 
            });
        }

        const orders = await readJSON(ORDERS_FILE);
        const orderId = 'MKS' + Date.now().toString().slice(-8);
        const newOrder = { 
            id: orderId, 
            ...orderData, 
            createdAt: new Date().toISOString(), 
            status: 'Pending', 
            updatedAt: new Date().toISOString() 
        };
        
        orders.push(newOrder);
        const writeSuccess = await writeJSON(ORDERS_FILE, orders);
        
        if (!writeSuccess) {
            throw new Error('Failed to save order to file');
        }

        console.log('Order created successfully:', orderId);
        res.status(201).json({ 
            success: true, 
            message: 'Order received successfully', 
            order: newOrder 
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create order: ' + error.message 
        });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

initializeData();

module.exports = app;