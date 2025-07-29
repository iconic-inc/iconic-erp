import { Link } from '@remix-run/react';
import BriefEmployeeCard from '~/components/BriefEmployeeCard';
import Defer from '~/components/Defer';
import LoadingCard from '~/components/LoadingCard';
import ErrorCard from '~/components/ErrorCard';
import TextRenderer from '~/components/TextRenderer';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { CASE_SERVICE } from '~/constants/caseService.constant';
import { ILoaderDataPromise } from '~/interfaces/app.interface';
import { ICaseService } from '~/interfaces/case.interface';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  FileText,
  Calendar,
  IdCard,
  Users,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  ArrowLeft,
  MapPin,
  Plus,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { ProgressWithPercentage } from '~/components/ui/ProgressWithPercentage';
import { calculateProgress } from '~/utils';

export default function CaseDetail({
  casePromise,
}: {
  casePromise: ILoaderDataPromise<ICaseService>;
}) {
  return (
    <Defer resolve={casePromise} fallback={<LoadingCard />}>
      {(caseService) => {
        if (!caseService || 'success' in caseService) {
          return (
            <ErrorCard
              message={
                caseService &&
                'message' in caseService &&
                typeof caseService.message === 'string'
                  ? caseService.message
                  : 'Đã xảy ra lỗi khi tải dữ liệu Ca dịch vụ'
              }
            />
          );
        }

        return (
          <Card className='rounded-xl overflow-hidden shadow-lg border border-gray-200'>
            <CardHeader className='bg-gradient-to-r from-red-900 to-red-800 text-white py-4 sm:py-6 rounded-t-xl'>
              <div className='flex items-center space-x-3 sm:space-x-4'>
                <div className='w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center'>
                  <FileText className='w-6 h-6 sm:w-8 sm:h-8 text-white' />
                </div>
                <div className='min-w-0 flex-1'>
                  <CardTitle className='text-white text-xl sm:text-2xl lg:text-3xl font-bold truncate'>
                    {caseService.case_code}
                  </CardTitle>
                  <p className='text-yellow-300 text-sm sm:text-base lg:text-lg truncate'>
                    Khách hàng: {caseService.case_customer.cus_firstName}{' '}
                    {caseService.case_customer.cus_lastName}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-4 sm:p-6 space-y-4 sm:space-y-6'>
              {/* Basic Information */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
                <div className='space-y-3 sm:space-y-4'>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 flex items-center'>
                    <FileText className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
                    Thông tin cơ bản
                  </h3>

                  <div className='space-y-2 sm:space-y-3'>
                    <div className='flex items-start space-x-2 sm:space-x-3'>
                      <IdCard className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Mã hồ sơ:
                        </span>
                        <span className='text-sm sm:text-base font-medium break-all'>
                          {caseService.case_code}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-start space-x-2 sm:space-x-3'>
                      <Users className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Khách hàng:
                        </span>
                        <span className='text-sm sm:text-base font-medium break-words'>
                          {caseService.case_customer.cus_firstName}{' '}
                          {caseService.case_customer.cus_lastName}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-start space-x-2 sm:space-x-3'>
                      <Calendar className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Ngày bắt đầu:
                        </span>
                        <span className='text-sm sm:text-base font-medium break-words'>
                          {caseService.case_date
                            ? format(
                                new Date(caseService.case_date),
                                'dd/MM/yyyy',
                                { locale: vi },
                              )
                            : 'Chưa có thông tin'}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-start space-x-2 sm:space-x-3'>
                      <Clock className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Ngày hẹn:
                        </span>
                        <span className='text-sm sm:text-base font-medium break-words'>
                          {caseService.case_appointmentDate
                            ? format(
                                new Date(caseService.case_appointmentDate),
                                'dd/MM/yyyy',
                                { locale: vi },
                              )
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {caseService.case_eventLocation && (
                      <div className='flex items-start space-x-2 sm:space-x-3'>
                        <MapPin className='w-4 h-4 text-gray-400 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <span className='text-xs sm:text-sm text-gray-500 block'>
                            Địa điểm sự kiện:
                          </span>
                          <span className='text-sm sm:text-base font-medium break-words'>
                            {caseService.case_eventLocation.street}
                            {caseService.case_eventLocation.district &&
                              `, ${caseService.case_eventLocation.district}`}
                            {caseService.case_eventLocation.province &&
                              `, ${caseService.case_eventLocation.province}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {caseService.case_partner && (
                      <div className='flex items-start space-x-2 sm:space-x-3'>
                        <Users className='w-4 h-4 text-gray-400 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <span className='text-xs sm:text-sm text-gray-500 block'>
                            Đối tác:
                          </span>
                          <span className='text-sm sm:text-base font-medium break-words'>
                            {caseService.case_partner}
                          </span>
                        </div>
                      </div>
                    )}

                    {caseService.case_paymentMethod && (
                      <div className='flex items-start space-x-2 sm:space-x-3'>
                        <AlertCircle className='w-4 h-4 text-gray-400 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <span className='text-xs sm:text-sm text-gray-500 block'>
                            Phương thức thanh toán:
                          </span>
                          <Badge className='text-xs sm:text-sm mt-1 bg-blue-100 text-blue-800'>
                            {Object.values(CASE_SERVICE.PAYMENT_METHOD).find(
                              (method) =>
                                method.value === caseService.case_paymentMethod,
                            )?.label || caseService.case_paymentMethod}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {caseService.case_closeAt && (
                      <div className='flex items-start space-x-2 sm:space-x-3'>
                        <CheckCircle className='w-4 h-4 text-gray-400 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <span className='text-xs sm:text-sm text-gray-500 block'>
                            Đóng tại:
                          </span>
                          <Badge className='text-xs sm:text-sm mt-1 bg-green-100 text-green-800'>
                            {Object.values(CASE_SERVICE.CLOSE_AT).find(
                              (closeAt) =>
                                closeAt.value === caseService.case_closeAt,
                            )?.label || caseService.case_closeAt}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Process Status */}
                <div className='space-y-3 sm:space-y-4'>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 flex items-center'>
                    <CheckCircle className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
                    Trạng thái xử lý
                  </h3>
                  <ProgressWithPercentage
                    value={calculateProgress(caseService.case_processStatus)}
                    showPercentage
                    label='Tiến độ xử lý'
                    showLabel
                  />

                  <div className='space-y-2 sm:space-y-3'>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isScanned ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>Đã scan</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isFullInfo ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>Đủ thông tin</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isAnalysisSent ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>
                          Đã gửi phân tích
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isPdfExported ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>Đã xuất PDF</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isFullyPaid ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>
                          Đã thanh toán đủ
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isSoftFileSent ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>
                          Đã gửi file mềm
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isPrinted ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>Đã in</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <div
                          className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isPhysicalCopySent ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                        <span className='text-xs sm:text-sm'>
                          Đã gửi bản cứng
                        </span>
                      </div>
                      {caseService.case_processStatus?.isDeepConsulted !==
                        undefined && (
                        <div className='flex items-center space-x-2'>
                          <div
                            className={`w-3 h-3 rounded-full ${caseService.case_processStatus?.isDeepConsulted ? 'bg-green-500' : 'bg-gray-300'}`}
                          />
                          <span className='text-xs sm:text-sm'>
                            Đã tư vấn sâu
                          </span>
                        </div>
                      )}
                    </div>

                    <div className='flex items-start space-x-2 sm:space-x-3 mt-4'>
                      <Calendar className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Ngày tạo:
                        </span>
                        <span className='text-sm sm:text-base font-medium'>
                          {caseService.createdAt
                            ? format(
                                new Date(caseService.createdAt),
                                'dd/MM/yyyy HH:mm',
                                { locale: vi },
                              )
                            : 'Không có thông tin'}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-start space-x-2 sm:space-x-3'>
                      <Calendar className='w-4 h-4 text-gray-400 mt-0.5' />
                      <div className='min-w-0 flex-1'>
                        <span className='text-xs sm:text-sm text-gray-500 block'>
                          Cập nhật lúc:
                        </span>
                        <span className='text-sm sm:text-base font-medium'>
                          {caseService.updatedAt
                            ? format(
                                new Date(caseService.updatedAt),
                                'dd/MM/yyyy HH:mm',
                                { locale: vi },
                              )
                            : 'Không có thông tin'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {caseService.case_notes && (
                <div className='space-y-2 sm:space-y-3'>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 flex items-center'>
                    <FileText className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
                    Ghi chú
                  </h3>
                  <div className='bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200'>
                    <TextRenderer content={caseService.case_notes} />
                  </div>
                </div>
              )}

              {/* Employee Roles */}
              {(caseService.case_consultant ||
                caseService.case_fingerprintTaker ||
                caseService.case_mainCounselor) && (
                <div className='space-y-6'>
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 flex items-center'>
                    <Users className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
                    Nhân viên phụ trách
                  </h3>
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
                    {caseService.case_consultant && (
                      <BriefEmployeeCard
                        key={caseService.case_consultant.id}
                        employee={caseService.case_consultant}
                        highlighted
                        highlightText='Tư vấn viên'
                      />
                    )}
                    {caseService.case_fingerprintTaker && (
                      <BriefEmployeeCard
                        key={caseService.case_fingerprintTaker.id}
                        employee={caseService.case_fingerprintTaker}
                        highlighted
                        highlightText='Người lấy vân tay'
                      />
                    )}
                    {caseService.case_mainCounselor && (
                      <BriefEmployeeCard
                        key={caseService.case_mainCounselor.id}
                        employee={caseService.case_mainCounselor}
                        highlighted
                        highlightText='Tư vấn chính'
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200'>
                <Button
                  variant={'primary'}
                  asChild
                  className='justify-center sm:justify-start'
                >
                  <Link to='./edit'>
                    <Edit className='w-4 h-4' />
                    <span className='hidden sm:inline'>Chỉnh sửa hồ sơ</span>
                    <span className='sm:hidden'>Chỉnh sửa</span>
                  </Link>
                </Button>

                <Button
                  variant={'primary'}
                  asChild
                  className='justify-center sm:justify-start'
                >
                  <Link to={'/erp/transactions/new?caseId=' + caseService.id}>
                    <Plus className='w-4 h-4' />
                    <span className='inline'>Thêm giao dịch</span>
                  </Link>
                </Button>

                <Button
                  variant={'secondary'}
                  asChild
                  className='justify-center sm:justify-start'
                >
                  <Link to='/erp/cases'>
                    <ArrowLeft className='w-4 h-4' />
                    <span className='hidden sm:inline'>Quay lại danh sách</span>
                    <span className='sm:hidden'>Quay lại</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }}
    </Defer>
  );
}
