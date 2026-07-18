import { Repository } from 'typeorm';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { AttendanceEventType } from '../enums/secretariat.enums';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance-record.entity';

describe('AttendanceService', () => {
  const findOne = jest.fn();
  const save = jest.fn((value: object) => value);
  const create = jest.fn((value: object) => value);
  const attendanceRepository = {
    findOne,
    save,
    create,
  } as unknown as Repository<AttendanceRecord>;
  const congregationsService = {
    getOrCreateBase: jest.fn().mockResolvedValue({ id: 'congregation-1' }),
  } as unknown as CongregationsService;
  const service = new AttendanceService(
    attendanceRepository,
    congregationsService,
  );
  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(() => jest.clearAllMocks());

  it('rejeita quando adults + children é diferente de total_present', async () => {
    await expect(
      service.createRecord(
        {
          eventDate: '2026-07-19',
          eventType: AttendanceEventType.SERVICE,
          totalPresent: 100,
          adults: 60,
          children: 30,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('aceita quando adults + children é igual a total_present', async () => {
    save.mockResolvedValue({
      id: 'record-1',
      congregationId: 'congregation-1',
      createdByUserId: 'user-1',
      eventDate: '2026-07-19',
      eventType: AttendanceEventType.SERVICE,
      calendarEventId: null,
      totalPresent: 90,
      adults: 60,
      children: 30,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.createRecord(
        {
          eventDate: '2026-07-19',
          eventType: AttendanceEventType.SERVICE,
          totalPresent: 90,
          adults: 60,
          children: 30,
        },
        user,
      ),
    ).resolves.toMatchObject({ id: 'record-1' });
  });

  it('aceita lançamento agregado sem adults/children informados', async () => {
    save.mockResolvedValue({
      id: 'record-2',
      congregationId: 'congregation-1',
      createdByUserId: 'user-1',
      eventDate: '2026-07-19',
      eventType: AttendanceEventType.SERVICE,
      calendarEventId: null,
      totalPresent: 120,
      adults: null,
      children: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.createRecord(
        {
          eventDate: '2026-07-19',
          eventType: AttendanceEventType.SERVICE,
          totalPresent: 120,
        },
        user,
      ),
    ).resolves.toMatchObject({ id: 'record-2' });
  });

  it('rejeita atualização cuja composição diverge do total_present existente', async () => {
    findOne.mockResolvedValue({
      id: 'record-1',
      congregationId: 'congregation-1',
      eventDate: '2026-07-19',
      eventType: AttendanceEventType.SERVICE,
      totalPresent: 90,
      adults: 60,
      children: 30,
    });

    await expect(
      service.updateRecord('record-1', { totalPresent: 100 }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('lança ApiException quando o registro não existe na congregação', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findRecord('record-x')).rejects.toBeInstanceOf(
      ApiException,
    );
  });
});
