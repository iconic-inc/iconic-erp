import { Router } from 'express';
import { CustomerController } from '@controllers/customer.controller';
import { authenticationV2 } from '@middlewares/authentication';
import { hasPermission } from '@middlewares/authorization';
import { validateObjectId, validateSchema } from '@schemas/index';
import {
  customerBulkDeleteSchema,
  customerCreateSchema,
} from '@schemas/customer.schema';
import { excelImportStorage } from '@configs/config.multer';

const router = Router();

// Require authentication for all routes
router.use(authenticationV2);

router.use('/me/case-services', require('../caseService/customer'));

router.get(
  '/me',
  hasPermission('customer', 'readOwn'),
  CustomerController.getCurrentCustomer
);

// Route để xuất danh sách nhân viên sang XLSX
router.get(
  '/export/xlsx',
  hasPermission('employee', 'readAny'),
  CustomerController.exportCustomersToXLSX
);

// Route để import dữ liệu khách hàng từ XLSX
router.post(
  '/import/xlsx',
  hasPermission('customer', 'createAny'),
  excelImportStorage.single('file'),
  CustomerController.importCustomersFromXLSX
);

// Get customer by ID
router.get(
  '/:id',
  validateObjectId('id'),
  hasPermission('customer', 'readAny'),
  CustomerController.getCustomerById
);

// Get all customers
router.get(
  '/',
  hasPermission('customer', 'readAny'),
  CustomerController.getCustomers
);

// Create customer account
router.post(
  '/:id/account',
  validateObjectId('id'),
  hasPermission('customer', 'createAny'),
  CustomerController.createCustomerAccount
);

// Create new customer
router.post(
  '/',
  validateSchema(customerCreateSchema),
  hasPermission('customer', 'createAny'),
  CustomerController.createCustomer
);

// Delete multiple customers
router.delete(
  '/delete-multiple',
  validateSchema(customerBulkDeleteSchema),
  hasPermission('customer', 'deleteAny'),
  CustomerController.deleteMultipleCustomers
);

// Update customer
router.put(
  '/:id',
  validateObjectId('id'),
  hasPermission('customer', 'updateAny'),
  CustomerController.updateCustomer
);
// Delete customer
router.delete(
  '/:id',
  validateObjectId('id'),
  hasPermission('customer', 'deleteAny'),
  CustomerController.deleteCustomer
);

module.exports = router;
