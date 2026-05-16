import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { EducationModule } from './modules/education/education.module';
import { TagsModule } from './modules/tags/tags.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AboutModule } from './modules/about/about.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { fallthrough: false, maxAge: '7d' },
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/portfolio'),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
