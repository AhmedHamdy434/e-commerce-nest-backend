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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/get-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImageValidationPipe } from '../../shared/storage';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ResponseMessage('تم جلب المنتجات بنجاح.')
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('تم جلب تفاصيل المنتج بنجاح.')
  findOne(@Param('id') id: string) {
    return this.productsService.findOneById(id);
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تم إنشاء المنتج بنجاح.')
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles(ImageValidationPipe(false)) files?: Express.Multer.File[],
  ) {
    return this.productsService.create(createProductDto, files);
  }

  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  @ResponseMessage('تم تحديث المنتج بنجاح.')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles(ImageValidationPipe(false)) files?: Express.Multer.File[],
  ) {
    return this.productsService.update(id, updateProductDto, files);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف المنتج بنجاح.')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get('options')
  @ResponseMessage('تم جلب خيارات المنتجات بنجاح.')
  findAllOptions() {
    return this.productsService.findAllOptions();
  }
}
