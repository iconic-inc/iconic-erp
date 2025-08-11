import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { USER } from '../constants';
import { getReturnData } from '../utils';
import { createTokenPair, generateKeyPair } from '../auth/authUtils';
import { IUserCreate } from '../interfaces/user.interface';
import { IKeyTokenCreate } from '../interfaces/keyToken.interface';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '../core/errors';
import {
  removeKeyById,
  createKeyToken,
  updateRefreshToken,
  findByUserId,
} from './keyToken.service';
import { createUser, findUserById } from '../models/repositories/user.repo';
import { UserModel } from '../models/user.model';
import { sendVerificationEmail, sendTempPassEmail } from './email.service';
import { deleteOTPByEmail, getOTPByToken } from './otp.service';
import { getRoleById, getRoles } from './role.service';
import { parseJwt, verifyJwt } from '../helpers/jwt.helper';
import { createEmployee } from './employee.service';

export class AuthService {
  static async signIn({
    username,
    password,
    browserId,
    refreshToken = null,
  }: {
    username: string;
    password: string;
    browserId: string;
    refreshToken: string | null;
  }) {
    const foundUser = await findUserById(username);

    const isMatchPwd = bcrypt.compareSync(
      password,
      foundUser?.usr_password || ''
    );

    if (!foundUser || !isMatchPwd || !password) {
      throw new BadRequestError('Username hoặc mật khẩu không đúng!');
    }

    const { privateKey, publicKey } = generateKeyPair();

    const tokens = createTokenPair({
      payload: { userId: foundUser.id, email: foundUser.usr_email!, browserId },
      privateKey,
      publicKey,
    });

    const keyTokenCreate: IKeyTokenCreate = {
      user: foundUser.id,
      browserId,
      privateKey,
      publicKey,
      refreshToken: tokens.refreshToken,
    };

    if (refreshToken) keyTokenCreate.refreshTokensUsed = [refreshToken];

    await createKeyToken(keyTokenCreate);

    return {
      user: getReturnData(foundUser, {
        fields: ['id', 'usr_email', 'usr_role'],
      }),
      tokens,
    };
  }

  static async signUp({ email }: IUserCreate) {
    if (!email) {
      throw new BadRequestError('Email is required');
    }
    const foundUser = await UserModel.findOne({ usr_email: email });
    if (foundUser) {
      throw new Error('Email already exists');
    }

    return await sendVerificationEmail(email);
  }

  static async verifyEmailToken({ token }: { token: string }) {
    if (!token) {
      throw new BadRequestError('Invalid token');
    }

    const foundOtp = await getOTPByToken(token);
    if (!foundOtp) {
      throw new BadRequestError('Invalid token');
    }
    const { otp_email: email } = foundOtp;
    await deleteOTPByEmail(email);

    const foundUser = await UserModel.findOne({ usr_email: email });
    if (foundUser) {
      throw new BadRequestError('Email already exists');
    }

    const role = await getRoleById('admin');
    if (!role) {
      throw new InternalServerError('Fail to get role!');
    }

    const tempPass = randomBytes(8).toString('hex');

    await createEmployee({
      email,
      password: tempPass,
      firstName: email.split('@')[0],
      lastName: '',
      slug: email.split('@')[0],
      status: USER.STATUS.ACTIVE,
      role: role.id!,
      code: randomBytes(4).toString('hex').toUpperCase(),
      department: 'Administration',
      position: 'Administrator',
      joinDate: new Date(),
      username: email,
    });

    await sendTempPassEmail(email, { username: email, password: tempPass });

    return {
      ok: true,
    };
  }

  static async signOut(id: string) {
    return await removeKeyById(id);
  }

  static async refreshTokenHandler({
    clientId,
    refreshToken,
  }: {
    clientId: string;
    refreshToken: string;
  }) {
    // Check if refreshToken is missing
    if (!refreshToken) {
      throw new BadRequestError('Invalid request.');
    }
    // Check if userId is missing
    if (!clientId) {
      throw new BadRequestError('Invalid request.');
    }
    // Check if refreshToken data is valid
    const { userId, browserId } = parseJwt(refreshToken);
    if (userId !== clientId) {
      throw new BadRequestError('Invalid request.');
    }

    // find user by id
    const foundUser = await findUserById(userId);
    if (!foundUser) {
      throw new BadRequestError('Invalid request.');
    }

    // Check KeyToken in DB
    const keyToken = await findByUserId(clientId, browserId);
    if (!keyToken) {
      throw new BadRequestError('Invalid request.');
    }

    // Check if refreshToken has been used?
    if (keyToken.refreshTokensUsed.includes(refreshToken)) {
      // The token is used for the second time => malicious behavior => require user to log in again
      await removeKeyById(keyToken._id.toString());
      throw new ForbiddenError(
        'Something wrong happened. Please login again!!'
      );
    }

    // The token is used for the first time => valid
    // Token not exists in DB
    if (keyToken.refreshToken !== refreshToken)
      throw new BadRequestError('Invalid request.');

    // Verify refreshToken
    const { email } = verifyJwt(refreshToken, keyToken.publicKey);
    if (!email) {
      throw new BadRequestError('Invalid request.');
    }
    // Token exists in DB
    const tokens = createTokenPair({
      payload: { userId, email, browserId },
      privateKey: keyToken.privateKey,
      publicKey: keyToken.publicKey,
    });

    await updateRefreshToken(keyToken, refreshToken, tokens.refreshToken);

    return {
      user: getReturnData(foundUser, {
        fields: ['id', 'usr_email', 'usr_role'],
      }),
      tokens,
    };
  }
}
