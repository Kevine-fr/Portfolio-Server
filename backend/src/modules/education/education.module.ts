import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Education, EducationSchema } from './education.schema';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Education.name, schema: EducationSchema }])],
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}
