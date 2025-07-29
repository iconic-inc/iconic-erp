import { ProgressWithPercentage } from '~/components/ui/ProgressWithPercentage';
import { ICaseService } from '~/interfaces/case.interface';
import { calculateProgress } from '~/utils';

export default function CaseServiceStatusDetail({
  caseService,
  onClose,
}: {
  caseService: ICaseService;
  onClose: () => void;
}) {
  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 md:p-0'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-lg shadow-lg w-full max-w-md mx-auto overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex justify-between items-center p-4 border-b border-gray-100'>
          <h3 className='text-lg font-bold text-gray-800'>Chi tiết tiến độ</h3>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100'
          >
            <span className='material-symbols-outlined'>close</span>
          </button>
        </div>

        {/* Body */}
        <div className='p-4 max-h-[70vh] overflow-y-auto'>
          {/* Thông tin khách hàng và progress bar */}
          <div className='mb-4 p-3 bg-gray-50 rounded-md'>
            <div className='text-sm mb-2'>
              <span className='font-medium text-gray-700'>Khách hàng:</span>
              <span className='ml-1 text-gray-900 font-medium'>
                {typeof caseService.case_customer === 'object'
                  ? `${caseService.case_customer.cus_firstName} ${caseService.case_customer.cus_lastName}`
                  : 'Khách hàng'}
              </span>
            </div>

            <ProgressWithPercentage
              value={calculateProgress(caseService.case_processStatus)}
              showPercentage
              label='Tiến độ xử lý'
              showLabel
            />
          </div>

          {/* Danh sách trạng thái */}
          <div className='mb-4'>
            <h4 className='font-medium text-gray-800 mb-2'>
              Trạng thái các bước
            </h4>
            <div className='grid grid-cols-1 gap-y-2'>
              {[
                {
                  label: 'Đã lấy dấu vân tay',
                  status: caseService.case_processStatus.isScanned,
                  description: 'Dữ liệu vân tay đã được thu thập',
                },
                {
                  label: 'Đã hoàn thành thông tin',
                  status: caseService.case_processStatus.isFullInfo,
                  description: 'Thông tin đã đầy đủ',
                },
                {
                  label: 'Đã gửi phân tích',
                  status: caseService.case_processStatus.isAnalysisSent,
                  description: 'Đã gửi phân tích cho khách',
                },
                {
                  label: 'Đã xuất PDF',
                  status: caseService.case_processStatus.isPdfExported,
                  description: 'Báo cáo PDF đã xuất',
                },
                {
                  label: 'Đã thanh toán đủ',
                  status: caseService.case_processStatus.isFullyPaid,
                  description: 'Thanh toán đầy đủ',
                },
                {
                  label: 'Đã gửi file mềm',
                  status: caseService.case_processStatus.isSoftFileSent,
                  description: 'File mềm đã gửi',
                },
                {
                  label: 'Đã in và gửi',
                  status: caseService.case_processStatus.isPrinted,
                  description: 'Đã in và gửi báo cáo',
                },
                {
                  label: 'Đã gửi bản cứng',
                  status: caseService.case_processStatus.isPhysicalCopySent,
                  description: 'Bản cứng đã gửi',
                },
                {
                  label: 'Đã tư vấn chuyên sâu',
                  status: caseService.case_processStatus.isDeepConsulted,
                  description: 'Đã tư vấn chuyên sâu',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className='flex items-center p-2 rounded-md hover:bg-gray-50'
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${item.status ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {item.status ? (
                      <span className='material-symbols-outlined text-xs'>
                        check
                      </span>
                    ) : (
                      <span className='material-symbols-outlined text-xs'>
                        remove
                      </span>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div
                      className={`font-medium text-sm truncate ${item.status ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                      {item.label}
                    </div>
                    <div className='text-xs text-gray-500 truncate'>
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end p-3 border-t border-gray-100 bg-gray-50'>
          <button
            onClick={onClose}
            className='px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition shadow-sm'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
