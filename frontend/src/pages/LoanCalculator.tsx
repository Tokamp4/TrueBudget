import { useState } from 'react';
import { formatCurrency } from '../lib/utils';

interface LoanResult {
  totalRepaid: number;
  totalFees: number;
  effectiveAPR: number;
  weeklyPayment: number;
  alternatives: { name: string; maxCost: number; link: string }[];
}

function calcPaydayLoan(amount: number, feePerHundred: number, termDays: number): LoanResult {
  const fee = (amount / 100) * feePerHundred;
  const totalRepaid = amount + fee;
  const effectiveAPR = (fee / amount) * (365 / termDays) * 100;

  return {
    totalRepaid,
    totalFees: fee,
    effectiveAPR,
    weeklyPayment: totalRepaid / (termDays / 7),
    alternatives: [
      { name: 'Credit Union Personal Loan (18% APR)', maxCost: amount * 0.18 * (termDays / 365), link: 'https://www.nafcu.org/find-credit-union' },
      { name: 'Community Assistance Program', maxCost: 0, link: 'https://www.needhelppayingbills.com' },
      { name: 'Employer Paycheck Advance', maxCost: 0, link: '#' },
    ],
  };
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState(300);
  const [feePerHundred, setFeePerHundred] = useState(15);
  const [termDays, setTermDays] = useState(14);

  const result = calcPaydayLoan(amount, feePerHundred, termDays);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payday Loan Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          See the true cost of a payday loan — and cheaper alternatives.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Loan Details</h2>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Loan Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Fee per $100 borrowed</label>
            <input
              type="number"
              value={feePerHundred}
              onChange={(e) => setFeePerHundred(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Typical range: $10–$30 per $100</p>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Loan Term (days)</label>
            <input
              type="number"
              value={termDays}
              onChange={(e) => setTermDays(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h2 className="font-semibold text-red-800 mb-3">True Cost</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">You borrow</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total fees</span>
                <span className="font-medium text-red-600">{formatCurrency(result.totalFees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">You repay</span>
                <span className="font-bold">{formatCurrency(result.totalRepaid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-red-100 pt-2 mt-2">
                <span className="text-gray-600">Effective APR</span>
                <span className="font-bold text-red-700 text-lg">{result.effectiveAPR.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <h2 className="font-semibold text-green-800 mb-3">💡 Better Alternatives</h2>
            <div className="space-y-2">
              {result.alternatives.map((alt) => (
                <div key={alt.name} className="flex justify-between items-start text-sm">
                  <a href={alt.link} target="_blank" rel="noreferrer"
                    className="text-brand-700 underline underline-offset-2 hover:text-brand-900 max-w-[200px]">
                    {alt.name}
                  </a>
                  <span className="font-medium text-green-700">
                    {alt.maxCost === 0 ? 'Free' : `~${formatCurrency(alt.maxCost)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
