import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IConstructionPhoto } from '@interfaces/IConstructionPhoto';
import { AuthService } from '@services/auth-service';
import { ConstructionPhotosService } from '@services/construction-photos-service';

@Component({
  selector: 'app-construction-photos-gallery',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './construction-photos-gallery.html',
  styleUrl: './construction-photos-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionPhotosGallery implements OnInit {
  readonly #photosService = inject(ConstructionPhotosService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();

  readonly photos = signal<IConstructionPhoto[]>([]);
  readonly photoUrls = signal<Record<string, string>>({});
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);

  readonly canWrite = signal(this.#auth.hasPermission('constructions:write'));

  readonly uploadForm = new FormGroup({
    caption: new FormControl('', { nonNullable: true }),
    file: new FormControl<File | null>(null),
  });

  ngOnInit(): void {
    this.#loadPhotos();
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    this.uploadForm.controls.file.setValue(file);
  }

  uploadPhoto(): void {
    const file = this.uploadForm.controls.file.value;
    if (!file) return;

    this.uploading.set(true);
    this.feedback.set(null);

    this.#photosService
      .upload(this.projectId(), {
        file,
        caption: this.uploadForm.controls.caption.value,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.uploadForm.reset({ caption: '', file: null });
          this.feedback.set('CONSTRUCTIONS.SAVE_SUCCESS');
          this.#loadPhotos();
        },
        error: () => {
          this.uploading.set(false);
          this.feedback.set('CONSTRUCTIONS.PHOTO_UPLOAD_ERROR');
        },
      });
  }

  confirmDelete(photoId: string): void {
    this.pendingDeleteId.set(photoId);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  deletePhoto(): void {
    const photoId = this.pendingDeleteId();
    if (!photoId) return;

    this.#photosService
      .remove(photoId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.feedback.set('CONSTRUCTIONS.DELETE_SUCCESS');
          this.#loadPhotos();
        },
        error: () => {
          this.pendingDeleteId.set(null);
          this.feedback.set('CONSTRUCTIONS.DELETE_ERROR');
        },
      });
  }

  photoSrc(photo: IConstructionPhoto): string | null {
    return this.photoUrls()[photo.id] ?? null;
  }

  #loadPhotos(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#photosService
      .list(this.projectId(), { page: 1, limit: 20 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.photos.set(response.data);
          this.loading.set(false);
          this.#loadPhotoBlobs(response.data);
        },
        error: () => {
          this.photos.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  #loadPhotoBlobs(photos: IConstructionPhoto[]): void {
    const nextUrls: Record<string, string> = { ...this.photoUrls() };

    for (const photo of photos) {
      if (nextUrls[photo.id]) continue;

      this.#photosService
        .getContentBlob(photo.id)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (blob) => {
            nextUrls[photo.id] = URL.createObjectURL(blob);
            this.photoUrls.set({ ...nextUrls });
          },
        });
    }
  }
}
