import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, Delete, Param, BadRequestException, NotFoundException,
  ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage, FileFilterCallback } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// Local Multer file shape — avoids depending on Express.Multer namespace
// augmentation (which fails if @types/multer isn't resolved yet).
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// 10 MB images, 100 MB videos, 20 MB documents (PDF/DOC)
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOC_BYTES   = 20 * 1024 * 1024;

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/avif', 'image/heic', 'image/heif',
]);
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4', 'video/webm', 'video/ogg',
  'video/quicktime',                          // .mov
  'video/x-m4v',                              // .m4v
  'video/x-matroska', 'video/matroska',       // .mkv (not browser-playable)
  'video/x-msvideo', 'video/avi',             // .avi  (not browser-playable)
]);
const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',                                                           // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',      // .docx
]);
const SAFE_EXT = /^\.(jpe?g|png|webp|gif|avif|heic|heif|mp4|webm|ogv|mov|m4v|mkv|avi|pdf|docx?|odt)$/i;

const storage = diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!SAFE_EXT.test(ext)) return cb(new BadRequestException('Extension non autorisée'), '');
    const id = randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const makeFileFilter = (allowed: Set<string>, kind: string) =>
  (_req: any, file: any, cb: FileFilterCallback) => {
    if (allowed.has(file.mimetype.toLowerCase())) return cb(null, true);
    cb(new BadRequestException(`Type ${kind} non supporté : ${file.mimetype}`));
  };

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: makeFileFilter(ALLOWED_IMAGE_MIMES, 'd\'image'),
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES })],
      }),
    )
    file: MulterFile,
  ) {
    return {
      url:      `/uploads/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: makeFileFilter(ALLOWED_VIDEO_MIMES, 'de vidéo'),
      limits: { fileSize: MAX_VIDEO_BYTES },
    }),
  )
  uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_VIDEO_BYTES })],
      }),
    )
    file: MulterFile,
  ) {
    return {
      url:      `/uploads/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: makeFileFilter(ALLOWED_DOC_MIMES, 'de document'),
      limits: { fileSize: MAX_DOC_BYTES },
    }),
  )
  uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_DOC_BYTES })],
      }),
    )
    file: MulterFile,
  ) {
    return {
      url:      `/uploads/${file.filename}`,
      filename: file.filename,
      size:     file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  @Delete(':filename')
  deleteFile(@Param('filename') filename: string) {
    // Prevent path traversal: keep basename only
    const safe = basename(filename);
    const filepath = join(UPLOAD_DIR, safe);
    if (!existsSync(filepath)) throw new NotFoundException('Fichier introuvable');
    unlinkSync(filepath);
    return { deleted: true, filename: safe };
  }
}
