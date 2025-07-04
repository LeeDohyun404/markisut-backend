// server.js - Backend Server untuk Markisut E-Commerce
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'markisut-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data storage (untuk demo, gunakan file JSON)
const DATA_DIR = './data';
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Inisialisasi data
async function initializeData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Buat file orders jika belum ada
        try {
            await fs.access(ORDERS_FILE);
        } catch {
            await fs.writeFile(ORDERS_FILE, JSON.stringify([]));
        }
        
        // Buat file users dengan admin default
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
        
        console.log('Data initialized successfully');
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Helper functions
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading file:', error);
        return [];
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        return false;
    }
}

// Middleware untuk autentikasi
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// 1. Login Admin
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.username === username);
        
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { username: user.username, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Terima pesanan dari frontend
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Generate order ID
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
        await writeJSON(ORDERS_FILE, orders);
        
        res.json({
            success: true,
            message: 'Order received successfully',
            orderId,
            order: newOrder
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// 3. Get semua pesanan (Admin only)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const { status, search, limit = 50, page = 1 } = req.query;
        
        let filteredOrders = orders;
        
        // Filter by status
        if (status && status !== 'all') {
            filteredOrders = filteredOrders.filter(order => 
                order.status.toLowerCase() === status.toLowerCase()
            );
        }
        
        // Search functionality
        if (search) {
            filteredOrders = filteredOrders.filter(order => 
                order.id.toLowerCase().includes(search.toLowerCase()) ||
                order.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                order.email?.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
        
        res.json({
            orders: paginatedOrders,
            total: filteredOrders.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredOrders.length / limit)
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// 4. Get pesanan berdasarkan ID
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const order = orders.find(o => o.id === req.params.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// 5. Update pesanan (Admin only)
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const orderIndex = orders.findIndex(o => o.id === req.params.id);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const updatedOrder = {
            ...orders[orderIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        orders[orderIndex] = updatedOrder;
        await writeJSON(ORDERS_FILE, orders);
        
        res.json({
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// 6. Delete pesanan (Admin only)
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const orderIndex = orders.findIndex(o => o.id === req.params.id);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const deletedOrder = orders.splice(orderIndex, 1)[0];
        await writeJSON(ORDERS_FILE, orders);
        
        res.json({
            message: 'Order deleted successfully',
            order: deletedOrder
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// 7. Dashboard stats (Admin only)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'Pending').length,
            completedOrders: orders.filter(o => o.status === 'Completed').length,
            totalRevenue: orders
                .filter(o => o.status === 'Completed')
                .reduce((sum, order) => sum + (parseFloat(order.totalPrice) || 0), 0),
            recentOrders: orders
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// 8. Export pesanan untuk cetak
app.get('/api/orders/export/:format', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const { format } = req.params;
        
        if (format === 'csv') {
            const csv = convertToCSV(orders);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
            res.send(csv);
        } else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=orders.json');
            res.send(JSON.stringify(orders, null, 2));
        } else {
            res.status(400).json({ error: 'Invalid format. Use csv or json' });
        }
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ error: 'Failed to export orders' });
    }
});

// Helper function untuk convert ke CSV
function convertToCSV(orders) {
    if (!orders.length) return '';
    
    const headers = ['ID', 'Customer Name', 'Email', 'Phone', 'Product', 'Quantity', 'Total Price', 'Status', 'Created At'];
    const csv = [headers.join(',')];
    
    orders.forEach(order => {
        const row = [
            order.id,
            order.customerName || '',
            order.email || '',
            order.phone || '',
            order.productType || '',
            order.quantity || '',
            order.totalPrice || '',
            order.status || '',
            order.createdAt || ''
        ];
        csv.push(row.join(','));
    });
    
    return csv.join('\n');
}

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
    await initializeData();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
        console.log(`🔐 Default admin: username=admin, password=admin123`);
    });
}

startServer().catch(console.error);

module.exports = app;