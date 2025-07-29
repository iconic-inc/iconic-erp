import { Save } from 'lucide-react';
import { useLoaderData, useNavigate } from '@remix-run/react';
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data as dataResponse,
} from '@remix-run/node';

import { getCaseServiceById, updateCaseService } from '~/services/case.server';
import { parseAuthCookie } from '~/services/cookie.server';
import ContentHeader from '~/components/ContentHeader';
import CaseDetailForm from './_components/CaseDetailForm';
import { getEmployees } from '~/services/employee.server';
import { isAuthenticated } from '~/services/auth.server';
import { ICaseServiceUpdate } from '~/interfaces/case.interface';
import { CASE_SERVICE } from '~/constants/caseService.constant';
import { useMemo } from 'react';
import { generateFormId } from '~/utils';
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
  const casePromise = getCaseServiceById(caseId, session!).catch((error) => {
    console.error('Error fetching case service:', error);
    return {
      success: false,
      message: error.message || 'Có lỗi khi lấy thông tin dịch vụ',
    };
  });

  // Load customers and employees for form selection
  const employeesPromise = getEmployees(
    new URLSearchParams([['limit', '1000']]),
    session!,
  ).catch((error) => {
    console.error('Error fetching employees:', error);
    return { success: false, message: 'Có lỗi khi lấy danh sách nhân viên' };
  });

  return { caseId, casePromise, employeesPromise };
};

export default function () {
  const { caseId, casePromise, employeesPromise } =
    useLoaderData<typeof loader>();

  const formId = useMemo(
    () => generateFormId(`case-detail-form-${caseId}`),
    [caseId],
  );

  return (
    <div className='space-y-4 md:space-y-6 min-h-screen'>
      <ContentHeader
        title='Chi tiết Ca dịch vụ'
        actionContent={
          <>
            <Save className='w-4 h-4' />
            Lưu Hồ sơ
          </>
        }
        actionHandler={() => {
          const form = document.getElementById(formId) as HTMLFormElement;
          if (form) {
            form.requestSubmit();
          }
        }}
      />

      {/* Case Service Details Card */}
      <CaseDetailForm
        formId={formId}
        casePromise={casePromise}
        type='update'
        employeesPromise={employeesPromise}
      />
    </div>
  );
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, headers } = await isAuthenticated(request);

  switch (request.method) {
    case 'PUT': {
      try {
        const caseId = params.caseId;
        if (!caseId) {
          return dataResponse(
            {
              case: null,
              redirectTo: null,
              toast: {
                message: 'Vui lòng cung cấp ID Ca dịch vụ',
                type: 'error' as ToastType,
              },
            },
            { headers },
          );
        }

        const formData = await request.formData();
        const data: ICaseServiceUpdate = {
          code: formData.get('code') as string,
          date: formData.get('date') as string,
          appointmentDate:
            (formData.get('appointmentDate') as string) || undefined,
          eventProvince: (formData.get('eventProvince') as string) || undefined,
          eventDistrict: (formData.get('eventDistrict') as string) || undefined,
          eventStreet: formData.get('eventStreet') as string,
          partner: (formData.get('partner') as string) || undefined,
          closeAt: (formData.get('closeAt') as any) || undefined,
          consultant: (formData.get('consultant') as string) || undefined,
          fingerprintTaker:
            (formData.get('fingerprintTaker') as string) || undefined,
          mainCounselor: (formData.get('mainCounselor') as string) || undefined,
          paymentMethod:
            (formData.get('paymentMethod') as Values<
              typeof CASE_SERVICE.PAYMENT_METHOD
            >['value']) || undefined,
          notes: (formData.get('notes') as string) || undefined,

          // Process status flags
          isScanned: formData.get('isScanned') === 'true',
          isFullInfo: formData.get('isFullInfo') === 'true',
          isAnalysisSent: formData.get('isAnalysisSent') === 'true',
          isPdfExported: formData.get('isPdfExported') === 'true',
          isFullyPaid: formData.get('isFullyPaid') === 'true',
          isSoftFileSent: formData.get('isSoftFileSent') === 'true',
          isPrinted: formData.get('isPrinted') === 'true',
          isPhysicalCopySent: formData.get('isPhysicalCopySent') === 'true',
          isDeepConsulted: formData.get('isDeepConsulted') === 'true',
        };

        // Kiểm tra dữ liệu bắt buộc
        if (
          ['date', 'eventStreet', 'code'].some(
            (field) => !data[field as keyof ICaseServiceUpdate],
          )
        ) {
          return dataResponse(
            {
              case: null,
              redirectTo: null,
              toast: {
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc',
                type: 'error' as ToastType,
              },
            },
            { headers },
          );
        }

        const res = await updateCaseService(caseId, data, session!);

        return dataResponse(
          {
            case: res,
            toast: {
              message: 'Cập nhật Hồ sơ thành công!',
              type: 'success' as ToastType,
            },
            redirectTo: `/erp/cases/${res.id}`,
          },
          { headers },
        );
      } catch (error: any) {
        console.error('Error creating case:', error);
        const errorMessage = error.message || 'Có lỗi xảy ra khi thêm Hồ sơ';

        return dataResponse(
          {
            case: null,
            redirectTo: null,
            toast: {
              message: errorMessage,
              type: 'error' as ToastType,
            },
          },
          { headers },
        );
      }
    }

    default:
      return dataResponse(
        {
          case: null,
          redirectTo: null,
          toast: { message: 'Method not allowed', type: 'error' as ToastType },
        },
        { headers },
      );
  }
};
