export enum ClassAgeGroup {
  NURSERY = 'nursery',
  CHILDREN = 'children',
  JUNIORS = 'juniors',
  TEENS = 'teens',
  YOUTH = 'youth',
  ADULTS = 'adults',
  MIXED = 'mixed',
}

export const CLASS_AGE_GROUPS = [
  ClassAgeGroup.NURSERY,
  ClassAgeGroup.CHILDREN,
  ClassAgeGroup.JUNIORS,
  ClassAgeGroup.TEENS,
  ClassAgeGroup.YOUTH,
  ClassAgeGroup.ADULTS,
  ClassAgeGroup.MIXED,
] as const;
