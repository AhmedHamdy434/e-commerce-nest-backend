import { Module } from '@nestjs/common';
import { OrderItemsService } from './order-items.service';

@Module({
  providers: [OrderItemsService],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
