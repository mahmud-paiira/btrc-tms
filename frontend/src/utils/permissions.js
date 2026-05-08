export const PERMISSION_CATEGORIES = [
  'centers', 'courses', 'trainers', 'assessors', 'trainees', 'financial', 'reports', 'users',
];

export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.is_superuser) return true;
  if (user.user_type === 'head_office') return true;
  if (!user.permissions) return false;
  return user.permissions.includes(permissionKey);
}

export function canViewModule(user, moduleKey) {
  if (!user) return false;
  if (user.is_superuser) return true;
  if (user.user_type === 'head_office') return true;
  return hasPermission(user, `${moduleKey}.view`);
}

export function canAction(user, actionKey) {
  if (!user) return false;
  if (user.is_superuser) return true;
  if (user.user_type === 'head_office') return true;
  return hasPermission(user, actionKey);
}

export const MODULE_PERMISSIONS = {
  centers: ['centers.view', 'centers.create', 'centers.edit', 'centers.delete'],
  courses: ['courses.view', 'courses.create', 'courses.edit', 'courses.delete'],
  trainers: ['trainers.view', 'trainers.approve', 'trainers.suspend', 'trainers.map'],
  assessors: ['assessors.view', 'assessors.approve', 'assessors.convert'],
  trainees: ['trainees.view', 'trainees.edit', 'trainees.enroll'],
  financial: ['financial.view_budget', 'financial.edit_budget', 'financial.create_voucher', 'financial.verify_voucher', 'financial.approve_voucher'],
  reports: ['reports.view', 'reports.export', 'reports.schedule'],
  users: ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles'],
};
