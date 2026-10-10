import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'اسم القسم مطلوب.' })
  @IsString({ message: 'يجب أن يكون الاسم نصاً.' })
  readonly name: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط القسم نصاً.' })
  readonly slug?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط الصورة نصاً.' })
  readonly image?: string;
}
