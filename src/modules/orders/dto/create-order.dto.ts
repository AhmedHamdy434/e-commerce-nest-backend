import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'كود الخصم يجب أن يكون نصاً.' })
  readonly couponCode?: string;

  @IsOptional()
  @IsString({ message: 'الملاحظات يجب أن تكون نصاً.' })
  readonly notes?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'تكلفة الشحن يجب أن تكون رقماً.' },
  )
  @Min(0, { message: 'تكلفة الشحن يجب ألا تقل عن صفر.' })
  readonly shippingCost?: number;
}
