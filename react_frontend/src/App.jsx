import { useState } from "react";
import { ComplianceDashboard } from "./features/compliance";

// Import legacy styles globally
import './assets/css/base.css';
import './assets/css/layout.css';
import './assets/css/components.css';
import './assets/css/compliance.css';

export default function App() {
  const [currentTab, setCurrentTab] = useState("compliance");

  if (currentTab === "compliance") {
    // This renders the EXACT legacy HTML structure: .admin-layout > .sidebar + .main-content
    return <ComplianceDashboard />;
  }

  // Fallback for other tabs
  return (
    <div style={{ padding: "24px" }}>
      <button onClick={() => setCurrentTab("compliance")}>Back to Compliance</button>
      <p>Placeholder</p>
    </div>
  );
}
