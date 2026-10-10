import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { ProductImagesService } from './product-images.service';
import { ProductImagesController } from './product-images.controller';
import { AdminProductImagesController } from './admin-product-images.controller';

@Module({
  imports: [StorageModule],
  controllers: [ProductImagesController, AdminProductImagesController],
  providers: [ProductImagesService],
  exports: [ProductImagesService],
})
export class ProductImagesModule {}
