// Perbaikan konfigurasi CORS dan Error Handling di index.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// PERBAIKAN: JWT_SECRET dengan fallback yang lebih aman
const JWT_SECRET = process.env.JWT_SECRET || 'markisut-super-secret-key-2024-fallback';

// PERBAIKAN: Konfigurasi CORS yang lebih fleksibel
const allowedOrigins = [
    'https://markisut-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://localhost:3000',
    // Tambahkan domain frontend Anda di sini
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tambahkan middleware untuk logging requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', req.body);
    }
    next();
});

const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

const DATA_DIR = path.join('/tmp', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// PERBAIKAN: Fungsi inisialisasi dengan error handling yang lebih baik
async function initializeData() {
    try {
        console.log('Initializing data directory...');
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Initialize orders file
        try {
            await fs.access(ORDERS_FILE);
            console.log('Orders file exists');
        } catch {
            console.log('Creating orders file...');
            await fs.writeFile(ORDERS_FILE, JSON.stringify([]));
        }
        
        // Initialize users file
        try {
            await fs.access(USERS_FILE);
            console.log('Users file exists');
        } catch {
            console.log('Creating users file with default admin...');
            try {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                const defaultAdmin = { 
                    username: 'admin', 
                    password: hashedPassword, 
                    role: 'admin' 
                };
                await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin]));
                console.log('Default admin created successfully');
            } catch (bcryptError) {
                console.error('Error creating default admin:', bcryptError);
                // Fallback: create admin with plain password (untuk testing)
                const defaultAdmin = { 
                    username: 'admin', 
                    password: 'admin123', 
                    role: 'admin',
                    isPlainText: true // flag untuk mendeteksi password plain text
                };
                await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin]));
                console.log('Default admin created with plain text password');
            }
        }
        
        console.log('Data initialization completed');
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Selamat Datang di Markisut Backend API',
        status: 'Server berjalan dengan baik',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        jwt_configured: !!JWT_SECRET
    });
});

// PERBAIKAN: Endpoint login dengan error handling yang lebih baik
app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt received');
        
        // Validasi JWT_SECRET
        if (!JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const { username, password } = req.body;
        console.log('Login attempt for username:', username);
        
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Baca file users
        const users = await readJSON(USERS_FILE);
        console.log('Users loaded:', users.length);
        
        if (users.length === 0) {
            console.log('No users found, reinitializing...');
            await initializeData();
            const newUsers = await readJSON(USERS_FILE);
            console.log('Users after reinit:', newUsers.length);
        }
        
        const user = users.find(u => u.username === username);
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verifikasi password
        let passwordMatch = false;
        try {
            if (user.isPlainText) {
                // Untuk testing dengan plain text password
                passwordMatch = (password === user.password);
                console.log('Using plain text password comparison');
            } else {
                // Gunakan bcrypt untuk password yang sudah di-hash
                passwordMatch = await bcrypt.compare(password, user.password);
                console.log('Using bcrypt password comparison');
            }
        } catch (bcryptError) {
            console.error('Bcrypt error:', bcryptError);
            // Fallback ke plain text comparison
            passwordMatch = (password === user.password);
            console.log('Fallback to plain text comparison');
        }
        
        if (!passwordMatch) {
            console.log('Password mismatch for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { username: user.username, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        console.log('Login successful for user:', username);
        res.json({ 
            message: 'Login successful', 
            token, 
            user: { 
                username: user.username, 
                role: user.role 
            } 
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
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

// PERBAIKAN: Endpoint untuk mendapatkan orders dengan autentikasi
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching orders for user:', req.user.username);
        
        const orders = await readJSON(ORDERS_FILE);
        console.log('Orders found:', orders.length);
        
        res.json({
            success: true,
            orders: orders,
            total: orders.length
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders: ' + error.message
        });
    }
});

// PERBAIKAN: Endpoint untuk update status order
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        console.log('Updating order status:', orderId, 'to', status);
        
        const orders = await readJSON(ORDERS_FILE);
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        const writeSuccess = await writeJSON(ORDERS_FILE, orders);
        
        if (!writeSuccess) {
            throw new Error('Failed to update order');
        }
        
        console.log('Order updated successfully:', orderId);
        res.json({
            success: true,
            message: 'Order updated successfully',
            order: orders[orderIndex]
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order: ' + error.message
        });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// PERBAIKAN: Error handling middleware yang lebih informatif
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Endpoint not found:', req.method, req.url);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize data when server starts
initializeData().then(() => {
    console.log('Server initialization completed');
}).catch(error => {
    console.error('Server initialization failed:', error);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;