import { Prisma } from '@prisma/client';
import { CategoryOptionsSelect } from '../../categories/constants/category.select';

export const ProductOptionsSelect = {
  id: true,
  name: true,
} satisfies Prisma.ProductSelect;

export const ProductSelect = {
  ...ProductOptionsSelect,
  categoryId: true,
  category: {
    select: CategoryOptionsSelect,
  },
  description: true,
  price: true,
  quantity: true,
  sku: true,
  images: true,
  image: true,
  slug: true,
  createdAt: true,
} satisfies Prisma.ProductSelect;

export type ProductOptions = Prisma.ProductGetPayload<{
  select: typeof ProductOptionsSelect;
}>;

export type Product = Prisma.ProductGetPayload<{
  select: typeof ProductSelect;
}>;

export type ProductListItem = Product;
