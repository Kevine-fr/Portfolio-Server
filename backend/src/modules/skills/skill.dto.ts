import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSkillDto {
  @IsString() name: string;
  @IsIn(['frontend', 'backend', 'tools', 'design', 'other']) category: string;
  @IsInt() @Min(0) @Max(100) level: number;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() visible?: boolean;
}
export class UpdateSkillDto extends CreateSkillDto {}
