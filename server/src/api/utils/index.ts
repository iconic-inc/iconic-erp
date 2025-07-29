import { randomBytes } from 'crypto';
import { Request } from 'express';
import _ from 'lodash';
import slugify from 'slugify';
import { serverConfig } from '@configs/config.server';
import { isValidObjectId } from 'mongoose';

declare global {
  interface Object {
    id?: string | any;
    _id?: string | any;
  }
}

const omit = <T = Object>(obj: T, fields?: string[]): Partial<T> => {
  if (!fields || !fields.length) return obj;

  return (Object.keys(obj as Object) as Array<keyof typeof obj>).reduce<
    Partial<T>
  >((object, field) => {
    if (!fields.includes(field as string)) object[field] = obj[field];

    return object;
  }, {});
};

function getReturnData<T = Object>(
  obj: T,
  options?: Partial<
    Record<'fields' | 'without', Array<Extract<keyof T, string>>>
  >
) {
  if (!obj) return obj;

  // @ts-ignore
  if (obj.toObject) obj = obj.toObject();

  if (obj?._id) {
    obj.id = obj._id.toString();

    delete obj._id;
  }

  const pickedObj = _.isEmpty(options?.fields || [])
    ? obj
    : _.pick(obj, options?.fields!);
  const filteredObj = omit(pickedObj, [
    ...(options?.without || []),
    '__v',
  ]) as Partial<typeof obj>;
  for (const key in filteredObj) {
    const value = filteredObj[key];

    if (isValidObjectId(value)) {
      filteredObj[key] = value?.toString() as any;
      continue;
    }
    if (value?._id) {
      filteredObj[key] = getReturnData(value) as any;
      continue;
    }
    if (Array.isArray(value) && value[0]?._id)
      filteredObj[key] = getReturnList(value) as any;
    continue;
  }

  return filteredObj;
}

function getReturnList<T = Array<any>>(
  arr: T[],
  options?: Partial<
    Record<'fields' | 'without', Array<Extract<keyof T, string>>>
  >
) {
  if (!arr.length) return arr;

  return arr.map((ele) => getReturnData(ele, options));
}

const isNullish = (val: any) => (val ?? null) === null;
const isEmptyObj = (obj: Object) => !Object.keys(obj).length;
const getSkipNumber = (limit: number, page: number) => limit * (page - 1);
const isObj = (obj: any) => obj instanceof Object && !Array.isArray(obj);
const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const removeNullishElements = (arr: Array<any>) => {
  const final: typeof arr = [];

  arr.forEach((ele) => {
    if (!isNullish(ele) && ele !== '') {
      const result = removeNestedNullish(ele);
      if (result instanceof Object && isEmptyObj(result)) return;

      final[final.length] = result;
    }
  });

  return final.filter((ele) => !isNullish(ele) && ele);
};

const removeNullishAttributes = (obj: Object) => {
  const final: typeof obj = {};

  (Object.keys(obj) as Array<keyof typeof obj>).forEach((key) => {
    if (!isNullish(obj[key]) && obj[key] !== '') {
      const result = removeNestedNullish(obj[key]);

      if (result instanceof Object && isEmptyObj(result)) return;

      final[key] = result;
    }
  });

  return final;
};

const removeNestedNullish = <T>(any: any): T => {
  if (any instanceof Array)
    return removeNullishElements(any as Array<any>) as T;
  if (any instanceof Object) return removeNullishAttributes(any as Object) as T;

  return any;
};

function flattenObj(
  obj: Object,
  parent?: string,
  res: { [key: string]: any } = {}
) {
  (Object.keys(obj) as Array<keyof typeof obj>).forEach((key) => {
    let propName = parent ? parent + '.' + key : key;
    if (isObj(obj[key])) {
      flattenObj(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  });

  return res;
}

function formatAttributeName<T extends Object = Object>(attrs: T, prefix = '') {
  const attributes = (Object.keys(attrs) as Array<keyof typeof attrs>).reduce(
    (acc, key) => {
      return Object.assign(acc, {
        [`${key === 'id' || key === '_id' ? '' : prefix}${key as string}`]:
          attrs[key],
      });
    },
    {}
  ) as T;

  return attributes;
}

function getSlug(str: string) {
  return slugify(
    str.split(' ').reduce((acc, cur) => acc + cur.slice(0, 1), '') +
      ' ' +
      randomBytes(4).toString('hex'),
    { lower: true }
  );
}

function replaceTemplatePlaceholders(
  template: string,
  placeholders: Record<string, string>
) {
  return Object.keys(placeholders).reduce(
    (acc, key) => acc.replace(new RegExp(`{{${key}}}`, 'g'), placeholders[key]),
    template
  );
}

function getImageUrl(name: string): string {
  return `${serverConfig.imageHost}/${name}`;
}

function checkIPSameNetwork(
  ip: string,
  officeIP: string,
  subnetMask: string
): boolean {
  const ipParts = ip.split('.').map(Number);
  const officeIPParts = officeIP.split('.').map(Number);
  const subnetMaskParts = subnetMask.split('.').map(Number);

  return ipParts.every((part, index) => {
    return (
      (part & subnetMaskParts[index]) ===
      (officeIPParts[index] & subnetMaskParts[index])
    );
  });
}

const abbCurrency = ['Đ', 'K', 'Tr', 'T'];
const shortenMoney = (money: number, stack = 0) => {
  if (Math.abs(+money) < 1_000 || stack >= abbCurrency.length - 1) {
    if (stack < 2) return `${+money.toFixed(2)}${abbCurrency[stack]}`;

    const [int, dec] = money.toFixed(2).split('.');
    return `${int}${abbCurrency[stack]}${dec.replace(/0+$/, '')}`;
  }

  return shortenMoney(+(+money / 1_000).toFixed(2), ++stack);
};

const toCurrencyString = (money: number | string) => {
  return shortenMoney(+money);
};

export {
  getSlug,
  isNullish,
  flattenObj,
  isEmptyObj,
  getImageUrl,
  getReturnData,
  getReturnList,
  getSkipNumber,
  formatAttributeName,
  removeNestedNullish,
  capitalizeFirstLetter,
  replaceTemplatePlaceholders,
  toCurrencyString,
};
