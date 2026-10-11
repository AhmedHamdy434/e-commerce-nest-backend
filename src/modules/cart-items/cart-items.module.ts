import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';

@Module({
  imports: [CartModule],
  controllers: [CartItemsController],
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}
