# Postman Integration Guide

This guide describes how to import, configure, and execute the official Postman collection and environment for the E-Commerce NestJS backend.

---

## 1. Files Overview

The following files are located in the `postman/` directory:

| File | Purpose |
| :--- | :--- |
| `postman/E-Commerce-Nest.postman_collection.json` | Complete API collection with 62 requests organized into 9 folders, with assertions and automatic token scripts. |
| `postman/E-Commerce-Nest.postman_environment.json` | Environment template containing configuration variables, base URLs, and state containers. |

---

## 2. Importing into Postman

1. Open the **Postman** desktop application or web workspace.
2. In the top-left corner, click **Import**.
3. Select **Files** and choose both:
   - `postman/E-Commerce-Nest.postman_collection.json`
   - `postman/E-Commerce-Nest.postman_environment.json`
4. Confirm the import. A new collection named **E-Commerce NestJS API** and an environment named **E-Commerce Nest Local Environment** will be created.

---

## 3. Environment Configuration

Select **E-Commerce Nest Local Environment** from the environment dropdown in the top-right corner.

### Available Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:5000/api` | Effective base URL for the backend API (including global prefix `/api`). |
| `accessToken` | `""` (Empty) | Stored customer JWT access token. Populated automatically upon customer login/signup. |
| `adminAccessToken` | `""` (Empty) | Stored administrator JWT access token. Populated automatically upon admin login. |
| `userId` | `""` | ID of the authenticated customer. |
| `categoryId` | `""` | ID of a created category. Used in product creation and category queries. |
| `categorySlug` | `""` | Slug of a created category. |
| `productId` | `""` | ID of a created product. Used in cart items, image gallery, reviews. |
| `productSlug` | `""` | Slug of a created product. |
| `productImageId` | `""` | ID of a product image. |
| `cartItemId` | `""` | ID of an item in the user's cart. |
| `couponId` | `""` | ID of a created coupon. |
| `couponCode` | `PROMO20` | Code of the coupon used during validation and checkout. |
| `orderId` | `""` | ID of a placed order. |
| `reviewId` | `""` | ID of a created review. |

---

## 4. Automatic Token Handling & Scripts

### 4.1 Customer Authentication
When executing **User Login** (`POST {{baseUrl}}/auth/login`) or **User Signup** (`POST {{baseUrl}}/auth/signup`), the response script runs:

```javascript
pm.test('Token received and saved', function () {
    pm.response.to.have.status(200);
    const json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.accessToken).to.be.a('string');
});

const json = pm.response.json();
if (json.data && json.data.accessToken) {
    pm.environment.set('accessToken', json.data.accessToken);
    pm.environment.set('userId', json.data.user.id);
}
```

All customer-protected endpoints inherit or reference `Bearer {{accessToken}}` automatically.

### 4.2 Administrator Authentication
When executing **Admin Login** (`POST {{baseUrl}}/admin/auth/login`), the response script sets:

```javascript
const json = pm.response.json();
if (json.data && json.data.accessToken) {
    pm.environment.set('adminAccessToken', json.data.accessToken);
}
```

All admin-protected endpoints in folders prefixed with `Admin` use `Bearer {{adminAccessToken}}`.

---

## 5. Recommended Sequential Workflow

To run the collection end-to-end as an automated workflow using the **Collection Runner**:

1. **Step 1: Admin Login / Setup**:
   - Run `Admin Login` to save `adminAccessToken`.
2. **Step 2: Category & Product Creation**:
   - Run `Admin - Create Category` (stores `categoryId` and `categorySlug`).
   - Run `Admin - Create Product` (stores `productId` and `productSlug`).
   - Run `Admin - Upload / Add Product Images` (stores `productImageId`).
3. **Step 3: Coupon Creation**:
   - Run `Admin - Create Coupon` (stores `couponId` and `couponCode`).
4. **Step 4: Customer Registration & Cart**:
   - Run `User Signup` or `User Login` (stores `accessToken` and `userId`).
   - Run `Add Item to Cart` (stores `cartItemId`).
   - Run `Update Cart Item Quantity`.
5. **Step 5: Checkout & Order Placement**:
   - Run `Customer - Create Order` using the items in the cart and `couponCode` (stores `orderId`).
   - Run `Customer - Get My Orders` and `Customer - Get Order By ID`.
6. **Step 6: Reviews**:
   - Run `Customer - Create Review` for `{{productId}}` (stores `reviewId`).
   - Run `Admin - Approve / Reject Review` to approve the review.
   - Run `Public - Get Product Reviews (Approved)`.
7. **Step 7: Admin Order Status**:
   - Run `Admin - Update Order Status` to mark the order as `completed`.
