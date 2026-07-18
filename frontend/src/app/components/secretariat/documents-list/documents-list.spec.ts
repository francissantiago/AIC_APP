import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecretariatDocumentStatus, SecretariatDocumentType } from '@enums/secretariat';
import { ISecretariatDocument } from '@interfaces/ISecretariat';
import { TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SecretariatService } from '@services/secretariat-service';
import { of } from 'rxjs';
import { translateServiceStub } from '../../../testing/translate-testing';
import { DocumentsList } from './documents-list';

function authStub(permissions: string[]) {
  return {
    currentUser: signal({ permissions }),
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (...codes: string[]) => codes.some((code) => permissions.includes(code)),
  };
}

const sampleDoc: ISecretariatDocument = {
  id: 'doc-1',
  congregationId: 'c1',
  createdByUserId: 'u1',
  title: 'Ata',
  type: SecretariatDocumentType.MINUTES,
  documentDate: '2026-07-01',
  summary: null,
  status: SecretariatDocumentStatus.DRAFT,
  hasAttachment: true,
  originalFilename: 'ata.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('DocumentsList', () => {
  let component: DocumentsList;
  let fixture: ComponentFixture<DocumentsList>;
  let secretariat: {
    documents: ReturnType<typeof vi.fn>;
    createDocument: ReturnType<typeof vi.fn>;
    updateDocument: ReturnType<typeof vi.fn>;
    removeDocument: ReturnType<typeof vi.fn>;
    uploadDocumentFile: ReturnType<typeof vi.fn>;
    downloadDocumentFile: ReturnType<typeof vi.fn>;
    removeDocumentFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    secretariat = {
      documents: vi.fn(() => of({ data: [sampleDoc], total: 1, page: 1, limit: 20 })),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      removeDocument: vi.fn(),
      uploadDocumentFile: vi.fn(),
      downloadDocumentFile: vi.fn(() => of(new Blob(['pdf']))),
      removeDocumentFile: vi.fn(() =>
        of({
          ...sampleDoc,
          hasAttachment: false,
          originalFilename: null,
          mimeType: null,
          sizeBytes: null,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: DOCUMENT, useValue: document },
        { provide: AuthService, useValue: authStub(['secretariat:read', 'secretariat:write']) },
        { provide: SecretariatService, useValue: secretariat },
        {
          provide: ApiErrorService,
          useValue: {
            resolve: () => ({ displayMessage: 'error', supportHint: null }),
          },
        },
      ],
    })
      .overrideComponent(DocumentsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DocumentsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load documents', () => {
    expect(component).toBeTruthy();
    expect(secretariat.documents).toHaveBeenCalled();
    expect(component.documents()).toEqual([sampleDoc]);
  });

  it('exposes write permission for attachment actions', () => {
    expect(component.canWrite()).toBe(true);
  });

  it('downloads attachment via service blob', () => {
    component.downloadFile(sampleDoc);

    expect(secretariat.downloadDocumentFile).toHaveBeenCalledWith('doc-1');
    expect(component.downloading()).toBe(false);
  });

  it('removes attachment and updates editing document', () => {
    component.editing.set(sampleDoc);
    component.removeFile(sampleDoc);

    expect(secretariat.removeDocumentFile).toHaveBeenCalledWith('doc-1');
    expect(component.editing()?.hasAttachment).toBe(false);
  });

  it('formats file sizes', () => {
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('DocumentsList without write permission', () => {
  let component: DocumentsList;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DocumentsList],
      providers: [
        { provide: TranslateService, useValue: translateServiceStub() },
        { provide: DOCUMENT, useValue: document },
        { provide: AuthService, useValue: authStub(['secretariat:read']) },
        {
          provide: SecretariatService,
          useValue: {
            documents: () => of({ data: [], total: 0, page: 1, limit: 20 }),
          },
        },
        {
          provide: ApiErrorService,
          useValue: { resolve: () => ({ displayMessage: 'error', supportHint: null }) },
        },
      ],
    })
      .overrideComponent(DocumentsList, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DocumentsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('hides write actions when canWrite is false', () => {
    expect(component.canWrite()).toBe(false);
  });
});
