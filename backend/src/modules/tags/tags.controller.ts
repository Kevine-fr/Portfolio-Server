import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './tag.dto';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}
  @Get() findAll() { return this.tags.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.tags.findOne(id); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post()
  create(@Body() dto: CreateTagDto) { return this.tags.create(dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) { return this.tags.update(id, dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.tags.remove(id); }
}
