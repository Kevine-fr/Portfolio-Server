import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('admin') @Get() findAll() { return this.users.findAll(); }
  @Roles('admin') @Get(':id') findOne(@Param('id') id: string) { return this.users.findById(id); }
  @Roles('admin') @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Roles('admin') @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
  @Roles('admin') @Delete(':id') remove(@Param('id') id: string) { return this.users.remove(id); }
}
