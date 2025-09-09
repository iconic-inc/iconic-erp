import CaseDetail from './_components/CaseDetail';
import { LoaderFunctionArgs } from '@remix-run/node';
import {
  getCaseServiceById,
  getMyCustomerCaseServiceById,
} from '~/services/case.server';
import { parseAuthCookie } from '~/services/cookie.server';
import { useLoaderData, useNavigate } from '@remix-run/react';
import ContentHeader from '~/components/ContentHeader';
import { Edit, Pen } from 'lucide-react';
import { canAccessCaseServices } from '~/utils/permission';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await parseAuthCookie(request);

  if (!canAccessCaseServices(session?.user.usr_role)) {
    throw new Response('Bạn không có quyền truy cập vào trang này.', {
      status: 403,
    });
  }

  // Fetch case service data based on case ID
  const caseId = params.caseId;
  if (!caseId) {
    throw new Response('Case ID is required', { status: 400 });
  }
  const casePromise = getMyCustomerCaseServiceById(caseId, session!).catch(
    (error) => {
      console.error('Error fetching case service:', error);
      return {
        success: false,
        message: error.message || 'Có lỗi khi lấy thông tin dịch vụ',
      };
    },
  );

  return {
    caseId,
    casePromise,
  };
};

export default function () {
  const { caseId, casePromise } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  return (
    <div className='space-y-4 sm:space-y-6 min-h-screen mx-auto'>
      <ContentHeader
        title='Chi tiết Ca dịch vụ'
        actionContent={
          <>
            <Edit className='w-4 h-4' />
            <span className='hidden sm:inline'>Chỉnh sửa Hồ sơ</span>
            <span className='sm:hidden'>Chỉnh sửa</span>
          </>
        }
        actionHandler={() => {
          navigate(`./edit`);
        }}
        backHandler={() => navigate('/erp/cases')}
      />

      {/* Case Service Details Card */}
      <CaseDetail casePromise={casePromise} />
    </div>
  );
}
