import mongoose, { Types } from 'mongoose';
import {
  ICaseServiceCreate,
  ICaseServiceUpdate,
  ICaseService,
} from '../interfaces/caseService.interface';
import { BadRequestError, NotFoundError } from '../core/errors';
import { CustomerModel } from '@models/customer.model';
import { EmployeeModel } from '@models/employee.model';
import {
  getReturnList,
  getReturnData,
  formatAttributeName,
  removeNestedNullish,
} from '@utils/index';
import { CaseServiceModel } from '@models/caseService.model';
import { CASE_SERVICE, CUSTOMER, USER } from '../constants';

// Import modules for export functionality
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { serverConfig } from '@configs/config.server';
import { format, parse } from 'date-fns';

// Query interface for case services
interface ICaseServiceQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  paymentMethod?: string;
  customerId?: string;
  consultantId?: string;
  fingerprintTakerId?: string;
  mainCounselorId?: string;
  dateFrom?: string;
  dateTo?: string;
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  // Process status filters
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

const getCaseServices = async (
  query: ICaseServiceQuery = {}
): Promise<{
  data: ICaseService[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      paymentMethod,
      customerId,
      consultantId,
      fingerprintTakerId,
      mainCounselorId,
      dateFrom,
      dateTo,
      appointmentDateFrom,
      appointmentDateTo,
      createdAtFrom,
      createdAtTo,
      ...processStatusFilters
    } = query;

    // Build the aggregation pipeline
    const pipeline: any[] = [];

    // Stage 1: Match by filters (early filtering)
    const matchConditions: any = {};

    // Add payment method filter if provided
    if (paymentMethod) {
      matchConditions.case_paymentMethod = paymentMethod;
    }

    // Add date range filters if provided
    if (dateFrom || dateTo) {
      matchConditions.case_date = {};
      if (dateFrom) {
        matchConditions.case_date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        matchConditions.case_date.$lte = new Date(dateTo);
      }
    }

    // Add appointment date range filters if provided
    if (appointmentDateFrom || appointmentDateTo) {
      matchConditions.case_appointmentDate = {};
      if (appointmentDateFrom) {
        matchConditions.case_appointmentDate.$gte = new Date(
          appointmentDateFrom
        );
      }
      if (appointmentDateTo) {
        matchConditions.case_appointmentDate.$lte = new Date(appointmentDateTo);
      }
    }

    // Add customer filter if provided
    if (customerId) {
      matchConditions.case_customer = new Types.ObjectId(customerId);
    }

    // Add employee filters if provided
    if (consultantId) {
      matchConditions.case_consultant = new Types.ObjectId(consultantId);
    }

    if (fingerprintTakerId) {
      matchConditions.case_fingerprintTaker = new Types.ObjectId(
        fingerprintTakerId
      );
    }

    if (mainCounselorId) {
      matchConditions.case_mainCounselor = new Types.ObjectId(mainCounselorId);
    }

    // Add process status filters
    for (const [key, value] of Object.entries(processStatusFilters)) {
      if (value !== undefined) {
        matchConditions[`case_processStatus.${key}`] = value;
      }
    }

    // Add created at range filters if provided
    if (createdAtFrom || createdAtTo) {
      matchConditions.createdAt = {};
      if (createdAtFrom) {
        matchConditions.createdAt.$gte = new Date(createdAtFrom);
      }
      if (createdAtTo) {
        matchConditions.createdAt.$lte = new Date(createdAtTo);
      }
    }

    // Add match stage if we have any conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Stage 2: Lookup customer information
    pipeline.push({
      $lookup: {
        from: CUSTOMER.COLLECTION_NAME,
        localField: 'case_customer',
        foreignField: '_id',
        as: 'case_customer',
      },
    });

    // Stage 3: Lookup consultant information
    pipeline.push({
      $lookup: {
        from: USER.EMPLOYEE.COLLECTION_NAME,
        localField: 'case_consultant',
        foreignField: '_id',
        as: 'case_consultant',
        pipeline: [
          {
            $lookup: {
              from: USER.COLLECTION_NAME,
              localField: 'emp_user',
              foreignField: '_id',
              as: 'emp_user',
            },
          },
          {
            $unwind: { path: '$emp_user', preserveNullAndEmptyArrays: true },
          },
        ],
      },
    });

    // Stage 4: Lookup fingerprint taker information
    pipeline.push({
      $lookup: {
        from: USER.EMPLOYEE.COLLECTION_NAME,
        localField: 'case_fingerprintTaker',
        foreignField: '_id',
        as: 'case_fingerprintTaker',
        pipeline: [
          {
            $lookup: {
              from: USER.COLLECTION_NAME,
              localField: 'emp_user',
              foreignField: '_id',
              as: 'emp_user',
            },
          },
          {
            $unwind: { path: '$emp_user', preserveNullAndEmptyArrays: true },
          },
        ],
      },
    });

    // Stage 5: Lookup main counselor information
    pipeline.push({
      $lookup: {
        from: USER.EMPLOYEE.COLLECTION_NAME,
        localField: 'case_mainCounselor',
        foreignField: '_id',
        as: 'case_mainCounselor',
        pipeline: [
          {
            $lookup: {
              from: USER.COLLECTION_NAME,
              localField: 'emp_user',
              foreignField: '_id',
              as: 'emp_user',
            },
          },
          {
            $unwind: { path: '$emp_user', preserveNullAndEmptyArrays: true },
          },
        ],
      },
    });

    // Stage 6: Unwind the arrays to work with single documents
    pipeline.push({
      $unwind: { path: '$case_customer', preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: { path: '$case_consultant', preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $unwind: {
        path: '$case_fingerprintTaker',
        preserveNullAndEmptyArrays: true,
      },
    });
    pipeline.push({
      $unwind: {
        path: '$case_mainCounselor',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Stage 7: Add search filter if provided (after lookups for richer search)
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
      pipeline.push({
        $match: {
          $or: [
            { case_notes: searchRegex },
            { case_partner: searchRegex },
            { case_eventType: searchRegex },
            { 'case_customer.cus_firstName': searchRegex },
            { 'case_customer.cus_lastName': searchRegex },
            { 'case_customer.cus_code': searchRegex },
            { 'case_consultant.emp_user.usr_firstName': searchRegex },
            { 'case_consultant.emp_user.usr_lastName': searchRegex },
            { 'case_consultant.emp_code': searchRegex },
            { 'case_fingerprintTaker.emp_user.usr_firstName': searchRegex },
            { 'case_fingerprintTaker.emp_user.usr_lastName': searchRegex },
            { 'case_fingerprintTaker.emp_code': searchRegex },
            { 'case_mainCounselor.emp_user.usr_firstName': searchRegex },
            { 'case_mainCounselor.emp_user.usr_lastName': searchRegex },
            { 'case_mainCounselor.emp_code': searchRegex },
          ],
        },
      });
    }

    // Stage 8: Project to include only necessary fields
    pipeline.push({
      $project: {
        _id: 1,
        case_customer: {
          _id: 1,
          cus_firstName: 1,
          cus_lastName: 1,
          cus_code: 1,
          cus_createdAt: 1,
          cus_parentName: 1,
          cus_parentDateOfBirth: 1,
        },
        case_date: 1,
        case_appointmentDate: 1,
        case_eventLocation: 1,
        case_partner: 1,
        case_eventType: 1,
        case_consultant: {
          _id: 1,
          emp_user: {
            _id: 1,
            usr_username: 1,
            usr_email: 1,
            usr_firstName: 1,
            usr_lastName: 1,
          },
          emp_code: 1,
          emp_position: 1,
          emp_department: 1,
        },
        case_fingerprintTaker: {
          _id: 1,
          emp_user: {
            _id: 1,
            usr_username: 1,
            usr_email: 1,
            usr_firstName: 1,
            usr_lastName: 1,
          },
          emp_code: 1,
          emp_position: 1,
          emp_department: 1,
        },
        case_mainCounselor: {
          _id: 1,
          emp_user: {
            _id: 1,
            usr_username: 1,
            usr_email: 1,
            usr_firstName: 1,
            usr_lastName: 1,
          },
          emp_code: 1,
          emp_position: 1,
          emp_department: 1,
        },
        case_scanLocation: 1,
        case_paymentMethod: 1,
        case_processStatus: 1,
        case_notes: 1,
        case_createdAt: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    // Stage 9: Sort the results
    const sortField = sortBy ? `${sortBy}` : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({
      $sort: { [sortField]: sortDirection },
    });

    // Get total count first (for pagination)
    const countPipeline = [...pipeline]; // Clone the pipeline
    countPipeline.push({ $count: 'total' });
    const countResult = await CaseServiceModel.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Stage 10: Apply pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: +limit });

    // Execute the aggregation
    const caseServices = await CaseServiceModel.aggregate(pipeline);
    const totalPages = Math.ceil(total / limit);

    return {
      data: getReturnList(caseServices) as ICaseService[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error) {
    // Wrap original error with Vietnamese message if it's a standard Error
    if (
      error instanceof Error &&
      !(error instanceof BadRequestError) &&
      !(error instanceof NotFoundError)
    ) {
      throw new Error(
        `Đã xảy ra lỗi khi lấy danh sách Ca dịch vụ: ${error.message}`
      );
    }
    throw error;
  }
};

const getCaseServiceById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('ID Ca dịch vụ không hợp lệ');
  }

  const caseService = await CaseServiceModel.findById(id)
    .populate([
      {
        path: 'case_customer',
        select:
          'cus_firstName cus_lastName cus_email cus_msisdn cus_code cus_createdAt cus_parentName cus_parentDateOfBirth',
      },
      {
        path: 'case_consultant',
        select: 'emp_user emp_code emp_position emp_department',
        populate: {
          path: 'emp_user',
          select: 'usr_username usr_email usr_firstName usr_lastName',
        },
      },
      {
        path: 'case_fingerprintTaker',
        select: 'emp_user emp_code emp_position emp_department',
        populate: {
          path: 'emp_user',
          select: 'usr_username usr_email usr_firstName usr_lastName',
        },
      },
      {
        path: 'case_mainCounselor',
        select: 'emp_user emp_code emp_position emp_department',
        populate: {
          path: 'emp_user',
          select: 'usr_username usr_email usr_firstName usr_lastName',
        },
      },
    ])
    .lean();
  if (!caseService) {
    throw new NotFoundError('Không tìm thấy Ca dịch vụ');
  }

  return getReturnData(caseService);
};

const createCaseService = async (caseServiceData: ICaseServiceCreate) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Format the data according to the schema
    const formattedData = {
      customer: caseServiceData.customer,
      date: caseServiceData.date,
      appointmentDate: caseServiceData.appointmentDate,
      eventLocation: {
        province: caseServiceData.eventProvince || '',
        district: caseServiceData.eventDistrict || '',
        street: caseServiceData.eventStreet,
      },
      partner: caseServiceData.partner,
      eventType: caseServiceData.eventType,
      consultant: caseServiceData.consultant,
      fingerprintTaker: caseServiceData.fingerprintTaker,
      mainCounselor: caseServiceData.mainCounselor,
      scanLocation: {
        province: caseServiceData.scanProvince || '',
        district: caseServiceData.scanDistrict || '',
        street: caseServiceData.scanStreet || '',
      },
      paymentMethod: caseServiceData.paymentMethod,
      processStatus: {
        isScanned: caseServiceData.isScanned || false,
        isFullInfo: caseServiceData.isFullInfo || false,
        isAnalysisSent: caseServiceData.isAnalysisSent || false,
        isPdfExported: caseServiceData.isPdfExported || false,
        isFullyPaid: caseServiceData.isFullyPaid || false,
        isSoftFileSent: caseServiceData.isSoftFileSent || false,
        isPrinted: caseServiceData.isPrinted || false,
        isPhysicalCopySent: caseServiceData.isPhysicalCopySent || false,
        isDeepConsulted: caseServiceData.isDeepConsulted || false,
      },
      notes: caseServiceData.notes,
      createdAt: caseServiceData.createdAt || new Date(),
    };

    const [caseService] = await CaseServiceModel.create(
      [formatAttributeName(formattedData, CASE_SERVICE.PREFIX)],
      { session }
    );

    if (!caseService) {
      throw new BadRequestError('Không thể tạo Ca dịch vụ');
    }

    await session.commitTransaction();
    return getReturnData(caseService);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateCaseService = async (id: string, data: ICaseServiceUpdate) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('ID Ca dịch vụ không hợp lệ');
  }

  // Check if case service exists
  const existingCaseService = await CaseServiceModel.findById(id);
  if (!existingCaseService) {
    throw new NotFoundError('Không tìm thấy Ca dịch vụ');
  }

  try {
    // Format and clean data
    const cleanedData = removeNestedNullish<ICaseServiceUpdate>(data);

    // Restructure data to match schema
    const formattedData = {
      ...cleanedData,
      eventLocation:
        cleanedData.eventProvince ||
        cleanedData.eventDistrict ||
        cleanedData.eventStreet
          ? {
              province: cleanedData.eventProvince,
              district: cleanedData.eventDistrict,
              street: cleanedData.eventStreet,
            }
          : undefined,
      scanLocation:
        cleanedData.scanProvince ||
        cleanedData.scanDistrict ||
        cleanedData.scanStreet
          ? {
              province: cleanedData.scanProvince,
              district: cleanedData.scanDistrict,
              street: cleanedData.scanStreet,
            }
          : undefined,
      processStatus: {
        ...(cleanedData.isScanned !== undefined && {
          isScanned: cleanedData.isScanned,
        }),
        ...(cleanedData.isFullInfo !== undefined && {
          isFullInfo: cleanedData.isFullInfo,
        }),
        ...(cleanedData.isAnalysisSent !== undefined && {
          isAnalysisSent: cleanedData.isAnalysisSent,
        }),
        ...(cleanedData.isPdfExported !== undefined && {
          isPdfExported: cleanedData.isPdfExported,
        }),
        ...(cleanedData.isFullyPaid !== undefined && {
          isFullyPaid: cleanedData.isFullyPaid,
        }),
        ...(cleanedData.isSoftFileSent !== undefined && {
          isSoftFileSent: cleanedData.isSoftFileSent,
        }),
        ...(cleanedData.isPrinted !== undefined && {
          isPrinted: cleanedData.isPrinted,
        }),
        ...(cleanedData.isPhysicalCopySent !== undefined && {
          isPhysicalCopySent: cleanedData.isPhysicalCopySent,
        }),
        ...(cleanedData.isDeepConsulted !== undefined && {
          isDeepConsulted: cleanedData.isDeepConsulted,
        }),
      },
    };

    // Remove process status fields from top level
    const {
      eventProvince,
      eventDistrict,
      eventStreet,
      scanProvince,
      scanDistrict,
      scanStreet,
      isScanned,
      isFullInfo,
      isAnalysisSent,
      isPdfExported,
      isFullyPaid,
      isSoftFileSent,
      isPrinted,
      isPhysicalCopySent,
      isDeepConsulted,
      ...finalData
    } = formattedData;

    // Only include processStatus if it has properties
    if (Object.keys(formattedData.processStatus || {}).length > 0) {
      (finalData as any).processStatus = formattedData.processStatus;
    }

    const formattedUpdateData = formatAttributeName(
      finalData,
      CASE_SERVICE.PREFIX
    );

    // Update case service
    const updatedCaseService = await CaseServiceModel.findByIdAndUpdate(
      id,
      { $set: formattedUpdateData },
      { new: true, timestamps: false }
    );

    if (!updatedCaseService) {
      throw new NotFoundError('Không tìm thấy Ca dịch vụ sau khi cập nhật');
    }

    return getReturnData(updatedCaseService);
  } catch (error) {
    // Wrap original error with Vietnamese message if it's a standard Error
    if (
      error instanceof Error &&
      !(error instanceof BadRequestError) &&
      !(error instanceof NotFoundError)
    ) {
      throw new Error(
        `Đã xảy ra lỗi khi cập nhật Ca dịch vụ: ${error.message}`
      );
    }
    throw error;
  }
};

const deleteCaseService = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('ID Ca dịch vụ không hợp lệ');
  }

  // Check if case service exists
  const caseService = await CaseServiceModel.findById(id);
  if (!caseService) {
    throw new NotFoundError('Không tìm thấy Ca dịch vụ');
  }

  // Delete case service
  const deleteResult = await CaseServiceModel.deleteOne({ _id: id });

  if (deleteResult.deletedCount === 0) {
    throw new Error('Không thể xóa Ca dịch vụ');
  }

  return {
    success: true,
    message: 'Xóa Ca dịch vụ thành công',
  };
};

const bulkDeleteCaseServices = async (ids: string[]) => {
  // Validate input
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError('Cần ít nhất một ID Ca dịch vụ');
  }

  // Validate all IDs
  for (const id of ids) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`ID Ca dịch vụ không hợp lệ: ${id}`);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Delete case services
    const deleteResult = await CaseServiceModel.deleteMany(
      { _id: { $in: ids } },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      message: 'Xóa nhiều Ca dịch vụ thành công',
      count: deleteResult.deletedCount,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Export case services data to XLSX file
 */
const exportCaseServicesToXLSX = async (queryParams: any) => {
  try {
    // Get case services based on query params
    const { data: caseServicesList } = await getCaseServices(queryParams);

    // Create directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Create timestamp for unique filename
    const timestamp = new Date().getTime();
    const fileName = `ho_so_vu_viec_${new Date()
      .toLocaleDateString('vi-VN')
      .split('/')
      .join('-')}_${timestamp}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // Map case service data for Excel
    const excelData = caseServicesList.map((caseService) => {
      return {
        ID: caseService.id || '',
        'Khách hàng': `${caseService.case_customer?.cus_lastName || ''} ${
          caseService.case_customer?.cus_firstName || ''
        }`.trim(),
        'Mã khách hàng': caseService.case_customer?.cus_code || '',
        'Ngày sự kiện': caseService.case_date
          ? format(new Date(caseService.case_date), 'dd/MM/yyyy')
          : '',
        'Ngày hẹn': caseService.case_appointmentDate
          ? format(new Date(caseService.case_appointmentDate), 'dd/MM/yyyy')
          : '',
        'Địa điểm sự kiện': caseService.case_eventLocation?.street || '',
        'Tỉnh/Thành phố sự kiện':
          caseService.case_eventLocation?.province || '',
        'Quận/Huyện sự kiện': caseService.case_eventLocation?.district || '',
        'Đối tác': caseService.case_partner || '',
        'Loại sự kiện': caseService.case_eventType || '',
        'Tư vấn viên': caseService.case_consultant
          ? `${caseService.case_consultant.emp_user?.usr_firstName || ''} ${
              caseService.case_consultant.emp_user?.usr_lastName || ''
            }`.trim()
          : '',
        'Người lấy vân tay': caseService.case_fingerprintTaker
          ? `${
              caseService.case_fingerprintTaker.emp_user?.usr_firstName || ''
            } ${
              caseService.case_fingerprintTaker.emp_user?.usr_lastName || ''
            }`.trim()
          : '',
        'Tư vấn viên chính': caseService.case_mainCounselor
          ? `${caseService.case_mainCounselor.emp_user?.usr_firstName || ''} ${
              caseService.case_mainCounselor.emp_user?.usr_lastName || ''
            }`.trim()
          : '',
        'Địa điểm scan': caseService.case_scanLocation?.street || '',
        'Phương thức thanh toán': caseService.case_paymentMethod || '',
        'Đã scan': caseService.case_processStatus?.isScanned ? 'Có' : 'Không',
        'Thông tin đầy đủ': caseService.case_processStatus?.isFullInfo
          ? 'Có'
          : 'Không',
        'Đã gửi phân tích': caseService.case_processStatus?.isAnalysisSent
          ? 'Có'
          : 'Không',
        'Đã xuất PDF': caseService.case_processStatus?.isPdfExported
          ? 'Có'
          : 'Không',
        'Đã thanh toán đầy đủ': caseService.case_processStatus?.isFullyPaid
          ? 'Có'
          : 'Không',
        'Đã gửi file mềm': caseService.case_processStatus?.isSoftFileSent
          ? 'Có'
          : 'Không',
        'Đã in': caseService.case_processStatus?.isPrinted ? 'Có' : 'Không',
        'Đã gửi bản cứng': caseService.case_processStatus?.isPhysicalCopySent
          ? 'Có'
          : 'Không',
        'Đã tư vấn sâu': caseService.case_processStatus?.isDeepConsulted
          ? 'Có'
          : 'Không',
        'Ghi chú': caseService.case_notes || '',
        'Tạo lúc': caseService.case_createdAt
          ? format(new Date(caseService.case_createdAt), 'HH:mm dd/MM/yyyy')
          : '',
        'Cập nhật lúc': caseService.updatedAt
          ? format(new Date(caseService.updatedAt), 'HH:mm dd/MM/yyyy')
          : '',
      };
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ca dịch vụ');

    // Write to file
    XLSX.writeFile(workbook, filePath);

    return {
      fileUrl: `${serverConfig.serverUrl}/exports/${fileName}`,
      fileName: fileName,
      count: excelData.length,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      !(error instanceof BadRequestError) &&
      !(error instanceof NotFoundError)
    ) {
      throw new Error(
        `Đã xảy ra lỗi khi xuất dữ liệu Ca dịch vụ: ${error.message}`
      );
    }
    throw error;
  }
};

export {
  getCaseServices,
  getCaseServiceById,
  createCaseService,
  updateCaseService,
  deleteCaseService,
  bulkDeleteCaseServices,
  exportCaseServicesToXLSX,
};
