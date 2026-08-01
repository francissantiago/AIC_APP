import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import {
  applyEntityMembershipMutation,
  EntityMembersListLoader,
  removeEntityMember,
  upsertEntityMember,
} from '@utils/entity-members-list.util';

interface TestMember {
  memberId: string;
  name: string;
}

describe('entity-members-list.util', () => {
  it('upsertEntityMember adiciona ou substitui por memberId', () => {
    const initial: TestMember[] = [{ memberId: 'a', name: 'Ana' }];
    const added = upsertEntityMember(initial, { memberId: 'b', name: 'Bruno' });
    expect(added).toHaveLength(2);

    const updated = upsertEntityMember(added, { memberId: 'a', name: 'Ana Silva' });
    expect(updated.find((item) => item.memberId === 'a')?.name).toBe('Ana Silva');
  });

  it('removeEntityMember remove pelo memberId', () => {
    const list: TestMember[] = [
      { memberId: 'a', name: 'Ana' },
      { memberId: 'b', name: 'Bruno' },
    ];
    expect(removeEntityMember(list, 'a')).toEqual([{ memberId: 'b', name: 'Bruno' }]);
  });

  it('EntityMembersListLoader ignora respostas obsoletas', () => {
    const members = signal<TestMember[]>([]);
    const loading = signal(false);
    const error = signal(false);
    const pendingStale = new Subject<{ data: TestMember[] }>();
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => pendingStale.asObservable())
      .mockImplementation(() => of({ data: [{ memberId: 'sync', name: 'Sync' }] }));

    TestBed.runInInjectionContext(() => {
      const destroyRef = TestBed.inject(DestroyRef);
      const loader = new EntityMembersListLoader<TestMember>({
        members,
        loading,
        error,
        fetch,
        destroyRef,
      });

      loader.reload();
      loader.invalidatePending();
      members.set([{ memberId: 'local', name: 'Local' }]);

      pendingStale.next({ data: [] });
      pendingStale.complete();

      expect(members()).toEqual([{ memberId: 'local', name: 'Local' }]);
    });
  });

  it('applyEntityMembershipMutation faz upsert local sem reload', () => {
    const members = signal<TestMember[]>([]);
    const loading = signal(true);
    const error = signal(false);
    const fetch = vi.fn(() => of({ data: [] }));

    TestBed.runInInjectionContext(() => {
      const destroyRef = TestBed.inject(DestroyRef);
      const loader = new EntityMembersListLoader<TestMember>({
        members,
        loading,
        error,
        fetch,
        destroyRef,
      });

      applyEntityMembershipMutation({
        loader,
        members,
        loading,
        upsert: { memberId: 'm1', name: 'Maria' },
      });

      expect(members()).toEqual([{ memberId: 'm1', name: 'Maria' }]);
      expect(loading()).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
