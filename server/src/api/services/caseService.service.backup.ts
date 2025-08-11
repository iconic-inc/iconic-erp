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

// Import modules for export functionality
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { serverConfig } from '@configs/config.server';
import { format, parse } from 'date-fns';

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
        select: 'cus_firstName cus_lastName cus_email cus_msisdn cus_code',
      },
      {
        path: 'case_leadAttorney',
        select: 'emp_user emp_code emp_position emp_department',
        populate: {
          path: 'emp_user',
          select: 'usr_username usr_email usr_firstName usr_lastName',
        },
      },
      {
        path: 'case_assignees',
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
  const [foundCase, taskTemplate] = await Promise.all([
    CaseServiceModel.findOne({
      case_code: caseServiceData.code,
    }),
    TaskTemplateModel.findOne({ tpl_key: 'default' }).lean(),
  ]);
  if (foundCase) {
    throw new BadRequestError('Mã Ca dịch vụ đã tồn tại');
  }
  if (!taskTemplate) {
    throw new NotFoundError('Không tìm thấy mẫu công việc mặc định');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [caseService] = await CaseServiceModel.create(
      [formatAttributeName(caseServiceData, CASE_SERVICE.PREFIX)],
      { session }
    );
    if (!caseService) {
      throw new BadRequestError('Không thể tạo Ca dịch vụ');
    }

    for (const step of taskTemplate.tpl_steps) {
      const [task] = await TaskModel.create(
        [
          formatAttributeName(
            {
              ...step,
              _id: undefined, // Remove _id to avoid conflicts
              name: `${caseServiceData.code} - ${step.name}`,
              caseService: caseService._id,
              startDate: new Date().addDays(step.caseOrder - 1), // Default start date is relative to case order (0-6)
              endDate: new Date().addDays(step.caseOrder), // Default end date is one day after start date (1-7)
              assignees: [
                ...(caseServiceData.assignees || []),
                caseServiceData.leadAttorney,
              ],
            },
            TASK.PREFIX
          ),
        ],
        { session }
      );
      if (!task) {
        throw new BadRequestError('Không thể tạo công việc');
      }

      // Get the created task with populated data for email notification
      const populatedTask = await TaskModel.findById(task._id)
        .populate({
          path: 'tsk_assignees',
          select: 'emp_code emp_position emp_department emp_user',
          populate: {
            path: 'emp_user',
            select:
              'usr_firstName usr_lastName usr_email usr_avatar usr_username',
          },
        })
        .populate({
          path: 'tsk_caseService',
          select:
            'case_code case_customer case_leadAttorney case_status case_startDate case_endDate',
          populate: {
            path: 'case_customer',
            select: 'cus_firstName cus_lastName cus_email cus_msisdn cus_code',
          },
        })
        .session(session);

      // Send email notifications to assignees
      if (populatedTask && populatedTask.tsk_assignees) {
        const emailPromises = populatedTask.tsk_assignees.map(
          async (assignee: any) => {
            if (assignee.emp_user?.usr_email) {
              try {
                await sendTaskNotificationEmail(assignee.emp_user.usr_email, {
                  taskId: populatedTask._id.toString(),
                  taskName: populatedTask.tsk_name,
                  taskDescription:
                    populatedTask.tsk_description || 'Không có mô tả',
                  priority: populatedTask.tsk_priority,
                  startDate: new Date(
                    populatedTask.tsk_startDate
                  ).toLocaleString('vi-VN'),
                  endDate: new Date(populatedTask.tsk_endDate).toLocaleString(
                    'vi-VN'
                  ),
                  employeeName: `${assignee.emp_user.usr_firstName || ''} ${
                    assignee.emp_user.usr_lastName || ''
                  }`.trim(),
                });
              } catch (emailError) {
                console.error(
                  `Failed to send email to ${assignee.emp_user.usr_email}:`,
                  emailError
                );
                // Don't throw error to prevent transaction rollback due to email failures
              }
            }
          }
        );

        // Execute email notifications (but don't wait for them to complete to avoid blocking the transaction)
        Promise.allSettled(emailPromises).catch((error) => {
          console.error('Error sending some task notification emails:', error);
        });
      }
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

  // Check if the new code already exists (if code is being updated)
  if (data.code && data.code !== existingCaseService.case_code) {
    const duplicateCase = await CaseServiceModel.findOne({
      case_code: data.code,
      _id: { $ne: id },
    });
    if (duplicateCase) {
      throw new BadRequestError('Mã Ca dịch vụ đã tồn tại');
    }
  }

  try {
    if (
      !data.endDate &&
      ['closed', 'completed'].includes(data.status as string)
    ) {
      // If status is closed or completed, set endDate to now
      data.endDate = new Date().toISOString();
    }

    const updatedCaseService = await CaseServiceModel.findByIdAndUpdate(
      id,
      {
        $set: formatAttributeName(
          removeNestedNullish({
            ...data,
            customer: data.customer,
            leadAttorney: data.leadAttorney,
            assignees: data.assignees,
            code: data.code,
            notes: data.notes,
            status: data.status,
            startDate: data.startDate
              ? new Date(data.startDate).toISOString()
              : undefined,
          }),
          CASE_SERVICE.PREFIX
        ),
      },
      { new: true }
    )
      .populate([
        {
          path: 'case_customer',
          select: 'cus_firstName cus_lastName cus_email cus_msisdn cus_code',
        },
        {
          path: 'case_leadAttorney',
          select: 'emp_user emp_code emp_position emp_department',
          populate: {
            path: 'emp_user',
            select: 'usr_username usr_email usr_firstName usr_lastName',
          },
        },
        {
          path: 'case_assignees',
          select: 'emp_user emp_code emp_position emp_department',
          populate: {
            path: 'emp_user',
            select: 'usr_username usr_email usr_firstName usr_lastName',
          },
        },
      ])
      .lean();

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

const deleteCaseService = async (id: string) => {};

const bulkDeleteCaseServices = async (ids: string[]) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await CaseServiceModel.deleteMany({ _id: { $in: ids } }, { session });
    await DocumentCaseModel.deleteMany(
      { caseService: { $in: ids } },
      { session }
    );
    await TaskModel.deleteMany({ tsk_caseService: { $in: ids } }, { session });
    await DocumentCaseModel.deleteMany(
      { caseService: { $in: ids } },
      { session }
    );
    await session.commitTransaction();
    return { success: true, message: 'Bulk delete successful' };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Import case services data from XLSX file
 * @param filePath Path to the Excel file to import
 * @param options Import options
 */
const importCaseServices = async (
  filePath: string,
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    skipEmptyRows?: boolean;
  } = {}
) => {
  let session;
  try {
    const {
      skipDuplicates = true,
      updateExisting = false,
      skipEmptyRows = true,
    } = options;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new BadRequestError('Không tìm thấy file Excel để import');
    }

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData || rawData.length === 0) {
      throw new BadRequestError(
        'File Excel không có dữ liệu hoặc định dạng không đúng'
      );
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    const results = {
      total: rawData.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>,
    };

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any;
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and first row is header

      try {
        // Skip empty rows if option is enabled
        if (skipEmptyRows && isEmptyCaseServiceRow(row)) {
          results.skipped++;
          continue;
        }

        // Map Excel columns to case service data
        const caseServiceData = await mapExcelRowToCaseService(row);
        console.log(
          '***************************************************import case service data',
          caseServiceData
        );

        // Validate required fields
        if (!caseServiceData.code) {
          results.errors.push({
            row: rowNumber,
            error: 'Thiếu mã Ca dịch vụ',
            data: row,
          });
          continue;
        }

        if (!caseServiceData.customer) {
          results.errors.push({
            row: rowNumber,
            error: 'Thiếu thông tin khách hàng',
            data: row,
          });
          continue;
        }

        if (!caseServiceData.leadAttorney) {
          results.errors.push({
            row: rowNumber,
            error: 'Thiếu thông tin luật sư chính',
            data: row,
          });
          continue;
        }

        // Check for existing case service
        const existingCaseService = await CaseServiceModel.findOne({
          case_code: caseServiceData.code,
        });

        if (existingCaseService) {
          if (skipDuplicates && !updateExisting) {
            results.skipped++;
            continue;
          } else if (updateExisting) {
            // Update existing case service
            await CaseServiceModel.findByIdAndUpdate(
              existingCaseService._id,
              formatAttributeName(
                {
                  customer: caseServiceData.customer,
                  leadAttorney: caseServiceData.leadAttorney,
                  assignees: caseServiceData.assignees,
                  notes: caseServiceData.notes,
                  status: caseServiceData.status,
                  startDate: caseServiceData.startDate,
                  endDate: caseServiceData.endDate,
                },
                CASE_SERVICE.PREFIX
              ),
              { session, new: true }
            );
            results.updated++;
          } else {
            results.errors.push({
              row: rowNumber,
              error: 'Ca dịch vụ đã tồn tại (mã trùng)',
              data: row,
            });
          }
        } else {
          // Create new case service
          const [newCaseService] = await CaseServiceModel.create(
            [
              formatAttributeName(
                {
                  code: caseServiceData.code,
                  customer: caseServiceData.customer,
                  leadAttorney: caseServiceData.leadAttorney,
                  assignees: caseServiceData.assignees,
                  notes: caseServiceData.notes,
                  status: caseServiceData.status,
                  startDate: caseServiceData.startDate,
                  endDate: caseServiceData.endDate,
                },
                CASE_SERVICE.PREFIX
              ),
            ],
            { session }
          );

          if (newCaseService) {
            // Create default tasks for the new case service
            const taskTemplate = await TaskTemplateModel.findOne({
              tpl_key: 'default',
            }).lean();

            if (taskTemplate) {
              for (const step of taskTemplate.tpl_steps) {
                await TaskModel.create(
                  [
                    formatAttributeName(
                      {
                        ...step,
                        _id: undefined,
                        name: `${caseServiceData.code} - ${step.name}`,
                        caseService: newCaseService._id,
                        startDate: new Date().addDays(step.caseOrder - 1),
                        endDate: new Date().addDays(step.caseOrder),
                        assignees: [
                          ...(caseServiceData.assignees || []),
                          caseServiceData.leadAttorney,
                        ],
                      },
                      TASK.PREFIX
                    ),
                  ],
                  { session }
                );
              }
            }
          }
          results.imported++;
        }
      } catch (error) {
        console.log('Error importing case service data:', error);
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Lỗi không xác định',
          data: row,
        });
      }
    }

    console.log(
      '***************************************************import results',
      results
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return results;
  } catch (error) {
    // Rollback transaction if there's an error
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    // Wrap original error with Vietnamese message if it's a standard Error
    if (
      error instanceof Error &&
      !(error instanceof BadRequestError) &&
      !(error instanceof NotFoundError)
    ) {
      throw new Error(
        `Đã xảy ra lỗi khi import dữ liệu Ca dịch vụ từ XLSX: ${error.message}`
      );
    }
    throw error;
  } finally {
    // Clean up the uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up uploaded file: ${filePath}`);
      }
    } catch (unlinkError) {
      console.error('Error cleaning up uploaded file:', unlinkError);
    }
  }
};

const exportCaseServicesToXLSX = async (query: ICaseServiceQuery = {}) => {
  try {
    // Reuse the same query logic from getCaseServices but get all data for export
    const { data: caseServicesList } = await getCaseServices(query);

    // Create directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    } else {
      // Clean up old case service export files
      for (const file of fs.readdirSync(exportDir)) {
        if (file.startsWith('ho_so_vu_viec_') && file.endsWith('.xlsx')) {
          fs.unlinkSync(path.join(exportDir, file));
        }
      }
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
        'Mã hồ sơ': caseService.case_code || '',
        'Khách hàng': caseService.case_customer
          ? `${caseService.case_customer.cus_firstName} ${caseService.case_customer.cus_lastName}`
          : '',
        'Mã khách hàng': caseService.case_customer?.cus_code || '',
        'Luật sư chính': caseService.case_leadAttorney
          ? `${caseService.case_leadAttorney.emp_user.usr_firstName} ${caseService.case_leadAttorney.emp_user.usr_lastName}`
          : '',
        'Mã luật sư': caseService.case_leadAttorney?.emp_code || '',
        'Phòng ban': caseService.case_leadAttorney?.emp_department || '',
        'Chức vụ': caseService.case_leadAttorney?.emp_position || '',
        'Người được phân công': caseService.case_assignees
          ? caseService.case_assignees
              .map(
                (assignee) =>
                  `${assignee.emp_user.usr_firstName} ${assignee.emp_user.usr_lastName}`
              )
              .join(', ')
          : '',
        'Trạng thái': caseService.case_status || '',
        'Ghi chú': caseService.case_notes || '',
        'Ngày bắt đầu': caseService.case_startDate
          ? new Date(caseService.case_startDate).toLocaleDateString('vi-VN')
          : '',
        'Ngày kết thúc': caseService.case_endDate
          ? new Date(caseService.case_endDate).toLocaleDateString('vi-VN')
          : '',
        'Thời gian tạo': caseService.createdAt
          ? new Date(caseService.createdAt).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '',
        'Cập nhật lần cuối': caseService.updatedAt
          ? new Date(caseService.updatedAt).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
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
    // Wrap original error with Vietnamese message if it's a standard Error
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

/**
 * Attach document to a case
 * @param {string[]} documentIds - Document ID
 * @param {string} caseId - Case service ID
 * @param {string} userId - user ID of the employee making the request
 */
const attachDocumentToCase = async (
  documentIds: string[],
  caseId: string,
  userId: string
) => {
  // Input already validated before going to controller using zod

  try {
    const [docRes, caseRes, employeeRes] = await Promise.allSettled([
      DocumentModel.find({
        _id: { $in: documentIds },
      }),
      CaseServiceModel.findById(caseId),
      getEmployeeByUserId(userId),
    ]);

    if (
      docRes.status === 'rejected' ||
      caseRes.status === 'rejected' ||
      employeeRes.status === 'rejected'
    ) {
      throw new BadRequestError(
        'Không tìm thấy tài liệu, Ca dịch vụ hoặc nhân viên'
      );
    }

    const documents = docRes.value;
    const caseService = caseRes.value;
    const employee = employeeRes.value;

    if (!caseService) {
      throw new NotFoundError('Không tìm thấy Ca dịch vụ');
    }

    // Check which documents exist
    const foundDocumentIds = documents.map((doc) => doc._id.toString());
    const notFoundDocumentIds = documentIds.filter(
      (id) => !foundDocumentIds.includes(id)
    );
    if (notFoundDocumentIds.length > 0) {
      throw new NotFoundError(`Không tìm thấy tài liệu.`);
    }

    // Check which documents are already attached to this case
    const existingRelations = await DocumentCaseModel.find({
      document: { $in: documentIds },
      caseService: caseId,
    });

    const alreadyAttachedDocumentIds = existingRelations.map((rel) =>
      rel.document.toString()
    );
    const documentsToAttach = documentIds.filter(
      (id) =>
        !alreadyAttachedDocumentIds.includes(id) &&
        foundDocumentIds.includes(id)
    );

    // Prepare result summary
    const result = {
      success: true,
      message: '',
      details: {
        total: documentIds.length,
        alreadyAttached: alreadyAttachedDocumentIds.length,
        newlyAttached: documentsToAttach.length,
        notFound: notFoundDocumentIds.length,
        alreadyAttachedIds: alreadyAttachedDocumentIds,
        newlyAttachedIds: documentsToAttach,
        notFoundIds: notFoundDocumentIds,
      },
    };

    // Create new document-case relationships for documents that aren't already attached
    if (documentsToAttach.length > 0) {
      const relations = documentsToAttach.map((docId) => ({
        document: docId,
        caseService: caseId,
        createdBy: employee.id,
      }));

      await DocumentCaseModel.insertMany(relations);
    }

    // Generate appropriate message based on results
    const messages = [];
    if (result.details.newlyAttached > 0) {
      messages.push(
        `${result.details.newlyAttached} tài liệu đã được đính kèm mới`
      );
    }
    if (result.details.alreadyAttached > 0) {
      messages.push(
        `${result.details.alreadyAttached} tài liệu đã được đính kèm trước đó`
      );
    }
    if (result.details.notFound > 0) {
      messages.push(`${result.details.notFound} tài liệu không tìm thấy`);
    }

    if (messages.length === 0) {
      result.message = 'Không có tài liệu nào được xử lý';
    } else {
      result.message = messages.join(', ');
    }

    // Add success indicator based on whether any new attachments were made
    if (
      result.details.newlyAttached === 0 &&
      result.details.alreadyAttached === 0 &&
      result.details.notFound > 0
    ) {
      result.success = false;
      result.message = 'Không tìm thấy tài liệu nào để đính kèm';
    }

    return result;
  } catch (error) {
    // Wrap original error with Vietnamese message if it's a standard Error
    if (
      error instanceof Error &&
      !(error instanceof BadRequestError) &&
      !(error instanceof NotFoundError)
    ) {
      throw new Error(
        `Đã xảy ra lỗi khi đính kèm tài liệu vào Ca dịch vụ: ${error.message}`
      );
    }
    throw error;
  }
};

/**
 * Detach document from a case
 * @param {string} documentId - Document ID
 * @param {string} caseId - Case service ID
 * @param {string} employeeId - ID of the employee making the request
 */
const detachDocumentFromCase = async (
  caseDocumentIds: string[],
  caseId: string
) => {
  const caseDocuments = await DocumentCaseModel.find({
    _id: { $in: caseDocumentIds },
  });

  if (!caseDocuments.length) {
    return {
      message: 'Không tìm thấy tài liệu nào được đính kèm vào Ca dịch vụ này',
      success: true,
    };
  }

  await DocumentCaseModel.deleteMany({
    _id: { $in: caseDocumentIds },
    caseService: caseId,
  });

  return {
    message: 'Tài liệu đã được gỡ khỏi Ca dịch vụ thành công',
    success: true,
  };
};

/**
 * Get documents by case
 * @param {string} caseId - Case service ID
 * @param {string} userId - ID of the employee making the request
 * @param {IDocumentQuery} query - Query parameters for filtering documents
 */
const getCaseServiceDocuments = async (
  caseId: string,
  userId: string,
  query: IDocumentQuery = {}
) => {
  if (!Types.ObjectId.isValid(caseId)) {
    throw new BadRequestError('Invalid case ID');
  }

  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder = 'desc',
      type,
      startDate,
      endDate,
    } = query;

    const employee = await getEmployeeByUserId(userId);
    const employeeId = employee.id;

    // Build the aggregation pipeline starting from DocumentCase
    const pipeline: any[] = [];

    // Stage 1: Match documents attached to this case service
    pipeline.push({
      $match: {
        caseService: new Types.ObjectId(caseId),
      },
    });

    // Stage 2: Lookup to get document details
    pipeline.push({
      $lookup: {
        from: 'documents',
        localField: 'document',
        foreignField: '_id',
        as: 'document',
      },
    });

    // Stage 3: Unwind document array
    pipeline.push({
      $unwind: {
        path: '$document',
        preserveNullAndEmptyArrays: false,
      },
    });

    // Stage 4: Check document access permissions
    pipeline.push({
      $match: {
        $or: [
          { 'document.doc_isPublic': true },
          { 'document.doc_createdBy': new Types.ObjectId(employeeId) },
          {
            'document.doc_whiteList': { $in: [new Types.ObjectId(employeeId)] },
          },
        ],
      },
    });

    // Stage 5: Lookup to populate document creator information
    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'document.doc_createdBy',
        foreignField: '_id',
        as: 'document.doc_createdBy',
      },
    });

    // Stage 6: Unwind createdBy array
    pipeline.push({
      $unwind: {
        path: '$document.doc_createdBy',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Stage 7: Lookup to populate user information for creator
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'document.doc_createdBy.emp_user',
        foreignField: '_id',
        as: 'document.doc_createdBy.emp_user',
      },
    });

    // Stage 8: Unwind the user array for creator
    pipeline.push({
      $unwind: {
        path: '$document.doc_createdBy.emp_user',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Stage 9: Lookup to populate whitelist information
    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'document.doc_whiteList',
        foreignField: '_id',
        as: 'document.doc_whiteList',
      },
    });

    // Stage 10: Lookup to populate user information for whitelist employees
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'document.doc_whiteList.emp_user',
        foreignField: '_id',
        as: 'whitelistUsers',
      },
    });

    // Stage 11: Add user information to each employee in whitelist
    pipeline.push({
      $addFields: {
        'document.doc_whiteList': {
          $map: {
            input: '$document.doc_whiteList',
            as: 'employee',
            in: {
              $mergeObjects: [
                '$$employee',
                {
                  emp_user: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$whitelistUsers',
                          as: 'user',
                          cond: { $eq: ['$$user._id', '$$employee.emp_user'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    });

    // Stage 12: Lookup to populate the employee who attached the document
    pipeline.push({
      $lookup: {
        from: 'employees',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
      },
    });

    // Stage 13: Unwind createdBy array
    pipeline.push({
      $unwind: {
        path: '$createdBy',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Stage 14: Lookup to populate user information for the one who attached
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy.emp_user',
        foreignField: '_id',
        as: 'createdBy.emp_user',
      },
    });

    // Stage 15: Unwind the user array for the one who attached
    pipeline.push({
      $unwind: {
        path: '$createdBy.emp_user',
        preserveNullAndEmptyArrays: true,
      },
    });

    // Stage 16: Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'document.doc_name': searchRegex },
            { 'document.doc_description': searchRegex },
            { 'document.doc_type': searchRegex },
            { 'document.doc_createdBy.emp_code': searchRegex },
            { 'createdBy.emp_code': searchRegex },
          ],
        },
      });
    }

    // Stage 17: Filter by document type if provided
    if (type) {
      pipeline.push({
        $match: { 'document.doc_type': type },
      });
    }

    // Stage 18: Filter by date range if provided
    if (startDate || endDate) {
      const dateFilter: any = {};

      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }

      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }

      pipeline.push({
        $match: { 'document.createdAt': dateFilter },
      });
    }

    // Stage 19: Project to include only necessary fields
    pipeline.push({
      $project: {
        _id: 1,
        caseService: 1,
        createdAt: 1,
        updatedAt: 1,
        createdBy: {
          _id: 1,
          emp_code: 1,
          emp_position: 1,
          emp_user: {
            _id: 1,
            usr_firstName: 1,
            usr_lastName: 1,
            usr_email: 1,
            usr_username: 1,
          },
        },
        document: {
          _id: 1,
          doc_name: 1,
          doc_type: 1,
          doc_description: 1,
          doc_url: 1,
          doc_isPublic: 1,
          createdAt: 1,
          updatedAt: 1,
          doc_createdBy: {
            _id: 1,
            emp_code: 1,
            emp_position: 1,
            emp_user: {
              _id: 1,
              usr_firstName: 1,
              usr_lastName: 1,
              usr_email: 1,
              usr_username: 1,
              usr_msisdn: 1,
              usr_avatar: 1,
              usr_status: 1,
              usr_role: 1,
            },
          },
          doc_whiteList: {
            _id: 1,
            emp_code: 1,
            emp_position: 1,
            emp_user: {
              _id: 1,
              usr_firstName: 1,
              usr_lastName: 1,
              usr_email: 1,
              usr_username: 1,
            },
          },
        },
      },
    });

    // Stage 20: Sort the results
    const sortField = sortBy ? `document.${sortBy}` : 'document.createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({
      $sort: { [sortField]: sortDirection },
    });

    // Get total count first (for pagination)
    const countPipeline = [...pipeline]; // Clone the pipeline
    countPipeline.push({ $count: 'total' });
    const countResult = await DocumentCaseModel.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Stage 21: Apply pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: +limit });

    // Execute the aggregation
    const documentCases = await DocumentCaseModel.aggregate(pipeline);
    const totalPages = Math.ceil(total / limit);

    return {
      data: getReturnList(documentCases),
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
        `Đã xảy ra lỗi khi lấy danh sách tài liệu của Ca dịch vụ: ${error.message}`
      );
    }
    throw error;
  }
};

/**
 * Get tasks associated with a case service
 * @param {string} caseId - Case service ID
 */
const getCaseServiceTasks = async (caseId: string) => {
  if (!Types.ObjectId.isValid(caseId)) {
    throw new BadRequestError('Invalid case ID');
  }

  // Find all tasks associated with this case
  return await getTasks({
    caseService: caseId,
    limit: 1000,
    sortBy: 'tsk_caseOrder',
    sortOrder: 'asc',
  });
};

/**
 * Helper function to check if a case service row is empty
 */
const isEmptyCaseServiceRow = (row: any): boolean => {
  const values = Object.values(row);
  return values.every(
    (value) =>
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
  );
};

/**
 * Helper function to map Excel row to case service data
 */
const mapExcelRowToCaseService = async (row: any) => {
  let startDate: string | undefined, endDate: string | undefined;

  // Parse dates
  if (row['Ngày bắt đầu']) {
    try {
      startDate = parse(
        row['Ngày bắt đầu'],
        'dd/MM/yyyy',
        new Date()
      ).toISOString();
    } catch (error) {
      console.warn('Error parsing start date:', error);
    }
  }

  if (row['Ngày kết thúc']) {
    try {
      endDate = parse(
        row['Ngày kết thúc'],
        'dd/MM/yyyy',
        new Date()
      ).toISOString();
    } catch (error) {
      console.warn('Error parsing end date:', error);
    }
  }

  // Find customer by code or name
  let customerId;
  if (row['Mã khách hàng']) {
    const { CustomerModel } = await import('@models/customer.model');
    const customer = await CustomerModel.findOne({
      cus_code: row['Mã khách hàng'],
    });
    customerId = customer?._id;
  } else if (row['Khách hàng']) {
    // Try to find by name if code is not provided
    const { CustomerModel } = await import('@models/customer.model');
    const fullName = row['Khách hàng'].trim();
    const nameParts = fullName.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[nameParts.length - 1];
      const lastName = nameParts.slice(0, -1).join(' ');

      const customer = await CustomerModel.findOne({
        cus_firstName: firstName,
        cus_lastName: lastName,
      });
      customerId = customer?._id;
    }
  }

  // Find lead attorney by code or name
  let leadAttorneyId;
  if (row['Mã luật sư']) {
    const { EmployeeModel } = await import('@models/employee.model');
    const attorney = await EmployeeModel.findOne({
      emp_code: row['Mã luật sư'],
    });
    leadAttorneyId = attorney?._id;
  } else if (row['Luật sư chính']) {
    // Try to find by name if code is not provided
    const { EmployeeModel } = await import('@models/employee.model');
    const fullName = row['Luật sư chính'].trim();
    const nameParts = fullName.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[nameParts.length - 1];
      const lastName = nameParts.slice(0, -1).join(' ');

      const attorney = await EmployeeModel.findOne().populate({
        path: 'emp_user',
        match: {
          usr_firstName: firstName,
          usr_lastName: lastName,
        },
      });

      if (attorney?.emp_user) {
        leadAttorneyId = attorney._id;
      }
    }
  }

  // Find assignees by parsing the assignees string
  let assigneeIds: string[] = [];
  if (row['Người được phân công']) {
    const { EmployeeModel } = await import('@models/employee.model');
    const assigneeNames = row['Người được phân công']
      .split(',')
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0);

    for (const fullName of assigneeNames) {
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 2) {
        const firstName = nameParts[nameParts.length - 1];
        const lastName = nameParts.slice(0, -1).join(' ');

        const assignee = await EmployeeModel.findOne().populate({
          path: 'emp_user',
          match: {
            usr_firstName: firstName,
            usr_lastName: lastName,
          },
        });

        if (assignee?.emp_user) {
          assigneeIds.push(assignee._id.toString());
        }
      }
    }
  }

  return {
    code: row['Mã hồ sơ'] || '',
    customer: customerId,
    leadAttorney: leadAttorneyId,
    assignees: assigneeIds,
    notes: row['Ghi chú'] || '',
    status: row['Trạng thái'] || CASE_SERVICE.STATUS.OPEN,
    startDate,
    endDate,
  };
};

export {
  getCaseServices,
  getCaseServiceById,
  getCaseServiceTasks,
  createCaseService,
  updateCaseService,
  deleteCaseService,
  bulkDeleteCaseServices,
  importCaseServices,
  exportCaseServicesToXLSX,
  attachDocumentToCase,
  detachDocumentFromCase,
  getCaseServiceDocuments,
};
