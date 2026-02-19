import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBranchManagerLoanDetail,
  approveLoan,
  rejectLoan,
  requestLoanChanges,
} from '../api/loans';

const BranchManagerLoanDetailPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [actionMode, setActionMode] = useState(null); // 'approve', 'reject', 'request-changes'
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const data = await getBranchManagerLoanDetail(loanId);
        setLoan(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load loan details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [loanId]);

  const handleApprove = async () => {
    try {
      const data = await approveLoan(loanId);
      setLoan(data);
      setActionMode(null);
      alert('Loan approved successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve loan');
    }
  };

  const handleReject = async () => {
    try {
      const data = await rejectLoan(loanId, remarks);
      setLoan(data);
      setActionMode(null);
      setRemarks('');
      alert('Loan rejected');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject loan');
    }
  };

  const handleRequestChanges = async () => {
    try {
      const data = await requestLoanChanges(loanId, remarks);
      setLoan(data);
      setActionMode(null);
      setRemarks('');
      alert('Changes requested from loan officer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request changes');
    }
  };

  if (loading) return <div className="p-4">Loading loan details...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate('/branch-manager/loans')}
          className="text-blue-600 hover:underline"
        >
          ← Back to Queue
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {loan && (
        <div className="bg-white rounded shadow">
          {/* Loan Status */}
          <div className="p-4 bg-gray-100 border-b">
            <h1 className="text-2xl font-bold">Loan #{loan.id}</h1>
            <div className="text-sm text-gray-600 mt-1">Status: <strong>{loan.status}</strong></div>
          </div>

          {/* Client & Loan Details */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold mb-3">Loan Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Client Name:</strong> {loan.client.full_name}
              </div>
              <div>
                <strong>National ID:</strong> {loan.client.national_id}
              </div>
              <div>
                <strong>Phone:</strong> {loan.client.phone}
              </div>
              <div>
                <strong>Email:</strong> {loan.client.email}
              </div>
              <div>
                <strong>KYC Status:</strong> {loan.client.kyc_status}
              </div>
              <div>
                <strong>Product:</strong> {loan.product.name}
              </div>
              <div>
                <strong>Amount:</strong> {loan.amount}
              </div>
              <div>
                <strong>Interest Rate:</strong> {loan.interest_rate}%
              </div>
              <div>
                <strong>Tenure:</strong> {loan.tenure_months} months
              </div>
              <div>
                <strong>Loan Officer:</strong> {loan.loan_officer_name}
              </div>
              <div>
                <strong>Submitted:</strong> {new Date(loan.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* KYC Documents */}
          {loan.documents.length > 0 && (
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold mb-3">Loan Documents</h2>
              <div className="space-y-2">
                {loan.documents.map((doc) => (
                  <div key={doc.id} className="p-3 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>{doc.document_type_name}</strong>
                        {doc.label && <div className="text-xs text-gray-600">Label: {doc.label}</div>}
                        {doc.description && <div className="text-xs text-gray-600">{doc.description}</div>}
                        <div className="text-xs text-gray-500">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                      </div>
                      {doc.document_file_url && (
                        <a
                          href={doc.document_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View File
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repayment Schedule */}
          {loan.schedule.length > 0 && (
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold mb-3">Repayment Schedule (Preview)</h2>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border px-2 py-1">Month</th>
                      <th className="border px-2 py-1">Due Date</th>
                      <th className="border px-2 py-1">Principal</th>
                      <th className="border px-2 py-1">Interest</th>
                      <th className="border px-2 py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.schedule.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-2 py-1">{item.month_number}</td>
                        <td className="border px-2 py-1">{new Date(item.due_date).toLocaleDateString()}</td>
                        <td className="border px-2 py-1">{parseFloat(item.principal_due).toFixed(2)}</td>
                        <td className="border px-2 py-1">{parseFloat(item.interest_due).toFixed(2)}</td>
                        <td className="border px-2 py-1 font-bold">
                          {(parseFloat(item.principal_due) + parseFloat(item.interest_due)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Branch Manager Remarks */}
          {loan.bm_remarks && (
            <div className="p-4 border-b bg-yellow-50">
              <h3 className="font-bold mb-2">Branch Manager Remarks</h3>
              <p className="text-sm">{loan.bm_remarks}</p>
            </div>
          )}

          {/* Action Buttons */}
          {loan.status === 'SUBMITTED' && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Approve Loan
                </button>
                <button
                  onClick={() => setActionMode('reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Reject Loan
                </button>
                <button
                  onClick={() => setActionMode('request-changes')}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                >
                  Request Changes
                </button>
              </div>
            </div>
          )}

          {/* Action Forms */}
          {actionMode === 'reject' && (
            <div className="p-4 bg-red-50 border-t">
              <h3 className="font-bold mb-3">Reject Loan</h3>
              <div className="mb-3">
                <label className="block text-sm font-bold mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows="3"
                  placeholder="Please provide reasons for rejection"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setActionMode(null);
                    setRemarks('');
                  }}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionMode === 'request-changes' && (
            <div className="p-4 bg-orange-50 border-t">
              <h3 className="font-bold mb-3">Request Changes</h3>
              <div className="mb-3">
                <label className="block text-sm font-bold mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows="3"
                  placeholder="Please specify what changes are needed"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestChanges}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                >
                  Send Back to Officer
                </button>
                <button
                  onClick={() => {
                    setActionMode(null);
                    setRemarks('');
                  }}
                  className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchManagerLoanDetailPage;
