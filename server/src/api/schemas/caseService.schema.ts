import { z } from 'zod';
import mongoose from 'mongoose';
import { CASE_SERVICE } from '../constants';

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);

// Base schema for common case service fields
const caseServiceBaseSchema = {
  customer: z.string().trim().refine(isValidObjectId, {
    message: 'ID khách hàng không hợp lệ',
  }),
  date: z.preprocess(
    (val) => (val ? new Date(val as string) : undefined),
    z.date({ message: 'Ngày không hợp lệ' })
  ),
  appointmentDate: z.preprocess(
    (val) => (val ? new Date(val as string) : undefined),
    z.date().optional()
  ),
  eventProvince: z.string().trim().optional(),
  eventDistrict: z.string().trim().optional(),
  eventStreet: z.string().trim().min(1, 'Địa chỉ sự kiện là bắt buộc'),
  partner: z.string().trim().optional(),
  closeAt: z.string().trim().optional(),
  consultant: z
    .string()
    .trim()
    .refine((val) => !val || isValidObjectId(val), {
      message: 'ID tư vấn viên không hợp lệ',
    })
    .optional(),
  fingerprintTaker: z
    .string()
    .trim()
    .refine((val) => !val || isValidObjectId(val), {
      message: 'ID người lấy vân tay không hợp lệ',
    })
    .optional(),
  mainCounselor: z
    .string()
    .trim()
    .refine((val) => !val || isValidObjectId(val), {
      message: 'ID tư vấn viên chính không hợp lệ',
    })
    .optional(),
  paymentMethod: z
    .enum(
      Object.values(CASE_SERVICE.PAYMENT_METHOD).map((item) => item.value) as [
        string,
        ...string[]
      ]
    )
    .optional(),
  notes: z.string().trim().optional(),

  // Process status fields
  isScanned: z.boolean().optional().default(false),
  isFullInfo: z.boolean().optional().default(false),
  isAnalysisSent: z.boolean().optional().default(false),
  isPdfExported: z.boolean().optional().default(false),
  isFullyPaid: z.boolean().optional().default(false),
  isSoftFileSent: z.boolean().optional().default(false),
  isPrinted: z.boolean().optional().default(false),
  isPhysicalCopySent: z.boolean().optional().default(false),
  isDeepConsulted: z.boolean().optional().default(false),
};

// Schema for creating a case service
export const caseServiceCreateSchema = z
  .object({
    ...caseServiceBaseSchema,
  })
  .refine(
    (data) => {
      // If both date and appointmentDate are provided, ensure appointmentDate is after date
      if (data.date && data.appointmentDate) {
        return data.appointmentDate >= data.date;
      }
      return true;
    },
    {
      message: 'Ngày hẹn phải sau hoặc bằng ngày sự kiện',
      path: ['appointmentDate'],
    }
  );

// Schema for updating a case service
export const caseServiceUpdateSchema = z
  .object({
    ...caseServiceBaseSchema,
  })
  .partial() // Makes all fields optional for update
  .refine(
    (data) => {
      // If both date and appointmentDate are provided, ensure appointmentDate is after date
      if (data.date && data.appointmentDate) {
        return data.appointmentDate >= data.date;
      }
      return true;
    },
    {
      message: 'Ngày hẹn phải sau hoặc bằng ngày sự kiện',
      path: ['appointmentDate'],
    }
  );

// Schema for case service query params
export const caseServiceQuerySchema = z
  .object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    paymentMethod: z
      .enum(
        Object.values(CASE_SERVICE.PAYMENT_METHOD).map(
          (item) => item.value
        ) as [string, ...string[]]
      )
      .optional(),
    customerId: z
      .string()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'ID khách hàng không hợp lệ',
      })
      .optional(),
    consultantId: z
      .string()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'ID tư vấn viên không hợp lệ',
      })
      .optional(),
    fingerprintTakerId: z
      .string()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'ID người lấy vân tay không hợp lệ',
      })
      .optional(),
    mainCounselorId: z
      .string()
      .refine((val) => !val || isValidObjectId(val), {
        message: 'ID tư vấn viên chính không hợp lệ',
      })
      .optional(),
    dateFrom: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    dateTo: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    appointmentDateFrom: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    appointmentDateTo: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    createdAtFrom: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),
    createdAtTo: z.preprocess(
      (val) => (val ? new Date(val as string) : undefined),
      z.date().optional()
    ),

    // Process status filters
    isScanned: z.boolean().optional(),
    isFullInfo: z.boolean().optional(),
    isAnalysisSent: z.boolean().optional(),
    isPdfExported: z.boolean().optional(),
    isFullyPaid: z.boolean().optional(),
    isSoftFileSent: z.boolean().optional(),
    isPrinted: z.boolean().optional(),
    isPhysicalCopySent: z.boolean().optional(),
    isDeepConsulted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If both date ranges are provided, ensure they are valid
      if (data.dateFrom && data.dateTo) {
        return data.dateFrom <= data.dateTo;
      }
      return true;
    },
    {
      message: 'Khoảng thời gian sự kiện không hợp lệ',
      path: ['dateRange'],
    }
  )
  .refine(
    (data) => {
      // If both appointment date ranges are provided, ensure they are valid
      if (data.appointmentDateFrom && data.appointmentDateTo) {
        return data.appointmentDateFrom <= data.appointmentDateTo;
      }
      return true;
    },
    {
      message: 'Khoảng thời gian hẹn không hợp lệ',
      path: ['appointmentDateRange'],
    }
  )
  .refine(
    (data) => {
      // If both created at ranges are provided, ensure they are valid
      if (data.createdAtFrom && data.createdAtTo) {
        return data.createdAtFrom <= data.createdAtTo;
      }
      return true;
    },
    {
      message: 'Khoảng thời gian tạo không hợp lệ',
      path: ['createdAtRange'],
    }
  );

// Schema for deleting multiple case services
export const caseServiceBulkDeleteSchema = z.object({
  caseServiceIds: z
    .array(
      z.string().refine(isValidObjectId, {
        message: 'ID Ca dịch vụ không hợp lệ',
      })
    )
    .min(1, 'Cần ít nhất một ID Ca dịch vụ'),
});

// Schema for case service ID validation
export const caseServiceIdSchema = z.object({
  caseServiceId: z.string().refine(isValidObjectId, {
    message: 'ID Ca dịch vụ không hợp lệ',
  }),
});

// Schema for attaching document to case
export const documentIdsSchema = z.object({
  documentIds: z.array(
    z.string().refine(isValidObjectId, {
      message: 'ID tài liệu không hợp lệ',
    })
  ),
});

export const caseDocumentIdsSchema = z.object({
  caseDocumentIds: z.array(
    z.string().refine(isValidObjectId, {
      message: 'ID tài liệu vụ việc không hợp lệ',
    })
  ),
});
