/** Política mínima de senha (AIC-SEC-014): maiúscula, minúscula, dígito, 8–72. */
export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Senha deve ter maiúscula, minúscula e número (8–72 caracteres)';
