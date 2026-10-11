import { Prisma } from '@prisma/client';

export const CartItemProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  image: true,
  quantity: true,
} satisfies Prisma.ProductSelect;

export const CartItemWithProductSelect = {
  id: true,
  cartId: true,
  productId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: CartItemProductSelect,
  },
} satisfies Prisma.CartItemSelect;

export const CartSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: CartItemWithProductSelect,
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.CartSelect;

export type CartItemProduct = Prisma.ProductGetPayload<{
  select: typeof CartItemProductSelect;
}>;

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  select: typeof CartItemWithProductSelect;
}>;

export type Cart = Prisma.CartGetPayload<{
  select: typeof CartSelect;
}>;

export type CartWithItems = Cart;
