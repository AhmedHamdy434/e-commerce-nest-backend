import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { buildMeta, PaginationMeta } from '../../common/utils/buildMeta';
import {
  Review,
  ReviewPublic,
  ReviewPublicSelect,
  ReviewSelect,
} from './constants/review.select';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/get-review.dto';
import { UpdateReviewApprovalDto } from './dto/update-review-approval.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('لقد قمت بإضافة تقييم لهذا المنتج من قبل.');
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
        isApproved: false,
      },
      select: ReviewSelect,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('غير مصرح لك بتعديل هذا التقييم.');
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        isApproved: false,
      },
      select: ReviewSelect,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('غير مصرح لك بحذف هذا التقييم.');
    }

    await this.prisma.review.delete({
      where: { id },
    });
  }

  async findProductReviews(
    productId: string,
    query: ReviewQueryDto,
  ): Promise<{ data: ReviewPublic[]; meta: PaginationMeta }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    const { skip, take } = paginate(query.page, query.limit);

    const where: Prisma.ReviewWhereInput = {
      productId,
      isApproved: true,
      ...(query.rating && { rating: query.rating }),
    };

    const [total, data] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: query.getOrderBy(['createdAt', 'rating'], {
          createdAt: 'desc',
        }),
        select: ReviewPublicSelect,
      }),
    ]);

    return {
      data,
      meta: buildMeta(total, query.page, query.limit),
    };
  }

  async findAllAdmin(
    query: ReviewQueryDto,
  ): Promise<{ data: Review[]; meta: PaginationMeta }> {
    const { skip, take } = paginate(query.page, query.limit);

    const where: Prisma.ReviewWhereInput = {
      ...(query.productId && { productId: query.productId }),
      ...(query.rating && { rating: query.rating }),
      ...(typeof query.isApproved === 'boolean' && {
        isApproved: query.isApproved,
      }),
      ...(query.search && {
        OR: [
          { comment: { contains: query.search, mode: 'insensitive' } },
          { user: { name: { contains: query.search, mode: 'insensitive' } } },
          {
            product: { name: { contains: query.search, mode: 'insensitive' } },
          },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: query.getOrderBy(['createdAt', 'rating', 'isApproved'], {
          createdAt: 'desc',
        }),
        select: ReviewSelect,
      }),
    ]);

    return {
      data,
      meta: buildMeta(total, query.page, query.limit),
    };
  }

  async findOneAdmin(id: string): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: ReviewSelect,
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود.');
    }

    return review;
  }

  async updateApprovalAdmin(
    id: string,
    dto: UpdateReviewApprovalDto,
  ): Promise<Review> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود.');
    }

    return this.prisma.review.update({
      where: { id },
      data: { isApproved: dto.isApproved },
      select: ReviewSelect,
    });
  }

  async removeAdmin(id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود.');
    }

    await this.prisma.review.delete({
      where: { id },
    });
  }
}
