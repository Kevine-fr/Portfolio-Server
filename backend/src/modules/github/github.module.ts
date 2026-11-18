import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AboutModule } from '../about/about.module';
import { Project, ProjectSchema } from '../projects/project.schema';
import { Skill, SkillSchema } from '../skills/skill.schema';
import { Experience, ExperienceSchema } from '../experiences/experience.schema';
import { Education, EducationSchema } from '../education/education.schema';
import { GithubSettings, GithubSettingsSchema } from './github-settings.schema';
import { GithubClient } from './github.client';
import { GithubSettingsService } from './github-settings.service';
import { GithubSyncService } from './github-sync.service';
import { GithubController } from './github.controller';

@Module({
  imports: [
    AboutModule,
    MongooseModule.forFeature([
      { name: GithubSettings.name, schema: GithubSettingsSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Skill.name, schema: SkillSchema },
      { name: Experience.name, schema: ExperienceSchema },
      { name: Education.name, schema: EducationSchema },
    ]),
  ],
  controllers: [GithubController],
  providers: [GithubClient, GithubSettingsService, GithubSyncService],
  exports: [GithubSyncService, GithubSettingsService],
})
export class GithubModule {}
