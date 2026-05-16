import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { About, AboutSchema } from './about.schema';
import { AboutService } from './about.service';
import { AboutController } from './about.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: About.name, schema: AboutSchema }])],
  providers: [AboutService],
  controllers: [AboutController],
  exports: [AboutService],
})
export class AboutModule {}
