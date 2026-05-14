import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  // Public read
  @Get() findAll(@Query() q: any) { return this.projects.findAll(q); }
  @Get('slug/:slug') findBySlug(@Param('slug') slug: string) { return this.projects.findBySlug(slug); }
  @Get(':id') findOne(@Param('id') id: string) { return this.projects.findOne(id); }

  // Protected write
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post()
  create(@Body() dto: CreateProjectDto) { return this.projects.create(dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.projects.remove(id); }
}
