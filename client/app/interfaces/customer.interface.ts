import { CUSTOMER } from '~/constants/customer.constant';

type IAddress = {
  province?: string;
  district?: string;
  street: string;
};

export interface ICustomerBrief {
  id: string;
  cus_firstName: string;
  cus_lastName: string;
  cus_code: string;
  cus_createdAt: string;
  cus_parentName?: string;
  cus_parentDateOfBirth?: string;
  cus_msisdn: string;
}

export interface ICustomer extends ICustomerBrief {
  cus_email?: string;
  cus_address?: IAddress;
  cus_birthDate?: string;
  cus_sex?: Values<typeof CUSTOMER.SEX>['value'];
  cus_contactChannel?: string;
  cus_source?: string;
  cus_notes?: string;
  cus_accountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerCreate extends Partial<IAddress> {
  code: string;
  firstName: string;
  lastName?: string;
  email?: string;
  msisdn: string;
  province?: string;
  district?: string;
  street: string;
  birthDate?: string;
  sex?: Values<typeof CUSTOMER.SEX>['value'];
  contactChannel?: string;
  source?: string;
  notes?: string;
  createdAt?: string;
  parentName?: string;
  parentDateOfBirth?: string;
  accountName?: string;
}

export interface ICustomerUpdate extends Partial<ICustomerCreate> {}

export interface IUpdateCustomerData extends Partial<ICustomerCreate> {}

export interface ICustomerStatisticsQuery {
  groupBy: 'status' | 'contactChannel' | 'source' | 'monthly' | 'daily';
  dateRange?: {
    start: string;
    end: string;
  };
}
