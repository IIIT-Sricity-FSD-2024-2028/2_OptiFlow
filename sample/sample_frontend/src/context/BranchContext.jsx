import { createContext, useContext, useState, useCallback } from 'react';

const BranchContext = createContext(null);

const DEMO_BRANCHES = [
  { id: 'global', name: 'Global (All Branches)', shortCode: 'GLB', color: '#2563eb' },
  { id: 'b001', name: 'Hyderabad HQ', shortCode: 'HYD', color: '#7c3aed' },
  { id: 'b002', name: 'Bangalore Operations', shortCode: 'BLR', color: '#059669' },
  { id: 'b003', name: 'Mumbai Finance', shortCode: 'MUM', color: '#d97706' },
  { id: 'b004', name: 'Chennai Tech', shortCode: 'CHN', color: '#dc2626' },
];

export function BranchProvider({ children }) {
  const [activeBranchId, setActiveBranchId] = useState('b001');

  const activeBranch = DEMO_BRANCHES.find(b => b.id === activeBranchId) ?? DEMO_BRANCHES[0];

  const switchBranch = useCallback((id) => {
    if (DEMO_BRANCHES.some(b => b.id === id)) {
      setActiveBranchId(id);
    }
  }, []);

  return (
    <BranchContext.Provider value={{ activeBranch, activeBranchId, switchBranch, branches: DEMO_BRANCHES }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}

export default BranchContext;
