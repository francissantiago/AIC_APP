import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { SocialProjectMemberRole } from '../enums/social-project-member-role.enum';
import { SocialProject } from './social-project.entity';

@Entity({ name: 'social_project_members' })
@Index('IDX_social_project_members_member', ['memberId'])
@Index('IDX_social_project_members_project_role', ['socialProjectId', 'role'])
export class SocialProjectMember {
  @PrimaryColumn({ name: 'social_project_id', type: 'char', length: 36 })
  socialProjectId!: string;

  @PrimaryColumn({ name: 'member_id', type: 'char', length: 36 })
  memberId!: string;

  @Column({
    type: 'enum',
    enum: SocialProjectMemberRole,
    default: SocialProjectMemberRole.PARTICIPANT,
  })
  role!: SocialProjectMemberRole;

  @Column({
    name: 'joined_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  joinedAt!: Date;

  @ManyToOne(() => SocialProject, (project) => project.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'social_project_id' })
  socialProject!: SocialProject;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member!: Member;
}
