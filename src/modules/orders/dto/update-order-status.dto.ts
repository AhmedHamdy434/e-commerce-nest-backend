import { OrderStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'حالة الطلب مطلوبة.' })
  @IsEnum(OrderStatus, {
    message:
      'حالة الطلب غير صالحة. الحالات المسموحة: pending, canceled, completed.',
  })
  readonly status: OrderStatus;
}
