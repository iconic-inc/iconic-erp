import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';
import { createEmployee } from '@services/employee.service';
import { USER } from '@constants/user.constant';
import { getRoleById } from '@services/role.service';
import { InternalServerError } from '@/api/core/errors';
import { sendTempPassEmail } from '@services/email.service';

require('dotenv').config();
import { mongodbInstance } from '../db/init.mongodb';
import mongoose, { ClientSession } from 'mongoose';
import { RoleModel } from '@models/role.model';

async function setup() {
  // Ask user to enter their email
  const rl = readline.createInterface({ input, output });

  const email = await rl.question('Please enter your email: ');

  if (!email) {
    console.error('Email is required.');
    rl.close();
    return;
  }
  await mongodbInstance.connect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const genApiKey = await import('./genApiKey');
    const genResource = await import('./genResource');
    const genRole = await import('./genRole');
    await genApiKey.default(session);
    await genResource.default(session);
    await genRole.default(session);

    await signup(email, session);
    await session.commitTransaction();
    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    await session.abortTransaction();
    throw new InternalServerError('Failed to complete setup');
  } finally {
    session.endSession();
  }
  // Close the readline interface
  rl.close();
}

const signup = async (email: string, session: ClientSession) => {
  try {
    const role = await RoleModel.findOne({ slug: 'admin' }).session(session);
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
      role: role._id.toString(),
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
  } catch (error) {
    console.error('Error during signup:', error);
    throw new InternalServerError('Failed to create user');
  }
};

setup()
  .then(() => {
    console.log('Setup completed successfully!');
  })
  .finally(async () => {
    await mongodbInstance.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  });
