import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ApiException } from '../../../common/errors/api.exception';
import { ApiErrorCode } from '../../../common/errors/api-error.types';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-uploads-'));
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOAD_DIR') return tempRoot;
        if (key === 'UPLOAD_MAX_BYTES') return '10485760';
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new FileStorageService(configService);
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('bloqueia path traversal em resolveAbsolutePath', () => {
    expect(() => service.resolveAbsolutePath('../secret.txt')).toThrow(
      ApiException,
    );
    expect(() =>
      service.resolveAbsolutePath('secretariat/../../etc/passwd'),
    ).toThrow(ApiException);
    try {
      service.resolveAbsolutePath('../secret.txt');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('rejeita MIME inválido', async () => {
    await expect(
      service.saveSecretariatDocument('doc-1', {
        buffer: Buffer.from('x'),
        originalname: 'malware.exe',
        mimetype: 'application/x-msdownload',
        size: 1,
      }),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID },
    });
  });

  it('rejeita extensão desalinhada ao MIME', async () => {
    await expect(
      service.saveSecretariatDocument('doc-1', {
        buffer: Buffer.from('%PDF'),
        originalname: 'doc.png',
        mimetype: 'application/pdf',
        size: 4,
      }),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID },
    });
  });

  it('rejeita arquivo acima do limite', async () => {
    const tinyLimitConfig = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOAD_DIR') return tempRoot;
        if (key === 'UPLOAD_MAX_BYTES') return '10';
        return undefined;
      }),
    } as unknown as ConfigService;
    const limited = new FileStorageService(tinyLimitConfig);

    await expect(
      limited.saveSecretariatDocument('doc-1', {
        buffer: Buffer.alloc(11),
        originalname: 'a.pdf',
        mimetype: 'application/pdf',
        size: 11,
      }),
    ).rejects.toMatchObject({
      response: { code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TOO_LARGE },
    });
  });

  it('salva PDF e remove com deleteIfExists', async () => {
    const saved = await service.saveSecretariatDocument('doc-uuid', {
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'Ata.pdf',
      mimetype: 'application/pdf',
      size: 8,
    });

    expect(saved.relativePath).toMatch(
      /^secretariat\/doc-uuid-[0-9a-f-]+\.pdf$/,
    );
    expect(saved.originalFilename).toBe('Ata.pdf');
    expect(saved.mimeType).toBe('application/pdf');
    expect(saved.sizeBytes).toBe(8);

    const absolute = service.resolveAbsolutePath(saved.relativePath);
    await expect(fs.access(absolute)).resolves.toBeUndefined();

    await service.deleteIfExists(saved.relativePath);
    await expect(fs.access(absolute)).rejects.toBeDefined();
  });
});
