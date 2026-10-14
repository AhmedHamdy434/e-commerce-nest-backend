import { Prisma } from '@prisma/client';

export const OrderItemProductSelect = {
  id: true,
  name: true,
  slug: true,
  image: true,
} satisfies Prisma.ProductSelect;

export const OrderItemSelect = {
  id: true,
  orderId: true,
  productId: true,
  productName: true,
  unitPrice: true,
  quantity: true,
  totalPrice: true,
  createdAt: true,
  product: {
    select: OrderItemProductSelect,
  },
} satisfies Prisma.OrderItemSelect;

export const OrderUserSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

export const OrderCouponSelect = {
  id: true,
  code: true,
  discountType: true,
  discountValue: true,
} satisfies Prisma.CouponSelect;

export const OrderSelect = {
  id: true,
  userId: true,
  couponId: true,
  status: true,
  subtotal: true,
  discountAmount: true,
  shippingCost: true,
  totalAmount: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: OrderUserSelect,
  },
  coupon: {
    select: OrderCouponSelect,
  },
  items: {
    select: OrderItemSelect,
  },
} satisfies Prisma.OrderSelect;

export const OrderListItemSelect = {
  id: true,
  userId: true,
  couponId: true,
  status: true,
  subtotal: true,
  discountAmount: true,
  shippingCost: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: OrderUserSelect,
  },
  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderItem = Prisma.OrderItemGetPayload<{
  select: typeof OrderItemSelect;
}>;

export type Order = Prisma.OrderGetPayload<{
  select: typeof OrderSelect;
}>;

export type OrderListItem = Prisma.OrderGetPayload<{
  select: typeof OrderListItemSelect;
}>;
