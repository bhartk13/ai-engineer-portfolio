"""
auth.py
-------
Minimal role-based access control. In production this would sit behind
OAuth2/OIDC (e.g. Auth0, Okta, Cognito) with the roles/permissions below
pulled from JWT claims — the enforcement shape (permission check before every
tool call) stays the same.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum


class Permission(str, Enum):
    READ_CASE = "read_case"
    SEARCH = "search"
    FLAG_CASE = "flag_case"
    ESCALATE_TO_HUMAN = "escalate_to_human"
    FREEZE_ACCOUNT = "freeze_account"  # destructive / high-risk action
    VIEW_AUDIT_LOG = "view_audit_log"


ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "analyst": {Permission.READ_CASE, Permission.SEARCH, Permission.FLAG_CASE, Permission.ESCALATE_TO_HUMAN},
    "senior_investigator": {
        Permission.READ_CASE, Permission.SEARCH, Permission.FLAG_CASE,
        Permission.ESCALATE_TO_HUMAN, Permission.FREEZE_ACCOUNT, Permission.VIEW_AUDIT_LOG,
    },
    "viewer": {Permission.READ_CASE, Permission.VIEW_AUDIT_LOG},
}


@dataclass
class User:
    user_id: str
    role: str
    permissions: set[Permission] = field(init=False)

    def __post_init__(self):
        self.permissions = ROLE_PERMISSIONS.get(self.role, set())

    def can(self, permission: Permission) -> bool:
        return permission in self.permissions


class PermissionDenied(Exception):
    pass


def require(user: User, permission: Permission) -> None:
    if not user.can(permission):
        raise PermissionDenied(
            f"user '{user.user_id}' with role '{user.role}' lacks permission '{permission.value}'"
        )
