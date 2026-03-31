# Summary of the interaction

## Basic information

- Domain: Office and Organisational Workflow Management
- Problem statement: Task, Process and Compliance Management System
- Date of interaction: 18th January, 2026
- Mode of interaction: Video call (Google Meet)
- Duration: 47:12 minutes
- Publicly accessible Video link: [Google Drive Video](https://drive.google.com/file/d/1TfbbIJAhoGz-lmEKwBWetMSUcLyg-5Wb/view?usp=sharing)

---

## Domain Expert Details

- Role/ designation: Software Engineer
- Experience in the domain: Engineering, Innovation (3 years of experience)
- Nature of work: Developer

---

## Domain Context and Terminology

### Describing the overall purpose of this problem statement

- In day-to-day organizational work, the purpose of this problem statement is to ensure that tasks are executed in a structured, accountable, and policy-compliant manner.
- From a practical standpoint, it addresses common operational issues such as:
  - Tasks being assigned informally without clear ownership

  - Unclear approval responsibilities

  - Delays caused by lack of visibility into task status

  - Compliance checks happening too late or inconsistently

  - Difficulty explaining who did what, when, and why during audits or reviews

### Primary Goals and Outcomes of our problem statement

- **Structured Task Execution**  
  Ensure that every task follows a predefined process from assignment to completion.

- **Clear Accountability**  
  Clearly define responsibility at each stage—execution, supervision, approval, and oversight.

- **Hierarchical Review and Control**  
  Support multi-level reviews (Team Leader → Project Manager) instead of flat or ad-hoc approvals.

- **Built-in Compliance Enforcement**  
  Integrate policy and compliance checks directly into task workflows rather than treating them as afterthoughts.

- **Controlled Exception Handling**  
  Provide formal mechanisms for escalation, rejection, and overrides when normal workflows cannot be followed.

- **Auditability and Traceability**  
  Maintain a complete history of actions so decisions can be reconstructed during audits, reviews, or disputes.

- **Operational Transparency**  
  Allow stakeholders to track progress and status without manual follow-ups.

### Key Domain Terms and Definitions

| Term       | Meaning as explained by the expert                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task       | A unit of work assigned to an individual or team that must be executed and completed within a defined workflow.                                                      |
| Workflow   | A workflow is a sequence of tasks that should be done in a specific order. It is a predefined flow that defines task states, transitions, approvals, and conditions. |
| Compliance | Adherence to organizational policies, standards, or regulatory requirements during task execution.                                                                   |
| Policy     | A formally defined rule or guideline that governs how tasks, processes, and decisions must be carried out within the organization.                                   |
| Escalation | The process of forwarding an unresolved issue or decision to a higher authority for resolution.                                                                      |
| Audit Log  | An immutable chronological record of system actions used for accountability and traceability.                                                                        |

---

## Actors and Responsibilities

- Identify the different roles involved and what they do in practice.

| Actor / Role              | Responsibilities                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compliance Officer| Defines compliance rules, audits task and process execution, identifies policy violations, and ensures regulatory adherence through audit logs and reports. |
| HR                        | Manages employee records, assigns roles and team structures, and maintains organizational hierarchy required for task and process execution.                |
| Process Admin             | Designs and maintains organizational processes and workflows, ensures processes align with policies, and optimizes process efficiency across projects.      |
| Project Manager           | Oversees project execution, assigns tasks, reviews task outcomes, handles escalations, and ensures project goals are met within defined processes.          |
| Team Leader               | Breaks tasks into subtasks, assigns work to team members, reviews subtask submissions, and escalates unresolved issues to the Project Manager.              |
| Team Member   | Executes assigned tasks, submits work and evidence, reports blockers or delays, and complies with defined processes and policies.                           |

---

## Core Workflows

### Workflow 1: Task Assignment and Completion

- _Trigger / Start Condition:_ Project work is initiated or a task requirement is identified
- _Steps Involved:_
  1. Project Manager assigns a task to a Team Leader
  2. Team Leader breaks the task into subtasks and assigns them to Team Members
  3. Team Member executes the assigned task and submits work with evidence
  4. Team Leader reviews the task outcome and provides approval or feedback
  5. Project Manager performs final review if required
- _Outcome / End Condition:_ Task is marked as completed, or returned for correction or escalation

### Workflow 2: Process Execution

- _Trigger / Start Condition:_ Initiation of a predefined organizational process
- _Steps Involved:_
  1. Process Admin defines or activates the process workflow
  2. Project Manager maps project tasks to the defined process steps
  3. Tasks are assigned to Team Leaders and Team Members according to the process
  4. Each process step is executed sequentially and tracked by the system
  5. Delays or deviations are escalated to the Project Manager or Process Admin
- _Outcome / End Condition:_ Process is successfully completed, paused, or escalated for corrective action

### Workflow 3: Compliance Tracking and Audit

- _Trigger / Start Condition:_ Compliance deadline, audit requirement, or policy enforcement event
- _Steps Involved:_
  1. Compliance Officer identifies applicable compliance rules and required actions
  2. Compliance-related tasks are assigned to responsible Project Managers or Team Leaders
  3. Team Members submit required evidence and records
  4. Compliance Officer reviews evidence and validates compliance status
  5. Non-compliance issues are flagged and corrective actions are initiated
- _Outcome / End Condition:_ Compliance requirement is fulfilled, or violation is reported and tracked.

---

## Rules, Constraints, and Exceptions

- Mandatory Rules or Policies:
  - Team members must complete assigned tasks within agreed timelines
  - Certain tasks require approval from the team leader or manager before proceeding
  - Standard processes defined by the process admin must be followed
  - Compliance-related records must be maintained as required by the compliance officer
  - HR policies must be followed during task execution and process handling

- Constraints or Limitations:
  - Visibility of work is limited across teams and departments
  - Task and process tracking is often done using emails or spreadsheets
  - Managers and team leaders depend on team members to update task status
  - Process updates are not always communicated immediately to all teams

- Common Exceptions or Edge Cases:
  - Employee unavailability due to leave or workload
  - Priority changes communicated by managers
  - Process steps skipped due to urgent delivery requirements
  - Missing or delayed compliance documentation

- Situations Where Things Usually Go Wrong:
  - Team members forget to update task status after completion
  - Team leaders are not informed early about delays
  - Processes are bypassed under time pressure
  - Compliance requirements are noticed close to audit deadlines

---

## Current Challenges and Pain Points

- **Most difficult or inefficient parts of the process**
  - Coordinating task execution across Team Members, Team Leaders, and Project Managers without a unified system
  - Ensuring that process definitions created by the Process Manager are consistently followed during project execution
  - Managing compliance requirements alongside ongoing project work

- **Where delays, errors, or misunderstandings usually occur**
  - Delays occur when task ownership or approval responsibility is unclear between Team Leaders and Project Managers
  - Errors arise due to informal communication (emails, messages) instead of system-enforced workflows
  - Misunderstandings occur when process changes are not clearly communicated or enforced across teams

- **Information that is hardest to track or manage**
  - Real-time task status and ownership
  - Escalations and exception handling history
  - Evidence and records required for compliance audits
  - Alignment between defined processes and actual execution

---

## Assumptions & Clarifications

### Assumptions Confirmed

- Team Members rely heavily on manual updates and informal communication for task progress reporting
- Team Leaders and Project Managers spend significant time following up on task status
- Compliance activities intensify during audits rather than being continuously tracked
- Process Managers define workflows, but enforcement during execution is limited

### Assumptions Corrected

- Not all organizational processes are clearly documented or consistently maintained by the Process Manager
- HR policies related to roles and responsibilities are not always fully understood by Team Members
- Compliance enforcement is not proactive and often depends on manual checks by the Compliance Officer
- Escalations are frequently handled informally rather than through structured mechanisms

### Open Questions (Addressed)

- **What exactly happens in case of task escalation?**

  Task escalation can be from two sources:
  - Some event happens. Example: employee joins, employee asks for a leave. If an employee asks for a leave, the HR has to do proper checking when they are asking for a leave and then they have to give the approval or dismissal. So there is some event some event happens that event will automatically create a task or some human has to create a task. That's our task escalation.
  - If somebody fails to do something then it should be automatically detected. Let's say there is a deadline and an team member fails to complete the task within a deadline. Then automatically the manager will get a task to check why this task was not completed. Through different event triggers new tasks can be created and let's say if a task is failed to be done within a deadline that has to be escalated to the manager.

- **How are compliance violations detected and communicated within the system?**  
  When some violation happens - let's say the HR did not send the NDA (Non-Disclosure Agreement), or let's say the employee did not comply to the security training- then that's a violation. Whenever there is a violation, there has to be an alert that has to be sent.

- **How long are compliance and HR records retained?**  
  Record retention periods vary based on organizational policy and audit requirements. In the current setup, these records are often retained inconsistently due to decentralized storage and manual handling. This makes it difficult to retrieve historical information during audits or reviews and highlights the need for centralized, policy-driven record management.

---



