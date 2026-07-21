import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Congregation } from '../../congregations/entities/congregation.entity';

@Entity({ name: 'membership_card_settings' })
export class MembershipCardSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'congregation_id', type: 'char', length: 36, unique: true })
  congregationId!: string;

  @OneToOne(() => Congregation, { nullable: false })
  @JoinColumn({ name: 'congregation_id' })
  congregation!: Congregation;

  @Column({ name: 'header_line1', type: 'varchar', length: 150 })
  headerLine1!: string;

  @Column({
    name: 'header_line2',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  headerLine2!: string | null;

  @Column({
    name: 'ministry_label',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  ministryLabel!: string | null;

  @Column({
    name: 'president_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  presidentName!: string | null;

  @Column({
    name: 'president_title',
    type: 'varchar',
    length: 100,
    default: 'PASTORA PRESIDENTE',
  })
  presidentTitle!: string;

  @Column({ name: 'logo_path', type: 'varchar', length: 500, nullable: true })
  logoPath!: string | null;

  @Column({
    name: 'signature_path',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  signaturePath!: string | null;

  @Column({
    name: 'validity_months',
    type: 'int',
    unsigned: true,
    default: 24,
  })
  validityMonths!: number;

  @Column({
    name: 'footer_notice',
    type: 'varchar',
    length: 255,
    default:
      'Válida somente com a apresentação de documento de identificação com foto',
  })
  footerNotice!: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
