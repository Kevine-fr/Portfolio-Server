import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EducationService } from './education.service';
import { CreateEducationDto, UpdateEducationDto } from './education.dto';

@ApiTags('education')
@Controller('education')
export class EducationController {
  constructor(private readonly education: EducationService) {}
  @Get() findAll() { return this.education.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.education.findOne(id); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post()
  create(@Body() dto: CreateEducationDto) { return this.education.create(dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEducationDto) { return this.education.update(id, dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.education.remove(id); }
}
