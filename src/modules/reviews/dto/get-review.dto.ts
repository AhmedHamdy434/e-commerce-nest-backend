import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BaseQueryDto } from '../../../common/dto/BaseQueryDto';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class ReviewQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString({ message: 'معرف المنتج يجب أن يكون نصاً.' })
  readonly productId?: string;

  @IsOptional()
  @IsInt({ message: 'التقييم يجب أن يكون رقماً صحيحاً.' })
  @Min(1, { message: 'أقل تقييم هو 1.' })
  @Max(5, { message: 'أعلى تقييم هو 5.' })
  readonly rating?: number;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'حالة الموافقة يجب أن تكون قيمة منطقية.' })
  readonly isApproved?: boolean;
}
