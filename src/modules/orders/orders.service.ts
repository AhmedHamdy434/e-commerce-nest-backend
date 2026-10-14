import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponDiscountType, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { buildMeta, PaginationMeta } from '../../common/utils/buildMeta';
import {
  Order,
  OrderListItem,
  OrderListItemSelect,
  OrderSelect,
} from './constants/order.select';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/get-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('عربة التسوق فارغة.');
    }

    for (const item of cart.items) {
      if (item.quantity > item.product.quantity) {
        throw new BadRequestException(
          `الكمية المطلوبة للمنتج "${item.product.name}" تتجاوز المخزون المتوفر (${item.product.quantity}).`,
        );
      }
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    let couponId: string | null = null;
    let discountAmount = 0;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode },
      });

      if (!coupon) {
        throw new NotFoundException('كوبون الخصم غير موجود.');
      }

      const now = new Date();
      if (coupon.startsAt && now < coupon.startsAt) {
        throw new BadRequestException('هذا الكوبون لم يبدأ العمل به بعد.');
      }

      if (coupon.expiresAt && now > coupon.expiresAt) {
        throw new BadRequestException('هذا الكوبون منتهي الصلاحية.');
      }

      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestException(
          'تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون.',
        );
      }

      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        throw new BadRequestException(
          `الحد الأدنى لقيمة الطلب لتطبيق هذا الكوبون هو ${Number(coupon.minOrderAmount)}.`,
        );
      }

      if (coupon.discountType === CouponDiscountType.percentage) {
        discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
        if (
          coupon.maxDiscountAmount &&
          discountAmount > Number(coupon.maxDiscountAmount)
        ) {
          discountAmount = Number(coupon.maxDiscountAmount);
        }
      } else {
        discountAmount = Math.min(Number(coupon.discountValue), subtotal);
      }

      discountAmount = Math.round(discountAmount * 100) / 100;
      couponId = coupon.id;
    }

    const shippingCost = dto.shippingCost ?? 0;
    const totalAmount = Math.max(
      0,
      Math.round((subtotal - discountAmount + shippingCost) * 100) / 100,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. إنشاء الطلب وعناصره
      const createdOrder = await tx.order.create({
        data: {
          userId,
          couponId,
          status: OrderStatus.pending,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(discountAmount),
          shippingCost: new Prisma.Decimal(shippingCost),
          totalAmount: new Prisma.Decimal(totalAmount),
          notes: dto.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              unitPrice: item.product.price,
              quantity: item.quantity,
              totalPrice: new Prisma.Decimal(
                Math.round(Number(item.product.price) * item.quantity * 100) /
                  100,
              ),
            })),
          },
        },
        select: OrderSelect,
      });
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. تحديث عدد استخدام الكوبون إن وُجد
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // 4. إفراغ سلة التسوق
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });
  }

  async findUserOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{ data: OrderListItem[]; meta: PaginationMeta }> {
    const { skip, take } = paginate(query.page, query.limit);

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status && { status: query.status }),
    };

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: query.getOrderBy(['createdAt', 'totalAmount', 'status'], {
          createdAt: 'desc',
        }),
        select: OrderListItemSelect,
      }),
    ]);

    return {
      data,
      meta: buildMeta(total, query.page, query.limit),
    };
  }

  async findOneUserOrder(id: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: OrderSelect,
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('غير مصرح لك بعرض هذا الطلب.');
    }

    return order;
  }

  async cancelUserOrder(id: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('غير مصرح لك بإلغاء هذا الطلب.');
    }

    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException(
        'لا يمكن إلغاء الطلب إلا إذا كان في حالة الانتظار (pending).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. إعادة المنتجات إلى المخزون
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // 2. تقليل عدد استخدام الكوبون إذا كان مستخدماً
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: {
            usedCount: {
              decrement: 1,
            },
          },
        });
      }

      // 3. تحديث حالة الطلب إلى ملغي
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.canceled },
        select: OrderSelect,
      });
    });
  }

  // --- Admin Methods ---

  async findAllAdmin(
    query: OrderQueryDto,
  ): Promise<{ data: OrderListItem[]; meta: PaginationMeta }> {
    const { skip, take } = paginate(query.page, query.limit);

    const where: Prisma.OrderWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { user: { name: { contains: query.search, mode: 'insensitive' } } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
          { notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: query.getOrderBy(['createdAt', 'totalAmount', 'status'], {
          createdAt: 'desc',
        }),
        select: OrderListItemSelect,
      }),
    ]);

    return {
      data,
      meta: buildMeta(total, query.page, query.limit),
    };
  }

  async findOneAdmin(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: OrderSelect,
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود.');
    }

    return order;
  }

  async updateStatusAdmin(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود.');
    }

    if (order.status === dto.status) {
      return this.prisma.order.findUniqueOrThrow({
        where: { id },
        select: OrderSelect,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // إذا تم الإلغاء ولم يكن ملغياً من قبل -> إعادة المخزون
      if (
        dto.status === OrderStatus.canceled &&
        order.status !== OrderStatus.canceled
      ) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }

        if (order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usedCount: {
                decrement: 1,
              },
            },
          });
        }
      }

      // إذا تم تغيير الحالة من canceled إلى أي حالة أخرى -> إعادة الخصم من المخزون
      if (
        order.status === OrderStatus.canceled &&
        dto.status !== OrderStatus.canceled
      ) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        if (order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        select: OrderSelect,
      });
    });
  }
}
