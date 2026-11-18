import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import mongoose from 'mongoose';

/**
 * Translates Mongoose / MongoDB driver errors into proper HTTP exceptions.
 * Without this, an invalid ObjectId (`GET /projects/abc`) or a duplicate
 * unique key (two projects with the same slug) ended up as a generic 500.
 */
export function mapMongoError(err: unknown): HttpException | null {
  if (err instanceof mongoose.Error.CastError) {
    return new BadRequestException(`Valeur invalide pour « ${err.path} »`);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return new BadRequestException(Object.values(err.errors).map((e) => e.message));
  }
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const keys = Object.keys((err as any).keyValue ?? (err as any).keyPattern ?? {});
    return new ConflictException(
      keys.length ? `Valeur déjà utilisée : ${keys.join(', ')}` : 'Cette ressource existe déjà',
    );
  }
  return null;
}

/** HTTP status that will eventually be sent for an error thrown by a handler. */
export function statusFromError(err: unknown): number {
  if (err instanceof HttpException) return err.getStatus();
  const mapped = mapMongoError(err);
  if (mapped) return mapped.getStatus();
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  return typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
}
