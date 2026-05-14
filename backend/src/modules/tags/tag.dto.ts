import { IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateTagDto extends CreateTagDto {}
