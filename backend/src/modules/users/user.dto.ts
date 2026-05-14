import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() name: string;
  @IsOptional() @IsIn(['admin', 'editor']) role?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['admin', 'editor']) role?: string;
  @IsOptional() isActive?: boolean;
}
