import { useState } from 'react';
import { apiClient } from '../../../services/api/client';
import { Table } from '../../../shared/components/Table';
import { Modal } from '../../../shared/components/Modal';
import styles from './Companies.module.css';
import { Badge } from '../../../shared/components/Badge';
import { useApi } from '../../../hooks/useApi';


const fetchCompaniesApi = () => {
  return apiClient('/api/platform/companies');
};

const getBadgeStatus = (status) => {
  if (status === 'Active') return 'success';
  if (status === 'Suspended') return 'warning';
  if (status === 'Closed') return 'danger';
  return 'default';
};


function PlatformCompanies() {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isDetailsOpen,setIsDetailsOpen] = useState(false);

  

  const { data: companiesList, loading, error } = 
  useApi(fetchCompaniesApi);

  //fetching details for a single company on button click
  const handleOpenDetails = async (companyId)=>{
    try{
      setIsDetailsOpen(true);
      setDetailsLoading(true);
      setSelectedCompany(null);
      const res = await apiClient(`/api/platform/companies/${companyId}`);
      setSelectedCompany(res);
    }
    catch(err){
      console.error('Failed to load company details:',err);
    }
    finally{
      setDetailsLoading(false);
    }
  };

  //this function is still incomplete. I need to add the edit modal and navigation once it is ready.
  const handleEdit = (companyId)=>{
    console.log('Edit company clicked for ID:',companyId);
  }

  const handleCloseDetails =()=>{
    setIsDetailsOpen(false);
    setSelectedCompany(null);
  }


  
  const columns = [
    {
      header:'Company',
      accessor: 'legalName',
      render: (row) =>{
        const users = row.userCount ?? row._count?.users ?? 0;
        const branches = row.branchCount ?? row._count?.branches??0;



        return (
            <div className={styles.companyInfo}>
              <span className={styles.companyName}>
                {row.legalName || 'Unnamed Company'}
              </span>
              <span className={styles.companyMeta}>
                {users} users - {branches} branches
              </span>
            </div>
        );
      },
    },
    {
      header: 'Tenant ID',
      accessor: 'id',
      render:(row)=> <code className={styles.tenantIdCode}>{row.id}</code>
    },
    {
      header:'Status',
      accessor:'status',
      render:(row)=>(
        <Badge status={getBadgeStatus(row.status)}>
          {row.status || '---'}
        </Badge>
      )
    },
    {
      header:'Registered',
      accessor:'createdAt',
      render:(row)=>(
        row.createdAt ? new Date(row.createdAt).toLocaleDateString():'--'
      )
    },
    {
      header:'Actions',
      render:(row)=>(
        <div className={styles.actionsWrapper} >
          <button type="button" className={styles.actionBtn} onClick={()=>handleOpenDetails(row.id)}>
            Details
          </button>
          <button type="button" className={styles.actionBtn} onClick={()=>handleEdit(row.id)}>
            Edit
          </button>

        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>
            Tenant Companies
          </h1>
        </div>
      </div>

      {/* API Error State*/}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
            <h2 className={styles.sectionTitle}>Registered Organisations Overview</h2>
            
        </div>

          <Table
            columns={columns}
            data={companiesList?.items || []}
            loading={loading}
            emptyMessage="No Companies Registered"
          />
      </div>

      {/*Modal for displaying all the details */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        title={selectedCompany?.legalName || 'Un-Named Corp'}
        footer={
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleCloseDetails}
            >
            Close
          </button>
        }
        >

        {detailsLoading ? (
          <div style={{textAlign:'center',padding:'30px',color: '#94a3b8'}}>
            Loading Company Details
          </div>
        ):selectedCompany?(
          <div className={styles.detailsGrid}>
            <div className={styles.detailsRow}>
              <div className={styles.detailsLabel}>
                <span className={styles.detailsLabel}>Tenant ID:</span>
                <code className={styles.tenantIdCode}>{selectedCompany.id}</code>
              </div>

              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>Legal Name:</span>
                <span className={styles.detailsValue}>{selectedCompany.legalName || '--'}</span>
              </div>

              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>
                  Account Status:
                </span>
                <Badge status=
                {getBadgeStatus(selectedCompany.status)}
                >
                  {selectedCompany.status || 'Active'}
                </Badge>
              </div>

              <div className={styles.detailsRow}>
                <span className={styles.detailsLabel}>
                  Registered Date:
                </span>
                <span className={styles.detailsValue}>
                    {
                      selectedCompany.createdAt
                      ? new Date(selectedCompany.createdAt).toLocaleDateString()
                      :'--'
                    }
                </span>
              </div>
              
              {/* Subscriptions */}

              <div className={styles.detailsSection}>
                <div className={styles.detailsSectionTitle}>
                    Subscriptions
                </div>
                {selectedCompany.subscriptions && selectedCompany.subscriptions.length>0 ? (
                  <ul className={styles.subscriptionList}>
                      {selectedCompany.subscriptions.map((s)=>(
                        <li key={s.id || s.planId} className={styles.subscriptionItem}>
                        <div>
                          <strong>{s.plan?.name || '--'}</strong>
                          {s.currentPeriodEnd && (
                            <div style={{fontSize:'11px',color:'#94a3b8'}}>
                              Renews at:{ new
                              Date(s.currentPeriodEnd).toLocaleDateString()
                              }
                            </div>
                          )
                        }
                        </div>
                        <Badge status={getBadgeStatus(s.status)}>
                            {s.status}
                        </Badge>

                        </li>
                      ))}
                  </ul>
                ):(
                  <p style={{fontSize:'12px',color:'#94a3b8',margin: 0}}>
                    No Active Subscriptions found;
                  </p>
                )
              }
              </div>

              {/* branches */}
              <div className={styles.detailsSection}>
                <div className={styles.detailsSectionTitle}>
                  Branches
                  ({selectedCompany.branches?.length || 0})
                </div>
                {
                  selectedCompany.branches && 
                  selectedCompany.branches.length >0 ? (
                    <div>
                      
                    </div>
                  ):(null)
                }
              </div>
            </div>

          </div>
        ):(
          null
        )

        }
      

      </Modal>

      

    </div>
  )


}

export default PlatformCompanies;

