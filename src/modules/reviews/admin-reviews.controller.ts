import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/get-review.dto';
import { UpdateReviewApprovalDto } from './dto/update-review-approval.dto';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ResponseMessage('تم جلب التقييمات بنجاح.')
  findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllAdmin(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل التقييم بنجاح.')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOneAdmin(id);
  }

  @Patch(':id/approval')
  @ResponseMessage('تم تحديث حالة اعتماد التقييم بنجاح.')
  updateApproval(
    @Param('id') id: string,
    @Body() updateApprovalDto: UpdateReviewApprovalDto,
  ) {
    return this.reviewsService.updateApprovalAdmin(id, updateApprovalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف التقييم بنجاح.')
  remove(@Param('id') id: string) {
    return this.reviewsService.removeAdmin(id);
  }
}
