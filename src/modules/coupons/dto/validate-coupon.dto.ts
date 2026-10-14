import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ValidateCouponDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'كود الكوبون مطلوب.' })
  @IsString({ message: 'يجب أن يكون كود الكوبون نصاً.' })
  readonly code: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'قيمة الطلب يجب أن تكون رقماً.' },
  )
  @IsPositive({ message: 'قيمة الطلب يجب أن تكون أكبر من الصفر.' })
  readonly orderAmount?: number;
}
