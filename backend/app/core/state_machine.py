from typing import Dict, List, Tuple
from app.models.enums import ApplicationStatus, UserRole

# Allowed status transitions mapped by current status
VALID_TRANSITIONS: Dict[ApplicationStatus, List[ApplicationStatus]] = {
    ApplicationStatus.DRAFT: [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.SUBMITTED: [
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.INSPECTION_REQUIRED,
        ApplicationStatus.INSPECTION_SCHEDULED,
        ApplicationStatus.DOCUMENT_QUERY,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.UNDER_REVIEW: [
        ApplicationStatus.DOCUMENT_QUERY,
        ApplicationStatus.INSPECTION_REQUIRED,
        ApplicationStatus.INSPECTION_SCHEDULED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.DOCUMENT_QUERY: [
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.INSPECTION_REQUIRED,
        ApplicationStatus.INSPECTION_SCHEDULED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.INSPECTION_REQUIRED: [
        ApplicationStatus.INSPECTION_SCHEDULED,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.INSPECTION_SCHEDULED: [
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.INSPECTION_REQUIRED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN
    ],
    ApplicationStatus.APPROVED: [],
    ApplicationStatus.REJECTED: [],
    ApplicationStatus.WITHDRAWN: []
}

# Role based permission to trigger a transition
ROLE_TRANSITION_PERMISSIONS = {
    UserRole.APPLICANT: [
        (ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED),
        (ApplicationStatus.DRAFT, ApplicationStatus.WITHDRAWN),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN),
        (ApplicationStatus.DOCUMENT_QUERY, ApplicationStatus.UNDER_REVIEW),
    ],
    UserRole.OFFICER: [
        (ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.INSPECTION_REQUIRED),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.INSPECTION_SCHEDULED),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.DOCUMENT_QUERY),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.APPROVED),
        (ApplicationStatus.SUBMITTED, ApplicationStatus.REJECTED),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DOCUMENT_QUERY),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INSPECTION_REQUIRED),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INSPECTION_SCHEDULED),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED),
        (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED),
        (ApplicationStatus.DOCUMENT_QUERY, ApplicationStatus.UNDER_REVIEW),
        (ApplicationStatus.DOCUMENT_QUERY, ApplicationStatus.APPROVED),
        (ApplicationStatus.DOCUMENT_QUERY, ApplicationStatus.REJECTED),
        (ApplicationStatus.INSPECTION_REQUIRED, ApplicationStatus.INSPECTION_SCHEDULED),
        (ApplicationStatus.INSPECTION_REQUIRED, ApplicationStatus.APPROVED),
        (ApplicationStatus.INSPECTION_REQUIRED, ApplicationStatus.REJECTED),
        (ApplicationStatus.INSPECTION_SCHEDULED, ApplicationStatus.UNDER_REVIEW),
        (ApplicationStatus.INSPECTION_SCHEDULED, ApplicationStatus.APPROVED),
        (ApplicationStatus.INSPECTION_SCHEDULED, ApplicationStatus.REJECTED),
    ],
    UserRole.ADMIN: []
}

def is_transition_valid(current_status: ApplicationStatus, next_status: ApplicationStatus, user_role: UserRole) -> Tuple[bool, str]:
    if current_status not in VALID_TRANSITIONS:
        return False, f"Unknown status: {current_status}"
    
    if next_status not in VALID_TRANSITIONS[current_status]:
        return False, f"Invalid transition from {current_status.value} to {next_status.value}"
    
    if user_role == UserRole.ADMIN:
        return True, "Valid transition"
    
    allowed_for_role = ROLE_TRANSITION_PERMISSIONS.get(user_role, [])
    if (current_status, next_status) not in allowed_for_role:
        return False, f"Role {user_role.value} is not permitted to transition from {current_status.value} to {next_status.value}"
    
    return True, "Valid transition"
