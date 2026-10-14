import { CouponDiscountType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'كود الكوبون مطلوب.' })
  @IsString({ message: 'يجب أن يكون كود الكوبون نصاً.' })
  readonly code: string;

  @IsOptional()
  @IsEnum(CouponDiscountType, {
    message: 'نوع الخصم يجب أن يكون إما amount أو percentage.',
  })
  readonly discountType?: CouponDiscountType = CouponDiscountType.amount;

  @IsNotEmpty({ message: 'قيمة الخصم مطلوبة.' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'قيمة الخصم يجب أن تكون رقماً.' },
  )
  @IsPositive({ message: 'قيمة الخصم يجب أن تكون أكبر من الصفر.' })
  readonly discountValue: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'الحد الأدنى لقيمة الطلب يجب أن يكون رقماً.' },
  )
  @Min(0, { message: 'الحد الأدنى لقيمة الطلب يجب ألا يقل عن صفر.' })
  readonly minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'الحد الأقصى لمبلغ الخصم يجب أن يكون رقماً.' },
  )
  @Min(0, { message: 'الحد الأقصى لمبلغ الخصم يجب ألا يقل عن صفر.' })
  readonly maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'حد الاستخدام يجب أن يكون رقماً صحيحاً.' })
  @Min(1, { message: 'حد الاستخدام يجب أن يكون 1 على الأقل.' })
  readonly usageLimit?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'تاريخ بداية الكوبون غير صالح.' })
  readonly startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'تاريخ انتهاء الكوبون غير صالح.' })
  readonly expiresAt?: Date;
}
