import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, MaxLength,
} from 'class-validator';
import { EmptyToNull } from '../../common/transformers';
import { CONTENT_FORMATS, PROJECT_STATUSES } from './project.schema';

export class CreateProjectDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, { message: 'slug : lettres, chiffres et tirets uniquement' })
  @MaxLength(120) slug: string;
  @IsOptional() @IsString() @MaxLength(300) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() longDescription?: string;
  @IsOptional() @IsIn(CONTENT_FORMATS) contentFormat?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) techStack?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  // Accept either a full URL (legacy) or a relative path like /uploads/xyz.jpg.
  // null clears the field (removing a cover/video from the admin).
  @IsOptional() @IsString() coverImage?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30, { message: 'La galerie est limitée à 30 images' })
  @IsString({ each: true }) gallery?: string[];
  @IsOptional() @IsString() demoVideo?: string | null;

  @EmptyToNull() @IsOptional() @IsUrl() liveUrl?: string | null;
  @EmptyToNull() @IsOptional() @IsUrl() repoUrl?: string | null;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsIn(PROJECT_STATUSES) status?: string;
  @EmptyToNull() @IsOptional() @IsInt() year?: number | null;
}

/** PATCH semantics: every field optional (used to require the full object). */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
