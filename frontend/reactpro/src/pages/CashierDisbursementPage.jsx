import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoanDetail, disburseLoan } from '../api/loans';

const CashierDisbursementPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const [disbursementData, setDisbursementData] = useState({
    disbursement_method: 'CASH',
    disbursement_reference: '',
  });

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const data = await getLoanDetail(loanId);
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

  const handleDisburse = async (e) => {
    e.preventDefault();
    
    if (disbursementData.disbursement_method === 'BANK_TRANSFER' && !disbursementData.disbursement_reference.trim()) {
      setError('Transfer reference is required for bank transfers');
      return;
    }

    try {
      setProcessing(true);
      const data = await disburseLoan(loanId, disbursementData);
      setLoan(data);
      alert('Loan disbursed successfully! Schedule has been generated.');
      navigate('/cashier/loans');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disburse loan');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-4">Loading loan details...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate('/cashier/loans')}
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
          {/* Loan Summary */}
          <div className="p-4 bg-gray-100 border-b">
            <h1 className="text-2xl font-bold">Disburse Loan #{loan.id}</h1>
            <div className="text-sm text-gray-600 mt-1">Client: {loan.client.full_name}</div>
          </div>

          {/* Loan Details */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold mb-3">Loan Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Amount to Disburse:</strong> {loan.amount}
              </div>
              <div>
                <strong>Product:</strong> {loan.product.name}
              </div>
              <div>
                <strong>Interest Rate:</strong> {loan.interest_rate}%
              </div>
              <div>
                <strong>Tenure:</strong> {loan.tenure_months} months
              </div>
              <div>
                <strong>Client Phone:</strong> {loan.client.phone}
              </div>
              <div>
                <strong>Client Email:</strong> {loan.client.email}
              </div>
            </div>
          </div>

          {/* Disbursement Form */}
          <form onSubmit={handleDisburse} className="p-4 border-b">
            <h2 className="text-lg font-bold mb-4">Disbursement Method</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Select Disbursement Method</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="CASH"
                    checked={disbursementData.disbursement_method === 'CASH'}
                    onChange={(e) => setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">Cash</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="BANK_TRANSFER"
                    checked={disbursementData.disbursement_method === 'BANK_TRANSFER'}
                    onChange={(e) => setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">Bank Transfer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="SAVINGS_CREDIT"
                    checked={disbursementData.disbursement_method === 'SAVINGS_CREDIT'}
                    onChange={(e) => setDisbursementData({ ...disbursementData, disbursement_method: e.target.value })}
                    className="mr-2"
                  />
                  <span className="text-sm">Savings Credit</span>
                </label>
              </div>
            </div>

            {/* Reference field - only required for BANK_TRANSFER */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                Reference / Receipt Number
                {disbursementData.disbursement_method === 'BANK_TRANSFER' && <span className="text-red-600">*</span>}
              </label>
              <input
                type="text"
                value={disbursementData.disbursement_reference}
                onChange={(e) => setDisbursementData({ ...disbursementData, disbursement_reference: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder={
                  disbursementData.disbursement_method === 'CASH' 
                    ? 'Optional: Receipt number' 
                    : 'Required: Transfer reference (e.g., transaction ID)'
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                {disbursementData.disbursement_method === 'CASH' && 'Optional: Enter receipt number if using receipt system'}
                {disbursementData.disbursement_method === 'BANK_TRANSFER' && 'Required: Enter the bank transfer reference number or transaction ID'}
                {disbursementData.disbursement_method === 'SAVINGS_CREDIT' && 'Optional: Internal savings transaction reference'}
              </p>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {processing ? 'Processing...' : 'Confirm Disbursement'}
            </button>
          </form>

          {/* Important Notes */}
          <div className="p-4 bg-blue-50 border-t border-blue-200 rounded-b">
            <h3 className="font-bold text-sm mb-2">Important:</h3>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>• This action will set the loan to ACTIVE status</li>
              <li>• Repayment schedule will be auto-generated</li>
              <li>• Client will begin repayment obligations</li>
              <li>• Bank Transfer requires a valid transfer reference</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierDisbursementPage;
