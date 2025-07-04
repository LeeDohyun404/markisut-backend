# Markisut E-Commerce Backend

Backend server untuk sistem e-commerce Markisut yang menyediakan API untuk mengelola pesanan dan admin panel untuk monitoring.

## ✨ Features

- 🔐 **Authentication System**: Login admin dengan JWT
- 📊 **Dashboard Analytics**: Statistik pesanan dan revenue
- 🛍️ **Order Management**: CRUD operations untuk pesanan
- 📈 **Real-time Stats**: Total orders, pending, completed, dan revenue
- 📤 **Export Data**: Export pesanan ke CSV/JSON
- 🔍 **Search & Filter**: Pencarian dan filter pesanan
- 📱 **Responsive Design**: Admin panel yang mobile-friendly

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 atau lebih baru)
- npm atau yarn

### Installation

1. Clone repository
```bash
git clone <your-repo-url>
cd markisut-backend
```

2. Install dependencies
```bash
npm install
```

3. Copy environment variables
```bash
cp .env.example .env
```

4. Edit `.env` file dengan konfigurasi Anda
```env
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

5. Start server
```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Project Structure

```
markisut-backend/
├── package.json
├── package-lock.json
├── server.js                  # Main server file
├── data/
│   ├── orders.json            # Orders database
│   └── users.json             # Users database
├── public/
│   ├── Admin-Panel.html       # Admin panel UI
│   ├── admin-styles.css       # Admin panel styles
│   ├── admin-script.js        # Admin panel JavaScript
│   └── favicon.ico            # Favicon
├── .env                       # Environment variables
├── .gitignore
├── README.md
└── railway.json               # Railway deployment config
```

## 🔧 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Admin login |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create new order |
| GET | `/api/orders` | Get all orders (admin only) |
| GET | `/api/orders/:id` | Get specific order |
| PUT | `/api/orders/:id` | Update order |
| DELETE | `/api/orders/:id` | Delete order |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard statistics |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/export/csv` | Export orders to CSV |
| GET | `/api/orders/export/json` | Export orders to JSON |

## 🔐 Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Warning**: Ubah password default setelah deployment!

## 🌐 Admin Panel

Akses admin panel di: `http://localhost:3000/admin`

### Features:
- 📊 **Dashboard**: Overview statistik pesanan
- 🛍️ **Order Management**: Kelola semua pesanan
- 📤 **Export Data**: Download data pesanan
- 🔍 **Search & Filter**: Cari pesanan dengan mudah
- 📱 **Mobile Responsive**: Dapat diakses dari perangkat mobile

## 📊 Data Structure

### Order Object
```json
{
  "id": "MKS12345678",
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "address": "Jl. Contoh No. 123",
  "productType": "Kemeja",
  "quantity": 2,
  "totalPrice": 150000,
  "status": "Pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Order Status
- `Pending`: Pesanan baru masuk
- `Processing`: Pesanan sedang diproses
- `Completed`: Pesanan selesai
- `Cancelled`: Pesanan dibatalkan

## 🚀 Deployment

### Railway

1. Connect repository ke Railway
2. Set environment variables:
   ```
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```
3. Deploy otomatis akan berjalan

### Manual Deployment

1. Build aplikasi
```bash
npm run build
```

2. Start production server
```bash
npm start
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT secret key | `markisut-secret-key-2024` |
| `NODE_ENV` | Environment mode | `development` |

## 📝 Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Build for production
npm run build
```

## 🛡️ Security

- JWT authentication untuk admin
- Password hashing dengan bcrypt
- CORS protection
- Input validation
- Rate limiting (recommended untuk production)

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. Check [Issues](https://github.com/your-username/markisut-backend/issues)
2. Create new issue jika belum ada
3. Atau hubungi developer

## 📈 Roadmap

- [ ] Real-time notifications
- [ ] Email notifications
- [ ] Payment integration
- [ ] Inventory management
- [ ] Customer management
- [ ] Reports & analytics
- [ ] API documentation dengan Swagger

## 🙏 Acknowledgments

- Express.js untuk web framework
- JWT untuk authentication
- bcrypt untuk password hashing
- Font Awesome untuk icons
- Railway untuk hosting

---

Made with ❤️ for Markisut E-Commerce