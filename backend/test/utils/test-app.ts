import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { configureApp } from '../../src/app.setup';
import { MongoExceptionFilter } from '../../src/common/mongo-exception.filter';
import { HealthController } from '../../src/health.controller';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { ProjectsModule } from '../../src/modules/projects/projects.module';
import { SkillsModule } from '../../src/modules/skills/skills.module';
import { ExperiencesModule } from '../../src/modules/experiences/experiences.module';
import { EducationModule } from '../../src/modules/education/education.module';
import { TagsModule } from '../../src/modules/tags/tags.module';
import { ContactsModule } from '../../src/modules/contacts/contacts.module';
import { UploadsModule } from '../../src/modules/uploads/uploads.module';
import { AboutModule } from '../../src/modules/about/about.module';
import { GithubModule } from '../../src/modules/github/github.module';
import { MailModule } from '../../src/mail/mail.module';
import { User, UserSchema } from '../../src/modules/users/user.schema';
import { Project, ProjectSchema } from '../../src/modules/projects/project.schema';
import { Skill, SkillSchema } from '../../src/modules/skills/skill.schema';
import { Experience, ExperienceSchema } from '../../src/modules/experiences/experience.schema';
import { Education, EducationSchema } from '../../src/modules/education/education.schema';
import { Tag, TagSchema } from '../../src/modules/tags/tag.schema';
import { Contact, ContactSchema } from '../../src/modules/contacts/contact.schema';
import { About, AboutSchema } from '../../src/modules/about/about.schema';
import { GithubSettings, GithubSettingsSchema } from '../../src/modules/github/github-settings.schema';
import { createMemoryModel, MemoryModel } from './memory-model';

export interface TestModels {
  users: MemoryModel;
  projects: MemoryModel;
  skills: MemoryModel;
  experiences: MemoryModel;
  education: MemoryModel;
  tags: MemoryModel;
  contacts: MemoryModel;
  about: MemoryModel;
  githubSettings: MemoryModel;
}

export function createModels(): TestModels {
  return {
    users: createMemoryModel(User.name, UserSchema),
    projects: createMemoryModel(Project.name, ProjectSchema),
    skills: createMemoryModel(Skill.name, SkillSchema),
    experiences: createMemoryModel(Experience.name, ExperienceSchema),
    education: createMemoryModel(Education.name, EducationSchema),
    tags: createMemoryModel(Tag.name, TagSchema),
    contacts: createMemoryModel(Contact.name, ContactSchema),
    about: createMemoryModel(About.name, AboutSchema),
    githubSettings: createMemoryModel(GithubSettings.name, GithubSettingsSchema),
  };
}

/**
 * Full HTTP application (same global config as production) backed by
 * in-memory models — no MongoDB needed.
 */
export async function createTestApp(models = createModels()) {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
      AuthModule,
      UsersModule,
      ProjectsModule,
      SkillsModule,
      ExperiencesModule,
      EducationModule,
      TagsModule,
      ContactsModule,
      UploadsModule,
      AboutModule,
      GithubModule,
      MailModule,
    ],
    controllers: [HealthController],
    providers: [
      { provide: APP_FILTER, useClass: MongoExceptionFilter },
      { provide: getConnectionToken(), useValue: { readyState: 1 } },
    ],
  })
    .overrideProvider(getModelToken(User.name)).useValue(models.users)
    .overrideProvider(getModelToken(Project.name)).useValue(models.projects)
    .overrideProvider(getModelToken(Skill.name)).useValue(models.skills)
    .overrideProvider(getModelToken(Experience.name)).useValue(models.experiences)
    .overrideProvider(getModelToken(Education.name)).useValue(models.education)
    .overrideProvider(getModelToken(Tag.name)).useValue(models.tags)
    .overrideProvider(getModelToken(Contact.name)).useValue(models.contacts)
    .overrideProvider(getModelToken(About.name)).useValue(models.about)
    .overrideProvider(getModelToken(GithubSettings.name)).useValue(models.githubSettings)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, moduleRef, models };
}

let seededUsers = 0;

/** Creates a user directly in the store and returns a valid bearer token for it. */
export async function seedUser(
  app: INestApplication,
  models: TestModels,
  data: { email?: string; password?: string; name?: string; role?: 'admin' | 'editor'; isActive?: boolean } = {},
) {
  const password = data.password ?? 'Secret123!';
  const user = await models.users.create({
    email: data.email ?? `user${++seededUsers}@test.dev`,
    password: await bcrypt.hash(password, 4),
    name: data.name ?? 'Test User',
    role: data.role ?? 'admin',
    isActive: data.isActive ?? true,
  });
  const token = await app.get(JwtService).signAsync({ sub: user._id.toString(), email: user.email, role: user.role });
  return { user, token, password, auth: { Authorization: `Bearer ${token}` } };
}
