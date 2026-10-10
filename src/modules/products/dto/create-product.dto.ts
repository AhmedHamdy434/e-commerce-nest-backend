import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ToStringArray } from 'src/common/decorators/to-string-array.decorator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'اسم المنتج مطلوب.' })
  @IsString({ message: 'يجب أن يكون الاسم نصاً.' })
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط المنتج نصاً.' })
  readonly slug?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط الصورة نصاً.' })
  readonly image?: string;

  @IsNotEmpty({ message: 'يجب أن يكون القسم مطلوب.' })
  @IsString({ message: 'يجب أن يكون القسم نصاً.' })
  readonly categoryId: string;

  @IsNotEmpty({ message: 'يجب أن يكون السعر مطلوب.' })
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: 'يجب أن يكون السعر رقماً.' })
  readonly price: number;

  @IsNotEmpty({ message: 'يجب أن تكون الكمية مطلوبة.' })
  @Transform(({ value }) => Number(value))
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'يجب أن تكون الكمية رقماً صحيحاً.' },
  )
  readonly quantity: number;

  @IsOptional()
  @ToStringArray()
  @IsArray({ message: 'يجب أن تكون الصور مصفوفة.' })
  @IsString({ each: true, message: 'يجب أن تكون الصور نصوصاً.' })
  readonly images?: string[];
}
