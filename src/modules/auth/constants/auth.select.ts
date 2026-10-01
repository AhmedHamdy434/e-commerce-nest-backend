import { Prisma } from '@prisma/client';

export const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserDetails = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;
