import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ResponseMessage('تم جلب عربة التسوق بنجاح.')
  getCart(@CurrentUser() user: RequestUser) {
    return this.cartService.getCart(user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم تفريغ عربة التسوق بنجاح.')
  clearCart(@CurrentUser() user: RequestUser) {
    return this.cartService.clearCart(user.id);
  }
}
