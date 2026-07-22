import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { ReadStream } from 'fs';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { UploadedFile } from './uploaded-file.interface';

const SECRETARIAT_SUBDIR = 'secretariat';
const DEFAULT_UPLOAD_DIR = 'uploads';
const DEFAULT_MAX_BYTES = 10_485_760;

const ALLOWED_MIME_TO_EXT: Readonly<Record<string, readonly string[]>> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

const IMAGE_MIME_TO_EXT: Readonly<Record<string, readonly string[]>> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export type SavedSecretariatFile = {
  relativePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type SavedImageFile = SavedSecretariatFile;

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly maxBytes: number;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR')?.trim() ||
      DEFAULT_UPLOAD_DIR;
    const parsed = Number(this.configService.get<string>('UPLOAD_MAX_BYTES'));
    this.maxBytes =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
  }

  getMaxBytes(): number {
    return this.maxBytes;
  }

  async ensureDir(subdir: string): Promise<void> {
    const absolute = path.join(this.resolveRoot(), subdir);
    await fs.mkdir(absolute, { recursive: true });
  }

  resolveAbsolutePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').trim();
    if (
      !normalized ||
      normalized.includes('..') ||
      path.isAbsolute(normalized) ||
      normalized.startsWith('/')
    ) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_BAD_REQUEST,
        message: ApiErrorMessage[ApiErrorCode.SYS_BAD_REQUEST],
      });
    }

    const root = this.resolveRoot();
    const absolute = path.resolve(root, normalized);
    const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (absolute !== root && !absolute.startsWith(rootWithSep)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_BAD_REQUEST,
        message: ApiErrorMessage[ApiErrorCode.SYS_BAD_REQUEST],
      });
    }
    return absolute;
  }

  async saveSecretariatDocument(
    documentId: string,
    file: Pick<UploadedFile, 'buffer' | 'originalname' | 'mimetype' | 'size'>,
  ): Promise<SavedSecretariatFile> {
    return this.saveFile(
      SECRETARIAT_SUBDIR,
      documentId,
      file,
      ALLOWED_MIME_TO_EXT,
    );
  }

  async saveImageAsset(
    subdir: string,
    entityId: string,
    file: Pick<UploadedFile, 'buffer' | 'originalname' | 'mimetype' | 'size'>,
  ): Promise<SavedImageFile> {
    const normalizedSubdir = subdir
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    if (
      !normalizedSubdir ||
      normalizedSubdir.includes('..') ||
      path.isAbsolute(normalizedSubdir)
    ) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SYS_BAD_REQUEST,
        message: ApiErrorMessage[ApiErrorCode.SYS_BAD_REQUEST],
      });
    }
    return this.saveFile(normalizedSubdir, entityId, file, IMAGE_MIME_TO_EXT);
  }

  private async saveFile(
    subdir: string,
    entityId: string,
    file: Pick<UploadedFile, 'buffer' | 'originalname' | 'mimetype' | 'size'>,
    mimeMap: Readonly<Record<string, readonly string[]>>,
  ): Promise<SavedSecretariatFile> {
    this.assertFilePresent(file);
    this.assertFileSize(file.size);
    const mimeType = file.mimetype?.toLowerCase().trim();
    const extension = this.resolveAllowedExtension(
      mimeType,
      file.originalname,
      mimeMap,
    );
    const originalFilename = this.sanitizeOriginalFilename(
      file.originalname,
      extension,
    );

    await this.ensureDir(subdir);
    const relativePath = `${subdir}/${entityId}-${randomUUID()}${extension}`;
    const absolutePath = this.resolveAbsolutePath(relativePath);
    await fs.writeFile(absolutePath, file.buffer);

    return {
      relativePath,
      originalFilename,
      mimeType: mimeType,
      sizeBytes: file.size,
    };
  }

  async deleteIfExists(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath) return;
    try {
      await fs.unlink(this.resolveAbsolutePath(relativePath));
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
      if (code === 'ENOENT') return;
      this.logger.warn(
        `Falha ao remover arquivo ${relativePath}: ${String(error)}`,
      );
    }
  }

  async openReadStream(relativePath: string): Promise<{
    stream: ReadStream;
    absolutePath: string;
  }> {
    const absolutePath = this.resolveAbsolutePath(relativePath);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    return { stream: createReadStream(absolutePath), absolutePath };
  }

  async readFileBuffer(relativePath: string): Promise<Buffer> {
    const absolutePath = this.resolveAbsolutePath(relativePath);
    try {
      return await fs.readFile(absolutePath);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
      if (code === 'ENOENT') {
        throw new ApiException(HttpStatus.NOT_FOUND, {
          code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
          message:
            ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
        });
      }
      this.logger.error(
        `Falha ao ler arquivo ${relativePath}: ${String(error)}`,
      );
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, {
        code: ApiErrorCode.SYS_INTERNAL,
        message: ApiErrorMessage[ApiErrorCode.SYS_INTERNAL],
      });
    }
  }

  assertFilePresent(
    file: Pick<UploadedFile, 'buffer' | 'size'> | undefined | null,
  ): asserts file is Pick<UploadedFile, 'buffer' | 'size'> {
    if (!file?.buffer || file.size <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_REQUIRED,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_REQUIRED],
      });
    }
  }

  assertFileSize(size: number): void {
    if (size > this.maxBytes) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TOO_LARGE,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TOO_LARGE],
      });
    }
  }

  resolveAllowedExtension(
    mimeType: string | undefined,
    originalname: string,
    mimeMap: Readonly<Record<string, readonly string[]>> = ALLOWED_MIME_TO_EXT,
  ): string {
    if (!mimeType || !(mimeType in mimeMap)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID],
      });
    }
    const allowed = mimeMap[mimeType];
    const ext = path.extname(originalname || '').toLowerCase();
    if (!allowed.includes(ext)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID],
      });
    }
    return ext === '.jpeg' ? '.jpg' : ext;
  }

  sanitizeOriginalFilename(originalname: string, extension: string): string {
    const stripped = Array.from(originalname || `file${extension}`)
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('');
    const base = path.basename(stripped).replace(/[/\\]/g, '_').trim();
    const cleaned = base || `file${extension}`;
    if (cleaned.toLowerCase().endsWith(extension)) {
      return cleaned.slice(0, 255);
    }
    return `${cleaned.slice(0, 255 - extension.length)}${extension}`;
  }

  private resolveRoot(): string {
    return path.isAbsolute(this.uploadDir)
      ? path.normalize(this.uploadDir)
      : path.resolve(process.cwd(), this.uploadDir);
  }
}
