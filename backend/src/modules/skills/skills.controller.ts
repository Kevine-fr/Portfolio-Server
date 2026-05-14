import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SkillsService } from './skills.service';
import { CreateSkillDto, UpdateSkillDto } from './skill.dto';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}
  @Get() findAll(@Query() q: any) { return this.skills.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.skills.findOne(id); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post()
  create(@Body() dto: CreateSkillDto) { return this.skills.create(dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSkillDto) { return this.skills.update(id, dto); }
  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.skills.remove(id); }
}
