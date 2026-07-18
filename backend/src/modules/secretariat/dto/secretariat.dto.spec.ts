import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AttendanceEventType,
  CalendarEventType,
  SecretariatDocumentType,
} from '../enums/secretariat.enums';
import {
  CreateAttendanceRecordDto,
  CreateCalendarEventDto,
  CreateSecretariatDocumentDto,
  CreateVisitorDto,
} from './secretariat.dto';

describe('Secretariat DTOs', () => {
  it('rejeita evento sem título', async () => {
    const dto = plainToInstance(CreateCalendarEventDto, {
      title: '',
      type: CalendarEventType.SERVICE,
      startsAt: '2026-07-20T19:00:00.000Z',
      endsAt: '2026-07-20T21:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });

  it('rejeita tipo de evento inválido', async () => {
    const dto = plainToInstance(CreateCalendarEventDto, {
      title: 'Culto de domingo',
      type: 'invalid-type',
      startsAt: '2026-07-20T19:00:00.000Z',
      endsAt: '2026-07-20T21:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });

  it('rejeita memberId que não é UUID', async () => {
    const dto = plainToInstance(CreateVisitorDto, {
      fullName: 'Visitante Teste',
      visitDate: '2026-07-17',
      memberId: 'nao-e-um-uuid',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'memberId')).toBe(true);
  });

  it('rejeita total_present negativo', async () => {
    const dto = plainToInstance(CreateAttendanceRecordDto, {
      eventDate: '2026-07-19',
      eventType: AttendanceEventType.SERVICE,
      totalPresent: -5,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'totalPresent')).toBe(
      true,
    );
  });

  it('aceita registro de presença agregado sem adults/children', async () => {
    const dto = plainToInstance(CreateAttendanceRecordDto, {
      eventDate: '2026-07-19',
      eventType: AttendanceEventType.SERVICE,
      totalPresent: 120,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita documento com título vazio', async () => {
    const dto = plainToInstance(CreateSecretariatDocumentDto, {
      title: '',
      type: SecretariatDocumentType.MINUTES,
      documentDate: '2026-07-17',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });
});
