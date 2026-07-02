import { describe, it, expect, vi } from 'vitest';
import { createTokenVerifier } from '../src/verifyToken.js';

function makeRequest(authHeader) {
  const headers = new Headers();
  if (authHeader) headers.set('Authorization', authHeader);
  return new Request('https://proxy.example/tv/1', { headers });
}

describe('createTokenVerifier', () => {
  it('autorise quand le token est valide et le uid correspond', async () => {
    const verifyFn = vi.fn().mockResolvedValue({ sub: 'user-123' });
    const isAuthorized = createTokenVerifier({ verifyFn });

    const result = await isAuthorized(
      makeRequest('Bearer good-token'),
      { FIREBASE_PROJECT_ID: 'proj', ALLOWED_UID: 'user-123' }
    );

    expect(result).toBe(true);
    expect(verifyFn).toHaveBeenCalledWith('good-token', 'proj');
  });

  it('refuse quand le uid ne correspond pas', async () => {
    const verifyFn = vi.fn().mockResolvedValue({ sub: 'someone-else' });
    const isAuthorized = createTokenVerifier({ verifyFn });

    const result = await isAuthorized(
      makeRequest('Bearer good-token'),
      { FIREBASE_PROJECT_ID: 'proj', ALLOWED_UID: 'user-123' }
    );

    expect(result).toBe(false);
  });

  it("refuse quand il n'y a pas d'en-tête Authorization", async () => {
    const verifyFn = vi.fn();
    const isAuthorized = createTokenVerifier({ verifyFn });

    const result = await isAuthorized(
      makeRequest(null),
      { FIREBASE_PROJECT_ID: 'proj', ALLOWED_UID: 'user-123' }
    );

    expect(result).toBe(false);
    expect(verifyFn).not.toHaveBeenCalled();
  });

  it('refuse quand la vérification du token échoue', async () => {
    const verifyFn = vi.fn().mockRejectedValue(new Error('bad signature'));
    const isAuthorized = createTokenVerifier({ verifyFn });

    const result = await isAuthorized(
      makeRequest('Bearer bad-token'),
      { FIREBASE_PROJECT_ID: 'proj', ALLOWED_UID: 'user-123' }
    );

    expect(result).toBe(false);
  });
});
