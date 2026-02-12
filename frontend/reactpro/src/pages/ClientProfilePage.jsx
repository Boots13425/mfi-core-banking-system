import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import axiosInstance from '../api/axios';

export const ClientProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);
  const [deactivateSuccess, setDeactivateSuccess] = useState(false);
  
  // KYC states
  const [initiatingKyc, setInitiatingKyc] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [approvingKyc, setApprovingKyc] = useState(false);
  const [rejectingKyc, setRejectingKyc] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [kycError, setKycError] = useState(null);
  const [kycSuccess, setKycSuccess] = useState(null);
  const [nationalIdFiles, setNationalIdFiles] = useState([]);
  const [proofOfAddressFiles, setProofOfAddressFiles] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [otherFiles, setOtherFiles] = useState([]);

  useEffect(() => {
    fetchClientDetails();
    fetchKYC();
  }, [id]);

  const fetchClientDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/clients/${id}/`);
      setClient(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Client not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this client');
      } else {
        setError('Failed to load client details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchKYC = async () => {
    try {
      const response = await axiosInstance.get(`/clients/${id}/kyc/`);
      setKyc(response.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        // 404 is expected if KYC doesn't exist yet
        console.error('Failed to fetch KYC:', err);
      }
      setKyc(null);
    }
  };

  const handleInitiateKYC = async () => {
    setInitiatingKyc(true);
    setKycError(null);
    setKycSuccess(null);

    try {
      await axiosInstance.post(`/clients/${id}/initiate-kyc/`);
      setKycSuccess('KYC initiated successfully! You can now upload documents.');
      await fetchKYC();
    } catch (err) {
      if (err.response?.data?.detail) {
        setKycError(err.response.data.detail);
      } else {
        setKycError('Failed to initiate KYC. Please try again.');
      }
    } finally {
      setInitiatingKyc(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    
    // Check if at least one file is selected
    const totalFiles = nationalIdFiles.length + proofOfAddressFiles.length + photoFiles.length + otherFiles.length;
    if (totalFiles === 0) {
      setKycError('Please select at least one file to upload');
      return;
    }

    setUploadingDocument(true);
    setKycError(null);
    setKycSuccess(null);

    const formData = new FormData();
    
    // Append all files for each document type
    nationalIdFiles.forEach((file) => {
      formData.append('national_id', file);
    });
    proofOfAddressFiles.forEach((file) => {
      formData.append('proof_of_address', file);
    });
    photoFiles.forEach((file) => {
      formData.append('photo', file);
    });
    otherFiles.forEach((file) => {
      formData.append('other', file);
    });

    try {
      const response = await axiosInstance.post(`/clients/${id}/kyc/upload-documents/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const uploadedCount = response.data.documents?.length || 0;
      setKycSuccess(`Successfully uploaded ${uploadedCount} document(s)!`);
      
      // Clear all file inputs
      setNationalIdFiles([]);
      setProofOfAddressFiles([]);
      setPhotoFiles([]);
      setOtherFiles([]);
      
      // Reset file inputs
      document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
      });
      
      await fetchKYC();
    } catch (err) {
      if (err.response?.data?.detail) {
        setKycError(err.response.data.detail);
      } else if (err.response?.data) {
        const errorMessages = Object.values(err.response.data).flat().join(', ');
        setKycError(errorMessages);
      } else {
        setKycError('Failed to upload documents. Please try again.');
      }
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleApproveKYC = async () => {
    if (!window.confirm('Are you sure you want to approve this KYC? This will activate the client account.')) {
      return;
    }

    setApprovingKyc(true);
    setKycError(null);
    setKycSuccess(null);

    try {
      await axiosInstance.post(`/clients/${id}/kyc/approve/`);
      setKycSuccess('KYC approved successfully! Client account has been activated.');
      await fetchKYC();
      await fetchClientDetails();
    } catch (err) {
      if (err.response?.data?.detail) {
        setKycError(err.response.data.detail);
      } else {
        setKycError('Failed to approve KYC. Please try again.');
      }
    } finally {
      setApprovingKyc(false);
    }
  };

  const handleRejectKYC = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setKycError('Please provide a reason for rejection');
      return;
    }

    setRejectingKyc(true);
    setKycError(null);
    setKycSuccess(null);

    try {
      await axiosInstance.post(`/clients/${id}/kyc/reject/`, {
        rejection_reason: rejectionReason,
      });
      setKycSuccess('KYC rejected. The cashier will be notified to resubmit documents.');
      setRejectionReason('');
      setShowRejectForm(false);
      await fetchKYC();
    } catch (err) {
      if (err.response?.data?.detail) {
        setKycError(err.response.data.detail);
      } else {
        setKycError('Failed to reject KYC. Please try again.');
      }
    } finally {
      setRejectingKyc(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this client?')) {
      return;
    }

    setDeactivating(true);
    setDeactivateError(null);
    setDeactivateSuccess(false);

    try {
      await axiosInstance.post(`/clients/${id}/deactivate/`);
      setDeactivateSuccess(true);
      setTimeout(() => {
        fetchClientDetails();
        fetchKYC();
      }, 1500);
    } catch (err) {
      if (err.response?.status === 403) {
        setDeactivateError('You do not have permission to deactivate this client');
      } else if (err.response?.data?.detail) {
        setDeactivateError(err.response.data.detail);
      } else {
        setDeactivateError('Failed to deactivate client. Please try again.');
      }
    } finally {
      setDeactivating(false);
    }
  };

  const getKYCStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#d4edda', color: '#155724' };
      case 'REJECTED':
        return { bg: '#f8d7da', color: '#721c24' };
      case 'SUBMITTED':
        return { bg: '#fff3cd', color: '#856404' };
      case 'PENDING':
        return { bg: '#d1ecf1', color: '#0c5460' };
      default:
        return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const getKYCStatusLabel = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'SUBMITTED':
        return 'Submitted for Review';
      case 'PENDING':
        return 'Pending Documents';
      default:
        return status;
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading client details...</div>;
  }

  if (error || !client) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          {error || 'Client not found'}
        </div>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back to Clients
        </button>
      </div>
    );
  }

  const kycStatusColor = kyc ? getKYCStatusColor(kyc.status) : null;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/clients')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          ← Back to Clients
        </button>
      </div>

      {/* Client Information Section */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '30px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #f0f0f0',
          }}
        >
          <h1 style={{ margin: 0 }}>{client.full_name}</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {kyc && (
              <span
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: kycStatusColor.bg,
                  color: kycStatusColor.color,
                }}
              >
                KYC: {getKYCStatusLabel(kyc.status)}
              </span>
            )}
            <span
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                background:
                  client.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                color:
                  client.status === 'ACTIVE' ? '#155724' : '#721c24',
              }}
            >
              {client.status}
            </span>
          </div>
        </div>

        {deactivateSuccess && (
          <div
            style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            Client deactivated successfully! Refreshing...
          </div>
        )}

        {deactivateError && (
          <div
            style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {deactivateError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '30px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Full Name
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.full_name}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              National ID
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.national_id}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Phone
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.phone}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Email
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {client.email || 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Branch
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
  {client.branch_display || client.branch_name || client.branch || 'N/A'}
</p>

          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Registered Date
            </label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* KYC Section */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '30px',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>KYC (Know Your Customer)</h2>

        {kycSuccess && (
          <div
            style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {kycSuccess}
          </div>
        )}

        {kycError && (
          <div
            style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {kycError}
          </div>
        )}

        {!kyc && user?.role === 'CASHIER' && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              KYC has not been initiated for this client. Click the button below to start the KYC process.
            </p>
            <button
              onClick={handleInitiateKYC}
              disabled={initiatingKyc}
              style={{
                padding: '10px 20px',
                background: initiatingKyc ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: initiatingKyc ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {initiatingKyc ? 'Initiating...' : 'Initiate KYC'}
            </button>
          </div>
        )}

        {kyc && (
          <>
            {/* KYC Status Info */}
            <div
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Status
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {getKYCStatusLabel(kyc.status)}
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Initiated By
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {kyc.initiated_by_username || 'N/A'}
                  </p>
                </div>
                {kyc.reviewed_by_username && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                      Reviewed By
                    </label>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                      {kyc.reviewed_by_username}
                    </p>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Created
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {new Date(kyc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {kyc.rejection_reason && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    Rejection Reason
                  </label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#721c24', fontStyle: 'italic' }}>
                    {kyc.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Document Upload Section (Cashier) */}
            {user?.role === 'CASHIER' && kyc.status !== 'APPROVED' && (
              <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #f0f0f0' }}>
                <h3 style={{ marginBottom: '15px' }}>Upload Documents</h3>
                <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                  Select files for each document type. You can upload multiple files at once for each type.
                </p>
                <form onSubmit={handleDocumentUpload}>
                  <div style={{ display: 'grid', gap: '20px', marginBottom: '20px' }}>
                    {/* National ID */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        National ID Documents
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setNationalIdFiles(Array.from(e.target.files))}
                        accept="image/*,.pdf"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {nationalIdFiles.length > 0 && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#28a745' }}>
                          {nationalIdFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    {/* Proof of Address */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Proof of Address Documents
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setProofOfAddressFiles(Array.from(e.target.files))}
                        accept="image/*,.pdf"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {proofOfAddressFiles.length > 0 && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#28a745' }}>
                          {proofOfAddressFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    {/* Photo */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Client Photos
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
                        accept="image/*"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {photoFiles.length > 0 && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#28a745' }}>
                          {photoFiles.length} file(s) selected
                        </p>
                      )}
                    </div>

                    {/* Other Documents */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                        Other Documents
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setOtherFiles(Array.from(e.target.files))}
                        accept="image/*,.pdf"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {otherFiles.length > 0 && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#28a745' }}>
                          {otherFiles.length} file(s) selected
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={uploadingDocument || (nationalIdFiles.length === 0 && proofOfAddressFiles.length === 0 && photoFiles.length === 0 && otherFiles.length === 0)}
                    style={{
                      padding: '12px 24px',
                      background: uploadingDocument || (nationalIdFiles.length === 0 && proofOfAddressFiles.length === 0 && photoFiles.length === 0 && otherFiles.length === 0) ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: uploadingDocument || (nationalIdFiles.length === 0 && proofOfAddressFiles.length === 0 && photoFiles.length === 0 && otherFiles.length === 0) ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {uploadingDocument ? 'Uploading...' : 'Upload All Documents'}
                  </button>
                </form>
              </div>
            )}

            {/* Documents List */}
            {kyc.documents && kyc.documents.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>Uploaded Documents</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {kyc.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>
                          {doc.document_type.replace('_', ' ')}
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                          Uploaded by {doc.uploaded_by_username} on{' '}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`http://127.0.0.1:8000${doc.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: '#007bff',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Branch Manager Actions */}
            {user?.role === 'BRANCH_MANAGER' && kyc.status === 'SUBMITTED' && (
              <div style={{ paddingTop: '20px', borderTop: '2px solid #f0f0f0' }}>
                <h3 style={{ marginBottom: '15px' }}>Review KYC</h3>
                {!showRejectForm ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleApproveKYC}
                      disabled={approvingKyc}
                      style={{
                        padding: '10px 20px',
                        background: approvingKyc ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: approvingKyc ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      {approvingKyc ? 'Approving...' : 'Approve KYC'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={rejectingKyc}
                      style={{
                        padding: '10px 20px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      Reject KYC
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRejectKYC}>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Rejection Reason *
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                        required
                        placeholder="Please provide a reason for rejection (e.g., documents are blurry, missing information, etc.)"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        disabled={rejectingKyc}
                        style={{
                          padding: '10px 20px',
                          background: rejectingKyc ? '#6c757d' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: rejectingKyc ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {rejectingKyc ? 'Rejecting...' : 'Submit Rejection'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        disabled={rejectingKyc}
                        style={{
                          padding: '10px 20px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Deactivate Button (Cashier and Branch Manager after approval) */}
            {(user?.role === 'CASHIER' || user?.role === 'BRANCH_MANAGER') &&
              kyc.status === 'APPROVED' &&
              client.status === 'ACTIVE' && (
                <div style={{ paddingTop: '20px', borderTop: '2px solid #f0f0f0' }}>
                  <button
                    onClick={handleDeactivate}
                    disabled={deactivating}
                    style={{
                      padding: '10px 20px',
                      background: deactivating ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deactivating ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {deactivating ? 'Deactivating...' : 'Deactivate Client'}
                  </button>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};
