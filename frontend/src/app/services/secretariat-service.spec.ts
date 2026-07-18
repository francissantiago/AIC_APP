import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from 'environments/environment';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SecretariatService } from './secretariat-service';

describe('SecretariatService', () => {
  const baseUrl = `${environment.apiUrl}/secretariat`;
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let service: SecretariatService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    http = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [SecretariatService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(SecretariatService);
  });

  it('uploads a document file with FormData field file', () => {
    const file = new File(['pdf'], 'ata.pdf', { type: 'application/pdf' });
    http.post.mockReturnValue(
      of({
        id: 'doc-1',
        hasAttachment: true,
        originalFilename: 'ata.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 3,
      }),
    );

    service.uploadDocumentFile('doc-1', file).subscribe();

    expect(http.post).toHaveBeenCalledWith(
      `${baseUrl}/documents/doc-1/upload`,
      expect.any(FormData),
    );
    const formData = http.post.mock.calls[0][1] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('downloads a document file as blob', () => {
    http.get.mockReturnValue(of(new Blob(['bytes'])));

    service.downloadDocumentFile('doc-1').subscribe();

    expect(http.get).toHaveBeenCalledWith(
      `${baseUrl}/documents/doc-1/download`,
      expect.objectContaining({ responseType: 'blob' }),
    );
  });

  it('removes a document file', () => {
    http.delete.mockReturnValue(
      of({
        id: 'doc-1',
        hasAttachment: false,
        originalFilename: null,
        mimeType: null,
        sizeBytes: null,
      }),
    );

    service.removeDocumentFile('doc-1').subscribe();

    expect(http.delete).toHaveBeenCalledWith(`${baseUrl}/documents/doc-1/file`);
  });

  it('does not retry client errors on upload', () => {
    const file = new File(['x'], 'bad.exe', { type: 'application/octet-stream' });
    http.post.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
    );

    let failures = 0;
    service.uploadDocumentFile('doc-1', file).subscribe({ error: () => failures++ });

    expect(failures).toBe(1);
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});
