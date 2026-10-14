import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class UpdateReviewApprovalDto {
  @ToBoolean()
  @IsNotEmpty({ message: 'حالة الموافقة مطلوبة.' })
  @IsBoolean({ message: 'حالة الموافقة يجب أن تكون قيمة منطقية (true/false).' })
  readonly isApproved: boolean;
}
