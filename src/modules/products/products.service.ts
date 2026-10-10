import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/get-product.dto';
import {
  Product,
  ProductOptions,
  ProductOptionsSelect,
  ProductSelect,
} from './constants/product.select';
import { createSlug } from '../../common/utils/createSlug';
import { buildMeta } from '../../common/utils/buildMeta';
import type { Prisma } from '@prisma/client';
import { StorageService } from '../../shared/storage/storage.service';
import { UploadFolder } from '../../shared/storage/enums/upload-folder.enum';
import { ProductImagesService } from '../product-images/product-images.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    filesOrCover?: Express.Multer.File | Express.Multer.File[],
  ): Promise<Product> {
    const {
      name,
      slug,
      image: dtoCoverImage,
      categoryId,
      price,
      quantity,
      images: dtoImages,
    } = createProductDto;

    const existingProduct = await this.prisma.product.findFirst({
      where: { name },
    });

    if (existingProduct) {
      throw new ConflictException('هذا المنتج موجود بالفعل.');
    }

    const productSlug = slug ? createSlug(slug) : createSlug(name);
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: productSlug },
    });

    if (existingSlug) {
      throw new ConflictException(
        'الاسم اللطيف (slug) لهذا المنتج موجود بالفعل.',
      );
    }

    if (categoryId) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!existingCategory) {
        throw new NotFoundException('التصنيف المحدد غير موجود.');
      }
    }

    let coverFile: Express.Multer.File | undefined;
    const newGalleryFiles: Express.Multer.File[] = [];

    if (filesOrCover) {
      if (Array.isArray(filesOrCover)) {
        for (const file of filesOrCover) {
          if (file.fieldname === 'image' || file.fieldname === 'cover') {
            coverFile = file;
          } else {
            newGalleryFiles.push(file);
          }
        }
      } else {
        coverFile = filesOrCover;
      }
    }

    const newlyUploadedUrls: string[] = [];
    let coverImageUrl: string | undefined = dtoCoverImage;

    if (coverFile) {
      const uploadResult = await this.storageService.uploadImage(
        coverFile,
        UploadFolder.PRODUCTS,
        'فشل رفع صورة المنتج.',
      );
      coverImageUrl = uploadResult.url;
      newlyUploadedUrls.push(coverImageUrl);
    }

    const galleryUrls: string[] = [];
    for (const file of newGalleryFiles) {
      const uploadResult = await this.storageService.uploadImage(
        file,
        UploadFolder.PRODUCTS,
        'فشل رفع صورة المعرض.',
      );
      galleryUrls.push(uploadResult.url);
      newlyUploadedUrls.push(uploadResult.url);
    }

    if (dtoImages && dtoImages.length > 0) {
      galleryUrls.push(...dtoImages);
    }

    try {
      return await this.prisma.product.create({
        data: {
          name,
          slug: productSlug,
          categoryId,
          price,
          quantity,
          image: coverImageUrl,
          ...(galleryUrls.length > 0 && {
            images: {
              create: galleryUrls.map((imgUrl, index) => ({
                imageUrl: imgUrl,
                isMain: index === 0,
              })),
            },
          }),
        },
        select: ProductSelect,
      });
    } catch (error) {
      for (const url of newlyUploadedUrls) {
        await this.storageService.cleanupUploadedFile(url);
      }
      throw error;
    }
  }

  async findAll(
    query: ProductQueryDto,
  ): Promise<{ data: Product[]; meta: any }> {
    const where = query.getWhere<Prisma.ProductWhereInput>([
      'name',
      'description',
    ]);

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.priceFrom !== undefined || query.priceTo !== undefined) {
      where.price = {
        ...(query.priceFrom !== undefined && { gte: query.priceFrom }),
        ...(query.priceTo !== undefined && { lte: query.priceTo }),
      };
    }

    if (query.quantityFrom !== undefined || query.quantityTo !== undefined) {
      where.quantity = {
        ...(query.quantityFrom !== undefined && { gte: query.quantityFrom }),
        ...(query.quantityTo !== undefined && { lte: query.quantityTo }),
      };
    }

    const orderBy = query.getOrderBy<
      | Prisma.ProductOrderByWithRelationInput
      | Prisma.ProductOrderByWithRelationInput[]
    >(['name', 'createdAt', 'price', 'quantity'], [{ createdAt: 'desc' }]);

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        select: ProductSelect,
        orderBy,
      }),
    ]);

    const meta = buildMeta(total, query.page, query.limit);
    return { data, meta };
  }

  async findOneById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: ProductSelect,
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    return product;
  }

  async findOneBySlug(slug: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: ProductSelect,
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    return product;
  }

  /**
   * تحديث المنتج وصور المعرض بالمعرف دون حذف وإعادة إنشاء جميع الصور
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    filesOrCover?: Express.Multer.File | Express.Multer.File[],
  ): Promise<Product> {
    const {
      name,
      slug,
      categoryId,
      price,
      quantity,
      deleteImageIds,
      updateImages,
      mainImageId,
      newImages,
    } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    const oldCoverUrl = product.image;

    // 1. تصنيف الملفات المرفوعة
    let coverFile: Express.Multer.File | undefined;
    const replacementFilesMap = new Map<string, Express.Multer.File>();
    const newGalleryFiles: Express.Multer.File[] = [];

    if (filesOrCover) {
      const filesList = Array.isArray(filesOrCover)
        ? filesOrCover
        : [filesOrCover];

      for (const file of filesList) {
        if (file.fieldname === 'image' || file.fieldname === 'cover') {
          coverFile = file;
          continue;
        }

        // محاولة مطابقة الحقل بـ updateImages[i].fileField
        const mappedByField = updateImages?.find(
          (u) => u.fileField && u.fileField === file.fieldname,
        );
        if (mappedByField) {
          replacementFilesMap.set(mappedByField.id, file);
          continue;
        }

        // محاولة مطابقة الحقل مع الصيغ: replaceImage_<id>, replace_<id>, image_<id>, gallery_<id>
        const replaceMatch = file.fieldname.match(
          /^(?:replaceImage_|replace_|image_|gallery_)(.+)$/,
        );
        if (replaceMatch && replaceMatch[1]) {
          const targetId = replaceMatch[1];
          replacementFilesMap.set(targetId, file);
          continue;
        }

        // مطابقة الحقل مع صيغة المصفوفة: images[<id>]
        const bracketMatch = file.fieldname.match(/^images\[(.+)\]$/);
        if (bracketMatch && bracketMatch[1]) {
          const targetId = bracketMatch[1];
          replacementFilesMap.set(targetId, file);
          continue;
        }

        // إن كان اسم الحقل هو المعرف مباشرة لأحد صور المنتج
        if (product.images.some((img) => img.id === file.fieldname)) {
          replacementFilesMap.set(file.fieldname, file);
          continue;
        }

        // إن لم يكن استبدالاً لصورة موجودة، يُعتبر صورة معرض جديدة
        newGalleryFiles.push(file);
      }
    }

    // 2. التحقق الصارم من صحة المعرفات وضمان تبعيتها لنفس المنتج
    if (deleteImageIds && deleteImageIds.length > 0) {
      for (const delId of deleteImageIds) {
        const belongs = product.images.some((img) => img.id === delId);
        if (!belongs) {
          throw new BadRequestException(
            `الصورة المطلوب حذفها (${delId}) غير موجودة أو لا تنتمي لهذا المنتج.`,
          );
        }
      }
    }

    if (updateImages && updateImages.length > 0) {
      for (const item of updateImages) {
        const belongs = product.images.some((img) => img.id === item.id);
        if (!belongs) {
          throw new BadRequestException(
            `الصورة المطلوب تعديلها (${item.id}) غير موجودة أو لا تنتمي لهذا المنتج.`,
          );
        }
      }
    }

    for (const targetId of replacementFilesMap.keys()) {
      const belongs = product.images.some((img) => img.id === targetId);
      if (!belongs) {
        throw new BadRequestException(
          `الملف المرفوع مرتبط بصورة غير موجودة أو لا تنتمي لهذا المنتج (${targetId}).`,
        );
      }
    }

    if (mainImageId) {
      const belongs = product.images.some((img) => img.id === mainImageId);
      if (!belongs) {
        throw new BadRequestException(
          `الصورة الرئيسية المحددة (${mainImageId}) غير موجودة أو لا تنتمي لهذا المنتج.`,
        );
      }
    }

    if (deleteImageIds && deleteImageIds.length > 0) {
      for (const delId of deleteImageIds) {
        if (
          replacementFilesMap.has(delId) ||
          updateImages?.some((u) => u.id === delId)
        ) {
          throw new BadRequestException(
            `لا يمكن تعديل الصورة (${delId}) وحذفها في نفس الطلب.`,
          );
        }
      }
    }

    // 3. التحقق من تفرد الاسم والرابط اللطيف والتصنيف
    if (name !== undefined && name !== product.name) {
      const existingByName = await this.prisma.product.findFirst({
        where: { name },
      });
      if (existingByName && existingByName.id !== id) {
        throw new ConflictException('هذا المنتج موجود بالفعل.');
      }
    }

    let productSlug: string | undefined;
    if (slug !== undefined) {
      productSlug = createSlug(slug);
      const existingBySlug = await this.prisma.product.findUnique({
        where: { slug: productSlug },
      });
      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException(
          'الاسم اللطيف (slug) لهذا المنتج موجود بالفعل.',
        );
      }
    }

    if (categoryId !== undefined && categoryId !== product.categoryId) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!existingCategory) {
        throw new NotFoundException('التصنيف المحدد غير موجود.');
      }
    }

    // 4. رفع الملفات الجديدة وتتبعها للتنظيف في حال فشل قاعدة البيانات
    const newlyUploadedUrls: string[] = [];

    let newCoverUrl: string | undefined;
    if (coverFile) {
      const uploadResult = await this.storageService.uploadImage(
        coverFile,
        UploadFolder.PRODUCTS,
        'فشل رفع صورة المنتج.',
      );
      newCoverUrl = uploadResult.url;
      newlyUploadedUrls.push(newCoverUrl);
    } else if (updateProductDto.image !== undefined) {
      newCoverUrl = updateProductDto.image;
    }

    const replacedImagesMap = new Map<
      string,
      { newUrl: string; oldUrl: string }
    >();

    for (const [targetId, file] of replacementFilesMap.entries()) {
      const uploadResult = await this.storageService.uploadImage(
        file,
        UploadFolder.PRODUCTS,
        'فشل رفع صورة المعرض.',
      );
      newlyUploadedUrls.push(uploadResult.url);
      const existingImg = product.images.find((img) => img.id === targetId)!;
      replacedImagesMap.set(targetId, {
        newUrl: uploadResult.url,
        oldUrl: existingImg.imageUrl,
      });
    }

    if (updateImages) {
      for (const item of updateImages) {
        if (item.imageUrl && !replacedImagesMap.has(item.id)) {
          const existingImg = product.images.find((img) => img.id === item.id)!;
          if (item.imageUrl !== existingImg.imageUrl) {
            replacedImagesMap.set(item.id, {
              newUrl: item.imageUrl,
              oldUrl: existingImg.imageUrl,
            });
          }
        }
      }
    }

    const createdGalleryUrls: string[] = [];
    for (const file of newGalleryFiles) {
      const uploadResult = await this.storageService.uploadImage(
        file,
        UploadFolder.PRODUCTS,
        'فشل رفع صورة المعرض.',
      );
      newlyUploadedUrls.push(uploadResult.url);
      createdGalleryUrls.push(uploadResult.url);
    }

    if (newImages && newImages.length > 0) {
      createdGalleryUrls.push(...newImages);
    }

    // 5. تنفيذ العمليات داخل معاملة Prisma لضمان اتساق البيانات
    let updatedProduct: Product;
    try {
      updatedProduct = await this.prisma.$transaction(async (tx) => {
        // تحديث بيانات المنتج الأساسية وصورة الغلاف
        await tx.product.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(productSlug !== undefined && { slug: productSlug }),
            ...(categoryId !== undefined && { categoryId }),
            ...(price !== undefined && { price }),
            ...(quantity !== undefined && { quantity }),
            ...(newCoverUrl !== undefined && { image: newCoverUrl }),
          },
        });

        // حذف الصور المحددة صراحة فقط
        if (deleteImageIds && deleteImageIds.length > 0) {
          await tx.productImage.deleteMany({
            where: {
              id: { in: deleteImageIds },
              productId: id,
            },
          });
        }

        // تحديد ما إذا تم تحديد صورة رئيسية للمعرض
        const targetMainImageId =
          mainImageId || updateImages?.find((u) => u.isMain === true)?.id;

        if (targetMainImageId) {
          await tx.productImage.updateMany({
            where: {
              productId: id,
              id: { not: targetMainImageId },
            },
            data: { isMain: false },
          });
        }

        // تحديث الصور الموجودة التي تم استبدال ملفاتها أو عناوينها
        for (const [imageId, { newUrl }] of replacedImagesMap.entries()) {
          const updatePayload: Prisma.ProductImageUpdateInput = {
            imageUrl: newUrl,
          };
          const explicitItem = updateImages?.find((u) => u.id === imageId);
          if (explicitItem?.isMain !== undefined) {
            updatePayload.isMain = explicitItem.isMain;
          } else if (targetMainImageId === imageId) {
            updatePayload.isMain = true;
          }
          await tx.productImage.update({
            where: { id: imageId },
            data: updatePayload,
          });
        }

        // تحديث الصور التي عُدلت خصائصها بدون استبدال الرابط
        if (updateImages) {
          for (const item of updateImages) {
            if (!replacedImagesMap.has(item.id)) {
              const updatePayload: Prisma.ProductImageUpdateInput = {};
              if (item.isMain !== undefined) {
                updatePayload.isMain = item.isMain;
              } else if (targetMainImageId === item.id) {
                updatePayload.isMain = true;
              }
              if (item.imageUrl !== undefined) {
                updatePayload.imageUrl = item.imageUrl;
              }
              if (Object.keys(updatePayload).length > 0) {
                await tx.productImage.update({
                  where: { id: item.id },
                  data: updatePayload,
                });
              }
            }
          }
        } else if (
          targetMainImageId &&
          !replacedImagesMap.has(targetMainImageId)
        ) {
          await tx.productImage.update({
            where: { id: targetMainImageId },
            data: { isMain: true },
          });
        }

        // إضافة الصور الجديدة دون المساس بالصور القديمة
        if (createdGalleryUrls.length > 0) {
          await tx.productImage.createMany({
            data: createdGalleryUrls.map((url) => ({
              productId: id,
              imageUrl: url,
              isMain: false,
            })),
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id },
          select: ProductSelect,
        });
      });
    } catch (dbError) {
      // تنظيف الملفات الجديدة المرفوعة في حال فشل المعاملة دون حجب الخطأ الأصلي
      for (const url of newlyUploadedUrls) {
        await this.storageService.cleanupUploadedFile(url);
      }
      throw dbError;
    }

    // 6. حذف الملفات الفيزيائية القديمة بأمان فقط بعد نجاح المعاملة
    if (
      newCoverUrl !== undefined &&
      oldCoverUrl &&
      oldCoverUrl !== newCoverUrl
    ) {
      await this.productImagesService.safelyDeleteOrphanedFile(oldCoverUrl);
    }

    for (const { oldUrl, newUrl } of replacedImagesMap.values()) {
      if (oldUrl && oldUrl !== newUrl) {
        await this.productImagesService.safelyDeleteOrphanedFile(oldUrl);
      }
    }

    if (deleteImageIds && deleteImageIds.length > 0) {
      for (const delId of deleteImageIds) {
        const deletedRecord = product.images.find((img) => img.id === delId);
        if (deletedRecord?.imageUrl) {
          await this.productImagesService.safelyDeleteOrphanedFile(
            deletedRecord.imageUrl,
          );
        }
      }
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود.');
    }

    const candidateUrls: string[] = [];
    if (product.image) candidateUrls.push(product.image);
    if (product.images) {
      for (const img of product.images) {
        if (img.imageUrl) candidateUrls.push(img.imageUrl);
      }
    }

    await this.prisma.product.delete({
      where: { id },
    });

    const uniqueUrls = [...new Set(candidateUrls)];
    for (const url of uniqueUrls) {
      await this.productImagesService.safelyDeleteOrphanedFile(url);
    }
  }

  async findAllOptions(): Promise<ProductOptions[]> {
    return await this.prisma.product.findMany({
      select: ProductOptionsSelect,
      orderBy: { name: 'asc' },
    });
  }
}
