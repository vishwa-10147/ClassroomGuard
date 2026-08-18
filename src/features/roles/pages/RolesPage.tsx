import React from 'react';
import { Shield, Check, X } from 'lucide-react';

const roles = ['Super Admin', 'Admin', 'Security', 'Faculty', 'Viewer'];
const permissions = [
  { category: 'System', perms: ['Manage Settings', 'View Audit Logs'] },
  { category: 'Camera', perms: ['Add/Edit Cameras', 'View Live Feed', 'PTZ Control'] },
  { category: 'Incidents', perms: ['Create Incident', 'Resolve Incident', 'Delete Incident'] },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-primary-600" /> Roles & Permissions
        </h1>
        <p className="text-sm text-gray-500 mt-1">Review access control matrix across system roles.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Permission</th>
              {roles.map(role => (
                <th key={role} scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">{role}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {permissions.map((group) => (
              <React.Fragment key={group.category}>
                <tr className="bg-gray-50">
                  <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-100">{group.category}</td>
                </tr>
                {group.perms.map(perm => (
                  <tr key={perm} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{perm}</td>
                    {roles.map(role => {
                      // Mock logic for checkmarks
                      const isGranted = role === 'Super Admin' || (role === 'Admin' && perm !== 'Manage Settings') || (role === 'Viewer' && perm === 'View Live Feed');
                      return (
                        <td key={`${perm}-${role}`} className="px-6 py-3 text-center">
                          {isGranted ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
