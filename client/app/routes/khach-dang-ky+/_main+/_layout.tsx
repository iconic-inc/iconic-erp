import { LoaderFunctionArgs } from '@remix-run/node';

import HandsomeError from '~/components/HandsomeError';
import { parseAuthCookie } from '~/services/cookie.server';
import Sidebar from '~/components/customer/SideBar';
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '~/components/ui/sidebar';
import { Outlet, useLoaderData, useNavigation } from '@remix-run/react';
import { getCurrentEmployeeByUserId } from '~/services/employee.server';
import { useEffect } from 'react';
import { getCurrentCustomer } from '~/services/customer.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await parseAuthCookie(request);

  // Basic authentication check
  if (!session?.user) {
    throw new Response('Bạn cần đăng nhập để truy cập trang này.', {
      status: 401,
    });
  }

  const customer = await getCurrentCustomer(session!);

  return { customer };
};

export const ErrorBoundary = () => <HandsomeError basePath='/khach-dang-ky' />;

// Component to handle sidebar auto-hide on navigation
function SidebarNavigationHandler() {
  const navigation = useNavigation();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    // Close sidebar on mobile when navigation starts
    if (isMobile && navigation.state === 'loading') {
      setOpenMobile(false);
    }
  }, [navigation.state, isMobile, setOpenMobile]);

  return null;
}

export default function RootAdminLayout() {
  const {} = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <SidebarNavigationHandler />
      <Sidebar />

      <SidebarTrigger className='md:hidden fixed top-4 right-4 z-50' />

      <main className='w-full overflow-hidden'>
        <div className='flex-1 p-4 md:p-6 mt-4 lg:mt-0 overflow-y-auto'>
          {/* Top Navigation */}

          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
