import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponQueryDto } from './dto/get-coupon.dto';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ResponseMessage('تم جلب كوبونات الخصم بنجاح.')
  findAll(@Query() query: CouponQueryDto) {
    return this.couponsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل كوبون الخصم بنجاح.')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOneById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تم إنشاء كوبون الخصم بنجاح.')
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Patch(':id')
  @ResponseMessage('تم تحديث كوبون الخصم بنجاح.')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف كوبون الخصم بنجاح.')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }

  @Get('options')
  @ResponseMessage('تم جلب خيارات كوبونات الخصم بنجاح.')
  findAllOptions() {
    return this.couponsService.findAllOptions();
  }
}
