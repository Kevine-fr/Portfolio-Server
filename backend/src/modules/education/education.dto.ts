import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEducationDto {
  @IsString() school: string;
  @IsString() degree: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() order?: number;
}
export class UpdateEducationDto extends CreateEducationDto {}
