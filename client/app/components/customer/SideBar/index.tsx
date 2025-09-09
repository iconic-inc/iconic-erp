import { Link, useLoaderData } from '@remix-run/react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '~/components/ui/sidebar';
import { Folder, IdCard, CreditCard, Users } from 'lucide-react';
import { loader } from '~/routes/khach-dang-ky+/_main+/_layout';
import SideNav from './SideNav';
import { NavUser } from './NavUser';
import { IUser } from '~/interfaces/user.interface';

export default function ERPSidebar() {
  const { customer } = useLoaderData<typeof loader>();
  const user = customer?.cus_user;
  const navMain = getNavItems(user);

  return (
    <Sidebar className='lg:h-screen'>
      <SidebarHeader>
        <Link
          to='/khach-dang-ky'
          prefetch='intent'
          className='flex items-center mb-6'
        >
          <div className='w-12 h-12 rounded-full overflow-hidden'>
            <img src='/assets/iconic-logo.png' alt='Iconic Logo' />
          </div>
          <span className='text-primary font-semibold ml-2'>
            Iconic Talents
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SideNav items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            avatar:
              user.usr_avatar?.img_url || '/assets/user-avatar-placeholder.jpg',
            email: user?.usr_email || '',
            name: `${user.usr_firstName} ${user.usr_lastName}`,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

// Generate navigation items based on user role
const getNavItems = (user: IUser) => {
  const navItems = [
    {
      title: 'Cá nhân',
      url: '#',
      icon: IdCard,
      isActive: true,
      items: [
        {
          title: 'Hồ sơ cá nhân',
          url: '/khach-dang-ky/profile',
        },
        {
          title: 'Ca dịch vụ',
          url: '/khach-dang-ky/cases',
        },
      ],
    },
  ];

  return navItems;
};
