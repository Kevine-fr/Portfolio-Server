import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto, UpdateExperienceDto } from './experience.dto';

@ApiTags('experiences')
@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experiences: ExperiencesService) {}
  @Get() findAll() { return this.experiences.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.experiences.findOne(id); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post()
  create(@Body() dto: CreateExperienceDto) { return this.experiences.create(dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExperienceDto) { return this.experiences.update(id, dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.experiences.remove(id); }
}
