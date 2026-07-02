import { createHandler } from './handler.js';
import { proxyToTMDB } from './tmdbProxy.js';
import { createTokenVerifier } from './verifyToken.js';

export default createHandler({
  isAuthorized: createTokenVerifier(),
  proxyToTMDB,
  allowedOrigin: 'https://tonpseudo.github.io',
});
