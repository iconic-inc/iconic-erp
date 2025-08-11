export const ATTENDANCE = {
  DOCUMENT_NAME: 'Attendance',
  COLLECTION_NAME: 'attendances',
  PREFIX: 'att_',

  // Có thể thêm các constant khác như:
  VALID_CHECK_IN_RADIUS: 100, // meters
  VALID_CHECK_IN_TIME: {
    START: '07:00',
    END: '09:00',
  },

  REQUEST: {
    DOCUMENT_NAME: 'AttendanceRequest',
    COLLECTION_NAME: 'attendance_requests',
    PREFIX: 'arq_',
  },
};
