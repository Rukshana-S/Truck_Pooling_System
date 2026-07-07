# 🚚 Nool-Vazhi — Smart Truck Pooling Platform

A full-stack MERN logistics web application for intelligent truck pooling across India.

## 🗂️ Project Structure

```
nool-vazhi/
├── backend/                  # Express + MongoDB API
│   ├── controllers/          # Business logic
│   ├── middleware/           # JWT auth middleware
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API routes
│   ├── server.js             # Entry point
│   └── .env                  # Environment variables
└── frontend/                 # React SPA
    └── src/
        ├── api/              # Axios API layer
        ├── components/       # Navbar, Sidebar, Footer
        ├── context/          # Auth context
        └── pages/            # All page components
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup
```bash
cd backend
npm install
# Edit .env with your MONGO_URI
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 3. Open App
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Get profile (auth) |
| GET | /api/shipments | Get my shipments (auth) |
| POST | /api/shipments | Create shipment (auth) |
| GET | /api/shipments/stats | Dashboard stats (auth) |
| PUT | /api/shipments/:id | Update status (auth) |
| GET | /api/tracking/:trackingId | Track shipment (public) |
| GET | /api/pricing/estimate | Get price estimate (public) |

## 🎨 Pages

| Page | Route | Auth Required |
|------|-------|---------------|
| Landing | / | No |
| Register | /register | No |
| Login | /login | No |
| Pricing | /pricing | No |
| Tracking | /tracking | No |
| Trust & Safety | /trust | No |
| Dashboard | /dashboard | Yes |
| Shipments | /shipments | Yes |

## 🌐 MongoDB Atlas (Production)
Replace `MONGO_URI` in `.env` with your Atlas connection string:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/nool-vazhi
```
