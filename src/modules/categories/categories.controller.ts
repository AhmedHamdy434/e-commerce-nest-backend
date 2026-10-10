import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/get-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ResponseMessage('تم جلب التصنيفات بنجاح.')
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل التصنيف بنجاح.')
  findOneById(@Param('id') id: string) {
    return this.categoriesService.findOneById(id);
  }

  @Get('slug/:slug')
  @ResponseMessage('تم جلب تفاصيل التصنيف بنجاح.')
  findOneBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlug(slug);
  }

  @Get('options')
  @ResponseMessage('تم جلب خيارات التصنيفات بنجاح.')
  findAllOptions() {
    return this.categoriesService.findAllOptions();
  }
}
