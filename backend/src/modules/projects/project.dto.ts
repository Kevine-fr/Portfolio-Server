import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, ArrayMaxSize,
} from 'class-validator';

export class CreateProjectDto {
  @IsString() title: string;
  @IsString() slug: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() longDescription?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) techStack?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  // Accept either a full URL (legacy) or a relative path like /uploads/xyz.jpg
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30, { message: 'La galerie est limitée à 30 images' })
  @IsString({ each: true }) gallery?: string[];
  @IsOptional() @IsString() demoVideo?: string;

  @IsOptional() @IsUrl() liveUrl?: string;
  @IsOptional() @IsUrl() repoUrl?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsIn(['draft', 'published', 'archived']) status?: string;
  @IsOptional() @IsInt() year?: number;
}

export class UpdateProjectDto extends CreateProjectDto {}
