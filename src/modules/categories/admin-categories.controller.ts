import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/get-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ImageValidationPipe } from 'src/shared/storage';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ResponseMessage('تم جلب التصنيفات بنجاح.')
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل التصنيف بنجاح.')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOneById(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تم إنشاء التصنيف بنجاح.')
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile(ImageValidationPipe(false)) image?: Express.Multer.File,
  ) {
    return this.categoriesService.create(createCategoryDto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ResponseMessage('تم تحديث التصنيف بنجاح.')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile(ImageValidationPipe(false)) image?: Express.Multer.File,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, image);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف التصنيف بنجاح.')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Get('options')
  @ResponseMessage('تم جلب خيارات التصنيفات بنجاح.')
  findAllOptions() {
    return this.categoriesService.findAllOptions();
  }
}
