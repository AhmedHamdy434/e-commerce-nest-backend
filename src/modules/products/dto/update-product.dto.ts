import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductImageDto } from './update-product-image.dto';
import { ToStringArray } from 'src/common/decorators/to-string-array.decorator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @ToStringArray()
  @IsArray({ message: 'يجب أن تكون معرفات الصور المحذوفة مصفوفة.' })
  @IsString({ each: true, message: 'يجب أن تكون معرفات الصور نصوصاً.' })
  readonly deleteImageIds?: string[];

  @IsOptional()
  @ToStringArray()
  @IsArray({ message: 'يجب أن تكون تعديلات الصور مصفوفة.' })
  @ValidateNested({ each: true })
  @Type(() => UpdateProductImageDto)
  readonly updateImages?: UpdateProductImageDto[];

  @IsOptional()
  @IsString({ message: 'يجب أن يكون معرف الصورة الرئيسية نصاً.' })
  readonly mainImageId?: string;

  @IsOptional()
  @ToStringArray()
  @IsArray({ message: 'يجب أن تكون الصور الجديدة مصفوفة.' })
  @IsString({ each: true, message: 'يجب أن تكون روابط الصور نصوصاً.' })
  readonly newImages?: string[];
}
