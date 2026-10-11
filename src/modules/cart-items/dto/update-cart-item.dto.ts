import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsNotEmpty({ message: 'الكمية مطلوبة.' })
  @IsInt({ message: 'يجب أن تكون الكمية رقماً صحيحاً.' })
  @Min(1, { message: 'يجب أن تكون الكمية 1 على الأقل.' })
  readonly quantity: number;
}
