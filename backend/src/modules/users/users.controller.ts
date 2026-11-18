import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get() findAll() { return this.users.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.users.findById(id); }
  @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.users.update(id, dto, req.user?.id);
  }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: any) {
    return this.users.remove(id, req.user?.id);
  }
}
