import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsString() @MinLength(10) @MaxLength(5000) message: string;
}

export class UpdateContactDto {
  @IsOptional() @IsBoolean() read?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
}
