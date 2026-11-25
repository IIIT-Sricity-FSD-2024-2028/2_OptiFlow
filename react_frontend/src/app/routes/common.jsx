import React from "react";
import { PATHS } from "../paths";
const Landing = React.lazy(() => import("../../features/common/pages/Landing"));
const Contact = React.lazy(() => import("../../features/common/pages/Contact"));
const Login = React.lazy(() => import("../../features/common/pages/Login"));
const ForgotPassword = React.lazy(() => import("../../features/common/pages/ForgotPassword"));
const SetPassword = React.lazy(() => import("../../features/common/pages/SetPassword"));
const Register = React.lazy(
  () => import("../../features/common/pages/Register"),
);
const Notifications = React.lazy(
  () => import("../../features/common/pages/Notifications"),
);
const Profile = React.lazy(() => import("../../features/common/pages/Profile"));
const ChangePassword = React.lazy(() => import("../../features/common/pages/ChangePassword"));
const Unauthorized = React.lazy(
  () => import("../../features/common/pages/Unauthorized"),
);
const ComponentShowcase = React.lazy(() => import("../../features/common/pages/ComponentShowcase"));
const NotFound = React.lazy(
  () => import("../../features/common/pages/NotFound"),
);

export const commonRoutes = [
  { path: PATHS.PUBLIC.LANDING, element: <Landing /> },
  { path: PATHS.PUBLIC.CONTACT, element: <Contact /> },
  { path: PATHS.PUBLIC.LOGIN, element: <Login /> },
  { path: PATHS.PUBLIC.FORGOT_PASSWORD, element: <ForgotPassword /> },
  { path: PATHS.PUBLIC.SET_PASSWORD, element: <SetPassword /> },
  { path: PATHS.PUBLIC.REGISTER, element: <Register /> },
  { path: PATHS.COMMON.NOTIFICATIONS, element: <Notifications /> },
  { path: PATHS.COMMON.PROFILE, element: <Profile /> },
  { path: PATHS.COMMON.UNAUTHORIZED, element: <Unauthorized /> },
  { path: "/components", element: <ComponentShowcase /> },
  { path: PATHS.COMMON.NOT_FOUND, element: <NotFound /> },
];

// Signed-in but outside the dashboard layout: the layout's own requests (notifications, etc.)
// would all be refused while the first-login password change is pending.
export const passwordRoutes = [
  { path: PATHS.COMMON.CHANGE_PASSWORD, element: <ChangePassword /> },
];
