# Complete API Specification

This document provides a comprehensive specification of all 62 endpoints implemented in the E-Commerce NestJS backend.

---

## 1. Global Conventions

- **Base URL**: `http://localhost:5000/api`
- **Global Route Prefix**: `/api`
- **Authentication**: JWT Bearer token sent in the `Authorization` header:
  ```
  Authorization: Bearer <token>
  ```
- **Standard Response Envelope**:
  ```json
  {
    "success": true,
    "message": "تمت العملية بنجاح.",
    "data": { ... }
  }
  ```
- **Paginated Response Envelope**:
  ```json
  {
    "success": true,
    "message": "تم جلب البيانات بنجاح.",
    "data": [ ... ],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
  ```

---

## 2. Table of Contents

- [1. Authentication (User)](#1-authentication-user) (6 endpoints)
- [2. Authentication (Admin)](#2-authentication-admin) (5 endpoints)
- [3. Categories](#3-categories) (9 endpoints)
- [4. Products](#4-products) (9 endpoints)
- [5. Product Images](#5-product-images) (5 endpoints)
- [6. Cart & Cart Items](#6-cart--cart-items) (5 endpoints)
- [7. Coupons](#7-coupons) (8 endpoints)
- [8. Orders](#8-orders) (7 endpoints)
- [9. Reviews](#9-reviews) (8 endpoints)

---

## 1. Authentication (User)

### 1.1 Customer Registration
- **Method & Path**: `POST /api/auth/signup`
- **Access**: Public (Rate-limited: 5 req/min)
- **Request Body**:
  ```json
  {
    "name": "Customer Name",
    "email": "customer@example.com",
    "password": "Password123",
    "image": "https://example.com/avatar.jpg"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "تم إنشاء الحساب بنجاح.",
    "data": {
      "user": {
        "id": "cuid...",
        "email": "customer@example.com",
        "name": "Customer Name",
        "image": "https://example.com/avatar.jpg",
        "role": "USER",
        "createdAt": "2026-10-14T00:00:00.000Z",
        "updatedAt": "2026-10-14T00:00:00.000Z"
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    }
  }
  ```
- **Error Responses**: `400 Bad Request` (validation error), `409 Conflict` (email already exists).

### 1.2 Customer Login
- **Method & Path**: `POST /api/auth/login`
- **Access**: Public (Rate-limited: 5 req/min)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123"
  }
  ```
- **Success Response** (`200 OK`): Same structure as signup.

### 1.3 Get Customer Profile
- **Method & Path**: `GET /api/auth/me`
- **Access**: Authenticated (`USER` role)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "تم استرجاع بيانات الملف الشخصي بنجاح.",
    "data": {
      "id": "cuid...",
      "email": "customer@example.com",
      "name": "Customer Name",
      "image": "https://example.com/avatar.jpg",
      "role": "USER",
      "createdAt": "2026-10-14T00:00:00.000Z"
    }
  }
  ```

### 1.4 Change Customer Password
- **Method & Path**: `PATCH /api/auth/change-password`
- **Access**: Authenticated (`USER` role)
- **Request Body**:
  ```json
  {
    "currentPassword": "Password123",
    "newPassword": "NewPassword123"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "تم تغيير كلمة المرور بنجاح.",
    "data": null
  }
  ```

### 1.5 Forgot Password (Request OTP)
- **Method & Path**: `POST /api/auth/forgot-password`
- **Access**: Public (Rate-limited: 3 req/min)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "تم معالجة طلب استعادة كلمة المرور.",
    "data": null
  }
  ```

### 1.6 Reset Password (with OTP)
- **Method & Path**: `POST /api/auth/reset-password`
- **Access**: Public (Rate-limited: 5 req/min)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "otp": "123456",
    "newPassword": "Password123"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "تم إعادة تعيين كلمة المرور بنجاح.",
    "data": null
  }
  ```

---

## 2. Authentication (Admin)

### 2.1 Admin Login
- **Method & Path**: `POST /api/admin/auth/login`
- **Access**: Public (Rate-limited: 5 req/min)
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "AdminPassword123"
  }
  ```
- **Success Response** (`200 OK`): Returns `accessToken` with `role: "ADMIN"`.

### 2.2 Admin Profile
- **Method & Path**: `GET /api/admin/auth/me`
- **Access**: Authenticated (`ADMIN` role)
- **Success Response** (`200 OK`): Admin profile details.

### 2.3 Admin Change Password
- **Method & Path**: `PATCH /api/admin/auth/change-password`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**: `currentPassword`, `newPassword` (min 6 chars).

### 2.4 Admin Forgot Password
- **Method & Path**: `POST /api/admin/auth/forgot-password`
- **Access**: Public

### 2.5 Admin Reset Password
- **Method & Path**: `POST /api/admin/auth/reset-password`
- **Access**: Public

---

## 3. Categories

### 3.1 Public - List Categories
- **Method & Path**: `GET /api/categories`
- **Access**: Public
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `search` (string, optional)
  - `sortBy` (`name` | `createdAt`)
  - `sortOrder` (`asc` | `desc`)
- **Success Response** (`200 OK`): Paginated category list with `_count.products`.

### 3.2 Public - Category Options
- **Method & Path**: `GET /api/categories/options`
- **Access**: Public
- **Success Response** (`200 OK`): Array of `{ id, name }`.

### 3.3 Public - Get Category by ID
- **Method & Path**: `GET /api/categories/:id`
- **Access**: Public

### 3.4 Public - Get Category by Slug
- **Method & Path**: `GET /api/categories/slug/:slug`
- **Access**: Public

### 3.5 Admin - List Categories
- **Method & Path**: `GET /api/admin/categories`
- **Access**: Authenticated (`ADMIN` role)

### 3.6 Admin - Get Category by ID
- **Method & Path**: `GET /api/admin/categories/:id`
- **Access**: Authenticated (`ADMIN` role)

### 3.7 Admin - Create Category
- **Method & Path**: `POST /api/admin/categories`
- **Access**: Authenticated (`ADMIN` role)
- **Body**: Multipart form-data or JSON (`name`, optional `slug`, optional `image`).
- **Success Response** (`201 Created`).

### 3.8 Admin - Update Category
- **Method & Path**: `PATCH /api/admin/categories/:id`
- **Access**: Authenticated (`ADMIN` role)
- **Body**: Partial category fields.

### 3.9 Admin - Delete Category
- **Method & Path**: `DELETE /api/admin/categories/:id`
- **Access**: Authenticated (`ADMIN` role)
- **Success Response** (`200 OK`).

---

## 4. Products

### 4.1 Public - List Products
- **Method & Path**: `GET /api/products`
- **Access**: Public
- **Query Parameters**: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `priceFrom`, `priceTo`, `quantityFrom`, `quantityTo`, `categoryId`.

### 4.2 Public - Product Options
- **Method & Path**: `GET /api/products/options`
- **Access**: Public

### 4.3 Public - Get Product by ID
- **Method & Path**: `GET /api/products/:id`
- **Access**: Public

### 4.4 Public - Get Product by Slug
- **Method & Path**: `GET /api/products/slug/:slug`
- **Access**: Public

### 4.5 Admin - List Products
- **Method & Path**: `GET /api/admin/products`
- **Access**: Authenticated (`ADMIN` role)

### 4.6 Admin - Get Product by ID
- **Method & Path**: `GET /api/admin/products/:id`
- **Access**: Authenticated (`ADMIN` role)

### 4.7 Admin - Create Product
- **Method & Path**: `POST /api/admin/products`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**:
  ```json
  {
    "name": "Product Name",
    "slug": "product-slug",
    "categoryId": "cuid...",
    "price": 499.99,
    "quantity": 100,
    "image": "https://example.com/cover.jpg",
    "images": ["https://example.com/gallery1.jpg"]
  }
  ```
- **Success Response** (`201 Created`).

### 4.8 Admin - Update Product
- **Method & Path**: `PATCH /api/admin/products/:id`
- **Access**: Authenticated (`ADMIN` role)

### 4.9 Admin - Delete Product
- **Method & Path**: `DELETE /api/admin/products/:id`
- **Access**: Authenticated (`ADMIN` role)

---

## 5. Product Images

### 5.1 Public - Get Images for Product
- **Method & Path**: `GET /api/products/:productId/images`
- **Access**: Public

### 5.2 Admin - Get Images for Product
- **Method & Path**: `GET /api/admin/products/:productId/images`
- **Access**: Authenticated (`ADMIN` role)

### 5.3 Admin - Add / Upload Product Images
- **Method & Path**: `POST /api/admin/products/:productId/images`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**:
  ```json
  {
    "images": ["https://example.com/new-pic.jpg"],
    "isMain": false
  }
  ```
- **Success Response** (`201 Created`).

### 5.4 Admin - Set Main Image
- **Method & Path**: `PATCH /api/admin/products/:productId/images/:imageId/main`
- **Access**: Authenticated (`ADMIN` role)

### 5.5 Admin - Delete Product Image
- **Method & Path**: `DELETE /api/admin/products/:productId/images/:imageId`
- **Access**: Authenticated (`ADMIN` role)

---

## 6. Cart & Cart Items

### 6.1 Get Cart
- **Method & Path**: `GET /api/cart`
- **Access**: Authenticated (`USER` role)
- **Success Response** (`200 OK`): Full cart object including items and product details.

### 6.2 Add Item to Cart
- **Method & Path**: `POST /api/cart/items`
- **Access**: Authenticated (`USER` role)
- **Request Body**:
  ```json
  {
    "productId": "cuid...",
    "quantity": 2
  }
  ```
- **Success Response** (`201 Created`).

### 6.3 Update Cart Item Quantity
- **Method & Path**: `PATCH /api/cart/items/:id`
- **Access**: Authenticated (`USER` role)
- **Request Body**: `{ "quantity": 3 }`

### 6.4 Delete Cart Item
- **Method & Path**: `DELETE /api/cart/items/:id`
- **Access**: Authenticated (`USER` role)

### 6.5 Clear User Cart
- **Method & Path**: `DELETE /api/cart`
- **Access**: Authenticated (`USER` role)

---

## 7. Coupons

### 7.1 Public - Get Coupon by Code
- **Method & Path**: `GET /api/coupons/code/:code`
- **Access**: Public

### 7.2 Public - Validate Coupon
- **Method & Path**: `POST /api/coupons/validate`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "code": "PROMO20",
    "orderAmount": 500
  }
  ```
- **Success Response** (`200 OK`): Calculated discount amount and final order total.

### 7.3 Admin - List Coupons
- **Method & Path**: `GET /api/admin/coupons`
- **Access**: Authenticated (`ADMIN` role)

### 7.4 Admin - Coupon Options
- **Method & Path**: `GET /api/admin/coupons/options`
- **Access**: Authenticated (`ADMIN` role)

### 7.5 Admin - Get Coupon by ID
- **Method & Path**: `GET /api/admin/coupons/:id`
- **Access**: Authenticated (`ADMIN` role)

### 7.6 Admin - Create Coupon
- **Method & Path**: `POST /api/admin/coupons`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**:
  ```json
  {
    "code": "PROMO20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderAmount": 200,
    "maxDiscountAmount": 100,
    "usageLimit": 50
  }
  ```
- **Success Response** (`201 Created`).

### 7.7 Admin - Update Coupon
- **Method & Path**: `PATCH /api/admin/coupons/:id`
- **Access**: Authenticated (`ADMIN` role)

### 7.8 Admin - Delete Coupon
- **Method & Path**: `DELETE /api/admin/coupons/:id`
- **Access**: Authenticated (`ADMIN` role)

---

## 8. Orders

### 8.1 Customer - Create Order (Checkout)
- **Method & Path**: `POST /api/orders`
- **Access**: Authenticated (`USER` role)
- **Request Body**:
  ```json
  {
    "couponCode": "PROMO20",
    "notes": "Deliver in the afternoon",
    "shippingCost": 20
  }
  ```
- **Success Response** (`201 Created`).

### 8.2 Customer - List My Orders
- **Method & Path**: `GET /api/orders`
- **Access**: Authenticated (`USER` role)
- **Query Parameters**: `page`, `limit`, `status`.

### 8.3 Customer - Get Order by ID
- **Method & Path**: `GET /api/orders/:id`
- **Access**: Authenticated (`USER` role)

### 8.4 Customer - Cancel Order
- **Method & Path**: `PATCH /api/orders/:id/cancel`
- **Access**: Authenticated (`USER` role)
- **Business Rule**: Only allowed if `status === 'pending'`. Restocks quantities atomically.

### 8.5 Admin - List All Orders
- **Method & Path**: `GET /api/admin/orders`
- **Access**: Authenticated (`ADMIN` role)
- **Query Parameters**: `page`, `limit`, `status`, `search`.

### 8.6 Admin - Get Order by ID
- **Method & Path**: `GET /api/admin/orders/:id`
- **Access**: Authenticated (`ADMIN` role)

### 8.7 Admin - Update Order Status
- **Method & Path**: `PATCH /api/admin/orders/:id/status`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**: `{ "status": "completed" }` (`pending` | `completed` | `canceled`).

---

## 9. Reviews

### 9.1 Public - Get Approved Reviews for Product
- **Method & Path**: `GET /api/reviews/product/:productId`
- **Access**: Public
- **Query Parameters**: `page`, `limit`, `rating`.

### 9.2 Customer - Create Review
- **Method & Path**: `POST /api/reviews`
- **Access**: Authenticated (`USER` role)
- **Request Body**:
  ```json
  {
    "productId": "cuid...",
    "rating": 5,
    "comment": "Outstanding product!"
  }
  ```
- **Success Response** (`201 Created`). Review created with `isApproved: false`.

### 9.3 Customer - Update Review
- **Method & Path**: `PATCH /api/reviews/:id`
- **Access**: Authenticated (`USER` role)
- **Request Body**: `{ "rating": 4, "comment": "Updated feedback" }`.

### 9.4 Customer - Delete Review
- **Method & Path**: `DELETE /api/reviews/:id`
- **Access**: Authenticated (`USER` role)

### 9.5 Admin - List All Reviews (Moderation)
- **Method & Path**: `GET /api/admin/reviews`
- **Access**: Authenticated (`ADMIN` role)
- **Query Parameters**: `page`, `limit`, `isApproved`, `productId`, `rating`, `search`.

### 9.6 Admin - Get Review by ID
- **Method & Path**: `GET /api/admin/reviews/:id`
- **Access**: Authenticated (`ADMIN` role)

### 9.7 Admin - Approve or Reject Review
- **Method & Path**: `PATCH /api/admin/reviews/:id/approval`
- **Access**: Authenticated (`ADMIN` role)
- **Request Body**: `{ "isApproved": true }`.

### 9.8 Admin - Delete Review
- **Method & Path**: `DELETE /api/admin/reviews/:id`
- **Access**: Authenticated (`ADMIN` role)
