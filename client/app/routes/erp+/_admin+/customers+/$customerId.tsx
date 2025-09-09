import {
  createCustomerAccount,
  getCustomerById,
} from '~/services/customer.server';
import { getCaseServices } from '~/services/case.server';
import { getTransactions } from '~/services/transaction.server';
import { LoaderFunctionArgs, ActionFunctionArgs, data } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { parseAuthCookie } from '~/services/cookie.server';
import ContentHeader from '~/components/ContentHeader';
import CustomerDetail from './_components/CustomerDetail';
import CustomerCaseServiceList from './_components/CustomerCaseServiceList';
import CustomerTransactionList from './_components/CustomerTransactionList';
import { Edit, Pen } from 'lucide-react';
import {
  canAccessCustomerManagement,
  canAccessTransactionManagement,
  hasRole,
} from '~/utils/permission';
import { isAuthenticated } from '~/services/auth.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await parseAuthCookie(request);

  if (!canAccessCustomerManagement(session?.user.usr_role)) {
    throw new Response('Bạn không có quyền truy cập vào trang này.', {
      status: 403,
    });
  }

  // Fetch customer data based on customer ID
  const customerId = params.customerId;
  if (!customerId) {
    throw new Response('Customer ID is required', { status: 400 });
  }
  const customerPromise = getCustomerById(customerId, session!).catch(
    (error) => {
      console.error('Error fetching customer:', error);
      return {
        success: false,
        message: error.message || 'Có lỗi khi lấy thông tin khách hàng',
      };
    },
  );
  const customerCaseServicesPromise = getCaseServices(
    new URLSearchParams({
      customerId,
      page: '1',
      limit: '100',
      ...(hasRole(session?.user.usr_role, ['admin'])
        ? {}
        : { employeeUserId: session?.user.id || '' }),
    }),
    session!,
  ).catch((error) => {
    console.error('Error fetching customer case services:', error);
    return {
      success: false,
      message: error.message || 'Có lỗi khi lấy danh sách Ca dịch vụ',
    };
  });
  const customerTransactionsPromise = canAccessTransactionManagement(
    session?.user.usr_role,
  )
    ? getTransactions(
        new URLSearchParams({ customerId, page: '1', limit: '100' }),
        session!,
      ).catch((error) => {
        console.error('Error fetching customer transactions:', error);
        return {
          success: false,
          message: error.message || 'Có lỗi khi lấy danh sách giao dịch',
        };
      })
    : null;

  return {
    customerId,
    customerPromise,
    customerCaseServicesPromise,
    customerTransactionsPromise,
  };
};
export default function CustomerDetails() {
  const {
    customerId,
    customerPromise,
    customerCaseServicesPromise,
    customerTransactionsPromise,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className='space-y-4 sm:space-y-6 min-h-screen mx-auto'>
      <ContentHeader
        title='Chi tiết Khách hàng'
        actionContent={
          <>
            <Edit className='w-4 h-4' />
            <span className='hidden sm:inline'>Chỉnh sửa Khách hàng</span>
            <span className='sm:hidden'>Chỉnh sửa</span>
          </>
        }
        actionHandler={() => {
          navigate(`./edit`);
        }}
        backHandler={() => navigate('/erp/customers')}
      />

      {/* Customer Details Card */}
      <CustomerDetail customerPromise={customerPromise} />

      {/* Associated Case Services Card */}
      <CustomerCaseServiceList
        customerId={customerId}
        customerCaseServicesPromise={customerCaseServicesPromise}
      />

      {/* Associated Transactions Card */}
      {customerTransactionsPromise && (
        <CustomerTransactionList
          customerId={customerId}
          customerTransactionsPromise={customerTransactionsPromise}
        />
      )}
    </div>
  );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, headers } = await isAuthenticated(request);
  const customerId = params.customerId;
  if (!customerId) {
    return data(
      {
        message: 'Customer ID is required',
        type: 'error',
      },
      { headers, status: 400 },
    );
  }

  try {
    switch (request.method) {
      case 'POST':
        await createCustomerAccount(customerId, session!);
        return data(
          {
            message: 'Đã tạo tài khoản khách hàng thành công!',
            type: 'success',
          },
          { headers, status: 201 },
        );

      default:
        return data(
          {
            message: 'Method not allowed',
            type: 'error',
          },
          {
            headers,
            status: 405,
          },
        );
    }
  } catch (error: any) {
    console.error('Error handling customer action:', error);
    return data(
      {
        message: error.message || 'Có lỗi xảy ra',
        type: 'error',
      },
      {
        headers,
        status: 500,
      },
    );
  }
};
