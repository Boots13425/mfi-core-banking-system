import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubmittedLoans } from '../api/loans';

const BranchManagerLoanQueuePage = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const data = await getSubmittedLoans();
        setLoans(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load loans');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  if (loading) return <div className="p-4">Loading submitted loans...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Loan Review Queue</h1>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="p-4 bg-gray-50 text-center rounded">
          No submitted loans awaiting review.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-4 py-2 text-left">Loan ID</th>
                <th className="border px-4 py-2 text-left">Client Name</th>
                <th className="border px-4 py-2 text-left">Product</th>
                <th className="border px-4 py-2 text-right">Amount</th>
                <th className="border px-4 py-2 text-left">Submitted Date</th>
                <th className="border px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{loan.id}</td>
                  <td className="border px-4 py-2">{loan.client_name}</td>
                  <td className="border px-4 py-2">{loan.product_name}</td>
                  <td className="border px-4 py-2 text-right">{loan.amount}</td>
                  <td className="border px-4 py-2">
                    {new Date(loan.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    <button
                      onClick={() => navigate(`/branch-manager/loans/${loan.id}`)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BranchManagerLoanQueuePage;
