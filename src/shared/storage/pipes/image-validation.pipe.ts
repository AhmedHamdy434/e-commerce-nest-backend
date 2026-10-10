import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import 'multer';
import { verifyImageMagicBytes } from '../utils/image-magic-bytes.util';

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

@Injectable()
export class ImageValidationPipeInstance implements PipeTransform<
  Express.Multer.File | Express.Multer.File[] | undefined,
  Express.Multer.File | Express.Multer.File[] | undefined
> {
  constructor(private readonly required: boolean = true) {}

  private validateSingleFile(file: Express.Multer.File): void {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `حجم الصورة (${file.originalname}) يجب ألا يتجاوز ${MAX_IMAGE_SIZE_MB} ميجابايت.`,
      );
    }

    if (!file.buffer) {
      throw new BadRequestException(
        `فشل قراءة محتوى الملف المرفوع (${file.originalname}).`,
      );
    }

    verifyImageMagicBytes(file.buffer, file.originalname, file.mimetype);
  }

  transform(
    files?: Express.Multer.File | Express.Multer.File[],
  ): Express.Multer.File | Express.Multer.File[] | undefined {
    if (!files || (Array.isArray(files) && files.length === 0)) {
      if (this.required) {
        throw new BadRequestException('يرجى اختيار صورة للرفع.');
      }
      return files;
    }

    if (Array.isArray(files)) {
      for (const file of files) {
        this.validateSingleFile(file);
      }
      return files;
    }

    this.validateSingleFile(files);
    return files;
  }
}

export function ImageValidationPipe(required = true): PipeTransform {
  return new ImageValidationPipeInstance(required);
}
