import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  Category,
  CategoryOptions,
  CategoryOptionsSelect,
  CategorySelect,
} from './constants/category.select';
import { createSlug } from '../../common/utils/createSlug';
import { CategoryQueryDto } from './dto/get-category.dto';
import { buildMeta } from '../../common/utils/buildMeta';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { Prisma } from '@prisma/client';
import { StorageService, UploadFolder } from 'src/shared/storage';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    image?: Express.Multer.File,
  ): Promise<Category> {
    const { name, slug } = createCategoryDto;

    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException('هذا التصنيف موجود بالفعل.');
    }

    const categorySlug = slug ? createSlug(slug) : createSlug(name);
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (existingSlug) {
      throw new ConflictException(
        'الاسم اللطيف (slug) لهذا التصنيف موجود بالفعل.',
      );
    }
    let imageUrl = createCategoryDto.image;
    let isNewFileUploaded = false;

    if (image) {
      const uploadResult = await this.storageService.uploadImage(
        image,
        UploadFolder.CATEGORIES,
        'فشل رفع صورة التصنيف.',
      );
      imageUrl = uploadResult.url;
      isNewFileUploaded = true;
    }

    try {
      return await this.prisma.category.create({
        data: {
          name,
          slug: categorySlug,
          image: imageUrl,
        },
        select: CategorySelect,
      });
    } catch (error) {
      if (isNewFileUploaded && imageUrl) {
        await this.storageService.cleanupUploadedFile(imageUrl);
      }
      throw error;
    }
  }

  async findAll(
    query: CategoryQueryDto,
  ): Promise<{ data: Category[]; meta: any }> {
    const where = query.getWhere<Prisma.CategoryWhereInput>(['name']);

    const orderBy = query.getOrderBy<
      | Prisma.CategoryOrderByWithRelationInput
      | Prisma.CategoryOrderByWithRelationInput[]
    >(['name', 'createdAt'], [{ createdAt: 'desc' }]);

    const [total, data] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip: query.skip,
        take: query.take,
        select: CategorySelect,
        orderBy,
      }),
    ]);

    const meta = buildMeta(total, query.page, query.limit);
    return { data, meta };
  }

  async findOneById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: CategorySelect,
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود.');
    }

    return category;
  }

  async findOneBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: CategorySelect,
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود.');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    image?: Express.Multer.File,
  ): Promise<Category> {
    const { name, slug } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود.');
    }

    const oldImageUrl = category.image;

    if (name !== undefined && name !== category.name) {
      const existingByName = await this.prisma.category.findUnique({
        where: { name },
      });

      if (existingByName) {
        throw new ConflictException('هذا التصنيف موجود بالفعل.');
      }
    }

    let categorySlug: string | undefined;

    if (slug !== undefined) {
      categorySlug = createSlug(slug);

      const existingBySlug = await this.prisma.category.findUnique({
        where: { slug: categorySlug },
      });

      if (existingBySlug && existingBySlug.id !== id) {
        throw new ConflictException(
          'الاسم اللطيف (slug) لهذا التصنيف موجود بالفعل.',
        );
      }
    }

    let newImageUrl: string | undefined;
    let isNewFileUploaded = false;

    if (image) {
      const uploadResult = await this.storageService.uploadImage(
        image,
        UploadFolder.CATEGORIES,
        'فشل رفع صورة التصنيف.',
      );
      newImageUrl = uploadResult.url;
      isNewFileUploaded = true;
    } else if (updateCategoryDto.image !== undefined) {
      newImageUrl = updateCategoryDto.image;
    }

    let updatedCategory: Category;
    try {
      updatedCategory = await this.prisma.category.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(categorySlug !== undefined && { slug: categorySlug }),
          ...(newImageUrl !== undefined && { image: newImageUrl }),
        },
        select: CategorySelect,
      });
    } catch (dbError) {
      if (isNewFileUploaded && newImageUrl) {
        await this.storageService.cleanupUploadedFile(newImageUrl);
      }
      throw dbError;
    }

    if (
      newImageUrl !== undefined &&
      oldImageUrl &&
      oldImageUrl !== newImageUrl
    ) {
      await this.storageService.deleteOldImageSafely(oldImageUrl, newImageUrl);
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود.');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException(
        'لا يمكن حذف هذا التصنيف لأنه مرتبط بمنتجات.',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    // حذف الصورة بعد نجاح الحذف من قاعدة البيانات فقط
    if (category.image) {
      await this.storageService.deleteOldImageSafely(category.image);
    }
  }

  async findAllOptions(): Promise<CategoryOptions[]> {
    return await this.prisma.category.findMany({
      select: CategoryOptionsSelect,
      orderBy: { name: 'asc' },
    });
  }
}
