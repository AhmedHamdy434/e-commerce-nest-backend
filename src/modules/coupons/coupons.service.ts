import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponDiscountType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { buildMeta } from '../../common/utils/buildMeta';
import {
  Coupon,
  CouponOptions,
  CouponOptionsSelect,
  CouponSelect,
} from './constants/coupon.select';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponQueryDto } from './dto/get-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: createCouponDto.code },
    });

    if (existingCoupon) {
      throw new ConflictException('كود الخصم هذا موجود بالفعل.');
    }

    if (
      createCouponDto.discountType === CouponDiscountType.percentage &&
      createCouponDto.discountValue > 100
    ) {
      throw new BadRequestException('نسبة الخصم لا يمكن أن تتجاوز 100%.');
    }

    if (
      createCouponDto.startsAt &&
      createCouponDto.expiresAt &&
      createCouponDto.startsAt >= createCouponDto.expiresAt
    ) {
      throw new BadRequestException(
        'تاريخ بداية الكوبون يجب أن يكون قبل تاريخ الانتهاء.',
      );
    }

    return this.prisma.coupon.create({
      data: createCouponDto,
      select: CouponSelect,
    });
  }

  async findAll(query: CouponQueryDto): Promise<{ data: Coupon[]; meta: any }> {
    const where = query.getWhere<Prisma.CouponWhereInput>(['code']);

    if (query.discountType) {
      where.discountType = query.discountType;
    }

    const orderBy = query.getOrderBy<
      | Prisma.CouponOrderByWithRelationInput
      | Prisma.CouponOrderByWithRelationInput[]
    >(
      ['code', 'discountValue', 'usedCount', 'createdAt', 'expiresAt'],
      [{ createdAt: 'desc' }],
    );

    const [total, data] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        skip: query.skip,
        take: query.take,
        select: CouponSelect,
        orderBy,
      }),
    ]);

    const meta = buildMeta(total, query.page, query.limit);
    return { data, meta };
  }

  async findOneById(id: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      select: CouponSelect,
    });

    if (!coupon) {
      throw new NotFoundException('كوبون الخصم غير موجود.');
    }

    return coupon;
  }

  async findByCode(code: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      select: CouponSelect,
    });

    if (!coupon) {
      throw new NotFoundException('كوبون الخصم غير موجود.');
    }

    return coupon;
  }

  async validateCoupon(dto: ValidateCouponDto): Promise<{
    coupon: Coupon;
    discountAmount: number;
    finalAmount?: number;
  }> {
    const coupon = await this.findByCode(dto.code);
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

    const orderAmount = dto.orderAmount ?? 0;

    if (
      dto.orderAmount !== undefined &&
      coupon.minOrderAmount &&
      orderAmount < Number(coupon.minOrderAmount)
    ) {
      throw new BadRequestException(
        `الحد الأدنى لقيمة الطلب لتطبيق هذا الكوبون هو ${Number(coupon.minOrderAmount)}.`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === CouponDiscountType.percentage) {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (
        coupon.maxDiscountAmount &&
        discountAmount > Number(coupon.maxDiscountAmount)
      ) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discountAmount =
        orderAmount > 0
          ? Math.min(Number(coupon.discountValue), orderAmount)
          : Number(coupon.discountValue);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount =
      orderAmount > 0
        ? Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100)
        : undefined;

    return {
      coupon,
      discountAmount,
      finalAmount,
    };
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('كوبون الخصم غير موجود.');
    }

    if (updateCouponDto.code !== coupon.code) {
      const existingByName = await this.prisma.coupon.findUnique({
        where: { code: updateCouponDto.code },
      });

      if (existingByName && existingByName.id !== id) {
        throw new ConflictException('كود الخصم هذا موجود بالفعل.');
      }
    }

    if (
      updateCouponDto.discountType === CouponDiscountType.percentage &&
      updateCouponDto.discountValue! > 100
    ) {
      throw new BadRequestException('نسبة الخصم لا يمكن أن تتجاوز 100%.');
    }

    if (
      updateCouponDto.startsAt &&
      updateCouponDto.expiresAt &&
      updateCouponDto.startsAt >= updateCouponDto.expiresAt
    ) {
      throw new BadRequestException(
        'تاريخ بداية الكوبون يجب أن يكون قبل تاريخ الانتهاء.',
      );
    }

    return this.prisma.coupon.update({
      where: { id },
      data: updateCouponDto,
      select: CouponSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!coupon) {
      throw new NotFoundException('كوبون الخصم غير موجود.');
    }

    await this.prisma.coupon.delete({
      where: { id },
    });
  }

  async findAllOptions(): Promise<CouponOptions[]> {
    return this.prisma.coupon.findMany({
      select: CouponOptionsSelect,
      orderBy: { code: 'asc' },
    });
  }
}
