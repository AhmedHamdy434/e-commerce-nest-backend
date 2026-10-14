import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/get-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تم إنشاء الطلب بنجاح.')
  create(
    @CurrentUser() user: RequestUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  @ResponseMessage('تم جلب قائمة الطلبات بنجاح.')
  findUserOrders(
    @CurrentUser() user: RequestUser,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findUserOrders(user.id, query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل الطلب بنجاح.')
  findOneUserOrder(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.findOneUserOrder(id, user.id);
  }

  @Patch(':id/cancel')
  @ResponseMessage('تم إلغاء الطلب بنجاح.')
  cancelUserOrder(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.cancelUserOrder(id, user.id);
  }
}
