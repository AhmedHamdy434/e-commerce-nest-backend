import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/get-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ResponseMessage('تم جلب المنتجات بنجاح.')
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل المنتج بنجاح.')
  findOneById(@Param('id') id: string) {
    return this.productsService.findOneById(id);
  }

  @Get('slug/:slug')
  @ResponseMessage('تم جلب تفاصيل المنتج بنجاح.')
  findOneBySlug(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  @Get('options')
  @ResponseMessage('تم جلب خيارات المنتجات بنجاح.')
  findAllOptions() {
    return this.productsService.findAllOptions();
  }
}
