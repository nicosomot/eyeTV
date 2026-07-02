import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwks;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

async function defaultVerify(idToken, projectId) {
  const { payload } = await jwtVerify(idToken, getJWKS(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

export function createTokenVerifier({ verifyFn = defaultVerify } = {}) {
  return async function isAuthorized(request, env) {
    const authHeader = request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return false;
    try {
      const payload = await verifyFn(match[1], env.FIREBASE_PROJECT_ID);
      return payload.sub === env.ALLOWED_UID;
    } catch {
      return false;
    }
  };
}
