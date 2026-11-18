import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import mongoose from 'mongoose';
import { mapMongoError, statusFromError } from './mongo-errors';
import { EmptyToNull, parseBooleanQuery } from './transformers';
import { getJwtSecret } from '../auth/jwt-secret';
import { parseCorsOrigins } from '../app.setup';

describe('mapMongoError', () => {
  it('maps cast errors to 400', () => {
    const err = mapMongoError(new mongoose.Error.CastError('ObjectId', 'abc', '_id'));
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err!.message).toContain('_id');
  });

  it('maps validation errors to 400 with every message', () => {
    const v = new mongoose.Error.ValidationError();
    v.addError('level', new mongoose.Error.ValidatorError({ message: 'too high', path: 'level' } as any));
    const err = mapMongoError(v) as BadRequestException;
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err.getResponse() as any).message).toEqual(['too high']);
  });

  it('maps duplicate keys to 409 naming the field', () => {
    const dup = new mongoose.mongo.MongoServerError({ message: 'E11000', code: 11000, keyValue: { slug: 'x' } } as any);
    const err = mapMongoError(dup);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err!.message).toContain('slug');
  });

  it('ignores anything else', () => {
    expect(mapMongoError(new Error('x'))).toBeNull();
    expect(mapMongoError(new mongoose.mongo.MongoServerError({ message: 'other', code: 2 } as any))).toBeNull();
  });

  it('derives the HTTP status of any error', () => {
    expect(statusFromError(new NotFoundException())).toBe(404);
    expect(statusFromError(new mongoose.Error.CastError('ObjectId', 'x', '_id'))).toBe(400);
    expect(statusFromError({ status: 413 })).toBe(413);
    expect(statusFromError(new Error('boom'))).toBe(500);
  });
});

describe('transformers', () => {
  class Dto {
    @EmptyToNull() value?: string | null;
  }
  it('turns empty strings into null', () => {
    expect(plainToInstance(Dto, { value: '  ' }).value).toBeNull();
    expect(plainToInstance(Dto, { value: 'x' }).value).toBe('x');
  });

  it('parses boolean query strings', () => {
    expect(parseBooleanQuery('true')).toBe(true);
    expect(parseBooleanQuery('0')).toBe(false);
    expect(parseBooleanQuery('maybe')).toBeUndefined();
    expect(parseBooleanQuery(undefined)).toBeUndefined();
  });
});

describe('configuration helpers', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('refuses to run in production without JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    process.env.NODE_ENV = 'development';
    expect(getJwtSecret()).toBe('dev_secret');
    process.env.JWT_SECRET = ' s3cret ';
    expect(getJwtSecret()).toBe('s3cret');
  });

  it('parses the CORS whitelist', () => {
    expect(parseCorsOrigins(' https://a.dev, ,https://b.dev ')).toEqual(['https://a.dev', 'https://b.dev']);
    expect(parseCorsOrigins('')).toEqual([]);
  });
});
