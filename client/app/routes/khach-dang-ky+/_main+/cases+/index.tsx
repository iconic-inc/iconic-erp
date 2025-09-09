import { ActionFunctionArgs, data, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import {
  bulkDeleteCaseService,
  exportCaseServicesToXLSX,
  getCaseServices,
  getMyCustomerCaseServices,
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await parseAuthCookie(request);

  const url = new URL(request.url);

  return {
    casesPromise: getMyCustomerCaseServices(url.searchParams, user!).catch(
      (e) => {
        console.error(e);
        return {
          success: false,
          message: 'Không thể tải danh sách Ca dịch vụ',
        };
      },
    ),
  };
};

export default function CRMCaseService() {
  const { casesPromise } = useLoaderData<typeof loader>();

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
          to={`/khach-dang-ky/cases/${item.id}`}
          prefetch='intent'
          className='text-blue-600 hover:underline block w-full h-full'
        >
          <span className='text-sm sm:text-base truncate block max-w-[150px] sm:max-w-none'>
            {item.case_code || 'N/A'}
          </span>
        </Link>
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
      render: (item) => (
        <span className='text-gray-600 text-sm sm:text-base truncate block max-w-[100px] sm:max-w-none'>
          {formatDate(item.case_createdAt)}
        </span>
      ),
    },
    {
      title: 'Ngày hẹn',
      key: 'appointmentDate',
      visible: true,
      sortField: 'case_appointmentDate',
      render: (item) => (
        <span className='text-gray-600 text-sm sm:text-base truncate block max-w-[100px] sm:max-w-none'>
          {item.case_appointmentDate
            ? formatDate(item.case_appointmentDate)
            : '-'}
        </span>
      ),
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
        actionHandler={() => navigate('/khach-dang-ky/cases/new')}
      />

      <List<ICaseService>
        itemsPromise={casesPromise}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        addNewHandler={() => navigate('/khach-dang-ky/cases/new')}
        exportable
        importable
        name='Ca dịch vụ'
      />
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
