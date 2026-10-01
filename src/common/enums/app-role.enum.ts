import { Role } from '@prisma/client';

export const AppRole = {
  ADMIN: Role.ADMIN,
  USER: Role.USER,
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];
