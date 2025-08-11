import { CaseServiceController } from '@controllers/caseService.controller';
import { Router } from 'express';
import { hasPermission } from '../../middlewares/authorization';

const router = Router();

router.get(
  '/',
  hasPermission('caseService', 'readOwn'),
  CaseServiceController.getCaseServicesByCustomer
);

router.get(
  '/:id',
  hasPermission('caseService', 'readOwn'),
  CaseServiceController.getCaseServiceById
);

module.exports = router;
