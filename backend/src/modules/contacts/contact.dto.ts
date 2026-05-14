import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MinLength(10) message: string;
}

export class UpdateContactDto {
  @IsOptional() @IsBoolean() read?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
}
