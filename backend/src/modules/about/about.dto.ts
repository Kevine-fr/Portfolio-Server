import {
  IsArray, IsInt, IsOptional, IsString, ValidateNested,
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

export class UpdateAboutDto {
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() title?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimelineEntryDto)
  timeline?: TimelineEntryDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ValueEntryDto)
  values?: ValueEntryDto[];
}
