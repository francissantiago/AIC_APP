import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Iexample } from '@interfaces/Iexample';
import { IexamplePatch } from '@interfaces/IexamplePatch';
import { ExampleService } from '@services/example-service';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-example',
  imports: [CommonModule, ReactiveFormsModule, JsonPipe],
  templateUrl: './example.html',
  styleUrl: './example.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Example {
  #exampleService = inject(ExampleService);
  #destroy$ = new Subject<void>();

  #getForm = new FormGroup({
    postId: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
  });
  #postForm = new FormGroup({
    title: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    body: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
  });
  #putForm = new FormGroup({
    postId: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    userId: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    title: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
    body: new FormControl<string>('', [Validators.required, Validators.minLength(3)]),
  });
  #patchForm = new FormGroup({
    postId: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
    title: new FormControl<string>(''),
    body: new FormControl<string>(''),
  });
  #deleteForm = new FormGroup({
    postId: new FormControl<number>(1, [Validators.required, Validators.min(1)]),
  });

  getResult = signal<Iexample | null>(null);
  postResult = signal<Iexample | null>(null);
  putResult = signal<Iexample | null>(null);
  patchResult = signal<Iexample | null>(null);
  deleteResult = signal<Record<string, never> | null>(null);

  getLoading = signal<boolean>(false);
  postLoading = signal<boolean>(false);
  putLoading = signal<boolean>(false);
  patchLoading = signal<boolean>(false);
  deleteLoading = signal<boolean>(false);

  get get_postId(): FormControl {
    return this.#getForm.get('postId') as FormControl;
  }

  get getForm(): FormGroup {
    return this.#getForm;
  }

  get postForm(): FormGroup {
    return this.#postForm;
  }

  get putForm(): FormGroup {
    return this.#putForm;
  }

  get patchForm(): FormGroup {
    return this.#patchForm;
  }

  get deleteForm(): FormGroup {
    return this.#deleteForm;
  }

  submitPost(): void {
    if (this.#postForm.invalid) {
      this.#postForm.markAllAsTouched();
      return;
    }

    const { title, body } = this.#postForm.getRawValue();
    this.#handleRequest(
      this.#exampleService.postPost({ userId: 1, title: title!, body: body! }),
      this.postResult,
      this.postLoading,
    );
  }

  getPostById(): void {
    this.#handleRequest(
      this.#exampleService.getPostById(this.get_postId.value),
      this.getResult,
      this.getLoading,
    );
  }

  submitPut(): void {
    if (this.#putForm.invalid) {
      this.#putForm.markAllAsTouched();
      return;
    }

    const { postId, userId, title, body } = this.#putForm.getRawValue();
    this.#handleRequest(
      this.#exampleService.putPost(postId!, {
        id: postId!,
        userId: userId!,
        title: title!,
        body: body!,
      }),
      this.putResult,
      this.putLoading,
    );
  }

  submitPatch(): void {
    if (this.#patchForm.invalid) {
      this.#patchForm.markAllAsTouched();
      return;
    }

    const { postId, title, body } = this.#patchForm.getRawValue();
    const patch: IexamplePatch = {};

    if (title) {
      patch.title = title;
    }

    if (body) {
      patch.body = body;
    }

    if (Object.keys(patch).length === 0) {
      this.#patchForm.markAllAsTouched();
      return;
    }

    this.#handleRequest(
      this.#exampleService.patchPost(postId!, patch),
      this.patchResult,
      this.patchLoading,
    );
  }

  submitDelete(): void {
    if (this.#deleteForm.invalid) {
      this.#deleteForm.markAllAsTouched();
      return;
    }

    const { postId } = this.#deleteForm.getRawValue();
    this.#handleRequest(
      this.#exampleService.deletePost(postId!),
      this.deleteResult,
      this.deleteLoading,
    );
  }

  #handleRequest<T>(
    request$: Observable<T>,
    result: WritableSignal<T | null>,
    loading: WritableSignal<boolean>,
  ): void {
    loading.set(true);
    result.set(null);

    request$.pipe(takeUntil(this.#destroy$)).subscribe({
      next: (data) => {
        result.set(data);
        loading.set(false);
      },
      error: (error) => {
        console.error(error);
        loading.set(false);
      },
      complete: () => {
        loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }
}
