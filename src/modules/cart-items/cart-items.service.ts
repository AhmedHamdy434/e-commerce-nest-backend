import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { CartItem, CartItemSelect } from './constants/cart-item.select';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  private validateStockQuantity(
    requestedQuantity: number,
    availableQuantity: number,
  ): void {
    if (requestedQuantity > availableQuantity) {
      throw new BadRequestException(
        `الكمية المطلوبة تتجاوز المخزون المتوفر (${availableQuantity}).`,
      );
    }
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartItem> {
    const requestedQuantity = dto.quantity ?? 1;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        quantity: true,
      },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    if (product.quantity <= 0) {
      throw new BadRequestException('المنتج نفد من المخزون.');
    }

    const cart = await this.cartService.getOrCreateCart(userId);

    return await this.prisma.$transaction(async (tx) => {
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: product.id,
          },
        },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + requestedQuantity;
        this.validateStockQuantity(newQuantity, product.quantity);
        return tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          select: CartItemSelect,
        });
      }

      this.validateStockQuantity(requestedQuantity, product.quantity);

      return tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: requestedQuantity,
        },
        select: CartItemSelect,
      });
    });
  }
  async updateQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
      include: {
        product: {
          select: {
            id: true,
            quantity: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('عنصر السلة غير موجود.');
    }

    this.validateStockQuantity(dto.quantity, item.product.quantity);

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
      select: CartItemSelect,
    });
  }

  async removeItem(userId: string, itemId: string): Promise<null> {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('عنصر السلة غير موجود.');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return null;
  }
}
