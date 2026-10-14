import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('code/:code')
  @ResponseMessage('تم جلب تفاصيل كوبون الخصم بنجاح.')
  findByCode(@Param('code') code: string) {
    return this.couponsService.findByCode(code);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم التحقق من صلاحية الكوبون بنجاح.')
  validate(@Body() validateCouponDto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(validateCouponDto);
  }
}
