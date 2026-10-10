import { IsIn, IsOptional } from 'class-validator';
import { BaseQueryDto } from '../../../common/dto/BaseQueryDto';

export class CategoryQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsIn(['name', 'createdAt'], {
    message: 'حقل الترتيب يجب أن يكون أحد الحقول التالية: name, createdAt',
  })
  declare readonly sortBy?: string;
}
