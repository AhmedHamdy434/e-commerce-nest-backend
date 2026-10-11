import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { CartItemsService } from './cart-items.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart/items')
@UseGuards(JwtAuthGuard)
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تمت إضافة المنتج إلى عربة التسوق بنجاح.')
  addItem(
    @CurrentUser() user: RequestUser,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    return this.cartItemsService.addItem(user.id, addCartItemDto);
  }

  @Patch(':id')
  @ResponseMessage('تم تحديث كمية المنتج في عربة التسوق بنجاح.')
  updateQuantity(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartItemsService.updateQuantity(user.id, id, updateCartItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف المنتج من عربة التسوق بنجاح.')
  removeItem(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.cartItemsService.removeItem(user.id, id);
  }
}
