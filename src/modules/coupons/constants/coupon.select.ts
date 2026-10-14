import { Prisma } from '@prisma/client';

export const CouponOptionsSelect = {
  id: true,
  code: true,
} satisfies Prisma.CouponSelect;

export const CouponSelect = {
  id: true,
  code: true,
  discountType: true,
  discountValue: true,
  minOrderAmount: true,
  maxDiscountAmount: true,
  usageLimit: true,
  usedCount: true,
  startsAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CouponSelect;

export type CouponOptions = Prisma.CouponGetPayload<{
  select: typeof CouponOptionsSelect;
}>;

export type Coupon = Prisma.CouponGetPayload<{
  select: typeof CouponSelect;
}>;

export type CouponListItem = Coupon;
