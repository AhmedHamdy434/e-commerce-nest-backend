import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';
import { UploadFolder } from '../../shared/storage/enums/upload-folder.enum';
import type { ProductImage } from '@prisma/client';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * جلب جميع صور منتج معين
   */
  async findAll(productId: string): Promise<ProductImage[]> {
    await this.ensureProductExists(productId);

    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * رفع وإنشاء صور جديدة لمنتج معين (سواء عبر ملفات أو روابط)
   */
  async uploadAndCreateImages(
    productId: string,
    files?: Express.Multer.File[],
    urls?: string[],
    isMain?: boolean,
  ): Promise<ProductImage[]> {
    await this.ensureProductExists(productId);

    const newlyUploadedUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await this.storageService.uploadImage(
            file,
            UploadFolder.PRODUCTS,
            'فشل رفع صورة المعرض.',
          );
          newlyUploadedUrls.push(uploadResult.url);
        } catch (error) {
          await this.cleanupUploadedFiles(newlyUploadedUrls);
          throw error;
        }
      }
    }

    const allImageUrls: string[] = [...newlyUploadedUrls];
    if (urls && urls.length > 0) {
      allImageUrls.push(...urls);
    }

    if (allImageUrls.length === 0) {
      throw new BadRequestException('يجب تقديم صورة واحدة على الأقل.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingCount = await tx.productImage.count({
          where: { productId },
        });

        const shouldSetMain = isMain === true || existingCount === 0;

        if (shouldSetMain) {
          await tx.productImage.updateMany({
            where: { productId },
            data: { isMain: false },
          });
        }

        const createdImages: ProductImage[] = [];
        for (let i = 0; i < allImageUrls.length; i++) {
          const imgUrl = allImageUrls[i];
          const imageRecord = await tx.productImage.create({
            data: {
              productId,
              imageUrl: imgUrl,
              isMain: shouldSetMain && i === 0,
            },
          });
          createdImages.push(imageRecord);
        }

        return createdImages;
      });
    } catch (dbError) {
      await this.cleanupUploadedFiles(newlyUploadedUrls);
      throw dbError;
    }
  }

  /**
   * تعيين صورة كصورة رئيسية للمنتج
   */
  async setMainImage(
    productId: string,
    imageId: string,
  ): Promise<ProductImage> {
    await this.ensureProductExists(productId);

    const targetImage = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!targetImage) {
      throw new NotFoundException(
        'الصورة المحددة غير موجودة أو لا تنتمي لهذا المنتج.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: {
          productId,
          id: { not: imageId },
        },
        data: { isMain: false },
      });

      return tx.productImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });
    });
  }

  /**
   * حذف صورة محددة لمنتج مع حذف الملف الفيزيائي بأمان
   */
  async removeImage(productId: string, imageId: string): Promise<void> {
    await this.ensureProductExists(productId);

    const targetImage = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!targetImage) {
      throw new NotFoundException(
        'الصورة المحددة غير موجودة أو لا تنتمي لهذا المنتج.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: { id: imageId },
      });

      // إذا كانت هي الصورة الرئيسية وهناك صور أخرى متبقية، نجعل أقدم صورة هي الرئيسية
      if (targetImage.isMain) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId },
          orderBy: { createdAt: 'asc' },
        });

        if (nextImage) {
          await tx.productImage.update({
            where: { id: nextImage.id },
            data: { isMain: true },
          });
        }
      }
    });

    // حذف الملف القديم فيزيائياً بعد نجاح المعاملة إن لم يعد مستخدماً في أي مكان
    await this.safelyDeleteOrphanedFile(targetImage.imageUrl);
  }

  /**
   * حذف ملف قديم بأمان بعد التحقق من عدم بقاء أي إشارة إليه في المنتجات أو المعرض
   */
  async safelyDeleteOrphanedFile(
    url: string | null | undefined,
  ): Promise<void> {
    if (!url) return;

    const [countGallery, countCover] = await Promise.all([
      this.prisma.productImage.count({ where: { imageUrl: url } }),
      this.prisma.product.count({ where: { image: url } }),
    ]);

    if (countGallery === 0 && countCover === 0) {
      await this.storageService.deleteOldImageSafely(url);
    }
  }

  /**
   * تنظيف مجموعة من الملفات المرفوعة مؤخراً في حالة الفشل
   */
  async cleanupUploadedFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.storageService.cleanupUploadedFile(url);
    }
  }

  /**
   * رفع مصفوفة من ملفات المعرض وإرجاع روابطها
   */
  async uploadGalleryFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const uploadResult = await this.storageService.uploadImage(
          file,
          UploadFolder.PRODUCTS,
          'فشل رفع صورة المعرض.',
        );
        uploadedUrls.push(uploadResult.url);
      }
      return uploadedUrls;
    } catch (error) {
      await this.cleanupUploadedFiles(uploadedUrls);
      throw error;
    }
  }

  /**
   * التحقق من وجود المنتج
   */
  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }
  }
}
