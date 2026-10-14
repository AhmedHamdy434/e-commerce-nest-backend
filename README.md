# E-Commerce NestJS Backend

A modular, scalable, and high-performance e-commerce backend built with [NestJS](https://nestjs.com/), [Prisma ORM](https://www.prisma.io/), and PostgreSQL. It features robust role-based access control (RBAC), end-to-end atomic cart checkout, image storage integration, and strict input validation.

---

## 🚀 Key Features

- **Authentication & RBAC**:
  - Secure customer & admin authentication using JWT (`passport-jwt`).
  - Roles: `USER` (Customer) and `ADMIN`.
  - Rate limiting with `@nestjs/throttler` (5 attempts per minute on auth endpoints).
  - Password hashing with `bcrypt` (10 salt rounds).
  - Profile management, password updates, and OTP-based password recovery.
- **Product & Category Catalog**:
  - Full CRUD operations with slug generation, rich filtering, search, and sorting.
  - Category and product options endpoints for lightweight dropdowns.
  - Multi-image support with main image toggling.
- **Shopping Cart**:
  - Persistent user cart with automatic creation on first access.
  - Stock validation upon adding or updating item quantities.
  - Atomically clears upon successful order checkout.
- **Discount Coupons**:
  - Support for percentage (`percentage`) and fixed amount (`amount`) coupons.
  - Validation rules for date ranges (`startsAt`, `expiresAt`), minimum order amount (`minOrderAmount`), usage limits (`usageLimit`), and cap on percentage discounts (`maxDiscountAmount`).
- **Atomic Order Checkout**:
  - Complete server-side price derivation and stock validation.
  - Stock decrementing, coupon usage incrementing, and cart clearing executed atomically in a single `prisma.$transaction`.
  - Order cancellation with automatic inventory restock and coupon usage decrement.
- **Reviews & Moderation**:
  - Product reviews with 1–5 star rating and comments.
  - Duplicate protection per user and product (`@@unique([userId, productId])`).
  - Admin approval workflow (`isApproved`).

---

## 🛠️ Tech Stack & Verified Versions

| Technology | Version / Specification |
| :--- | :--- |
| **Node.js** | `>= 20.x` (Tested on `v24.18.0`) |
| **NestJS** | `^11.0.1` |
| **Prisma ORM** | `^7.10.0` |
| **Database** | PostgreSQL |
| **Authentication** | `passport-jwt` (`^4.0.1`), `@nestjs/jwt` (`^12.0.2`), `bcrypt` (`^6.0.0`) |
| **Validation** | `class-validator` (`^0.15.1`), `class-transformer` (`^0.5.1`) |
| **Storage** | Local disk storage & Cloudinary support |

---

## 📋 Prerequisites

- **Node.js**: `v20.x` or higher installed
- **PostgreSQL**: PostgreSQL 14+ instance running locally or remotely

---

## ⚙️ Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd e-commerce-nest
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce_nest?schema=public"

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=100d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# File Storage
UPLOAD_DIR=uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
FRONTEND_URL="http://localhost:3000,http://localhost:5173"
```

### 3. Database Migration & Client Generation
Run Prisma migrations to set up the database schema and generate the client:

```bash
# Apply migrations to database
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

---

## 🏃 Running the Application

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build

# Start production server
npm run start:prod
```

Once started, the API is served at:
```
http://localhost:5000/api
```

---

## 🧪 Quality & Testing Commands

```bash
# Type check without emitting files
npx tsc --noEmit

# Lint code and autofix formatting
npm run lint

# Run unit tests
npm run test
```

---

## 📖 API Documentation & Postman

- **Full API Specification**: Detailed documentation for all 62 endpoints is available at [docs/API.md](docs/API.md).
- **Architecture Overview**: Deep dive into module interactions and design patterns at [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Postman Guide & Collection**: Comprehensive setup guide at [docs/POSTMAN.md](docs/POSTMAN.md).
  - Collection file: [postman/E-Commerce-Nest.postman_collection.json](postman/E-Commerce-Nest.postman_collection.json)
  - Environment file: [postman/E-Commerce-Nest.postman_environment.json](postman/E-Commerce-Nest.postman_environment.json)

---

## 🔒 Global Standards & Response Format

All successful responses are intercepted by `TransformInterceptor` and follow the envelope:

```json
{
  "success": true,
  "message": "تمت العملية بنجاح.",
  "data": { ... }
}
```

Paginated responses contain an additional `meta` block:
```json
{
  "success": true,
  "message": "تم جلب البيانات بنجاح.",
  "data": [ ... ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```
