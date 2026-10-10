import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { StorageModule } from '../../shared/storage/storage.module';
import { ProductImagesModule } from '../product-images/product-images.module';

@Module({
  imports: [StorageModule, ProductImagesModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
