import { ActionFunctionArgs, data, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  bulkDeleteCaseService,
  exportCaseServicesToXLSX,
  getCaseServices,
  getMyCaseServices,
} from '~/services/case.server';
import ContentHeader from '~/components/ContentHeader';
import { parseAuthCookie } from '~/services/cookie.server';
import { ICaseService } from '~/interfaces/case.interface';
import {
  IListColumn,
  IActionFunctionReturn,
  IExportResponse,
} from '~/interfaces/app.interface';
import { isAuthenticated } from '~/services/auth.server';
import List from '~/components/List';
import { CASE_SERVICE } from '~/constants/caseService.constant';
import { canAccessCaseServices, hasRole } from '~/utils/permission';
import { getEmployees } from '~/services/employee.server';
import { getCustomers } from '~/services/customer.server';
import { isResolveError } from '~/lib';
import { IEmployeeBrief } from '~/interfaces/employee.interface';
import { ICustomerBrief } from '~/interfaces/customer.interface';
import { calculateProgress, formatDate } from '~/utils';
import { ProgressWithPercentage } from '~/components/ui/ProgressWithPercentage';
import CaseServiceStatusDetail from '../../cases+/_components/CaseServiceStatusDetail';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await parseAuthCookie(request);
  if (!hasRole(user?.user.usr_role, ['admin'])) {
    throw new Response('Bạn không có quyền truy cập vào trang này.', {
      status: 403,
    });
  }

  const url = new URL(request.url);

  return {
    casesPromise: getMyCaseServices(url.searchParams, user!).catch((e) => {
      console.error(e);
      return {
        success: false,
        message: 'Không thể tải danh sách Ca dịch vụ',
      };
    }),
    employeesPromise: getEmployees(
      new URLSearchParams([['limit', '1000']]),
      user!,
    ).catch((e) => {
      console.error(e);
      return {
        success: false,
        message: e.message || 'Có lỗi xảy ra khi lấy danh sách nhân viên',
      };
    }),
    customersPromise: getCustomers(
      new URLSearchParams([['limit', '1000']]),
      user!,
    ).catch((e) => {
      console.error(e);
      return {
        success: false,
        message: e.message || 'Có lỗi xảy ra khi lấy danh sách khách hàng',
      };
    }),
  };
};

export default function CRMCaseService() {
  const { casesPromise, employeesPromise, customersPromise } =
    useLoaderData<typeof loader>();

  useEffect(() => {
    const loadFilterData = async () => {
      // Load employees for lead attorney filter
      const employeesData = (await employeesPromise) as any;
      const customersData = (await customersPromise) as any;

      setVisibleColumns((prevColumns) =>
        prevColumns.map((col) => {
          if (col.key === 'consultant' && !isResolveError(employeesData)) {
            return {
              ...col,
              options: employeesData.data.length
                ? employeesData.data.map((emp: IEmployeeBrief) => ({
                    value: emp.id,
                    label: `${emp.emp_user?.usr_firstName} ${emp.emp_user?.usr_lastName}`,
                  }))
                : [
                    {
                      value: '',
                      label: 'Không có nhân viên',
                    },
                  ],
            };
          }
          if (col.key === 'customer' && !isResolveError(customersData)) {
            return {
              ...col,
              options: customersData.data.length
                ? customersData.data.map((customer: ICustomerBrief) => ({
                    value: customer.id,
                    label: `${customer.cus_firstName} ${customer.cus_lastName}`,
                  }))
                : [
                    {
                      value: '',
                      label: 'Không có khách hàng',
                    },
                  ],
            };
          }
          return col;
        }),
      );
    };
    loadFilterData();
  }, [employeesPromise, customersPromise]);

  const [showStatusModal, setShowStatusModal] = useState<null | ICaseService>(
    null,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowStatusModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const [visibleColumns, setVisibleColumns] = useState<
    IListColumn<ICaseService>[]
  >([
    {
      title: 'Mã Ca dịch vụ',
      key: 'code',
      visible: true,
      sortField: 'case_code',
      render: (item) => (
        <Link
          to={`/erp/cases/${item.id}`}
          className='text-blue-600 hover:underline block w-full h-full'
        >
          <span className='text-sm sm:text-base truncate block max-w-[150px] sm:max-w-none'>
            {item.case_code || 'N/A'}
          </span>
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      visible: true,
      sortField: 'case_customer.cus_firstName',
      filterField: 'customerId',
      options: [],
      render: (item) => (
        <Link
          to={`/erp/customers/${item.case_customer.id}`}
          className='text-blue-600 hover:underline block w-full h-full'
        >
          <span className='text-sm sm:text-base truncate block max-w-[150px] sm:max-w-none'>
            {item.case_customer.cus_firstName} {item.case_customer.cus_lastName}
          </span>
        </Link>
      ),
    },
    {
      title: 'Thông tin phụ huynh',
      key: 'parentData',
      visible: true,
      render: (item) => (
        <div className='flex flex-col gap-1 text-sm sm:text-base'>
          <span>{item.case_customer.cus_parentName || 'N/A'}</span>
          <span className='text-gray-500 text-xs sm:text-sm'>
            {formatDate(item.case_customer.cus_parentDateOfBirth) || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      key: 'msisdn',
      visible: true,
      // sortField: 'case_customer.cus_msisdn',
      render: (item) => (
        <span className='text-sm sm:text-base truncate block max-w-[150px] sm:max-w-none'>
          {item.case_customer.cus_msisdn || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Ngày bắt đầu',
      key: 'date',
      visible: true,
      sortField: 'case_date',
      filterField: 'date',
      dateFilterable: true,
      render: (item) => (
        <span className='text-gray-600 text-sm sm:text-base truncate block max-w-[100px] sm:max-w-none'>
          {formatDate(item.case_date)}
        </span>
      ),
    },
    {
      title: 'Ngày hẹn',
      key: 'appointmentDate',
      visible: true,
      sortField: 'case_appointmentDate',
      filterField: 'appointmentDate',
      dateFilterable: true,
      render: (item) => (
        <span className='text-gray-600 text-sm sm:text-base truncate block max-w-[100px] sm:max-w-none'>
          {item.case_appointmentDate
            ? formatDate(item.case_appointmentDate)
            : '-'}
        </span>
      ),
    },
    {
      title: 'Phương thức thanh toán',
      key: 'paymentMethod',
      visible: true,
      sortField: 'case_paymentMethod',
      filterField: 'paymentMethod',
      options: Object.values(CASE_SERVICE.PAYMENT_METHOD).map((method) => ({
        value: method.value,
        label: method.label,
      })),
      render: (item) => (
        <span className='text-gray-600 text-xs sm:text-sm truncate block max-w-[100px] sm:max-w-none'>
          {item.case_paymentMethod
            ? Object.values(CASE_SERVICE.PAYMENT_METHOD).find(
                (method) => method.value === item.case_paymentMethod,
              )?.label || item.case_paymentMethod
            : '-'}
        </span>
      ),
    },
    {
      title: 'Trạng thái xử lý',
      key: 'processStatus',
      visible: true,
      sortField: 'case_processStatus.isFullyPaid',
      render: (item) => {
        const processStatus = item.case_processStatus;
        return (
          <div className='space-y-2'>
            <div className='w-full'>
              <ProgressWithPercentage
                value={calculateProgress(processStatus)}
                showPercentage
                label='Tiến độ xử lý'
                showLabel
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusModal(item);
              }}
              className='text-xs text-blue-500 hover:underline mt-1'
            >
              Xem tất cả
            </button>
          </div>
        );
      },
    },
  ]);

  const navigate = useNavigate();

  return (
    <div className='space-y-4 sm:space-y-6 min-h-screen'>
      {/* Content Header */}
      <ContentHeader
        title='Danh sách Ca dịch vụ'
        actionContent={
          <>
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>Thêm Ca dịch vụ</span>
            <span className='sm:hidden'>Thêm</span>
          </>
        }
        actionHandler={() => navigate('/erp/cases/new')}
      />

      <List<ICaseService>
        itemsPromise={casesPromise}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        addNewHandler={() => navigate('/erp/cases/new')}
        exportable
        importable
        name='Ca dịch vụ'
      />

      {showStatusModal && (
        <CaseServiceStatusDetail
          caseService={showStatusModal}
          onClose={() => setShowStatusModal(null)}
        />
      )}
    </div>
  );
}

export const action = async ({
  request,
}: ActionFunctionArgs): IActionFunctionReturn<IExportResponse> => {
  const { session, headers } = await isAuthenticated(request);
  if (!session) {
    return data(
      {
        success: false,
        toast: {
          type: 'error',
          message: 'Bạn cần đăng nhập để thực hiện hành động này',
        },
      },
      { headers },
    );
  }

  try {
    const formData = await request.formData();
    switch (request.method) {
      case 'DELETE':
        const caseIdsString = formData.get('itemIds') as string;
        if (!caseIdsString) {
          return data(
            {
              success: false,
              toast: {
                message: 'Không có Ca dịch vụ nào được chọn để xóa',
                type: 'error',
              },
            },
            { headers },
          );
        }

        const caseIds = JSON.parse(caseIdsString);
        if (!Array.isArray(caseIds) || caseIds.length === 0) {
          return data(
            {
              success: false,
              toast: {
                message: 'Không có Ca dịch vụ nào được chọn để xóa',
                type: 'error',
              },
            },
            { headers },
          );
        }
        // Call the bulk delete function
        await bulkDeleteCaseService(caseIds, session);

        return data(
          {
            success: true,
            toast: {
              type: 'success',
              message: `Đã xóa ${caseIds.length} Ca dịch vụ thành công`,
            },
          },
          { headers },
        );

      case 'POST':
        // Handle export action (placeholder for future implementation)
        const fileType = formData.get('fileType') as string;
        if (!fileType || !['xlsx'].includes(fileType)) {
          return data(
            {
              success: false,
              toast: { type: 'error', message: 'Định dạng file không hợp lệ.' },
            },
            { headers },
          );
        }

        // TODO: Implement export functionality when exportCaseServices is available
        const url = new URL(request.url);
        const fileData = await exportCaseServicesToXLSX(
          url.searchParams,
          session,
        );

        return data(
          {
            success: true,
            toast: {
              type: 'success',
              message: 'Đã xuất dữ liệu Ca dịch vụ thành công!',
            },
            data: {
              fileUrl: fileData.fileUrl,
              fileName: fileData.fileName,
              count: fileData.count,
            },
          },
          { headers },
        );

      default:
        return data(
          {
            success: false,
            toast: { message: 'Phương thức không hợp lệ', type: 'error' },
          },
          { headers },
        );
    }
  } catch (error: any) {
    console.error('Action error:', error);
    return data(
      {
        success: false,
        toast: {
          message: error.message || 'Có lỗi xảy ra khi thực hiện hành động',
          type: 'error',
        },
      },
      { headers },
    );
  }
};
