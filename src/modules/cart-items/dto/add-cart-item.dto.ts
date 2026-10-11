import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsNotEmpty({ message: 'معرف المنتج مطلوب.' })
  @IsString({ message: 'يجب أن يكون معرف المنتج نصاً.' })
  readonly productId: string;

  @IsOptional()
  @IsInt({ message: 'يجب أن تكون الكمية رقماً صحيحاً.' })
  @Min(1, { message: 'يجب أن تكون الكمية 1 على الأقل.' })
  readonly quantity?: number = 1;
}
