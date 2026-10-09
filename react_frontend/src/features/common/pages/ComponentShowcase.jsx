import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { StatCard } from '../../../shared/components/StatCard';
import { Loader } from '../../../shared/components/Loader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { FileUpload } from '../../../shared/components/FileUpload';
import { FormField, Input, Select, Textarea } from '../../../shared/components/FormField';
import { Modal } from '../../../shared/components/Modal';
import { Toast, useToast } from '../../../shared/components/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';

// WHY: A centralized showcase allows developers and designers to see and test all available 
// UI primitives in one interactive sandbox (http://localhost:5173/components).
export default function ComponentShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statLoading, setStatLoading] = useState(false);
  const [standaloneToast, setStandaloneToast] = useState(null);

  // Universal imperative toast hook
  const toast = useToast();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 bg-white min-h-screen">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">OptiFlow UI Kit</h1>
        <p className="text-slate-500 mt-2">Handcrafted shared components utilized across all 9 actor roles.</p>
      </div>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" disabled>Disabled Button</Button>
        </div>
      </section>

      {/* Badges Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Badges (Status, Priority, Severity)</h2>
        
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Statuses & Pulse Dots</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge value="Active" type="status" status="active" pulse />
            <Badge value="Completed" type="status" status="completed" />
            <Badge value="Pending" type="status" status="pending" />
            <Badge value="Blocked" type="status" status="blocked" pulse />
            <Badge value="Neutral" type="status" status="neutral" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Priority Levels</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge value="Low Priority" type="priority" status="low" />
            <Badge value="Medium Priority" type="priority" status="medium" />
            <Badge value="High Priority" type="priority" status="high" />
            <Badge value="Critical Priority" type="priority" status="critical" pulse />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Severity Levels</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge value="Low Severity" type="severity" status="low" />
            <Badge value="Medium Severity" type="severity" status="medium" />
            <Badge value="High Severity" type="severity" status="high" />
            <Badge value="Critical Severity" type="severity" status="critical" />
          </div>
        </div>
      </section>

      {/* Stat Cards Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-semibold text-slate-800">Stat Cards (KPI Metrics)</h2>
          <Button 
            variant="outline" 
            onClick={() => setStatLoading(!statLoading)}
          >
            {statLoading ? 'Show Data' : 'Test Skeleton Loading'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Active Projects" 
            value="42" 
            trend="+12%" 
            trendDirection="up"
            hint="vs last month"
            icon="💼" 
            loading={statLoading}
          />
          <StatCard 
            label="Open Violations" 
            value="5" 
            trend="-2%" 
            trendDirection="down"
            hint="requires resolution"
            icon="🚨" 
            loading={statLoading}
          />
          <StatCard 
            label="Team Members" 
            value="128" 
            hint="Across 4 branches"
            icon="👥" 
            loading={statLoading}
          />
        </div>
      </section>

      {/* Form Fields Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Form Fields</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
          <FormField label="First Name" required hint="Enter your legal first name">
            <Input placeholder="e.g. John" />
          </FormField>
          <FormField label="Email Address" required error="Invalid email format">
            <Input type="email" placeholder="john@example.com" error />
          </FormField>
          <FormField label="Role">
            <Select options={[{value: 'admin', label: 'Admin'}, {value: 'user', label: 'User'}]} placeholder="Select a role" />
          </FormField>
          <FormField label="Bio">
            <Textarea placeholder="Tell us about yourself..." />
          </FormField>
        </div>
      </section>

      {/* File Upload Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">File Upload</h2>
        <div className="w-full md:w-2/3">
          <FileUpload 
            label="Evidence Document"
            hint="PDF, PNG, JPG (MAX. 5MB)"
            maxMB={5}
            onUpload={(file) => toast.success(`Selected: ${file.name}`)} 
          />
        </div>
      </section>

      {/* Empty State Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Empty States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState 
            icon="shield"
            message="No open compliance violations"
            description="All monitored workflows are currently within designated regulatory thresholds."
            action={<Button variant="primary" onClick={() => toast.info('Initiating audit scan...')}>Run Audit Scan</Button>}
          />
          <EmptyState 
            icon="search"
            message="No team members found"
            description="Try adjusting your filter terms or clear your search query."
            action={<Button variant="outline" onClick={() => toast.info('Filters cleared')}>Clear Filters</Button>}
          />
        </div>
      </section>

      {/* Overlays Section (Modals & Imperative Toasts) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Overlays (Modals & Toasts)</h2>
        <div className="flex flex-wrap gap-4 items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Open Standard Modal</Button>
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>Open Confirm Dialog</Button>
          
          {/* Universal Imperative Toast Triggers */}
          <Button variant="outline" onClick={() => toast.success('Rule changes published successfully!')}>
            Trigger Success Toast
          </Button>
          <Button variant="outline" onClick={() => toast.error('Failed to sync changes with backend.')}>
            Trigger Error Toast
          </Button>
          <Button variant="outline" onClick={() => toast.warning('Evidence upload window closes in 2 hours.')}>
            Trigger Warning Toast
          </Button>
          <Button variant="outline" onClick={() => toast.info('Workflow template updated by Admin.')}>
            Trigger Info Toast
          </Button>
        </div>

        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Create New Rule"
          footer={<Button variant="primary" onClick={() => setIsModalOpen(false)}>Save Rule</Button>}
        >
          <p className="text-sm text-slate-600">This is the standard modal component. You can put forms, text, or anything else inside here!</p>
        </Modal>

        <ConfirmDialog 
          isOpen={isConfirmOpen}
          title="Delete Project"
          message="Are you sure you want to delete this project? This action cannot be undone."
          confirmText="Yes, Delete"
          onConfirm={() => {
            setIsConfirmOpen(false);
            toast.success('Project deleted successfully.');
          }}
          onCancel={() => setIsConfirmOpen(false)}
        />

        {standaloneToast && (
          <Toast 
            type={standaloneToast.type} 
            message={standaloneToast.message} 
            onClose={() => setStandaloneToast(null)} 
          />
        )}
      </section>

      {/* Loaders Section */}
      <section className="space-y-4 pb-20">
        <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Loaders & Feedback</h2>
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col justify-center items-center">
          <p className="text-sm text-slate-500 mb-4 text-center">Standard Spin Loader</p>
          <Loader />
        </div>
      </section>

    </div>
  );
}
