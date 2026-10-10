import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';
import { ToStringArray } from 'src/common/decorators/to-string-array.decorator';

export class UploadProductImagesDto {
  @IsOptional()
  @ToStringArray()
  @IsArray({ message: 'يجب أن تكون الصور مصفوفة.' })
  @IsString({ each: true, message: 'يجب أن تكون روابط الصور نصوصاً.' })
  readonly images?: string[];

  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'يجب أن تكون قيمة الصورة الرئيسية منطقية.' })
  readonly isMain?: boolean;
}
