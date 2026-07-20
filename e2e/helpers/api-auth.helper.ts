export interface AuthResponseBody {
  accessToken: string;
  user: { id: string; email: string };
}

export async function loginViaApi(
  apiUrl: string,
  email: string,
  password: string,
): Promise<AuthResponseBody> {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login API falhou (${response.status}). Verifique credenciais e backend.`);
  }

  return (await response.json()) as AuthResponseBody;
}
