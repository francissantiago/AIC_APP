export interface IGenealogyPerson {
  memberId: string;
  fullName: string;
  birthDate: string | null;
}

export interface IGenealogySpouse extends IGenealogyPerson {
  siblings: IGenealogyPerson[];
}

export interface IGenealogyTreeNode {
  memberId: string;
  fullName: string;
  birthDate: string | null;
  siblings: IGenealogyPerson[];
  spouses: IGenealogySpouse[];
  children: IGenealogyTreeNode[];
}

export interface IFamilyGenealogy {
  familyId: string;
  familyName: string;
  roots: IGenealogyTreeNode[];
  unlinkedMembers: IGenealogyPerson[];
}
