import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IGenealogyTreeNode } from '@interfaces/IFamilyGenealogy';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-family-genealogy-tree',
  imports: [AppDatePipe, FamilyGenealogyTree, TranslatePipe],
  templateUrl: './family-genealogy-tree.html',
  styleUrl: './family-genealogy-tree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyGenealogyTree {
  readonly node = input.required<IGenealogyTreeNode>();

  shortName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return parts[0] ?? '';
    }
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
}
