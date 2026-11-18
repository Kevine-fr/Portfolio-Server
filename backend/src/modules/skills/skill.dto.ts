import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SKILL_CATEGORIES } from './skill.schema';

export class CreateSkillDto {
  @IsString() @MaxLength(80) name: string;
  @IsIn(SKILL_CATEGORIES) category: string;
  @IsInt() @Min(0) @Max(100) level: number;
  @IsOptional() @IsString() icon?: string | null;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() visible?: boolean;
}
export class UpdateSkillDto extends PartialType(CreateSkillDto) {}
