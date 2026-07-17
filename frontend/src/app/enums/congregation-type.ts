export enum CongregationType {
  HEADQUARTERS = 'headquarters',
  BRANCH = 'branch',
}

export const CONGREGATION_TYPES = [CongregationType.HEADQUARTERS, CongregationType.BRANCH] as const;
