import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiException } from '../../../common/errors/api.exception';
import { ApiErrorCode } from '../../../common/errors/api-error.types';
import { CongregationsService } from '../../congregations/congregations.service';
import { FileStorageService } from '../storage/file-storage.service';
import { UploadedFile } from '../storage/uploaded-file.interface';
import {
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../enums/secretariat.enums';
import { DocumentsService } from './documents.service';
import { SecretariatDocument } from './entities/secretariat-document.entity';

describe('DocumentsService (file attachment)', () => {
  let service: DocumentsService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const documentId = 'dddddddd-eeee-ffff-0000-111111111111';

  const documentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };

  const fileStorageService = {
    saveSecretariatDocument: jest.fn(),
    deleteIfExists: jest.fn(),
    openReadStream: jest.fn(),
  };

  const baseDocument = (): SecretariatDocument => {
    const document = new SecretariatDocument();
    document.id = documentId;
    document.congregationId = congregationId;
    document.createdByUserId = 'uuuuuuuu-vvvv-wwww-xxxx-yyyyyyyyyyyy';
    document.title = 'Ata ordinária';
    document.type = SecretariatDocumentType.MINUTES;
    document.documentDate = '2026-07-17';
    document.summary = null;
    document.status = SecretariatDocumentStatus.DRAFT;
    document.filePath = null;
    document.originalFilename = null;
    document.mimeType = null;
    document.sizeBytes = null;
    document.createdAt = new Date('2026-07-17T00:00:00Z');
    document.updatedAt = new Date('2026-07-17T00:00:00Z');
    document.deletedAt = null;
    return document;
  };

  const sampleFile = (): UploadedFile => ({
    fieldname: 'file',
    originalname: 'ata.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 12,
    buffer: Buffer.from('%PDF-sample'),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: congregationId,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(SecretariatDocument),
          useValue: documentsRepository,
        },
        { provide: CongregationsService, useValue: congregationsService },
        { provide: FileStorageService, useValue: fileStorageService },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  it('upload define colunas de anexo e hasAttachment na response', async () => {
    const document = baseDocument();
    documentsRepository.findOne.mockResolvedValue(document);
    fileStorageService.saveSecretariatDocument.mockResolvedValue({
      relativePath: `secretariat/${documentId}-abc.pdf`,
      originalFilename: 'ata.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12,
    });
    documentsRepository.save.mockImplementation((entity: SecretariatDocument) =>
      Promise.resolve(entity),
    );

    const result = await service.uploadFile(documentId, sampleFile());

    expect(fileStorageService.saveSecretariatDocument).toHaveBeenCalled();
    expect(result.hasAttachment).toBe(true);
    expect(result.originalFilename).toBe('ata.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(12);
    expect(result).not.toHaveProperty('filePath');
  });

  it('replace remove arquivo antigo do disco', async () => {
    const document = baseDocument();
    document.filePath = 'secretariat/old-file.pdf';
    document.originalFilename = 'old.pdf';
    document.mimeType = 'application/pdf';
    document.sizeBytes = 4;
    documentsRepository.findOne.mockResolvedValue(document);
    fileStorageService.saveSecretariatDocument.mockResolvedValue({
      relativePath: `secretariat/${documentId}-new.pdf`,
      originalFilename: 'novo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12,
    });
    documentsRepository.save.mockImplementation((entity: SecretariatDocument) =>
      Promise.resolve(entity),
    );

    await service.uploadFile(documentId, sampleFile());

    expect(fileStorageService.deleteIfExists).toHaveBeenCalledWith(
      'secretariat/old-file.pdf',
    );
  });

  it('download sem anexo lança DOCUMENT_FILE_NOT_FOUND', async () => {
    documentsRepository.findOne.mockResolvedValue(baseDocument());

    await expect(service.downloadFile(documentId)).rejects.toBeInstanceOf(
      ApiException,
    );
    try {
      await service.downloadFile(documentId);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as ApiException).getResponse()).toMatchObject({
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
      });
    }
  });

  it('removeFile limpa colunas e apaga físico', async () => {
    const document = baseDocument();
    document.filePath = 'secretariat/file.pdf';
    document.originalFilename = 'file.pdf';
    document.mimeType = 'application/pdf';
    document.sizeBytes = 8;
    documentsRepository.findOne.mockResolvedValue(document);
    documentsRepository.save.mockImplementation((entity: SecretariatDocument) =>
      Promise.resolve(entity),
    );

    await service.removeFile(documentId);

    expect(document.filePath).toBeNull();
    expect(document.originalFilename).toBeNull();
    expect(document.mimeType).toBeNull();
    expect(document.sizeBytes).toBeNull();
    expect(fileStorageService.deleteIfExists).toHaveBeenCalledWith(
      'secretariat/file.pdf',
    );
  });

  it('removeFile sem anexo lança 404', async () => {
    documentsRepository.findOne.mockResolvedValue(baseDocument());

    await expect(service.removeFile(documentId)).rejects.toMatchObject({
      response: { code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND },
    });
  });

  it('findDocument com activeCongregationId não chama getOrCreateBase', async () => {
    const explicitId = '22222222-3333-4444-5555-666666666666';
    const document = baseDocument();
    document.congregationId = explicitId;
    documentsRepository.findOne.mockResolvedValue(document);
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: congregationId,
    });

    await service.findDocument(documentId, explicitId);

    expect(congregationsService.getOrCreateBase).not.toHaveBeenCalled();
    expect(documentsRepository.findOne).toHaveBeenCalledWith({
      where: { id: documentId, congregationId: explicitId },
    });
  });
});
