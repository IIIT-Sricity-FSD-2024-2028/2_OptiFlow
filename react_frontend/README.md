# OptiFlow Frontend

This is the Vite React frontend for OptiFlow.

## Folder Map
- `src/app/`: Routing logic, guards, path constants, and feature route arrays.
- `src/config/nav/`: Navigation configuration (sidebars).
- `src/context/`: Global React contexts (AuthContext).
- `src/services/api/`: API client wrappers matching backend endpoints.
- `src/layouts/`: Dashboard and Platform layouts.
- `src/shared/`: Shared components, hooks, and utilities.
- `src/features/`: Isolated feature modules.
  - `platform/`: M5 (Platform Admin)
  - `executive/`: M1 (Executive/CEO)
  - `compliance/`: M1 (Compliance)
  - `hr/`: M2 (HR/Access Governance)
  - `process-admin/`: M3 (Process Admin)
  - `work/pm/`: M4 (Project Manager)
  - `work/team-lead/`: M4 (Team Leader)
  - `work/member/`: M4 (Team Member)
  - `common/`: M3 (Shared/Public)

## Rules
- Each member edits **only** their own features/ folders and their own `app/routes/` file.
- Changes to `shared/`, `layouts/`, `services/api/client.js`, or `paths.js` go through the **M3 owner by PR**.
- `paths.js` exports every URL as a constant. No hardcoded path strings elsewhere.
- The `services/api/client.js` module automatically unwraps {success, data} and handles 401 unauth redirect mapping.

## Owner Table
| Owner | Features | Roles |
|---|---|---|
| M1 | Executive, Compliance | Company Owner, Compliance Officer |
| M2 | HR / Access Governance | HR Manager |
| M3 | Process Admin, Common | Process Admin, Public / Shared |
| M4 | PM, Team Lead, Member | Project Manager, Team Leader, Team Member |
| M5 | Platform | Platform Admin (System Admin) |
