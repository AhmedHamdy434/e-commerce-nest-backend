import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImageValidationPipe } from '../../shared/storage';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductImagesService } from './product-images.service';
import { UploadProductImagesDto } from './dto/upload-product-images.dto';

@Controller('admin/products/:productId/images')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
export class AdminProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Get()
  @ResponseMessage('تم جلب صور المنتج بنجاح.')
  findAll(@Param('productId') productId: string) {
    return this.productImagesService.findAll(productId);
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('تمت إضافة صور المنتج بنجاح.')
  uploadImages(
    @Param('productId') productId: string,
    @Body() dto: UploadProductImagesDto,
    @UploadedFiles(ImageValidationPipe(false)) files?: Express.Multer.File[],
  ) {
    return this.productImagesService.uploadAndCreateImages(
      productId,
      files,
      dto.images,
      dto.isMain,
    );
  }

  @Patch(':imageId/main')
  @ResponseMessage('تم تعيين الصورة كصورة رئيسية بنجاح.')
  setMain(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.setMainImage(productId, imageId);
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('تم حذف صورة المنتج بنجاح.')
  remove(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.removeImage(productId, imageId);
  }
}
