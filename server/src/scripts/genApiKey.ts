import { randomBytes } from 'crypto';
import { ApiKeyModel } from '../api/models/apiKey.model';
import { ClientSession } from 'mongoose';

export default async function main(session: ClientSession) {
  await ApiKeyModel.create(
    [
      {
        key: randomBytes(32).toString('hex'),
        status: true,
        permissions: ['0000', '1111', '2222'],
      },
    ],
    { session }
  ).then((k) => console.log(k[0].toJSON()));

  await ApiKeyModel.create(
    [
      {
        key: randomBytes(32).toString('hex'),
        status: true,
        permissions: ['0000'],
      },
    ],
    { session }
  ).then((k) => console.log(k[0].toJSON()));

  await ApiKeyModel.create(
    [
      {
        key: randomBytes(32).toString('hex'),
        status: true,
        permissions: ['1111'],
      },
    ],
    { session }
  ).then((k) => console.log(k[0].toJSON()));

  await ApiKeyModel.create(
    [
      {
        key: randomBytes(32).toString('hex'),
        status: true,
        permissions: ['2222'],
      },
    ],
    { session }
  ).then((k) => console.log(k[0].toJSON()));
}
