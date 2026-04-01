CREATE DATABASE IF NOT EXISTS office;
USE office;
-- 1. PERMISSIONS: The foundational building blocks of what can be done.
CREATE TABLE Permissions (
    permission_id SERIAL PRIMARY KEY,
    -- 'slug' is crucial for code constants (e.g., 'workflow:approve', 'compliance:resolve')
    slug VARCHAR(100) UNIQUE NOT NULL, 
    -- UI-friendly module grouping (e.g., 'Workflows', 'Tasks', 'Audit')
    module VARCHAR(50) NOT NULL, 
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROLES: Templates used to quickly assign standard permission sets.
CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'Department_Head', 'Compliance_Officer'
    description TEXT,
    -- 'is_system' prevents accidental deletion of core admin roles
    is_system BOOLEAN DEFAULT FALSE, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ROLE_PERMISSIONS: Maps the atomic permissions to the role templates.
CREATE TABLE Role_Permissions (
    role_id INT REFERENCES Roles(role_id) ON DELETE CASCADE,
    permission_id INT REFERENCES Permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


CREATE TABLE Departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    manager_id INT, -- Will reference Users(user_id) once created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    department_id INT REFERENCES Departments(department_id),
    manager_id INT REFERENCES Users(user_id), -- Handles reporting hierarchy (e.g., Leave Approvals)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL -- Soft delete for offboarding employees
);

-- Add the foreign key for Department Manager now that Users table exists
ALTER TABLE Departments 
ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES Users(user_id);

-- 4. USER_ROLES: Assigns a user to one or multiple roles.
CREATE TABLE User_Roles (
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES Roles(role_id) ON DELETE CASCADE,
    assigned_by INT REFERENCES Users(user_id), -- Audit trail of who granted the role
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 5. USER_PERMISSIONS (The PBAC Engine): Direct overrides for a specific user.
CREATE TABLE User_Permissions (
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    permission_id INT REFERENCES Permissions(permission_id) ON DELETE CASCADE,
    -- If TRUE, grants the permission. If FALSE, explicitly revokes a permission 
    -- they would otherwise inherit from their role.
    is_granted BOOLEAN NOT NULL DEFAULT TRUE, 
    granted_by INT REFERENCES Users(user_id), -- Audit trail
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- CRITICAL: Allows for temporary access (e.g., covering for someone on leave)
    PRIMARY KEY (user_id, permission_id)
);



CREATE TYPE project_status AS ENUM ('Planning', 'Active', 'On_Hold', 'Completed', 'Cancelled');

CREATE TABLE Projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    department_id INT REFERENCES Departments(department_id),
    status project_status DEFAULT 'Planning',
    start_date DATE,
    end_date DATE, -- Projected or actual completion date
    created_by INT REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TYPE step_type AS ENUM ('Approval', 'Input_Required', 'Automated_Task');

CREATE TABLE Workflow_Templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- e.g., 'HR', 'Finance', 'IT'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE, -- Set to FALSE when a new version of the process is created
    version INT DEFAULT 1,
    created_by INT REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Workflow_Template_Steps (
    step_id SERIAL PRIMARY KEY,
    template_id INT REFERENCES Workflow_Templates(template_id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_type step_type DEFAULT 'Approval',
    
    -- Link to PBAC: Who is ALLOWED to do this? (e.g., 'workflow:approve_finance')
    required_permission_id INT REFERENCES Permissions(permission_id),
    
    -- Workflow Logic:
    escalation_timeout_hours INT NULL, -- If no action in X hours, trigger an alert/escalation
    on_reject_goto_step_id INT NULL REFERENCES Workflow_Template_Steps(step_id), -- Allows loops (e.g., go back to step 1 to fix errors)
    
    UNIQUE (template_id, step_order) -- Ensures no duplicate orders in the same template
);

CREATE TYPE instance_status AS ENUM ('Draft', 'Active', 'Completed', 'Cancelled', 'Rejected');
CREATE TYPE step_execution_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');

CREATE TABLE Workflow_Instances (
    instance_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL, -- e.g., "Annual Leave - John Doe - March"
    template_id INT REFERENCES Workflow_Templates(template_id),
    project_id INT NULL REFERENCES Projects(project_id) ON DELETE CASCADE, -- Nullable!
    initiated_by INT REFERENCES Users(user_id),
    current_step_id INT REFERENCES Workflow_Template_Steps(step_id),
    status instance_status DEFAULT 'Active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

CREATE TABLE Workflow_Instance_Steps (
    instance_step_id SERIAL PRIMARY KEY,
    instance_id INT REFERENCES Workflow_Instances(instance_id) ON DELETE CASCADE,
    step_id INT REFERENCES Workflow_Template_Steps(step_id),
    
    -- Routing: Can be assigned to a specific user, OR left null if anyone with the required_permission_id can claim it
    assigned_to INT NULL REFERENCES Users(user_id), 
    
    status step_execution_status DEFAULT 'Pending',
    remarks TEXT,
    
    -- Auditability: 'assigned_to' is who SHOULD do it. 'actioned_by' is who ACTUALLY did it (e.g., if a manager delegated it).
    actioned_by INT NULL REFERENCES Users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actioned_at TIMESTAMP NULL
);


-- Replaced spaces with underscores to match professional API standards
CREATE TYPE task_status AS ENUM ('Pending', 'In_Progress', 'In_Review', 'Completed', 'Cancelled');

-- Added a priority enum to help team members sort their queues
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');


CREATE TABLE Tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INT NULL REFERENCES Projects(project_id) ON DELETE CASCADE,
    workflow_instance_id INT NULL REFERENCES Workflow_Instances(instance_id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- The Team Leader (creator) and the Team Member (assignee)
    created_by INT REFERENCES Users(user_id), 
    assigned_to INT REFERENCES Users(user_id), 
    
    status task_status DEFAULT 'Pending',
    priority task_priority DEFAULT 'Medium',
    
    -- Scheduling and Tracking (Crucial for Professional Systems)
    estimated_hours NUMERIC(5,2), -- e.g., 4.50 hours
    actual_hours NUMERIC(5,2) DEFAULT 0.00,
    start_date DATE NULL, -- When work actually began
    due_date DATE NULL,
    completed_at TIMESTAMP NULL, -- Timestamp of when status changed to 'Completed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL -- Soft delete so Team Leaders don't accidentally wipe history
);


CREATE TABLE Subtasks (
    subtask_id SERIAL PRIMARY KEY,
    task_id INT REFERENCES Tasks(task_id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT, -- Added: Subtasks often need their own specific instructions
    
    created_by INT REFERENCES Users(user_id), -- Usually the Team Leader or the Task Assignee
    assigned_to INT REFERENCES Users(user_id),
    
    status task_status DEFAULT 'Pending',
    
    -- Granular tracking
    estimated_hours NUMERIC(5,2),
    due_date DATE NULL,
    completed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Task_Attachments (
    attachment_id SERIAL PRIMARY KEY,
    task_id INT REFERENCES Tasks(task_id) ON DELETE CASCADE,
    -- If NULL, the file belongs to the main task. If populated, it belongs to the subtask.
    subtask_id INT NULL REFERENCES Subtasks(subtask_id) ON DELETE CASCADE, 
    
    file_name VARCHAR(255) NOT NULL, -- e.g., 'Q3_Financial_Report.pdf'
    file_type VARCHAR(50), -- e.g., 'application/pdf', 'image/png'
    file_size_bytes BIGINT, -- Helps warn users before downloading huge files
    file_url TEXT NOT NULL, -- S3 Bucket URL or internal path
    
    uploaded_by INT REFERENCES Users(user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Task_Comments (
    comment_id SERIAL PRIMARY KEY,
    task_id INT REFERENCES Tasks(task_id) ON DELETE CASCADE,
    subtask_id INT NULL REFERENCES Subtasks(subtask_id) ON DELETE CASCADE,
    
    user_id INT REFERENCES Users(user_id), -- Who made the comment
    comment_text TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL -- Allows users to delete their own comments
);


CREATE TYPE rule_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE violation_status AS ENUM ('Open', 'Under_Review', 'Resolved', 'Ignored');
-- Using a standard set of entities helps keep polymorphic relations clean
CREATE TYPE system_entity AS ENUM ('User', 'Project', 'Task', 'Subtask', 'Workflow_Instance', 'Workflow_Step');



CREATE TABLE Compliance_Categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g., 'Data Privacy', 'Financial Controls'
    description TEXT,
    manager_id INT REFERENCES Users(user_id) -- The ultimate owner of this compliance category
);

CREATE TABLE Compliance_Rules (
    rule_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES Compliance_Categories(category_id),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    remediation_steps TEXT, -- Instructions on how to resolve the issue
    severity rule_severity DEFAULT 'Medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Compliance_Violations (
    violation_id SERIAL PRIMARY KEY,
    rule_id INT REFERENCES Compliance_Rules(rule_id),
    
    -- Polymorphic relation: What broke the rule?
    entity_id INT NOT NULL, 
    entity_type system_entity NOT NULL, 
    
    status violation_status DEFAULT 'Open',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Auditability of the violation itself
    reported_by INT NULL REFERENCES Users(user_id), -- NULL if detected by the automated system
    resolved_by INT NULL REFERENCES Users(user_id),
    resolved_at TIMESTAMP NULL,
    
    -- Crucial: Why was it ignored or how was it resolved?
    resolution_remarks TEXT, 
    due_date DATE -- Legal/HR deadlines for compliance
);


CREATE TABLE Violation_Comments (
    comment_id SERIAL PRIMARY KEY,
    violation_id INT REFERENCES Compliance_Violations(violation_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id),
    comment_text TEXT NOT NULL,
    attachment_url TEXT NULL, -- Proof of resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Audit_Logs (
    log_id BIGSERIAL PRIMARY KEY, -- BIGSERIAL because audit tables grow massively
    
    -- Polymorphic relation: What was changed?
    entity_id INT NOT NULL,
    entity_type system_entity NOT NULL,
    
    action VARCHAR(100) NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
    
    performed_by INT NULL REFERENCES Users(user_id), -- NULL if done by the system
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security & Network Context
    ip_address VARCHAR(45), -- Supports both IPv4 and IPv6
    user_agent TEXT, -- Browser or device information
    
    -- The PBAC Connection: Which permission allowed them to do this?
    used_permission_slug VARCHAR(100), 
    
    -- Data State Changes (Using JSONB for structured querying)
    old_value JSONB, 
    new_value JSONB
);

-- Creating indexes is critical for an Audit table, otherwise tracking history becomes terribly slow
CREATE INDEX idx_audit_entity ON Audit_Logs (entity_type, entity_id);

CREATE INDEX idx_audit_performed_by ON Audit_Logs (performed_by);

CREATE INDEX idx_user_roles_user ON User_Roles(user_id);
CREATE INDEX idx_tasks_assigned_to ON Tasks(assigned_to);
CREATE INDEX idx_tasks_project ON Tasks(project_id);


