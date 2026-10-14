import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'معرف المنتج مطلوب.' })
  @IsString({ message: 'معرف المنتج يجب أن يكون نصاً.' })
  readonly productId: string;

  @IsNotEmpty({ message: 'التقييم مطلوب.' })
  @IsInt({ message: 'التقييم يجب أن يكون رقماً صحيحاً.' })
  @Min(1, { message: 'أقل تقييم هو 1.' })
  @Max(5, { message: 'أعلى تقييم هو 5.' })
  readonly rating: number;

  @IsOptional()
  @IsString({ message: 'التعليق يجب أن يكون نصاً.' })
  readonly comment?: string;
}
