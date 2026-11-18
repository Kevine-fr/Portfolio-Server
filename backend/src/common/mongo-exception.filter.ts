import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import mongoose from 'mongoose';
import { mapMongoError } from './mongo-errors';

@Catch(mongoose.Error.CastError, mongoose.Error.ValidationError, mongoose.mongo.MongoServerError)
export class MongoExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(mapMongoError(exception) ?? exception, host);
  }
}
