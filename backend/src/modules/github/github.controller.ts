import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { GithubClient } from './github.client';
import { GithubSettingsService } from './github-settings.service';
import { GithubSyncService } from './github-sync.service';
import { ProjectAutoSyncDto, RepoSelectionDto, UpdateGithubSettingsDto } from './github.dto';

@ApiTags('github')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('github')
export class GithubController {
  constructor(
    private readonly settings: GithubSettingsService,
    private readonly sync: GithubSyncService,
    private readonly client: GithubClient,
  ) {}

  @Get('settings')
  async getSettings() {
    const s = await this.settings.get();
    return {
      ...s,
      effectiveUsername: this.settings.effectiveUsername(s),
      tokenConfigured: this.client.hasToken(),
    };
  }

  @Roles('admin')
  @Put('settings')
  async updateSettings(@Body() dto: UpdateGithubSettingsDto) {
    const s = await this.settings.update(dto);
    return { ...s, effectiveUsername: this.settings.effectiveUsername(s), tokenConfigured: this.client.hasToken() };
  }

  @Get('status')
  status() {
    return this.sync.status();
  }

  @Get('repos')
  repos() {
    return this.sync.listRepos();
  }

  @Put('repos/:name/selection')
  async selectRepo(@Param('name') name: string, @Body() dto: RepoSelectionDto) {
    const s = await this.settings.setRepoIncluded(name, dto.included);
    return { selectedRepos: s.selectedRepos, excludedRepos: s.excludedRepos };
  }

  @Put('projects/:id/auto-sync')
  projectAutoSync(@Param('id') id: string, @Body() dto: ProjectAutoSyncDto) {
    return this.sync.setProjectAutoSync(id, dto.autoSync);
  }

  @HttpCode(200)
  @Post('sync')
  runSync() {
    return this.sync.sync('manual');
  }
}
