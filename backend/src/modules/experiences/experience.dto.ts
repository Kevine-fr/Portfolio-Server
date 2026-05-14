import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateExperienceDto {
  @IsString() title: string;
  @IsString() company: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() current?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) achievements?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) techStack?: string[];
  @IsOptional() @IsInt() order?: number;
}
export class UpdateExperienceDto extends CreateExperienceDto {}
