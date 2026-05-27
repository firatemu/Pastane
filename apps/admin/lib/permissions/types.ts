export interface AdminPermissionDefinition {
  id: string;
  code: string;
  description: string | null;
}

export interface AdminPermissionRoleAssignment {
  id: string;
  name: string;
  description: string | null;
  editable: boolean;
  permissionIds: string[];
}

export interface AdminPermissionsManagementPayload {
  permissions: AdminPermissionDefinition[];
  roles: AdminPermissionRoleAssignment[];
}
