# Application Architecture Documentation

This document describes the architectural principles, layers, request lifecycle, data flow, and security design implemented in the E-Commerce NestJS backend.

---

## 1. High-Level Architecture Overview

The system follows a modular NestJS monolith pattern backed by PostgreSQL via Prisma ORM.

```
Incoming Request (HTTP / REST)
       │
       ▼
   Main Middleware / CORS / Static Files (/uploads/)
       │
       ▼
 Global ValidationPipe (whitelist, transform, forbidNonWhitelisted)
       │
       ▼
 Guards Pipeline (ThrottlerGuard -> JwtAuthGuard -> RolesGuard)
       │
       ▼
 Controller (Route mapping, @CurrentUser extraction, @ResponseMessage)
       │
       ▼
 Service Layer (Business rules, stock checks, database transactions)
       │
       ▼
 PrismaService (Prisma Client with pg pool adapter)
       │
       ▼
 PostgreSQL Database
       │
       ▼
 TransformInterceptor (Envelope formatting { success, message, data, meta })
       │
       ▼
 HTTP Response
```

---

## 2. Module Responsibilities & Layout

Each domain module in `src/modules/<feature-name>/` maintains a strict separation of concerns:

```
src/modules/<feature-name>/
├── constants/
│   └── <feature>.select.ts       # Prisma selection masks & derived TypeScript payload types
├── dto/
│   ├── create-<feature>.dto.ts   # Incoming creation payload validation
│   ├── update-<feature>.dto.ts   # Update payload validation
│   └── get-<feature>.dto.ts      # Query filter & pagination parameters
├── <feature>.controller.ts       # Public & Customer HTTP controller
├── admin-<feature>.controller.ts # Admin HTTP controller (if applicable)
├── <feature>.service.ts          # Core business logic & database operations
└── <feature>.module.ts           # NestJS module declaration
```

### Domain Modules
1. **`AuthModule`**: User registration, login, JWT issuance, password updates, and OTP password recovery.
2. **`CategoriesModule`**: Category hierarchy, slug generation, optional image handling, and admin CRUD.
3. **`ProductsModule`**: Product catalog, inventory tracking, price management, search, and filtering.
4. **`ProductImagesModule`**: Product image gallery management and primary image selection.
5. **`CartModule`**: Customer shopping cart container.
6. **`CartItemsModule`**: Item-level cart additions, quantity increments, stock validation, and removal.
7. **`CouponsModule`**: Discount codes validation, percentage/fixed calculations, and usage tracking.
8. **`OrdersModule`**: Atomic checkout, coupon application, stock decrementing, and order cancellation with automatic restock.
9. **`OrderItemsModule`**: Order line items persistence and querying.
10. **`ReviewsModule`**: Customer feedback, 1-5 rating constraints, uniqueness per product, and admin moderation.

---

## 3. Request Lifecycle & Cross-Cutting Concerns

### 3.1 Global Prefix & Routing
- Configured in `src/main.ts` via `app.setGlobalPrefix('api')`.
- All routes begin with `/api/` (e.g. `/api/auth/login`, `/api/admin/products`).

### 3.2 Global Validation Pipeline
Configured globally in `src/main.ts`:
- `whitelist: true`: Strips undeclared payload fields.
- `transform: true`: Transforms payloads into DTO class instances.
- `forbidNonWhitelisted: true`: Rejects unknown properties with HTTP 400.
- `enableImplicitConversion: true`: Converts query strings to types declared in DTOs.

### 3.3 Response Envelope (`TransformInterceptor`)
Located in `src/common/interceptors/transform.interceptor.ts`. Every successful controller response is wrapped in a standard JSON envelope:
- Single resource / action: `{ success: true, message: string, data: T }`
- Paginated results: `{ success: true, message: string, data: T[], meta: PaginationMeta }`

### 3.4 Exception Handling
Standard NestJS HTTP exceptions are thrown with user-friendly Arabic messages across services:
- `NotFoundException` (HTTP 404): Resource not found.
- `BadRequestException` (HTTP 400): Validation failures, invalid date logic, insufficient stock.
- `ConflictException` (HTTP 409): Duplicate email, slug, or duplicate review.
- `ForbiddenException` (HTTP 403): Role or ownership mismatch.
- `UnauthorizedException` (HTTP 401): Missing or expired JWT token.

---

## 4. Authentication & Security Flow

### 4.1 JWT Strategy
- Stateless JWT authentication implemented via `passport-jwt` (`src/modules/auth/strategies/jwt.strategy.ts`).
- Extraction: HTTP header `Authorization: Bearer <accessToken>`.
- Secret key: loaded from `JWT_SECRET`.
- Validates token claims and extracts `RequestUser`:
  ```typescript
  export interface RequestUser {
    id: string;
    role: AppRole; // 'ADMIN' | 'USER'
  }
  ```

### 4.2 Role-Based Access Control (RBAC)
- Guard: `RolesGuard` (`src/common/guards/roles.guard.ts`).
- Applied alongside `JwtAuthGuard`:
  ```typescript
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  ```
- Public customer routes omit `@Roles` and `@UseGuards(JwtAuthGuard)` or specify `@Roles(AppRole.USER)` where authenticated access is mandatory.

---

## 5. Database Access & Concurrency Patterns

### 5.1 Prisma Service & pg Adapter
- `PrismaService` extends `PrismaClient` using `@prisma/adapter-pg` and PostgreSQL connection pooling (`pg.Pool`).
- Configured as a `@Global()` module (`src/database/prisma/prisma.module.ts`).

### 5.2 Atomic Operations (`prisma.$transaction`)
Operations that involve related state mutations run within interactive transactions:
- **Order Placement**:
  1. Validates cart items and verifies current stock.
  2. Creates `Order` and `OrderItem` records.
  3. Decrements product inventory (`quantity: { decrement: item.quantity }`).
  4. Increments coupon usage if a coupon is provided.
  5. Clears cart items.
- **Order Cancellation**:
  1. Restocks inventory (`quantity: { increment: item.quantity }`).
  2. Decrements coupon usage if applied.
  3. Updates order status to `canceled`.
