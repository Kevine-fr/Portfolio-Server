import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './contact.dto';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  // Public — rate-limited to mitigate spam (5/minute per IP)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateContactDto, @Req() req: any) {
    return this.contacts.create(dto, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Get()
  findAll(@Query() q: any) { return this.contacts.findAll(q); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Get('unread-count')
  unreadCount() { return this.contacts.countUnread().then((count) => ({ count })); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Get(':id')
  findOne(@Param('id') id: string) { return this.contacts.findOne(id); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) { return this.contacts.update(id, dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Delete(':id')
  remove(@Param('id') id: string) { return this.contacts.remove(id); }
}
