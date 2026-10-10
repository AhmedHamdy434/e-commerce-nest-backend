import { Prisma } from '@prisma/client';

export const CategoryOptionsSelect = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

export const CategorySelect = {
  ...CategoryOptionsSelect,
  image: true,
  slug: true,
  createdAt: true,
} satisfies Prisma.CategorySelect;

export type CategoryOptions = Prisma.CategoryGetPayload<{
  select: typeof CategoryOptionsSelect;
}>;

export type Category = Prisma.CategoryGetPayload<{
  select: typeof CategorySelect;
}>;

export type CategoryListItem = Category;
