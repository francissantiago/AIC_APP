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

  ASSETS_NOT_FOUND: 'ASSETS.NOT_FOUND',
  ASSETS_DUPLICATE: 'ASSETS.DUPLICATE',

  SECRETARIAT_ATTENDANCE_NOT_FOUND: 'SECRETARIAT.ATTENDANCE_NOT_FOUND',
  SECRETARIAT_ATTENDANCE_TOTAL_MISMATCH:
    'SECRETARIAT.ATTENDANCE_TOTAL_MISMATCH',
  SECRETARIAT_VISITOR_NOT_FOUND: 'SECRETARIAT.VISITOR_NOT_FOUND',
  SECRETARIAT_VISITOR_ALREADY_CONVERTED:
    'SECRETARIAT.VISITOR_ALREADY_CONVERTED',
  SECRETARIAT_DOCUMENT_NOT_FOUND: 'SECRETARIAT.DOCUMENT_NOT_FOUND',
  SECRETARIAT_EVENT_NOT_FOUND: 'SECRETARIAT.EVENT_NOT_FOUND',
  SECRETARIAT_EVENT_ENDS_BEFORE_START: 'SECRETARIAT.EVENT_ENDS_BEFORE_START',
  SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID:
    'SECRETARIAT.EVENT_RECURRENCE_UNTIL_INVALID',
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
  [ApiErrorCode.SECRETARIAT_EVENT_NOT_FOUND]: 'Evento não encontrado.',
  [ApiErrorCode.SECRETARIAT_EVENT_ENDS_BEFORE_START]:
    'O fim do evento deve ser posterior ou igual ao início.',
  [ApiErrorCode.SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID]:
    'A data final da recorrência deve ser posterior ou igual à data de início.',
} as const;
