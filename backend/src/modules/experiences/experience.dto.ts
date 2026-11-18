import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmptyToNull } from '../../common/transformers';

export class CreateExperienceDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(200) company: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate: string;
  // '' / null clears the end date (e.g. when the position becomes current)
  @EmptyToNull() @IsOptional() @IsDateString() endDate?: string | null;
  @IsOptional() @IsBoolean() current?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) techStack?: string[];
  @IsOptional() @IsInt() order?: number;
}
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}
