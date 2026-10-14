import { Prisma } from '@prisma/client';

export const ReviewUserSelect = {
  id: true,
  name: true,
  image: true,
} satisfies Prisma.UserSelect;

export const ReviewProductSelect = {
  id: true,
  name: true,
  slug: true,
  image: true,
} satisfies Prisma.ProductSelect;

export const ReviewSelect = {
  id: true,
  userId: true,
  productId: true,
  rating: true,
  comment: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: ReviewUserSelect,
  },
  product: {
    select: ReviewProductSelect,
  },
} satisfies Prisma.ReviewSelect;

export const ReviewPublicSelect = {
  id: true,
  userId: true,
  productId: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: {
    select: ReviewUserSelect,
  },
} satisfies Prisma.ReviewSelect;

export type Review = Prisma.ReviewGetPayload<{
  select: typeof ReviewSelect;
}>;

export type ReviewPublic = Prisma.ReviewGetPayload<{
  select: typeof ReviewPublicSelect;
}>;
