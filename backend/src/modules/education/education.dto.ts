import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmptyToNull } from '../../common/transformers';

export class CreateEducationDto {
  @IsString() @MaxLength(200) school: string;
  @IsString() @MaxLength(200) degree: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate: string;
  // The admin form sends '' when there is no end date: it used to fail with 400
  @EmptyToNull() @IsOptional() @IsDateString() endDate?: string | null;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() order?: number;
}
export class UpdateEducationDto extends PartialType(CreateEducationDto) {}
