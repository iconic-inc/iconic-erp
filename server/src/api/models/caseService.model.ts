import { Schema, model } from 'mongoose';
import { CASE_SERVICE, CUSTOMER, USER } from '../constants';
import {
  ICaseServiceCreate,
  ICaseServiceModel,
  ICaseServiceDocument,
} from '../interfaces/caseService.interface';
import { formatAttributeName } from '../utils';

const caseServiceSchema = new Schema<ICaseServiceDocument, ICaseServiceModel>(
  {
    case_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    case_customer: {
      type: Schema.Types.ObjectId,
      ref: CUSTOMER.DOCUMENT_NAME,
      required: true,
    },
    case_date: {
      type: Date,
      required: true,
    },
    case_appointmentDate: {
      type: Date,
    },
    case_eventLocation: {
      province: { type: String },
      district: { type: String },
      street: { type: String, required: true },
    },
    case_partner: {
      type: String,
      trim: true,
    },
    case_closeAt: {
      type: String,
      trim: true,
    },
    case_consultant: {
      type: Schema.Types.ObjectId,
      ref: USER.EMPLOYEE.DOCUMENT_NAME,
    },
    case_fingerprintTaker: {
      type: Schema.Types.ObjectId,
      ref: USER.EMPLOYEE.DOCUMENT_NAME,
    },
    case_mainCounselor: {
      type: Schema.Types.ObjectId,
      ref: USER.EMPLOYEE.DOCUMENT_NAME,
    },
    case_paymentMethod: {
      type: String,
      enum: Object.values(CASE_SERVICE.PAYMENT_METHOD).flatMap(
        (item) => item.value
      ),
    },
    case_processStatus: {
      isScanned: { type: Boolean, default: false },
      isFullInfo: { type: Boolean, default: false },
      isAnalysisSent: { type: Boolean, default: false },
      isPdfExported: { type: Boolean, default: false },
      isFullyPaid: { type: Boolean, default: false },
      isSoftFileSent: { type: Boolean, default: false },
      isPrinted: { type: Boolean, default: false },
      isPhysicalCopySent: { type: Boolean, default: false },
      isDeepConsulted: { type: Boolean, default: false },
    },
    case_notes: {
      type: String,
      trim: true,
    },
    case_createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: CASE_SERVICE.COLLECTION_NAME,
  }
);

caseServiceSchema.statics.build = (attrs: ICaseServiceCreate) => {
  return CaseServiceModel.create(
    formatAttributeName(attrs, CASE_SERVICE.PREFIX)
  );
};

export const CaseServiceModel = model<ICaseServiceDocument, ICaseServiceModel>(
  CASE_SERVICE.DOCUMENT_NAME,
  caseServiceSchema
);
