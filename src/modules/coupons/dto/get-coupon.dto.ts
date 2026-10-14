import { CouponDiscountType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { BaseQueryDto } from '../../../common/dto/BaseQueryDto';

export class CouponQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsIn(['code', 'discountValue', 'usedCount', 'createdAt', 'expiresAt'], {
    message:
      'حقل الترتيب يجب أن يكون أحد الحقول التالية: code, discountValue, usedCount, createdAt, expiresAt',
  })
  declare readonly sortBy?: string;

  @IsOptional()
  @IsEnum(CouponDiscountType, {
    message: 'نوع الخصم يجب أن يكون إما amount أو percentage.',
  })
  readonly discountType?: CouponDiscountType;
}
