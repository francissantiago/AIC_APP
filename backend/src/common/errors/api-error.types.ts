export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  traceId?: string;
}

/** Catálogo estável DOMAIN.CASE — espelhado em ERRORS.* no frontend. */
export const ApiErrorCode = {
  SYS_INTERNAL: 'SYS.INTERNAL',
  SYS_VALIDATION: 'SYS.VALIDATION',
  SYS_BAD_REQUEST: 'SYS.BAD_REQUEST',
  SYS_NOT_FOUND: 'SYS.NOT_FOUND',

  AUTH_INVALID_CREDENTIALS: 'AUTH.INVALID_CREDENTIALS',
  AUTH_FORBIDDEN: 'AUTH.FORBIDDEN',

  USERS_NOT_FOUND: 'USERS.NOT_FOUND',
  USERS_EMAIL_IN_USE: 'USERS.EMAIL_IN_USE',
  USERS_USERNAME_IN_USE: 'USERS.USERNAME_IN_USE',
  USERS_ROLES_NOT_FOUND: 'USERS.ROLES_NOT_FOUND',

  ROLES_NOT_FOUND: 'ROLES.NOT_FOUND',
  ROLES_CODE_IN_USE: 'ROLES.CODE_IN_USE',
  ROLES_SYSTEM_PROTECTED: 'ROLES.SYSTEM_PROTECTED',
  ROLES_IN_USE: 'ROLES.IN_USE',
  ROLES_ADMIN_REQUIRES_ROLES_WRITE: 'ROLES.ADMIN_REQUIRES_ROLES_WRITE',

  PERMISSIONS_NOT_FOUND: 'PERMISSIONS.NOT_FOUND',

  MEMBERS_NOT_FOUND: 'MEMBERS.NOT_FOUND',
  MEMBERS_EMAIL_IN_USE: 'MEMBERS.EMAIL_IN_USE',
  MEMBERS_DOCUMENT_IN_USE: 'MEMBERS.DOCUMENT_IN_USE',
  MEMBERS_USER_ALREADY_LINKED: 'MEMBERS.USER_ALREADY_LINKED',
  MEMBERS_USER_NOT_FOUND: 'MEMBERS.USER_NOT_FOUND',

  CONGREGATIONS_EMAIL_IN_USE: 'CONGREGATIONS.EMAIL_IN_USE',
  CONGREGATIONS_DOCUMENT_IN_USE: 'CONGREGATIONS.DOCUMENT_IN_USE',

  FINANCE_CATEGORY_NOT_FOUND: 'FINANCE.CATEGORY_NOT_FOUND',
  FINANCE_ENTRY_NOT_FOUND: 'FINANCE.ENTRY_NOT_FOUND',
  FINANCE_CATEGORY_TYPE_LOCKED: 'FINANCE.CATEGORY_TYPE_LOCKED',
  FINANCE_CATEGORY_TYPE_MISMATCH: 'FINANCE.CATEGORY_TYPE_MISMATCH',
  FINANCE_CATEGORY_INACTIVE: 'FINANCE.CATEGORY_INACTIVE',
  FINANCE_CATEGORY_DUPLICATE: 'FINANCE.CATEGORY_DUPLICATE',
  FINANCE_EXPORT_RANGE_REQUIRED: 'FINANCE.EXPORT_RANGE_REQUIRED',
  FINANCE_EXPORT_RANGE_ORDER: 'FINANCE.EXPORT_RANGE_ORDER',
  FINANCE_EXPORT_RANGE_MAX: 'FINANCE.EXPORT_RANGE_MAX',
  FINANCE_MEMBER_LINK_INVALID: 'FINANCE.MEMBER_LINK_INVALID',
  FINANCE_MEMBER_NOT_FOUND: 'FINANCE.MEMBER_NOT_FOUND',
  FINANCE_MEMBER_WRONG_CONGREGATION: 'FINANCE.MEMBER_WRONG_CONGREGATION',
  FINANCE_MEMBER_REQUIRED_FOR_REPORT: 'FINANCE.MEMBER_REQUIRED_FOR_REPORT',

  ASSETS_NOT_FOUND: 'ASSETS.NOT_FOUND',
  ASSETS_DUPLICATE: 'ASSETS.DUPLICATE',

  SECRETARIAT_ATTENDANCE_NOT_FOUND: 'SECRETARIAT.ATTENDANCE_NOT_FOUND',
  SECRETARIAT_ATTENDANCE_TOTAL_MISMATCH:
    'SECRETARIAT.ATTENDANCE_TOTAL_MISMATCH',
  SECRETARIAT_VISITOR_NOT_FOUND: 'SECRETARIAT.VISITOR_NOT_FOUND',
  SECRETARIAT_VISITOR_ALREADY_CONVERTED:
    'SECRETARIAT.VISITOR_ALREADY_CONVERTED',
  SECRETARIAT_DOCUMENT_NOT_FOUND: 'SECRETARIAT.DOCUMENT_NOT_FOUND',
  SECRETARIAT_DOCUMENT_FILE_REQUIRED: 'SECRETARIAT.DOCUMENT_FILE_REQUIRED',
  SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID:
    'SECRETARIAT.DOCUMENT_FILE_TYPE_INVALID',
  SECRETARIAT_DOCUMENT_FILE_TOO_LARGE: 'SECRETARIAT.DOCUMENT_FILE_TOO_LARGE',
  SECRETARIAT_DOCUMENT_FILE_NOT_FOUND: 'SECRETARIAT.DOCUMENT_FILE_NOT_FOUND',
  SECRETARIAT_EVENT_NOT_FOUND: 'SECRETARIAT.EVENT_NOT_FOUND',
  SECRETARIAT_EVENT_ENDS_BEFORE_START: 'SECRETARIAT.EVENT_ENDS_BEFORE_START',
  SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID:
    'SECRETARIAT.EVENT_RECURRENCE_UNTIL_INVALID',

  MINISTRIES_NOT_FOUND: 'MINISTRIES.NOT_FOUND',
  MINISTRIES_NAME_IN_USE: 'MINISTRIES.NAME_IN_USE',
  MINISTRIES_LEADER_NOT_FOUND: 'MINISTRIES.LEADER_NOT_FOUND',
  MINISTRIES_LEADER_WRONG_CONGREGATION: 'MINISTRIES.LEADER_WRONG_CONGREGATION',
  MINISTRIES_MEMBER_NOT_FOUND: 'MINISTRIES.MEMBER_NOT_FOUND',
  MINISTRIES_MEMBER_WRONG_CONGREGATION: 'MINISTRIES.MEMBER_WRONG_CONGREGATION',
  MINISTRIES_MEMBER_ALREADY_LINKED: 'MINISTRIES.MEMBER_ALREADY_LINKED',
  MINISTRIES_MEMBER_LINK_NOT_FOUND: 'MINISTRIES.MEMBER_LINK_NOT_FOUND',

  FAMILIES_NOT_FOUND: 'FAMILIES.NOT_FOUND',
  FAMILIES_MEMBER_NOT_FOUND: 'FAMILIES.MEMBER_NOT_FOUND',
  FAMILIES_MEMBER_WRONG_CONGREGATION: 'FAMILIES.MEMBER_WRONG_CONGREGATION',
  FAMILIES_MEMBER_ALREADY_IN_FAMILY: 'FAMILIES.MEMBER_ALREADY_IN_FAMILY',
  FAMILIES_MEMBER_ALREADY_LINKED: 'FAMILIES.MEMBER_ALREADY_LINKED',
  FAMILIES_MEMBER_LINK_NOT_FOUND: 'FAMILIES.MEMBER_LINK_NOT_FOUND',
  FAMILIES_HEAD_NOT_FOUND: 'FAMILIES.HEAD_NOT_FOUND',
  FAMILIES_HEAD_WRONG_CONGREGATION: 'FAMILIES.HEAD_WRONG_CONGREGATION',
  FAMILIES_MEMBER_FAMILY_NOT_FOUND: 'FAMILIES.MEMBER_FAMILY_NOT_FOUND',
  FAMILIES_BIRTHDAY_MONTH_INVALID: 'FAMILIES.BIRTHDAY_MONTH_INVALID',

  CLASSES_NOT_FOUND: 'CLASSES.NOT_FOUND',
  CLASSES_NAME_IN_USE: 'CLASSES.NAME_IN_USE',
  CLASSES_TEACHER_NOT_FOUND: 'CLASSES.TEACHER_NOT_FOUND',
  CLASSES_TEACHER_WRONG_CONGREGATION: 'CLASSES.TEACHER_WRONG_CONGREGATION',
  CLASSES_ENROLLMENT_NOT_FOUND: 'CLASSES.ENROLLMENT_NOT_FOUND',
  CLASSES_ENROLLMENT_ALREADY_EXISTS: 'CLASSES.ENROLLMENT_ALREADY_EXISTS',
  CLASSES_ENROLLMENT_MEMBER_NOT_FOUND: 'CLASSES.ENROLLMENT_MEMBER_NOT_FOUND',
  CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION:
    'CLASSES.ENROLLMENT_MEMBER_WRONG_CONGREGATION',
  CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED:
    'CLASSES.ATTENDANCE_MEMBER_NOT_ENROLLED',
  CLASSES_ATTENDANCE_PERIOD_INVALID: 'CLASSES.ATTENDANCE_PERIOD_INVALID',
  CLASSES_ATTENDANCE_EMPTY_ENTRIES: 'CLASSES.ATTENDANCE_EMPTY_ENTRIES',

  SMALL_GROUPS_NOT_FOUND: 'SMALL_GROUPS.NOT_FOUND',
  SMALL_GROUPS_NAME_CONFLICT: 'SMALL_GROUPS.NAME_CONFLICT',
  SMALL_GROUPS_LEADER_NOT_FOUND: 'SMALL_GROUPS.LEADER_NOT_FOUND',
  SMALL_GROUPS_LEADER_WRONG_CONGREGATION:
    'SMALL_GROUPS.LEADER_WRONG_CONGREGATION',
  SMALL_GROUPS_LEADER_INACTIVE: 'SMALL_GROUPS.LEADER_INACTIVE',
  SMALL_GROUPS_MEMBER_NOT_FOUND: 'SMALL_GROUPS.MEMBER_NOT_FOUND',
  SMALL_GROUPS_MEMBER_WRONG_CONGREGATION:
    'SMALL_GROUPS.MEMBER_WRONG_CONGREGATION',
  SMALL_GROUPS_MEMBER_INACTIVE: 'SMALL_GROUPS.MEMBER_INACTIVE',
  SMALL_GROUPS_MEMBER_ALREADY_LINKED: 'SMALL_GROUPS.MEMBER_ALREADY_LINKED',
  SMALL_GROUPS_MEETING_NOT_FOUND: 'SMALL_GROUPS.MEETING_NOT_FOUND',
  SMALL_GROUPS_MEETING_DATE_CONFLICT: 'SMALL_GROUPS.MEETING_DATE_CONFLICT',
  SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE:
    'SMALL_GROUPS.ATTENDANCE_MEMBER_NOT_ACTIVE',
  SMALL_GROUPS_INVALID_PERIOD: 'SMALL_GROUPS.INVALID_PERIOD',

  SCHEDULES_NOT_FOUND: 'SCHEDULES.NOT_FOUND',
  SCHEDULES_EVENT_NOT_FOUND: 'SCHEDULES.EVENT_NOT_FOUND',
  SCHEDULES_MINISTRY_NOT_FOUND: 'SCHEDULES.MINISTRY_NOT_FOUND',
  SCHEDULES_MINISTRY_INACTIVE: 'SCHEDULES.MINISTRY_INACTIVE',
  SCHEDULES_MEMBER_NOT_FOUND: 'SCHEDULES.MEMBER_NOT_FOUND',
  SCHEDULES_MEMBER_INACTIVE: 'SCHEDULES.MEMBER_INACTIVE',
  SCHEDULES_MEMBER_WRONG_CONGREGATION: 'SCHEDULES.MEMBER_WRONG_CONGREGATION',
  SCHEDULES_MEMBER_NOT_IN_MINISTRY: 'SCHEDULES.MEMBER_NOT_IN_MINISTRY',
  SCHEDULES_CONGREGATION_MISMATCH: 'SCHEDULES.CONGREGATION_MISMATCH',
  SCHEDULES_ASSIGNMENT_CONFLICT: 'SCHEDULES.ASSIGNMENT_CONFLICT',
  SCHEDULES_INVALID_PERIOD: 'SCHEDULES.INVALID_PERIOD',

  ANNOUNCEMENTS_NOT_FOUND: 'ANNOUNCEMENTS.NOT_FOUND',
  ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED: 'ANNOUNCEMENTS.AUDIENCE_NOT_SUPPORTED',
  ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH: 'ANNOUNCEMENTS.EXPIRES_BEFORE_PUBLISH',
  ANNOUNCEMENTS_INVALID_TARGETS: 'ANNOUNCEMENTS.INVALID_TARGETS',

  NOTIFICATIONS_NOT_FOUND: 'NOTIFICATIONS.NOT_FOUND',
} as const;

export type ApiErrorCodeValue =
  (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const ApiErrorMessage = {
  [ApiErrorCode.SYS_INTERNAL]:
    'Ocorreu um erro interno. Se o problema persistir, informe o código de suporte.',
  [ApiErrorCode.SYS_VALIDATION]:
    'Dados inválidos. Verifique os campos destacados.',
  [ApiErrorCode.SYS_BAD_REQUEST]: 'Requisição inválida.',
  [ApiErrorCode.SYS_NOT_FOUND]: 'Recurso não encontrado.',
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Credenciais inválidas',
  [ApiErrorCode.AUTH_FORBIDDEN]: 'Perfil sem permissão para esta operação',
  [ApiErrorCode.USERS_NOT_FOUND]: 'Usuário não encontrado.',
  [ApiErrorCode.USERS_EMAIL_IN_USE]: 'Este e-mail já está cadastrado.',
  [ApiErrorCode.USERS_USERNAME_IN_USE]: 'Este nome de usuário já está em uso.',
  [ApiErrorCode.USERS_ROLES_NOT_FOUND]:
    'Uma ou mais roles informadas não existem.',
  [ApiErrorCode.ROLES_NOT_FOUND]: 'Papel não encontrado.',
  [ApiErrorCode.ROLES_CODE_IN_USE]: 'Este código de papel já está em uso.',
  [ApiErrorCode.ROLES_SYSTEM_PROTECTED]:
    'Papéis do sistema não podem ser removidos.',
  [ApiErrorCode.ROLES_IN_USE]:
    'Não é possível remover: há usuários vinculados a este papel.',
  [ApiErrorCode.ROLES_ADMIN_REQUIRES_ROLES_WRITE]:
    'O papel ADMIN não pode perder a permissão de gerenciar papéis (roles:write).',
  [ApiErrorCode.PERMISSIONS_NOT_FOUND]:
    'Uma ou mais permissões informadas não existem.',
  [ApiErrorCode.MEMBERS_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.MEMBERS_EMAIL_IN_USE]: 'Este e-mail já está cadastrado.',
  [ApiErrorCode.MEMBERS_DOCUMENT_IN_USE]: 'Este documento já está cadastrado.',
  [ApiErrorCode.MEMBERS_USER_ALREADY_LINKED]:
    'Este usuário já está vinculado a outro membro.',
  [ApiErrorCode.MEMBERS_USER_NOT_FOUND]: 'Usuário vinculado não encontrado.',
  [ApiErrorCode.CONGREGATIONS_EMAIL_IN_USE]: 'Este e-mail já está cadastrado.',
  [ApiErrorCode.CONGREGATIONS_DOCUMENT_IN_USE]:
    'Este documento já está cadastrado.',
  [ApiErrorCode.FINANCE_CATEGORY_NOT_FOUND]: 'Categoria não encontrada.',
  [ApiErrorCode.FINANCE_ENTRY_NOT_FOUND]: 'Lançamento não encontrado.',
  [ApiErrorCode.FINANCE_CATEGORY_TYPE_LOCKED]:
    'Categoria em uso não pode trocar de tipo.',
  [ApiErrorCode.FINANCE_CATEGORY_TYPE_MISMATCH]:
    'O tipo do lançamento deve corresponder ao tipo da categoria.',
  [ApiErrorCode.FINANCE_CATEGORY_INACTIVE]:
    'Categoria inativa não aceita novos lançamentos.',
  [ApiErrorCode.FINANCE_CATEGORY_DUPLICATE]:
    'Já existe uma categoria com esse nome e tipo.',
  [ApiErrorCode.FINANCE_EXPORT_RANGE_REQUIRED]:
    'from e to são obrigatórios para exportar CSV.',
  [ApiErrorCode.FINANCE_EXPORT_RANGE_ORDER]:
    'from deve ser anterior ou igual a to.',
  [ApiErrorCode.FINANCE_EXPORT_RANGE_MAX]:
    'O período máximo permitido é de 24 meses.',
  [ApiErrorCode.FINANCE_MEMBER_LINK_INVALID]:
    'O membro só pode ser vinculado a lançamentos de dízimo, oferta ou doação.',
  [ApiErrorCode.FINANCE_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.FINANCE_MEMBER_WRONG_CONGREGATION]:
    'O membro deve pertencer a esta congregação.',
  [ApiErrorCode.FINANCE_MEMBER_REQUIRED_FOR_REPORT]:
    'memberId é obrigatório para este relatório.',
  [ApiErrorCode.ASSETS_NOT_FOUND]: 'Bem não encontrado.',
  [ApiErrorCode.ASSETS_DUPLICATE]: 'Já existe um bem com esses dados.',
  [ApiErrorCode.SECRETARIAT_ATTENDANCE_NOT_FOUND]:
    'Registro de presença não encontrado.',
  [ApiErrorCode.SECRETARIAT_ATTENDANCE_TOTAL_MISMATCH]:
    'A soma de adultos e crianças deve ser igual ao total presente.',
  [ApiErrorCode.SECRETARIAT_VISITOR_NOT_FOUND]: 'Visitante não encontrado.',
  [ApiErrorCode.SECRETARIAT_VISITOR_ALREADY_CONVERTED]:
    'Este visitante já foi integrado como membro.',
  [ApiErrorCode.SECRETARIAT_DOCUMENT_NOT_FOUND]: 'Documento não encontrado.',
  [ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_REQUIRED]: 'Arquivo é obrigatório.',
  [ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TYPE_INVALID]:
    'Tipo de arquivo não permitido.',
  [ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_TOO_LARGE]:
    'Arquivo excede o tamanho máximo permitido.',
  [ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND]:
    'Arquivo do documento não encontrado.',
  [ApiErrorCode.SECRETARIAT_EVENT_NOT_FOUND]: 'Evento não encontrado.',
  [ApiErrorCode.SECRETARIAT_EVENT_ENDS_BEFORE_START]:
    'O fim do evento deve ser posterior ou igual ao início.',
  [ApiErrorCode.SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID]:
    'A data final da recorrência deve ser posterior ou igual à data de início.',
  [ApiErrorCode.MINISTRIES_NOT_FOUND]: 'Ministério não encontrado.',
  [ApiErrorCode.MINISTRIES_NAME_IN_USE]:
    'Já existe um ministério com este nome.',
  [ApiErrorCode.MINISTRIES_LEADER_NOT_FOUND]:
    'Líder selecionado não encontrado.',
  [ApiErrorCode.MINISTRIES_LEADER_WRONG_CONGREGATION]:
    'O líder deve pertencer a esta congregação.',
  [ApiErrorCode.MINISTRIES_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.MINISTRIES_MEMBER_WRONG_CONGREGATION]:
    'O membro deve pertencer a esta congregação.',
  [ApiErrorCode.MINISTRIES_MEMBER_ALREADY_LINKED]:
    'Membro já vinculado a este ministério.',
  [ApiErrorCode.MINISTRIES_MEMBER_LINK_NOT_FOUND]: 'Vínculo não encontrado.',
  [ApiErrorCode.FAMILIES_NOT_FOUND]: 'Família não encontrada.',
  [ApiErrorCode.FAMILIES_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.FAMILIES_MEMBER_WRONG_CONGREGATION]:
    'Membro pertence a outra congregação.',
  [ApiErrorCode.FAMILIES_MEMBER_ALREADY_IN_FAMILY]:
    'Membro já está vinculado a uma família.',
  [ApiErrorCode.FAMILIES_MEMBER_ALREADY_LINKED]:
    'Membro já está vinculado a esta família.',
  [ApiErrorCode.FAMILIES_MEMBER_LINK_NOT_FOUND]:
    'Vínculo familiar não encontrado.',
  [ApiErrorCode.FAMILIES_HEAD_NOT_FOUND]:
    'Responsável da família não encontrado.',
  [ApiErrorCode.FAMILIES_HEAD_WRONG_CONGREGATION]:
    'Responsável pertence a outra congregação.',
  [ApiErrorCode.FAMILIES_MEMBER_FAMILY_NOT_FOUND]:
    'Membro não possui família cadastrada.',
  [ApiErrorCode.FAMILIES_BIRTHDAY_MONTH_INVALID]:
    'Mês de aniversário inválido.',
  [ApiErrorCode.CLASSES_NOT_FOUND]: 'Turma não encontrada.',
  [ApiErrorCode.CLASSES_NAME_IN_USE]: 'Já existe uma turma com este nome.',
  [ApiErrorCode.CLASSES_TEACHER_NOT_FOUND]:
    'Professor selecionado não encontrado.',
  [ApiErrorCode.CLASSES_TEACHER_WRONG_CONGREGATION]:
    'O professor deve pertencer a esta congregação.',
  [ApiErrorCode.CLASSES_ENROLLMENT_NOT_FOUND]: 'Matrícula não encontrada.',
  [ApiErrorCode.CLASSES_ENROLLMENT_ALREADY_EXISTS]:
    'Membro já matriculado nesta turma.',
  [ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.CLASSES_ENROLLMENT_MEMBER_WRONG_CONGREGATION]:
    'O membro deve pertencer a esta congregação.',
  [ApiErrorCode.CLASSES_ATTENDANCE_MEMBER_NOT_ENROLLED]:
    'O membro não possui matrícula ativa nesta turma.',
  [ApiErrorCode.CLASSES_ATTENDANCE_PERIOD_INVALID]:
    'Período inválido: from deve ser ≤ to e o intervalo máximo é de 24 meses.',
  [ApiErrorCode.CLASSES_ATTENDANCE_EMPTY_ENTRIES]:
    'Informe ao menos um aluno na chamada.',
  [ApiErrorCode.SMALL_GROUPS_NOT_FOUND]: 'Pequeno grupo não encontrado.',
  [ApiErrorCode.SMALL_GROUPS_NAME_CONFLICT]:
    'Já existe um pequeno grupo com este nome.',
  [ApiErrorCode.SMALL_GROUPS_LEADER_NOT_FOUND]:
    'Líder selecionado não encontrado.',
  [ApiErrorCode.SMALL_GROUPS_LEADER_WRONG_CONGREGATION]:
    'O líder deve pertencer a esta congregação.',
  [ApiErrorCode.SMALL_GROUPS_LEADER_INACTIVE]:
    'O líder selecionado não está ativo.',
  [ApiErrorCode.SMALL_GROUPS_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.SMALL_GROUPS_MEMBER_WRONG_CONGREGATION]:
    'O membro deve pertencer a esta congregação.',
  [ApiErrorCode.SMALL_GROUPS_MEMBER_INACTIVE]:
    'O membro selecionado não está ativo.',
  [ApiErrorCode.SMALL_GROUPS_MEMBER_ALREADY_LINKED]:
    'Membro já vinculado a este pequeno grupo.',
  [ApiErrorCode.SMALL_GROUPS_MEETING_NOT_FOUND]: 'Reunião não encontrada.',
  [ApiErrorCode.SMALL_GROUPS_MEETING_DATE_CONFLICT]:
    'Já existe uma reunião nesta data para o grupo.',
  [ApiErrorCode.SMALL_GROUPS_ATTENDANCE_MEMBER_NOT_ACTIVE]:
    'O membro não possui vínculo ativo neste pequeno grupo.',
  [ApiErrorCode.SMALL_GROUPS_INVALID_PERIOD]:
    'Período inválido: from deve ser ≤ to e o intervalo máximo é de 24 meses.',
  [ApiErrorCode.SCHEDULES_NOT_FOUND]: 'Atribuição de escala não encontrada.',
  [ApiErrorCode.SCHEDULES_EVENT_NOT_FOUND]: 'Evento não encontrado.',
  [ApiErrorCode.SCHEDULES_MINISTRY_NOT_FOUND]: 'Ministério não encontrado.',
  [ApiErrorCode.SCHEDULES_MINISTRY_INACTIVE]:
    'Ministério inativo não aceita novas atribuições.',
  [ApiErrorCode.SCHEDULES_MEMBER_NOT_FOUND]: 'Membro não encontrado.',
  [ApiErrorCode.SCHEDULES_MEMBER_INACTIVE]:
    'O membro selecionado não está ativo.',
  [ApiErrorCode.SCHEDULES_MEMBER_WRONG_CONGREGATION]:
    'O membro deve pertencer a esta congregação.',
  [ApiErrorCode.SCHEDULES_MEMBER_NOT_IN_MINISTRY]:
    'O membro não pertence a este ministério.',
  [ApiErrorCode.SCHEDULES_CONGREGATION_MISMATCH]:
    'Evento e ministério devem pertencer à mesma congregação.',
  [ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT]:
    'Já existe uma atribuição deste membro neste ministério para o evento.',
  [ApiErrorCode.SCHEDULES_INVALID_PERIOD]:
    'Período inválido: from deve ser ≤ to e o intervalo máximo é de 92 dias.',
  [ApiErrorCode.ANNOUNCEMENTS_NOT_FOUND]: 'Aviso não encontrado.',
  [ApiErrorCode.ANNOUNCEMENTS_AUDIENCE_NOT_SUPPORTED]:
    'Este tipo de audiência ainda não é suportado. Use audience=all.',
  [ApiErrorCode.ANNOUNCEMENTS_EXPIRES_BEFORE_PUBLISH]:
    'A data de expiração deve ser posterior à data de publicação.',
  [ApiErrorCode.ANNOUNCEMENTS_INVALID_TARGETS]:
    'Targets de audiência inválidos no MVP. Envie null ou lista vazia.',
  [ApiErrorCode.NOTIFICATIONS_NOT_FOUND]: 'Notificação não encontrada.',
} as const;
