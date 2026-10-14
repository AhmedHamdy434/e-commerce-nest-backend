import { CreateReviewDto } from './create-review.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}
