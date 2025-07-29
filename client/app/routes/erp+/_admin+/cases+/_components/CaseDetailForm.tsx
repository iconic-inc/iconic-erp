import { toast } from 'react-toastify';
import { useEffect, useRef, useState } from 'react';
import { Link, useFetcher, useNavigate } from '@remix-run/react';

import { action } from '~/routes/erp+/_admin+/cases+/new';
import { format } from 'date-fns';
import { CASE_SERVICE } from '~/constants/caseService.constant';
import { ILoaderDataPromise } from '~/interfaces/app.interface';
import { IListResponse } from '~/interfaces/response.interface';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { IEmployee, IEmployeeBrief } from '~/interfaces/employee.interface';
import { ICaseService } from '~/interfaces/case.interface';
import { Button } from '~/components/ui/button';
import { Save, ArrowLeft, RotateCcw } from 'lucide-react';
import { DatePicker } from '~/components/ui/date-picker';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import TextEditor from '~/components/TextEditor';
import { ICustomer } from '~/interfaces/customer.interface';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import Defer from '~/components/Defer';
import CustomerBrief from './CustomerBrief';
import { SelectSearch } from '~/components/ui/SelectSearch';
import {
  getDistrictBySlug,
  getDistrictsByProvinceCode,
  getProvinceBySlug,
  provinces,
} from '~/utils/address.util';

export default function CaseDetailForm({
  formId,
  type,
  casePromise,
  customerPromise,
  employeesPromise,
}: {
  formId: string;
  type: 'create' | 'update';
  casePromise?: ILoaderDataPromise<ICaseService>;
  customerPromise?: ILoaderDataPromise<ICustomer>;
  employeesPromise: ILoaderDataPromise<IListResponse<IEmployee>>;
}) {
  const fetcher = useFetcher<typeof action>({ key: formId });
  const toastIdRef = useRef<any>(null);
  const navigate = useNavigate();

  // State for case service form fields
  const [code, setCode] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);

  // Event location address state
  const [eventProvince, setEventProvince] = useState(provinces[0]);
  const [eventDistricts, setEventDistricts] = useState(
    getDistrictsByProvinceCode(provinces[0].code),
  );
  const [eventDistrict, setEventDistrict] = useState(
    getDistrictsByProvinceCode(provinces[0].code)[0],
  );
  const [eventStreet, setEventStreet] = useState<string>('');

  const [partner, setPartner] = useState<string>('');
  const [closeAt, setCloseAt] = useState<string>('');
  const [consultant, setConsultant] = useState<IEmployeeBrief | null>(null);
  const [fingerprintTaker, setFingerprintTaker] =
    useState<IEmployeeBrief | null>(null);
  const [mainCounselor, setMainCounselor] = useState<IEmployeeBrief | null>(
    null,
  );

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Process status flags
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [isFullInfo, setIsFullInfo] = useState<boolean>(false);
  const [isAnalysisSent, setIsAnalysisSent] = useState<boolean>(false);
  const [isPdfExported, setIsPdfExported] = useState<boolean>(false);
  const [isFullyPaid, setIsFullyPaid] = useState<boolean>(false);
  const [isSoftFileSent, setIsSoftFileSent] = useState<boolean>(false);
  const [isPrinted, setIsPrinted] = useState<boolean>(false);
  const [isPhysicalCopySent, setIsPhysicalCopySent] = useState<boolean>(false);
  const [isDeepConsulted, setIsDeepConsulted] = useState<boolean>(false);

  // Thêm state để theo dõi lỗi
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isChanged, setIsChanged] = useState(false);

  // Handle event province changes
  useEffect(() => {
    const newDistricts = getDistrictsByProvinceCode(eventProvince.code);
    setEventDistricts(newDistricts);
    setEventDistrict(newDistricts[0] || eventDistricts[0]);
  }, [eventProvince]);

  // Generate case service code based on customer code
  const generateCaseServiceCode = async () => {
    try {
      if (customerPromise) {
        const customer = await customerPromise;
        if (customer && 'cus_code' in customer && customer.cus_code) {
          // Extract customer code and generate case service code
          // Format: CustomerCode_YYMMDD_HHMMSS
          const now = new Date();
          const year = now.getFullYear().toString().slice(-2);
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const seconds = now.getSeconds().toString().padStart(2, '0');

          const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
          const caseCode = `${customer.cus_code}_${timestamp}`;
          setCode(caseCode);
        } else {
          toast.error('Không thể lấy mã khách hàng để tạo mã dịch vụ');
        }
      } else {
        // Fallback: generate with CS prefix if no customer
        const timestamp = Date.now().toString().slice(-6);
        const caseCode = `CS${timestamp}`;
        setCode(caseCode);
      }
    } catch (error) {
      console.error('Error generating case service code:', error);
      // Fallback: generate with CS prefix
      const timestamp = Date.now().toString().slice(-6);
      const caseCode = `CS${timestamp}`;
      setCode(caseCode);
    }
  };

  // Xử lý form submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation
    const validationErrors: Record<string, string> = {};

    if (!code.trim()) {
      validationErrors.code = 'Vui lòng nhập mã dịch vụ';
    }

    if (!eventStreet.trim()) {
      validationErrors.eventStreet = 'Vui lòng nhập địa chỉ sự kiện';
    }

    if (!eventProvince.slug) {
      validationErrors.eventProvince =
        'Vui lòng chọn tỉnh/thành phố cho sự kiện';
    }

    if (!eventDistrict.slug) {
      validationErrors.eventDistrict = 'Vui lòng chọn quận/huyện cho sự kiện';
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

    // Add all the form fields
    formData.append('code', code);
    formData.append('date', format(date, 'yyyy-MM-dd'));
    if (appointmentDate) {
      formData.append('appointmentDate', format(appointmentDate, 'yyyy-MM-dd'));
    }
    formData.append('eventProvince', eventProvince.slug);
    formData.append('eventDistrict', eventDistrict.slug);
    formData.append('eventStreet', eventStreet);
    formData.append('partner', partner);
    formData.append('closeAt', closeAt);
    if (consultant) formData.append('consultant', consultant.id);
    if (fingerprintTaker)
      formData.append('fingerprintTaker', fingerprintTaker.id);
    if (mainCounselor) formData.append('mainCounselor', mainCounselor.id);
    formData.append('paymentMethod', paymentMethod);
    formData.append('notes', notes);

    // Process status flags
    formData.append('isScanned', String(isScanned));
    formData.append('isFullInfo', String(isFullInfo));
    formData.append('isAnalysisSent', String(isAnalysisSent));
    formData.append('isPdfExported', String(isPdfExported));
    formData.append('isFullyPaid', String(isFullyPaid));
    formData.append('isSoftFileSent', String(isSoftFileSent));
    formData.append('isPrinted', String(isPrinted));
    formData.append('isPhysicalCopySent', String(isPhysicalCopySent));
    formData.append('isDeepConsulted', String(isDeepConsulted));

    toastIdRef.current = toast.loading('Đang xử lý...');
    // Submit the form
    if (type === 'create') {
      fetcher.submit(formData, { method: 'POST' });
    } else if (type === 'update') {
      // Use PATCH for updates
      fetcher.submit(formData, { method: 'PUT' });
    }
  };

  useEffect(() => {
    // Check if any field has changed
    const hasChanged =
      code ||
      date ||
      appointmentDate ||
      eventProvince.slug ||
      eventDistrict.slug ||
      eventStreet ||
      partner ||
      closeAt ||
      consultant ||
      fingerprintTaker ||
      mainCounselor ||
      paymentMethod ||
      notes ||
      isScanned ||
      isFullInfo ||
      isAnalysisSent ||
      isPdfExported ||
      isFullyPaid ||
      isSoftFileSent ||
      isPrinted ||
      isPhysicalCopySent ||
      isDeepConsulted;

    setIsChanged(!!hasChanged);
  }, [
    code,
    date,
    appointmentDate,
    eventProvince.slug,
    eventDistrict.slug,
    eventStreet,
    partner,
    closeAt,
    consultant,
    fingerprintTaker,
    mainCounselor,
    paymentMethod,
    notes,
    isScanned,
    isFullInfo,
    isAnalysisSent,
    isPdfExported,
    isFullyPaid,
    isSoftFileSent,
    isPrinted,
    isPhysicalCopySent,
    isDeepConsulted,
  ]);

  useEffect(() => {
    if (fetcher.data?.toast) {
      const { toast: toastData } = fetcher.data;
      toast.update(toastIdRef.current, {
        type: toastData.type,
        render: toastData.message,
        isLoading: false,
        autoClose: 3000,
        closeOnClick: true,
        pauseOnHover: true,
        pauseOnFocusLoss: true,
      });

      // Redirect if success
      if (fetcher.data?.redirectTo) {
        navigate(fetcher.data.redirectTo, { replace: true });
      }
    }
  }, [fetcher.data]);

  // false by default if type is 'update', true after resolve the casePromise
  const [isContentReady, setIsContentReady] = useState(type !== 'update');
  // Fetch and load case data when in edit mode
  useEffect(() => {
    if (type === 'update' && casePromise) {
      const loadCase = async () => {
        try {
          const caseData = await casePromise;

          if (caseData && 'id' in caseData) {
            // Set basic case data
            setCode(caseData.case_code || '');
            setNotes(caseData.case_notes || '');

            // Set dates
            if (caseData.case_date) {
              setDate(new Date(caseData.case_date));
            }
            if (caseData.case_appointmentDate) {
              setAppointmentDate(new Date(caseData.case_appointmentDate));
            }

            // Set location data
            if (caseData.case_eventLocation) {
              const eventProv =
                getProvinceBySlug(caseData.case_eventLocation.province) ||
                provinces[0];
              setEventProvince(eventProv);
              const eventDists = getDistrictsByProvinceCode(eventProv.code);
              setEventDistricts(eventDists);
              const eventDist =
                getDistrictBySlug(
                  eventDists,
                  caseData.case_eventLocation.district,
                ) || eventDists[0];
              setEventDistrict(eventDist);
              setEventStreet(caseData.case_eventLocation.street || '');
            }

            // Set other fields
            setPartner(caseData.case_partner || '');
            setCloseAt(caseData.case_closeAt || '');
            setPaymentMethod(caseData.case_paymentMethod || '');

            // Set employees
            if (caseData.case_consultant) {
              setConsultant(caseData.case_consultant);
            }
            if (caseData.case_fingerprintTaker) {
              setFingerprintTaker(caseData.case_fingerprintTaker);
            }
            if (caseData.case_mainCounselor) {
              setMainCounselor(caseData.case_mainCounselor);
            }

            // Set process status
            if (caseData.case_processStatus) {
              setIsScanned(caseData.case_processStatus.isScanned || false);
              setIsFullInfo(caseData.case_processStatus.isFullInfo || false);
              setIsAnalysisSent(
                caseData.case_processStatus.isAnalysisSent || false,
              );
              setIsPdfExported(
                caseData.case_processStatus.isPdfExported || false,
              );
              setIsFullyPaid(caseData.case_processStatus.isFullyPaid || false);
              setIsSoftFileSent(
                caseData.case_processStatus.isSoftFileSent || false,
              );
              setIsPrinted(caseData.case_processStatus.isPrinted || false);
              setIsPhysicalCopySent(
                caseData.case_processStatus.isPhysicalCopySent || false,
              );
              setIsDeepConsulted(
                caseData.case_processStatus.isDeepConsulted || false,
              );
            }
          } else {
            console.error('Case data is not in the expected format:', caseData);
            toast.error('Không thể tải dữ liệu case. Vui lòng thử lại sau.');
          }
        } catch (error) {
          console.error('Error loading case data:', error);
          toast.error('Không thể tải dữ liệu case. Vui lòng thử lại sau.');
        }
      };

      loadCase().then(() => {
        setIsContentReady(true);
      });
    }
  }, [type, casePromise, employeesPromise]);

  // Auto-generate case code when creating new case and customer is available
  useEffect(() => {
    if (type === 'create' && !code && customerPromise) {
      generateCaseServiceCode();
    }
  }, [type, customerPromise]);

  return (
    <fetcher.Form
      id={formId}
      method={type === 'create' ? 'POST' : 'PUT'}
      onSubmit={handleSubmit}
    >
      <Card className='rounded-xl overflow-hidden shadow-lg border border-gray-200'>
        <CardHeader className='bg-gradient-to-r from-red-900 to-red-800 text-white py-4 sm:py-6 rounded-t-xl'>
          <CardTitle className='text-white text-xl sm:text-2xl lg:text-3xl font-bold truncate'>
            {code ? code : `Ca dịch vụ ${type === 'create' ? 'mới' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6 space-y-4 sm:space-y-6'>
          <Defer resolve={customerPromise}>
            {(customer) => <CustomerBrief customer={customer} />}
          </Defer>

          {/* Case Service Code */}
          <div>
            <Label
              htmlFor='case_code'
              className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
            >
              Mã dịch vụ <span className='text-red-500'>*</span>
            </Label>
            <div className='flex gap-2'>
              <Input
                id='case_code'
                name='code'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='Ví dụ: KH123456_250729_143022'
                className='bg-white border-gray-300 text-sm sm:text-base'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={generateCaseServiceCode}
                className='whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3'
              >
                <RotateCcw className='h-3 w-3 sm:h-4 sm:w-4 mr-1' />
                <span className='hidden sm:inline'>Tự động tạo</span>
                <span className='sm:hidden'>Tạo</span>
              </Button>
            </div>
            {errors.code && (
              <p className='text-red-500 text-xs sm:text-sm mt-1'>
                {errors.code}
              </p>
            )}
          </div>

          {/* Date and Appointment Date */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
            <div>
              <Label
                htmlFor='case_date'
                className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
              >
                Ngày bắt đầu <span className='text-red-500'>*</span>
              </Label>
              <DatePicker
                id='case_date'
                name='date'
                initialDate={date}
                onChange={(date) => setDate(date)}
              />
            </div>

            <div>
              <Label
                htmlFor='case_appointmentDate'
                className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
              >
                Ngày hẹn (Tùy chọn)
              </Label>
              <DatePicker
                id='case_appointmentDate'
                name='appointmentDate'
                initialDate={appointmentDate}
                onChange={(date) => setAppointmentDate(date)}
              />
            </div>
          </div>

          {/* Event Location */}
          <div>
            <Label className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'>
              Địa điểm sự kiện
            </Label>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div>
                <Label
                  htmlFor='eventProvince'
                  className='text-sm text-gray-600'
                >
                  Tỉnh/Thành phố <span className='text-red-500'>*</span>
                </Label>
                <SelectSearch
                  options={provinces.map((p) => ({
                    value: p.slug,
                    label: p.name,
                  }))}
                  value={eventProvince.slug}
                  onValueChange={(value) => {
                    const selectedProvince =
                      getProvinceBySlug(value) || provinces[0];
                    setEventProvince(selectedProvince);
                    const newDistricts = getDistrictsByProvinceCode(
                      selectedProvince.code,
                    );
                    setEventDistricts(newDistricts);
                    setEventDistrict(newDistricts[0]);
                  }}
                  placeholder='Chọn tỉnh/thành phố'
                  name='eventProvince'
                  id='eventProvince'
                />
                {errors.eventProvince && (
                  <p className='text-red-500 text-xs mt-1'>
                    {errors.eventProvince}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor='eventDistrict'
                  className='text-sm text-gray-600'
                >
                  Quận/Huyện <span className='text-red-500'>*</span>
                </Label>
                <SelectSearch
                  options={eventDistricts.map((d) => ({
                    value: d.slug,
                    label: d.name,
                  }))}
                  value={eventDistrict.slug}
                  onValueChange={(value) => {
                    const selectedDistrict =
                      getDistrictBySlug(eventDistricts, value) ||
                      eventDistricts[0];
                    setEventDistrict(selectedDistrict);
                  }}
                  placeholder='Chọn quận/huyện'
                  name='eventDistrict'
                  id='eventDistrict'
                />
                {errors.eventDistrict && (
                  <p className='text-red-500 text-xs mt-1'>
                    {errors.eventDistrict}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='eventStreet' className='text-sm text-gray-600'>
                  Địa chỉ cụ thể <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='eventStreet'
                  name='eventStreet'
                  value={eventStreet}
                  onChange={(e) => setEventStreet(e.target.value)}
                  placeholder='Số nhà, đường, phường...'
                  className='bg-white border-gray-300 text-sm'
                />
                {errors.eventStreet && (
                  <p className='text-red-500 text-xs mt-1'>
                    {errors.eventStreet}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Partner and Event Type */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
            <div>
              <Label
                htmlFor='partner'
                className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
              >
                Đối tác
              </Label>
              <Input
                id='partner'
                name='partner'
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder='Tên đối tác'
                className='bg-white border-gray-300 text-sm'
              />
            </div>
            <div>
              <Label
                htmlFor='closeAt'
                className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
              >
                Chốt tại
              </Label>
              <SelectSearch
                id='closeAt'
                name='closeAt'
                value={closeAt}
                options={Object.values(CASE_SERVICE.CLOSE_AT)}
                onValueChange={(value) => setCloseAt(value)}
                placeholder='Chọn địa điểm chốt'
              />
            </div>
          </div>

          {/* Employee Selection */}
          <div className='border-t border-gray-200 pt-4 sm:pt-6'>
            <Label className='text-gray-700 font-semibold block flex items-center text-sm sm:text-base mb-4'>
              <span className='text-teal-600 mr-2'>
                &#128100; Nhân viên phụ trách
              </span>
            </Label>

            <Defer resolve={employeesPromise}>
              {({ data: employees }) => (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div>
                    <Label
                      htmlFor='consultant'
                      className='text-sm text-gray-600'
                    >
                      Người tư vấn demo
                    </Label>
                    <SelectSearch
                      id='consultant'
                      name='consultant'
                      value={consultant?.id}
                      placeholder='Chọn người tư vấn demo'
                      options={employees.map((emp) => ({
                        label:
                          emp.emp_user.usr_firstName +
                          ' ' +
                          emp.emp_user.usr_lastName,
                        value: emp.id,
                      }))}
                      onValueChange={(value) => {
                        const selectedEmp = employees.find(
                          (emp) => emp.id === value,
                        );
                        setConsultant(selectedEmp || null);
                      }}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='fingerprintTaker'
                      className='text-sm text-gray-600'
                    >
                      Người lấy vân tay
                    </Label>
                    <SelectSearch
                      id='fingerprintTaker'
                      name='fingerprintTaker'
                      value={fingerprintTaker?.id}
                      placeholder='Chọn người lấy vân tay'
                      options={employees.map((emp) => ({
                        label:
                          emp.emp_user.usr_firstName +
                          ' ' +
                          emp.emp_user.usr_lastName,
                        value: emp.id,
                      }))}
                      onValueChange={(value) => {
                        const selectedEmp = employees.find(
                          (emp) => emp.id === value,
                        );
                        setFingerprintTaker(selectedEmp || null);
                      }}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor='mainCounselor'
                      className='text-sm text-gray-600'
                    >
                      Tư vấn chính
                    </Label>
                    <SelectSearch
                      id='mainCounselor'
                      name='mainCounselor'
                      value={mainCounselor?.id}
                      placeholder='Chọn tư vấn chính'
                      options={employees.map((emp) => ({
                        label:
                          emp.emp_user.usr_firstName +
                          ' ' +
                          emp.emp_user.usr_lastName,
                        value: emp.id,
                      }))}
                      onValueChange={(value) => {
                        const selectedEmp = employees.find(
                          (emp) => emp.id === value,
                        );
                        setMainCounselor(selectedEmp || null);
                      }}
                    />
                  </div>
                </div>
              )}
            </Defer>
          </div>

          {/* Payment Method */}
          <div>
            <Label
              htmlFor='paymentMethod'
              className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'
            >
              Phương thức thanh toán
            </Label>
            <Select
              value={paymentMethod}
              name='paymentMethod'
              onValueChange={(value) => setPaymentMethod(value)}
            >
              <SelectTrigger className='text-sm sm:text-base'>
                <SelectValue placeholder='Chọn phương thức thanh toán' />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CASE_SERVICE.PAYMENT_METHOD).map(
                  ([key, value]) => (
                    <SelectItem key={key} value={value.value}>
                      {value.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Process Status */}
          <div>
            <Label className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'>
              Trạng thái xử lý
            </Label>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isScanned'
                  checked={isScanned}
                  onCheckedChange={(checked) =>
                    setIsScanned(checked as boolean)
                  }
                />
                <Label htmlFor='isScanned' className='text-sm'>
                  Đã lấy dấu
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isFullInfo'
                  checked={isFullInfo}
                  onCheckedChange={(checked) =>
                    setIsFullInfo(checked as boolean)
                  }
                />
                <Label htmlFor='isFullInfo' className='text-sm'>
                  Đủ thông tin
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isAnalysisSent'
                  checked={isAnalysisSent}
                  onCheckedChange={(checked) =>
                    setIsAnalysisSent(checked as boolean)
                  }
                />
                <Label htmlFor='isAnalysisSent' className='text-sm'>
                  Đã gửi phân tích
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isPdfExported'
                  checked={isPdfExported}
                  onCheckedChange={(checked) =>
                    setIsPdfExported(checked as boolean)
                  }
                />
                <Label htmlFor='isPdfExported' className='text-sm'>
                  Đã xuất PDF
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isFullyPaid'
                  checked={isFullyPaid}
                  onCheckedChange={(checked) =>
                    setIsFullyPaid(checked as boolean)
                  }
                />
                <Label htmlFor='isFullyPaid' className='text-sm'>
                  Đã thanh toán đủ
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isSoftFileSent'
                  checked={isSoftFileSent}
                  onCheckedChange={(checked) =>
                    setIsSoftFileSent(checked as boolean)
                  }
                />
                <Label htmlFor='isSoftFileSent' className='text-sm'>
                  Đã gửi file mềm
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isPrinted'
                  checked={isPrinted}
                  onCheckedChange={(checked) =>
                    setIsPrinted(checked as boolean)
                  }
                />
                <Label htmlFor='isPrinted' className='text-sm'>
                  Đã in
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isPhysicalCopySent'
                  checked={isPhysicalCopySent}
                  onCheckedChange={(checked) =>
                    setIsPhysicalCopySent(checked as boolean)
                  }
                />
                <Label htmlFor='isPhysicalCopySent' className='text-sm'>
                  Đã gửi bản cứng
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='isDeepConsulted'
                  checked={isDeepConsulted}
                  onCheckedChange={(checked) =>
                    setIsDeepConsulted(checked as boolean)
                  }
                />
                <Label htmlFor='isDeepConsulted' className='text-sm'>
                  Đã tư vấn chuyên sâu
                </Label>
              </div>
            </div>
          </div>

          {/* Case Notes */}
          <div>
            <Label className='text-gray-700 font-semibold mb-2 block text-sm sm:text-base'>
              Ghi chú
            </Label>
            <TextEditor
              name='notes'
              value={notes}
              isReady={isContentReady}
              onChange={setNotes}
              className='min-h-48 sm:min-h-40'
              placeholder='Nhập ghi chú cho dịch vụ này...'
            />
          </div>
        </CardContent>

        <CardFooter className='p-4 sm:p-6'>
          <div className='w-full flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0'>
            <Link
              to='/erp/cases'
              className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm flex items-center transition-all duration-300 w-full sm:w-auto justify-center'
            >
              <ArrowLeft className='h-4 w-4' />
              <span className='hidden sm:inline'>Trở về Danh sách</span>
              <span className='sm:hidden'>Trở về</span>
            </Link>

            <div className='flex space-x-2 w-full sm:w-auto'>
              <Button
                className='bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm flex items-center transition-all duration-300 shadow-sm hover:shadow transform hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center'
                type='submit'
                form={formId}
                disabled={!isChanged}
              >
                <Save className='h-4 w-4' />
                <span className='hidden sm:inline'>Lưu dịch vụ</span>
                <span className='sm:hidden'>Lưu</span>
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </fetcher.Form>
  );
}
