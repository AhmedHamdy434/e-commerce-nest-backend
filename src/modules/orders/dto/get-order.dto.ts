import { OrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { BaseQueryDto } from '../../../common/dto/BaseQueryDto';

export class OrderQueryDto extends BaseQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(OrderStatus, {
    message: 'حالة الطلب غير صالحة.',
  })
  readonly status?: OrderStatus;
}
