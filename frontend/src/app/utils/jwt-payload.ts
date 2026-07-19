import { IJwtPayload } from '@interfaces/IJwtPayload';

export function decodeJwtPayload(token: string): IJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const segment = parts[1];
    if (!segment) {
      return null;
    }

    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as IJwtPayload;
  } catch {
    return null;
  }
}
