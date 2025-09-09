import { RoleModel } from '@models/role.model';
import { ResourceModel } from '@models/resource.model';
import { removeNestedNullish } from '@utils/index';
import { ClientSession } from 'mongoose';

export default async function main(session: ClientSession) {
  const formatedRoles = Object.values(ROLES).map(
    async ({ name, slug, description, grants, status }) => {
      const formatedGrants = await Promise.all(
        grants.map(async (grant) => {
          const resrc = await ResourceModel.findOne({
            slug: grant.resourceId.slug,
          }).session(session);
          if (!resrc) return null;

          return { resourceId: resrc.id, actions: grant.actions };
        })
      );

      return {
        name,
        slug,
        description,
        status: status as 'active',
        grants: removeNestedNullish(formatedGrants),
      };
    }
  );

  return await RoleModel.create(await Promise.all(formatedRoles), {
    session,
    ordered: true,
  });
}

// Base permissions shared by all employees
const BASE_EMPLOYEE_GRANTS = [
  { resourceId: { slug: 'officeIP' }, actions: ['read:any'] },
  {
    resourceId: { slug: 'keyToken' },
    actions: ['create:own', 'read:own', 'update:own', 'delete:own'],
  },
  { resourceId: { slug: 'user' }, actions: ['read:own', 'update:own'] },
  { resourceId: { slug: 'employee' }, actions: ['read:any', 'update:own'] },
  {
    resourceId: { slug: 'attendance' },
    actions: ['create:own', 'read:own', 'update:own'],
  },
  {
    resourceId: { slug: 'image' },
    actions: ['create:any', 'read:any', 'update:any', 'delete:any'],
  },
  { resourceId: { slug: 'reward' }, actions: ['read:any'] },
];

const ROLES = [
  {
    name: 'Quản trị hệ thống',
    slug: 'admin',
    status: 'active',
    description: 'Quản trị hệ thống',
    grants: [
      'resource',
      'template',
      'role',
      'otp',
      'apiKey',
      'keyToken',
      'image',
      'user',
      'officeIP',
      'employee',
      'attendance',
      'caseService',
      'customer',
      'task',
      'transaction',
      'document',
      'reward',
    ].map((resource) => ({
      resourceId: { slug: resource },
      actions: ['create:any', 'read:any', 'update:any', 'delete:any'],
    })),
  },
  {
    name: 'Nhân viên',
    slug: 'employee',
    status: 'active',
    description: 'Nhân viên',
    grants: [
      ...BASE_EMPLOYEE_GRANTS,
      // Support role - limited case access
      {
        resourceId: { slug: 'caseService' },
        actions: ['read:any', 'update:any'],
      },
      // Customer support
      {
        resourceId: { slug: 'customer' },
        actions: ['read:any', 'update:any'],
      },
      // Own tasks only
      {
        resourceId: { slug: 'task' },
        actions: ['create:own', 'read:own', 'update:own', 'delete:own'],
      },
      // Document access for support
      {
        resourceId: { slug: 'document' },
        actions: ['create:any', 'read:any', 'update:any'],
      },
    ],
  },
  {
    name: 'Kế toán',
    slug: 'accountant',
    status: 'active',
    description: 'Kế toán',
    grants: [
      ...BASE_EMPLOYEE_GRANTS,
      // Read-only case access for billing
      {
        resourceId: { slug: 'caseService' },
        actions: ['read:any'],
      },
      // Customer billing info
      {
        resourceId: { slug: 'customer' },
        actions: ['read:any', 'update:any'],
      },
      // Own tasks
      {
        resourceId: { slug: 'task' },
        actions: ['create:own', 'read:own', 'update:own', 'delete:own'],
      },
      // Full transaction access
      {
        resourceId: { slug: 'transaction' },
        actions: ['create:any', 'read:any', 'update:any', 'delete:any'],
      },
      // Financial documents
      {
        resourceId: { slug: 'document' },
        actions: ['create:any', 'read:any', 'update:any'],
      },
    ],
  },
  {
    name: 'Khách hàng',
    slug: 'customer',
    status: 'active',
    description: 'Khách hàng',
    grants: [
      {
        resourceId: { slug: 'customer' }, //68870ef9ed44c8a92ee0fadd
        actions: ['read:own', 'update:own'],
      },
      {
        resourceId: { slug: 'caseService' }, //68870ef9ed44c8a92ee0fadb
        actions: ['read:own'],
      },
    ],
  },
];
