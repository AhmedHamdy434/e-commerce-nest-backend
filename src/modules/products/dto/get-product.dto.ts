import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../../common/dto/BaseQueryDto';

export class ProductQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsIn(['name', 'createdAt', 'price', 'quantity'], {
    message:
      'حقل الترتيب يجب أن يكون أحد الحقول التالية: name, createdAt, price, quantity',
  })
  declare readonly sortBy?: string;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون سعر المنتج رقماً.' })
  declare readonly priceFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون سعر المنتج رقماً.' })
  declare readonly priceTo?: number;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون الكمية رقماً.' })
  declare readonly quantityFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون الكمية رقماً.' })
  declare readonly quantityTo?: number;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط المنتج نصاً.' })
  declare readonly categoryId?: string;
}
