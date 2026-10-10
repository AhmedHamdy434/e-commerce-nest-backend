import {
  Injectable,
  Inject,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import 'multer';
import { UploadFolder } from './enums/upload-folder.enum';
import { StoredFile } from './interfaces/stored-file.interface';
import type { IStorageProvider } from './interfaces/storage-provider.interface';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';

/**
 * خدمة التخزين المركزية (Facade/Context).
 * تفصل منطق الـ Business Logic تماماً عن آلية التخزين الفعلية (Local Disk, S3, etc.).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: IStorageProvider,
  ) {}

  /**
   * رفع وحفظ صورة وفق المزود المعتمد في النظام مع معالجة الأخطاء مركزياً
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder = UploadFolder.IMAGES,
    errorMessage: string = 'فشل رفع الملف.',
  ): Promise<StoredFile> {
    try {
      return await this.provider.upload(file, folder);
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `فشل غير متوقع أثناء رفع الملف إلى ${folder}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * حذف ملف بأمان وفق المزود المعتمد
   */
  async deleteFile(url: string | null | undefined): Promise<boolean> {
    return this.provider.delete(url);
  }

  /**
   * حذف صورة قديمة بأمان بعد اكتمال التحديث، مع التأكد من عدم حذف الصورة الجديدة
   * وتفادي إيقاف أو فشل عملية التحديث في حال فشل الحذف على مستوى التخزين.
   */
  async deleteOldImageSafely(
    oldImageUrl: string | null | undefined,
    newImageUrl?: string | null,
  ): Promise<boolean> {
    if (!oldImageUrl) {
      return false;
    }

    // تجنب حذف نفس الرابط إذا لم يتغير
    if (newImageUrl && oldImageUrl === newImageUrl) {
      return false;
    }

    try {
      return await this.deleteFile(oldImageUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `فشل حذف الصورة السابقة (${oldImageUrl}): ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      return false;
    }
  }

  /**
   * تنظيف ملف رُفع حديثاً في حال فشلت العملية اللاحقة في قاعدة البيانات
   * دون حجب الخطأ الأصلي
   */
  async cleanupUploadedFile(url: string | null | undefined): Promise<boolean> {
    if (!url) {
      return false;
    }

    try {
      return await this.deleteFile(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `فشل تنظيف الملف المرفوع حديثاً (${url}): ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      return false;
    }
  }

  /**
   * التحقق مما إذا كان الرابط يشير إلى ملف محلي داخل نظام التخزين الحالي
   */
  isLocalFile(url: string | null | undefined): boolean {
    return this.provider.isLocalFile(url);
  }

  /**
   * الحصول على المسار المطلق لمجلد التخزين الرئيسي
   */
  getBaseUploadDir(): string {
    return this.provider.getBaseUploadDir?.() || '';
  }
}
