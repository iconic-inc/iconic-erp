export const CASE_SERVICE = {
  DOCUMENT_NAME: 'CaseService',
  COLLECTION_NAME: 'case_services',
  PREFIX: 'case_',
  STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CLOSED: 'closed',
  },
  CLOSE_AT: {
    EVENT: {
      label: 'Tại sự kiện',
      value: 'event',
    },
    HOME: {
      label: 'Tại nhà',
      value: 'home',
    },
    OFFICE: {
      label: 'Tại văn phòng',
      value: 'office',
    },
    OTHER: {
      label: 'Khác',
      value: 'other',
    },
  },
} as const;
