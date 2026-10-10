import { Controller, Get, Param } from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ProductImagesService } from './product-images.service';

@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Get()
  @ResponseMessage('تم جلب صور المنتج بنجاح.')
  findAll(@Param('productId') productId: string) {
    return this.productImagesService.findAll(productId);
  }
}
