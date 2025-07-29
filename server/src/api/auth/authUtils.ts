import JWT from 'jsonwebtoken';
import { IUserJWTPayload } from '../interfaces/user.interface';
import crypto from 'crypto';

function createTokenPair({
  payload,
  privateKey,
}: {
  payload: IUserJWTPayload;
  privateKey: string;
  publicKey: string;
}) {
  const accessToken = JWT.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1d',
  });

  const refreshToken = JWT.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7 days',
  });

  return { accessToken, refreshToken };
}

function generateKeyPair() {
  // const privateKey = crypto.randomBytes(64).toString('hex');
  // const publicKey = crypto.randomBytes(64).toString('hex');

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  });

  return { privateKey, publicKey };
}

export { createTokenPair, generateKeyPair };
