import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class UpdateProductImageDto {
  @IsNotEmpty({ message: 'معرف الصورة مطلوب.' })
  @IsString({ message: 'يجب أن يكون معرف الصورة نصاً.' })
  id: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'يجب أن تكون قيمة الصورة الرئيسية منطقية.' })
  isMain?: boolean;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط الصورة نصاً.' })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: 'يجب أن يكون اسم حقل الملف نصاً.' })
  fileField?: string;
}
