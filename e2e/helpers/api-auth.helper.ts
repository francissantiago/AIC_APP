export interface AuthResponseBody {
  accessToken: string;
  user: { id: string; email: string };
}

export async function loginViaApi(
  apiUrl: string,
  email: string,
  password: string,
  retries = 3,
): Promise<AuthResponseBody> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
          continue;
        }
        throw new Error(
          `Login API falhou (${response.status}). Verifique credenciais e backend.`,
        );
      }

      return (await response.json()) as AuthResponseBody;
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }
      throw error;
    }
  }

  throw new Error("Login API falhou após retries.");
}
