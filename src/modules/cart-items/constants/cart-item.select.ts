import { Prisma } from '@prisma/client';

export const CartItemSelect = {
  id: true,
  cartId: true,
  productId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CartItemSelect;

export type CartItem = Prisma.CartItemGetPayload<{
  select: typeof CartItemSelect;
}>;
