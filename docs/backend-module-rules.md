# Backend Module Architectural Rules & Standards

This document establishes the verified architectural patterns, conventions, and guidelines for developing new feature modules in this NestJS + Prisma + PostgreSQL e-commerce backend.

---

## 1. Project Architecture

### 1.1 Module Structure
- All domain modules reside under `src/modules/<feature-name>/`.
- Standard directory layout for any domain module:
  ```
  src/modules/<feature-name>/
  ├── constants/
  │   └── <feature>.select.ts          # Prisma select objects & derived TypeScript payload types
  ├── dto/
  │   ├── create-<feature>.dto.ts      # Creation payload validation
  │   ├── update-<feature>.dto.ts      # Update payload validation
  │   └── get-<feature>.dto.ts         # Query params extending BaseQueryDto (if applicable)
  ├── <feature>.controller.ts          # Public / Customer-facing HTTP controller
  ├── admin-<feature>.controller.ts    # Admin-only HTTP controller (if applicable)
  ├── <feature>.service.ts             # Business logic & Prisma interactions
  └── <feature>.module.ts              # NestJS Module definition
  ```
- Cross-cutting concerns reside in `src/common/`:
  - `decorators/`: `@CurrentUser()`, `@ResponseMessage()`, `@Roles()`, `@ToBoolean()`, `@ToStringArray()`.
  - `dto/`: `BaseQueryDto`, `PaginationDto`.
  - `enums/`: `AppRole` (`ADMIN`, `USER`).
  - `guards/`: `RolesGuard`.
  - `interceptors/`: `TransformInterceptor` (global response envelope).
  - `utils/`: `buildMeta`, `paginate`, `createSlug`, `password.util`.
- Global infrastructure resides in:
  - `src/database/prisma/`: `PrismaModule` (Global) and `PrismaService`.
  - `src/shared/storage/`: `StorageModule`, `StorageService`.

### 1.2 Naming Conventions
- **Files & Directories**: Kebab-case (e.g., `cart-items.module.ts`, `create-cart-item.dto.ts`).
- **Classes**: PascalCase with layer suffix:
  - Modules: `<Feature>Module` (e.g., `CartModule`, `CartItemsModule`).
  - Controllers: `<Feature>Controller` or `Admin<Feature>Controller`.
  - Services: `<Feature>Service`.
  - DTOs: `Create<Entity>Dto`, `Update<Entity>Dto`, `<Entity>QueryDto`.
- **Variables & Functions**: camelCase (e.g., `findOneById`, `addItem`).
- **Prisma Select constants**: PascalCase ending in `Select` (e.g., `CartSelect`, `CartItemSelect`).
- **Payload types**: PascalCase matching entity name (e.g., `Cart = Prisma.CartGetPayload<{ select: typeof CartSelect }>`).

### 1.3 Responsibilities by Layer
- **Controller**:
  - Thin routing and HTTP request handling.
  - Applies guards (`JwtAuthGuard`, `RolesGuard`), route decorators, parameter decorators (`@CurrentUser()`, `@Param()`, `@Body()`).
  - Sets user-facing success message using `@ResponseMessage('...')`.
  - Delegates all business logic, validation decisions, and data access to the service layer.
- **Service**:
  - Owns all business logic, ownership checks, stock verification, and domain invariants.
  - Interacts with Prisma client (`PrismaService`).
  - Executes database transactions (`prisma.$transaction`) when operations involve multiple related updates.
  - Throws built-in NestJS exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`).
- **DTO**:
  - Defines the request structure and validates types, constraints, and transformations using `class-validator` and `class-transformer`.

### 1.4 Module Dependencies & Exports
- `PrismaModule` is marked with `@Global()`; feature modules do **not** need to import `PrismaModule`.
- Feature modules export services only if other modules require them.
- Independent domain concerns should avoid circular imports; coordination should be unidirectional or handled via focused method calls.

---

## 2. Prisma and Database Access

### 2.1 Injection & Usage
- `PrismaService` extends `PrismaClient` using `@prisma/adapter-pg` with `pg.Pool`.
- Injected via constructor in services:
  ```typescript
  constructor(private readonly prisma: PrismaService) {}
  ```

### 2.2 Prisma Selection Objects & Type Safety
- Every module defines its selection masks in `constants/<entity>.select.ts`.
- The `satisfies Prisma.<Model>Select` pattern ensures strict type-checking of selected fields without leaking sensitive or unnecessary data.
- Domain payload types are derived via `Prisma.<Model>GetPayload<{ select: typeof <Model>Select }>`.
- **MANDATORY RULE - No Custom Formatted Interfaces**: Do **not** create manual response/data interfaces (e.g., `FormattedCartProduct`, `FormattedCartItem`, `FormattedCart`) inside service files. Always rely strictly on the Prisma-derived payload type exported from `constants/<entity>.select.ts` (e.g., `Product`, `Category`, `Cart`), exactly as implemented across `products.service.ts` and `categories.service.ts`. Services must return the derived Prisma payload type directly.

### 2.3 Transactions
- Multi-step operations or operations requiring atomicity and rollback safety use `this.prisma.$transaction(async (tx) => { ... })`.
- Transactions receive `tx: Prisma.TransactionClient`.

### 2.4 Error Handling & Database Constraints
- Unique constraint violations: Services proactively check existence (`findUnique`, `findFirst`) and throw `ConflictException` with Arabic descriptive messages, or catch Prisma error code `P2002` when handling high-concurrency operations.
- Non-existent records: Explicit check and throw `NotFoundException` with descriptive Arabic message.

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism
- Stateless JWT authentication via `passport-jwt` and `JwtAuthGuard` (`src/modules/auth/guards/jwt-auth.guard.ts`).
- Extraction: Bearer token from the `Authorization` header (`ExtractJwt.fromAuthHeaderAsBearerToken()`).
- Secret: `JWT_SECRET` from environment variables.
- Validation: `JwtStrategy.validate(payload)` verifies user existence in the database and returns:
  ```typescript
  export interface RequestUser {
    id: string;
    role: AppRole;
  }
  ```

### 3.2 Guards & Decorators
- **Authentication**: Apply `@UseGuards(JwtAuthGuard)` at controller or route method level.
- **Role Authorization**: Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(AppRole.ADMIN)`.
- **Identity Extraction**: Use the custom `@CurrentUser() user: RequestUser` decorator to obtain the authenticated user.

### 3.3 Ownership Verification
- Every user-owned resource operation MUST resolve ownership through the authenticated user's ID (`user.id`).
- Client-provided identifiers (e.g. `cartId`) must never be trusted blindly. The service must ensure that the target resource belongs to `user.id`. If a user attempts to modify an item belonging to another user, throw `NotFoundException` (to avoid data enumeration) or `ForbiddenException`.

---

## 4. DTOs and Validation

### 4.1 Global Validation Pipe Configuration
- Configured in `src/main.ts`:
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  ```
- Unknown properties in request bodies are forbidden (`forbidNonWhitelisted: true`).
- Types are automatically transformed (`transform: true`, `enableImplicitConversion: true`).

### 4.2 Validation Decorators & Conventions
- Decorators from `class-validator`: `@IsNotEmpty()`, `@IsString()`, `@IsInt()`, `@IsPositive()`, `@Min()`, `@IsOptional()`.
- Explicit Arabic messages in decorator options:
  ```typescript
  @IsNotEmpty({ message: 'الكمية مطلوبة.' })
  @IsInt({ message: 'يجب أن تكون الكمية رقماً صحيحاً.' })
  @Min(1, { message: 'يجب أن تكون الكمية 1 على الأقل.' })
  readonly quantity: number;
  ```

### 4.3 Data Normalization & Transformation in DTOs (معالجة وتحويل البيانات في الـ DTO)
- **MANDATORY RULE - All Input Transformations Belong to DTOs**: Any input sanitization, trimming, casing adjustments (e.g., `value.trim().toUpperCase()`, `value.trim().toLowerCase()`), type parsing, or array conversions must be handled **entirely within the DTO layer** using `class-transformer` decorators (such as `@Transform(...)` or custom decorators like `@ToStringArray()`, `@ToBoolean()`).
- **Services Must Receive Clean Data**: Services must receive pre-sanitized, normalized data directly from the DTO properties without performing manual string mutations or re-formatting (e.g., do **not** write `dto.code.trim().toUpperCase()` inside services; the DTO's `code` property must already be transformed).
- **Decorator Ordering**: Place `@Transform(...)` before validation decorators (`@IsNotEmpty()`, `@IsString()`, etc.) so that the data is sanitized and transformed before validation rules are executed.

---

## 5. Controllers and Services

### 5.1 Route Prefixes and HTTP Conventions
- Global route prefix is `'api'` (configured in `main.ts` via `app.setGlobalPrefix('api')`).
- Controller paths do not include `'api'`; NestJS prepends it automatically.
- Customer-facing routes: `@Controller('cart')`, `@Controller('cart/items')` (or `@Controller('cart')`).
- Standard HTTP methods:
  - `GET`: Read resource.
  - `POST`: Create resource or perform action (status `201 Created` or `200 OK` with `@HttpCode`).
  - `PATCH`: Partial update.
  - `DELETE`: Remove resource (returns `200 OK` with `@HttpCode(HttpStatus.OK)`).

### 5.2 Exception Conventions
- Standard NestJS HTTP exceptions with Arabic error messages:
  - `NotFoundException('...')`
  - `BadRequestException('...')`
  - `ConflictException('...')`
  - `ForbiddenException('...')`
  - `UnauthorizedException('...')`

---

## 6. API Responses and Swagger

### 6.1 Global Response Interceptor
- Handled globally by `TransformInterceptor` (`src/common/interceptors/transform.interceptor.ts`).
- Standard success envelope:
  ```json
  {
    "success": true,
    "message": "<Message set by @ResponseMessage() or default>",
    "data": <Service return value>
  }
  ```
- Controllers use `@ResponseMessage('تمت العملية بنجاح.')` to specify user-friendly Arabic messages.

### 6.2 Swagger Documentation Status
- **Verified Fact**: `@nestjs/swagger` is **not installed** in `package.json` and Swagger is **not configured** in `src/main.ts`.
- **Rule**: Do not add `@ApiTags`, `@ApiOperation`, or Swagger decorators unless Swagger is officially added to the project dependencies.

---

## 7. Testing and Quality Checks

### 7.1 Quality Commands
- **Type Checking**: `npx tsc --noEmit`
- **Linting & Code Style**: `npm run lint` (`eslint "{src,apps,libs,test}/**/*.ts" --fix`)
- **Production Build**: `npm run build` (`nest build`)

### 7.2 Required Criteria Before Completion
- Zero TypeScript compiler diagnostics.
- Zero ESLint errors or warnings on new/modified files.
- Clean production build with `npm run build`.

### 7.3 Spec Files Policy
- **MANDATORY RULE - Do Not Create Spec Files**: Do **not** create `.spec.ts` test files when developing or modifying modules and features. Quality and correctness verification must rely strictly on static type analysis (`tsc --noEmit`), linting (`npm run lint`), and compilation builds (`npm run build`).

---

## 8. Implementation Constraints

1. **Preserve Existing Architecture**: Stick strictly to established module structure, DTO validation patterns, and Prisma select helpers.
2. **No Unnecessary Abstractions**: Do not create redundant repository layers or micro-framework wrappers; use `PrismaService` directly.
3. **No Unrelated Refactoring**: Do not alter existing models, schema definitions, or other modules unless directly required for integration.
4. **No Custom Formatted DTO/Interfaces in Services**: Do not declare ad-hoc `Formatted...` interfaces in services; always rely on `Prisma.<Model>GetPayload<{ select: typeof <Model>Select }>` from `constants/<entity>.select.ts`.
5. **No Spec Test Files**: Never create `*.spec.ts` files for new modules or services.
6. **All Input Sanitization & Normalization in DTOs**: Never perform manual string manipulation (trimming, casing, parsing) inside services; handle all input formatting and transformations exclusively within the DTO via `@Transform`.
7. **Authoritative Server-Side Invariants**: Prices and product properties must be derived from the database, never trusted from client payloads.
8. **Update Payloads Sent in Full**: In update operations, all fields are expected to be sent in the request payload. Do not perform redundant `!== undefined` checks or fallback coalescing for optional properties in services when handling updates; validate and process fields directly.
9. **Verified Facts vs Assumptions**:
   - *Verified*: `Cart` and `CartItem` models exist in Prisma schema with `Cart.userId` `@unique` and `CartItem` `@@unique([cartId, productId])`.
   - *Verified*: `Coupon` model exists with `CouponDiscountType` enum (`amount`, `percentage`).
   - *Verified*: `Product.quantity` represents available stock.
   - *Verified*: `JwtAuthGuard` and `@CurrentUser()` extract `{ id: string, role: Role }`.
   - *Verified*: Global `ValidationPipe` and `TransformInterceptor` wrap requests and responses.
