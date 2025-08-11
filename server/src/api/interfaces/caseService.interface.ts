import { CASE_SERVICE } from '@constants/caseService.constant';
import { ICustomerPopulate } from './customer.interface';
import { IEmployeePopulate } from './employee.interface';
import { HydratedDocument, Model, Types } from 'mongoose';

// Interface for process status data
export interface IProcessStatus {
  isScanned: boolean;
  isFullInfo: boolean;
  isAnalysisSent: boolean;
  isPdfExported: boolean;
  isFullyPaid: boolean;
  isSoftFileSent: boolean;
  isPrinted: boolean;
  isPhysicalCopySent: boolean;
  isDeepConsulted?: boolean;
}

type IAddress = {
  province?: string;
  district?: string;
  street: string;
};

export interface ICaseServicePopulate {
  id: string;
  case_code: string;
  case_customer: ICustomerPopulate;
  case_date: Date;
  case_appointmentDate?: Date;
  case_processStatus: IProcessStatus;
  case_createdAt: Date;
}

export interface ICaseService extends ICaseServicePopulate {
  case_eventLocation: IAddress;
  case_partner?: string;
  case_closeAt?: Values<typeof CASE_SERVICE.CLOSE_AT>['value'];
  case_consultant?: IEmployeePopulate;
  case_fingerprintTaker?: IEmployeePopulate;
  case_mainCounselor?: IEmployeePopulate;
  case_notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseServiceDocument extends HydratedDocument<ICaseService> {}

export interface ICaseServiceModel extends Model<ICaseServiceDocument> {
  build(attrs: ICaseServiceCreate): Promise<ICaseServiceDocument>;
}

export interface ICaseServiceCreate {
  code: string;
  customer: string;
  date: string;
  appointmentDate?: string;
  eventProvince?: string;
  eventDistrict?: string;
  eventStreet: string;
  partner?: string;
  eventType?: string;
  consultant?: string;
  fingerprintTaker?: string;
  mainCounselor?: string;
  notes?: string;
  createdAt?: string;

  // Process status flags
  isScanned?: boolean;
  isFullInfo?: boolean;
  isAnalysisSent?: boolean;
  isPdfExported?: boolean;
  isFullyPaid?: boolean;
  isSoftFileSent?: boolean;
  isPrinted?: boolean;
  isPhysicalCopySent?: boolean;
  isDeepConsulted?: boolean;
}

export interface ICaseServiceUpdate extends Partial<ICaseServiceCreate> {}
