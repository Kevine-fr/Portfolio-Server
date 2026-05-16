import {
  IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TimelineEntryDto {
  @IsString()             year: string;
  @IsString()             title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt()    order?: number;
}

class ValueEntryDto {
  @IsString()             icon: string;
  @IsString()             title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt()    order?: number;
}

class HeroStatDto {
  @IsString()             label: string;
  @IsNumber()             value: number;
  @IsOptional() @IsInt()    order?: number;
}

export class UpdateAboutDto {
  // Hero
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() tagline?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  roles?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HeroStatDto)
  stats?: HeroStatDto[];

  // About
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() cvUrl?: string;
  @IsOptional() @IsString() cvFilename?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimelineEntryDto)
  timeline?: TimelineEntryDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ValueEntryDto)
  values?: ValueEntryDto[];
}
