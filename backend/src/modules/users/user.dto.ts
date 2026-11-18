import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) @MaxLength(128) password: string;
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsOptional() @IsIn(['admin', 'editor']) role?: string;
  // Sent by the admin "Nouvel utilisateur" form — used to be rejected (400)
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) @MaxLength(128) password?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsIn(['admin', 'editor']) role?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
