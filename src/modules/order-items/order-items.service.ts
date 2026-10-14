import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OrderItem, OrderItemSelect } from './constants/order-item.select';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      select: OrderItemSelect,
    });
  }

  async findOneById(id: string): Promise<OrderItem> {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      select: OrderItemSelect,
    });

    if (!item) {
      throw new NotFoundException('عنصر الطلب غير موجود.');
    }

    return item;
  }
}
