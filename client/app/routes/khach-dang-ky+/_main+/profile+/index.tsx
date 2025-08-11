import { useFetcher, Link } from '@remix-run/react';
import { ActionFunctionArgs, data as dataResponse } from '@remix-run/node';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import { isAuthenticated } from '~/services/auth.server';
import HandsomeError from '~/components/HandsomeError';
import { formatDate, generateFormId } from '~/utils';
import ContentHeader from '~/components/ContentHeader';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useCustomerLoaderData } from '~/lib';
import { updateMyEmployee } from '~/services/employee.server';
import { DatePicker } from '~/components/ui/date-picker';
import ImageInput from '~/components/ImageInput';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { IImage } from '~/interfaces/image.interface';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session: auth, headers } = await isAuthenticated(request);
    if (!auth) {
      throw new Response('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());
    // Prepare update data
    const updateData = {
      firstName: data.firstName as string,
      lastName: data.lastName as string,
      email: data.email as string,
      msisdn: data.msisdn as string,
      address: data.address as string,
      sex: data.sex as string,
      birthdate: data.birthdate as string,
      username: data.username as string,
      password: data.password as string,
      avatar: data.avatar as string,
    };

    const updatedEmployee = await updateMyEmployee(updateData, auth!);
    return dataResponse(
      {
        employee: updatedEmployee,
        toast: { message: 'Cập nhật thông tin thành công!', type: 'success' },
      },
      { headers },
    );
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return {
      toast: {
        message: error.message || error.statusText || 'Cập nhật thất bại!',
        type: 'error',
      },
    };
  }
};

export default function HRMProfile() {
  const { customer } = useCustomerLoaderData();
  const user = customer?.cus_user;
  const fetcher = useFetcher<typeof action>();
  const toastIdRef = useRef<any>(null);

  const formId = useMemo(() => generateFormId('admin-profile-form'), []);

  // Form state
  const [avatar, setAvatar] = useState<IImage>(
    user?.usr_avatar || ({} as IImage),
  );
  const [username, setUsername] = useState(user?.usr_username || '');
  const [password, setPassword] = useState('');

  // State management
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isChanged, setIsChanged] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanged = password !== '' || username !== user?.usr_username;

    setIsChanged(hasChanged);
  }, [password, username, user, avatar.id]);

  // Form submission handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    const validationErrors: Record<string, string> = {};

    if (!username.trim()) {
      validationErrors.username = 'Vui lòng nhập tên đăng nhập';
    }

    // If there are validation errors, show them and prevent form submission
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error(Object.values(validationErrors)[0]);
      return;
    }

    // Clear errors
    setErrors({});

    // Create FormData
    const formData = new FormData(e.currentTarget);

    // Add user ID
    if (user?.id) {
      formData.append('id', user.id);
    }

    toastIdRef.current = toast.loading('Đang cập nhật...');

    // Submit the form
    fetcher.submit(formData, { method: 'PUT' });
  };

  // Handle toast notifications
  useEffect(() => {
    if (fetcher.data?.toast) {
      const { toast: toastData } = fetcher.data;
      toast.update(toastIdRef.current, {
        type: toastData.type as any,
        render: toastData.message,
        isLoading: false,
        autoClose: 3000,
        closeOnClick: true,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
      });

      // Reset password and mark as unchanged if success
      if (toastData.type === 'success') {
        setPassword('');
        setIsChanged(false);
      }
    }
  }, [fetcher.data]);

  return (
    <div className='space-y-4 sm:space-y-6 min-h-screen'>
      {/* Content Header */}
      <ContentHeader
        title='Hồ sơ cá nhân'
        actionContent={
          <>
            <Save className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
            <span className='hidden sm:inline'>Lưu thay đổi</span>
            <span className='sm:hidden'>Lưu</span>
          </>
        }
        actionHandler={() => {
          const form = globalThis.document.getElementById(
            formId,
          ) as HTMLFormElement;
          if (form) {
            form.requestSubmit();
          }
        }}
      />

      {/* Form Container */}
      <fetcher.Form id={formId} method='PUT' onSubmit={handleSubmit}>
        <Card className='rounded-xl overflow-hidden shadow-lg border border-gray-200'>
          <CardHeader className='bg-gradient-to-r from-red-900 to-red-800 text-white p-3 sm:p-6 rounded-t-xl'>
            <CardTitle className='text-white text-xl sm:text-3xl font-bold'>
              <span className='hidden sm:inline'>{'Hồ sơ cá nhân'}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className='p-3 sm:p-6 space-y-4 sm:space-y-6'>
            {/* Avatar Section */}
            {/* <div className='space-y-4'>
              <h3 className='text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2'>
                Ảnh đại diện
              </h3>

              <div className='flex flex-col items-center space-y-4'>
                <ImageInput
                  name='avatar'
                  value={avatar}
                  onChange={(e) => setAvatar(e as IImage)}
                  className='w-full max-w-md'
                />
              </div>
            </div> */}
            {/* Personal Information */}
            <div className='space-y-3 sm:space-y-4'>
              <h3 className='text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2'>
                <span className='hidden sm:inline'>Thông tin đăng nhập</span>
                <span className='sm:hidden'>Thông tin</span>
              </h3>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                <div>
                  <Label
                    htmlFor='username'
                    className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
                  >
                    <span className='hidden sm:inline'>Tên đăng nhập</span>
                    <span className='sm:hidden'>Username</span>{' '}
                    <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    id='username'
                    name='username'
                    type='text'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder='Nhập tên đăng nhập'
                    className={`text-sm sm:text-base ${errors.username ? 'border-red-500' : ''}`}
                  />
                  {errors.username && (
                    <p className='text-red-500 text-xs sm:text-sm mt-1'>
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor='password'
                    className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
                  >
                    <span className='hidden sm:inline'>Mật khẩu mới</span>
                    <span className='sm:hidden'>Mật khẩu</span>
                  </Label>
                  <Input
                    id='password'
                    name='password'
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Để trống nếu không thay đổi'
                    className='text-sm sm:text-base'
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className='p-3 sm:p-6'>
            <div className='w-full flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0'>
              <Link
                to='/khach-dang-ky'
                prefetch='intent'
                className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm flex items-center transition-all duration-300 w-full sm:w-auto justify-center sm:justify-start'
              >
                <ArrowLeft className='h-4 w-4 mr-1' />
                <span className='hidden sm:inline'>Trở về Trang chủ</span>
                <span className='sm:hidden'>Trang chủ</span>
              </Link>

              <Button
                className='bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm flex items-center transition-all duration-300 shadow-sm hover:shadow transform hover:-translate-y-0.5 w-full sm:w-auto justify-center'
                type='submit'
                form={formId}
                disabled={!isChanged}
              >
                <Save className='h-4 w-4' />
                <span className='hidden sm:inline'>Cập nhật hồ sơ</span>
                <span className='sm:hidden'>Cập nhật</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </fetcher.Form>
    </div>
  );
}

export const ErrorBoundary = () => <HandsomeError basePath='/khach-dang-ky' />;
