// Fixed Backend Code for Markisut E-commerce
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// JWT_SECRET with better fallback
const JWT_SECRET = process.env.JWT_SECRET || 'markisut-super-secret-key-2024-fallback';

// CORS Configuration
const allowedOrigins = [
    'https://markisut-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://localhost:3000',
];

const corsOptions = {
    origin: function (origin, callback) {
        console.log("REQUEST ORIGIN: ", origin);
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("CORS BLOCKED: Origin not allowed:", origin);
            callback(new Error('Access denied by CORS policy'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'POST' && req.url !== '/api/login') {
        console.log('Request body:', req.body);
    }
    next();
});

// Static files
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));

// Data storage paths
const DATA_DIR = path.join('/tmp', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory fallback storage (for when file system fails)
let memoryOrders = [];
let memoryUsers = [];

// Enhanced bcrypt alternative using Node.js crypto
const crypto = require('crypto');

function hashPassword(password) {
    try {
        // Try to use bcrypt if available
        const bcrypt = require('bcrypt');
        return bcrypt.hashSync(password, 10);
    } catch (error) {
        console.log('bcrypt not available, using crypto fallback');
        // Fallback to crypto-based hashing
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `crypto:${salt}:${hash}`;
    }
}

function verifyPassword(password, hashedPassword) {
    try {
        // Handle bcrypt hashes
        if (!hashedPassword.startsWith('crypto:')) {
            const bcrypt = require('bcrypt');
            return bcrypt.compareSync(password, hashedPassword);
        }
        
        // Handle crypto hashes
        const [, salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    } catch (error) {
        console.log('Password verification failed, trying plain text');
        return password === hashedPassword;
    }
}

// Enhanced initialization function
async function initializeData() {
    try {
        console.log('Initializing data...');
        
        // Try to create directory
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            console.log('Data directory created/verified');
        } catch (dirError) {
            console.warn('Could not create data directory:', dirError.message);
        }
        
        // Initialize users
        try {
            await initializeUsers();
        } catch (userError) {
            console.error('User initialization failed:', userError.message);
            // Fallback to memory storage
            memoryUsers = [
                { 
                    username: 'admin', 
                    password: 'admin123', 
                    role: 'admin',
                    isPlainText: true
                }
            ];
            console.log('Using in-memory user storage');
        }
        
        // Initialize orders
        try {
            await initializeOrders();
        } catch (orderError) {
            console.error('Order initialization failed:', orderError.message);
            memoryOrders = [];
            console.log('Using in-memory order storage');
        }
        
        console.log('Data initialization completed');
    } catch (error) {
        console.error('Critical initialization error:', error);
        // Ensure we have fallback data
        memoryUsers = [
            { 
                username: 'admin', 
                password: 'admin123', 
                role: 'admin',
                isPlainText: true
            }
        ];
        memoryOrders = [];
        console.log('Using full in-memory storage fallback');
    }
}

async function initializeUsers() {
    try {
        await fs.access(USERS_FILE);
        console.log('Users file exists');
        const users = await readJSON(USERS_FILE);
        memoryUsers = users;
    } catch {
        console.log('Creating users file with default admin...');
        const defaultAdmin = { 
            username: 'admin', 
            password: 'admin123', 
            role: 'admin',
            isPlainText: true
        };
        
        try {
            // Try to create hashed password
            const hashedPassword = hashPassword('admin123');
            defaultAdmin.password = hashedPassword;
            defaultAdmin.isPlainText = false;
        } catch (hashError) {
            console.log('Using plain text password:', hashError.message);
        }
        
        memoryUsers = [defaultAdmin];
        
        try {
            await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2));
            console.log('Users file created successfully');
        } catch (writeError) {
            console.log('Could not write users file, using memory only');
        }
    }
}

async function initializeOrders() {
    try {
        await fs.access(ORDERS_FILE);
        console.log('Orders file exists');
        const orders = await readJSON(ORDERS_FILE);
        memoryOrders = orders;
    } catch {
        console.log('Creating empty orders file...');
        memoryOrders = [];
        
        try {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
            console.log('Orders file created successfully');
        } catch (writeError) {
            console.log('Could not write orders file, using memory only');
        }
    }
}

async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

// Enhanced authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
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
        jwt_configured: !!JWT_SECRET,
        users_count: memoryUsers.length,
        orders_count: memoryOrders.length
    });
});

// Enhanced login endpoint
app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt received');
        
        if (!JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('Missing credentials');
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        console.log('Attempting login for:', username);
        
        // Ensure we have users loaded
        if (memoryUsers.length === 0) {
            console.log('No users in memory, reinitializing...');
            await initializeUsers();
        }
        
        console.log('Available users:', memoryUsers.map(u => u.username));
        
        const user = memoryUsers.find(u => u.username === username);
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Enhanced password verification
        let passwordMatch = false;
        
        if (user.isPlainText) {
            passwordMatch = (password === user.password);
            console.log('Plain text password check:', passwordMatch);
        } else {
            try {
                passwordMatch = verifyPassword(password, user.password);
                console.log('Hashed password check:', passwordMatch);
            } catch (verifyError) {
                console.log('Password verification error:', verifyError.message);
                // Final fallback to plain text
                passwordMatch = (password === user.password);
            }
        }
        
        if (!passwordMatch) {
            console.log('Password mismatch for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                username: user.username, 
                role: user.role,
                iat: Math.floor(Date.now() / 1000)
            }, 
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
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Enhanced orders endpoint
app.post('/api/orders', async (req, res) => {
    try {
        console.log('Received order data');
        
        const orderData = req.body;
        if (!orderData || Object.keys(orderData).length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Order data is required' 
            });
        }

        const orderId = 'MKS' + Date.now().toString().slice(-8);
        const newOrder = { 
            id: orderId, 
            ...orderData, 
            createdAt: new Date().toISOString(), 
            status: 'Pending', 
            updatedAt: new Date().toISOString() 
        };
        
        // Add to memory storage
        memoryOrders.push(newOrder);
        
        // Try to save to file (but don't fail if it doesn't work)
        try {
            await writeJSON(ORDERS_FILE, memoryOrders);
            console.log('Order saved to file');
        } catch (fileError) {
            console.log('Could not save to file, using memory only');
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

// Get orders endpoint
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching orders for user:', req.user.username);
        
        res.json({
            success: true,
            orders: memoryOrders,
            total: memoryOrders.length
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders: ' + error.message
        });
    }
});

// Update order status endpoint
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        console.log('Updating order status:', orderId, 'to', status);
        
        const orderIndex = memoryOrders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        memoryOrders[orderIndex].status = status;
        memoryOrders[orderIndex].updatedAt = new Date().toISOString();
        
        // Try to save to file
        try {
            await writeJSON(ORDERS_FILE, memoryOrders);
        } catch (fileError) {
            console.log('Could not save to file, using memory only');
        }
        
        console.log('Order updated successfully:', orderId);
        res.json({
            success: true,
            message: 'Order updated successfully',
            order: memoryOrders[orderIndex]
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order: ' + error.message
        });
    }
});

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'Admin-Panel.html'));
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Endpoint not found:', req.method, req.url);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize data when server starts
initializeData().then(() => {
    console.log('Server initialization completed successfully');
}).catch(error => {
    console.error('Server initialization failed:', error);
});

const PORT = process.env.PORT || 3000;

// Only start server if not in production (Vercel handles this)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;