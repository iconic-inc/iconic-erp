import { CaseServiceController } from '@controllers/caseService.controller';
import { hasPermission } from '@middlewares/authorization';
import { Router } from 'express';

const router = Router();

router.get(
  '/',
  hasPermission('caseService', 'readOwn'),
  CaseServiceController.getCaseServicesByEmployee
);

module.exports = router;
