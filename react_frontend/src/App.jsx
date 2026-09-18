import { useState } from "react";
import Navbar from "./components/layout/Navbar";
import Login from "./features/auth/Login";
import EmployeeList from "./features/hr/EmployeeList";
import TaskBoard from "./features/tasks/TaskBoard";
import WorkflowDesigner from "./features/process/WorkflowDesigner";
import AuditLogs from "./features/compliance/AuditLogs";

export default function App() {
  const [currentTab, setCurrentTab] = useState("tasks");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {currentTab === "auth" && <Login />}
        {currentTab === "hr" && <EmployeeList />}
        {currentTab === "tasks" && <TaskBoard />}
        {currentTab === "process" && <WorkflowDesigner />}
        {currentTab === "compliance" && <AuditLogs />}
      </main>
    </div>
  );
}
