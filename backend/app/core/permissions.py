"""Single source of truth for role-based permissions.

`require_permission` enforces ROLE_PERMISSIONS, the roles API seeds its system
roles from it, and the Roles page renders PERMISSION_GROUPS as its matrix.
"""

PERMISSION_GROUPS: list[dict] = [
    {"category": "Users", "permissions": [
        {"id": "users:read", "label": "View users"},
        {"id": "users:write", "label": "Create and edit users"},
        {"id": "users:delete", "label": "Delete users"},
    ]},
    {"category": "Roles", "permissions": [
        {"id": "roles:read", "label": "View roles"},
        {"id": "roles:write", "label": "Create and edit roles"},
        {"id": "roles:delete", "label": "Delete roles"},
    ]},
    {"category": "Organizations", "permissions": [
        {"id": "organizations:read", "label": "View organization"},
        {"id": "organizations:manage", "label": "Manage organization and invites"},
        {"id": "organizations:create", "label": "Create organizations"},
    ]},
    {"category": "Cameras", "permissions": [
        {"id": "cameras:read", "label": "View cameras"},
        {"id": "cameras:write", "label": "Add and edit cameras"},
        {"id": "cameras:delete", "label": "Delete cameras"},
    ]},
    {"category": "Classrooms", "permissions": [
        {"id": "classrooms:read", "label": "View classrooms"},
        {"id": "classrooms:write", "label": "Create and edit classrooms"},
        {"id": "classrooms:delete", "label": "Delete classrooms"},
    ]},
    {"category": "Alerts & Events", "permissions": [
        {"id": "alerts:read", "label": "View alerts"},
        {"id": "alerts:write", "label": "Create alerts and ingest events"},
        {"id": "alerts:manage", "label": "Acknowledge, assign and resolve alerts"},
        {"id": "events:read", "label": "View detection events"},
    ]},
    {"category": "Incidents", "permissions": [
        {"id": "incidents:read", "label": "View incidents"},
        {"id": "incidents:write", "label": "Create and update incidents"},
    ]},
    {"category": "Recordings", "permissions": [
        {"id": "recordings:read", "label": "View recordings and evidence"},
        {"id": "recordings:delete", "label": "Delete recordings"},
    ]},
    {"category": "Reports & Search", "permissions": [
        {"id": "reports:read", "label": "View and export reports"},
        {"id": "reports:write", "label": "Generate reports"},
        {"id": "search:read", "label": "Use global search"},
    ]},
    {"category": "System", "permissions": [
        {"id": "settings:read", "label": "View settings"},
        {"id": "settings:write", "label": "Change settings"},
        {"id": "audit_logs:read", "label": "View audit logs"},
        {"id": "audit_logs:write", "label": "Write audit logs"},
        {"id": "webhooks:view", "label": "View integrations"},
        {"id": "webhooks:manage", "label": "Manage integrations"},
    ]},
]

ALL_PERMISSIONS: list[str] = [p["id"] for g in PERMISSION_GROUPS for p in g["permissions"]]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": list(ALL_PERMISSIONS),
    "admin": [
        "users:read", "users:write",
        "organizations:read", "organizations:manage",
        "cameras:read", "cameras:write",
        "classrooms:read", "classrooms:write",
        "alerts:read", "alerts:write", "alerts:manage",
        "incidents:read", "incidents:write",
        "recordings:read", "recordings:delete",
        "events:read",
        "reports:read", "reports:write",
        "search:read",
        "settings:read",
        "audit_logs:read",
        "webhooks:view", "webhooks:manage",
    ],
    "faculty": [
        "cameras:read",
        "classrooms:read",
        "alerts:read", "alerts:manage",
        "incidents:read",
        "recordings:read",
        "events:read",
        "reports:read",
        "search:read",
        "webhooks:view",
    ],
    "security": [
        "cameras:read",
        "classrooms:read",
        "alerts:read", "alerts:write", "alerts:manage",
        "incidents:read", "incidents:write",
        "recordings:read",
        "events:read",
        "reports:read",
        "search:read",
        "webhooks:view",
    ],
    "viewer": [
        "cameras:read",
        "classrooms:read",
        "alerts:read",
        "incidents:read",
        "events:read",
        "reports:read",
        "search:read",
        "webhooks:view",
    ],
}

ROLE_DESCRIPTIONS: dict[str, str] = {
    "super_admin": "Full system access with all permissions",
    "admin": "Administrative access to manage users, cameras, and alerts",
    "faculty": "Faculty access to view cameras, alerts, and reports for their classrooms",
    "security": "Security personnel access to cameras, alerts, and incident management",
    "viewer": "Read-only access to view dashboards and reports",
}
