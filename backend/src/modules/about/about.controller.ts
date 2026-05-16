import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AboutService } from './about.service';
import { UpdateAboutDto } from './about.dto';

@ApiTags('about')
@Controller('about')
export class AboutController {
  constructor(private readonly service: AboutService) {}

  // Public — consumed by the portfolio frontend
  @Get()
  get() {
    return this.service.get();
  }

  // Protected — admin only
  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Body() dto: UpdateAboutDto) {
    return this.service.update(dto);
  }
}
