# Smart Office Appointment System

A full-stack appointment management system built with **Next.js** and **NestJS**.

## 🚀 Live Demo

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

## ✨ Features

### For Users
- 🔐 Easy registration and login
- 📅 Book appointments in 3 simple steps
- 👥 Choose from expert staff members
- ⏰ Real-time availability checking
- 📱 View all appointments with status
- 📝 Add notes and special requests
- 🔔 Get notifications on approval/rejection

### For Staff
- 👀 View assigned appointments only
- ✅ Approve with optional comments
- ❌ Reject with required reasons
- 📊 Track pending/approved appointments
- 🔔 Receive notifications for new bookings
- 📈 View performance statistics

### For Admin
- 👥 Manage all users and staff
- ➕ Add or remove staff members
- 📋 View all appointments system-wide
- 📎 Export reports to Excel
- 📊 Analytics dashboard with charts
- 🔧 Full system control

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 | React framework |
| | Tailwind CSS | Styling |
| | Recharts | Data visualization |
| | Lucide Icons | Modern icons |
| **Backend** | NestJS | Node.js framework |
| | TypeORM | Database ORM |
| | JWT | Authentication |
| | Passport | Authorization |
| **Database** | PostgreSQL | Relational database |
| **Tools** | Git/GitHub | Version control |

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)

### Backend Setup

```bash
cd APPOINTMENT-BACKEND
npm install
cp .env.example .env
# Update .env with your database credentials
npm run seed
npm run start:dev
