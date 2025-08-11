import { CASE_SERVICE } from '~/constants/caseService.constant';
import { IEmployeeBrief } from './employee.interface';
import { IDocument } from './document.interface';
import { ICustomerBrief } from './customer.interface';

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

export interface ICaseServiceBrief {
  id: string;
  case_code: string;
  case_customer: ICustomerBrief;
  case_appointmentDate?: Date;
  case_processStatus: IProcessStatus;
  case_createdAt: Date;
}

export interface ICaseService extends ICaseServiceBrief {
  case_eventLocation: IAddress;
  case_partner?: string;
  case_closeAt?: Values<typeof CASE_SERVICE.CLOSE_AT>['value'];
  case_consultant?: IEmployeeBrief;
  case_fingerprintTaker?: IEmployeeBrief;
  case_mainCounselor?: IEmployeeBrief;
  case_notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseServiceCreate {
  code: string;
  customer: string;
  appointmentDate?: string;
  eventProvince?: string;
  eventDistrict?: string;
  eventStreet: string;
  partner?: string;
  closeAt?: Values<typeof CASE_SERVICE.CLOSE_AT>['value'];
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

export interface ICaseServiceStatisticsQuery {
  groupBy: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ICaseDocumentBrief {
  id: string;
  document: IDocument;
  caseService: ICaseServiceBrief;
}

export interface ICaseDocument extends ICaseDocumentBrief {
  createdBy: IEmployeeBrief;
  createdAt: string;
  updatedAt: string;
}

export interface ICaseDocumentCreate {
  caseServiceId: string;
  documentId: string;
}
