import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Cart, CartSelect } from './constants/cart.select';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string) {
    const existingCart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });

    if (existingCart) {
      return existingCart;
    }
    return await this.prisma.cart.create({
      data: { userId },
      select: { id: true, userId: true },
    });
  }

  async getCart(userId: string): Promise<Cart> {
    await this.getOrCreateCart(userId);

    return this.prisma.cart.findUniqueOrThrow({
      where: { userId },
      select: CartSelect,
    });
  }

  /**
   * تفريغ جميع عناصر سلة المستخدم مع الحفاظ على سجل السلة والمستخدم
   */
  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      select: CartSelect,
    });
  }
}
