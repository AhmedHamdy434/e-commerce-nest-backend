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

export type OrderItem = Prisma.OrderItemGetPayload<{
  select: typeof OrderItemSelect;
}>;
