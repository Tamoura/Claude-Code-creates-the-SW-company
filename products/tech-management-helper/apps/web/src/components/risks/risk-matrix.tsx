'use client';

import { useState, useEffect } from 'react';
import type { Risk } from '@/types/risk';

interface RiskMatrixProps {
  risks: Risk[];
}

interface MatrixCell {
  likelihood: number;
  impact: number;
  count: number;
  risks: Risk[];
  score: number;
}

export function RiskMatrix({ risks }: RiskMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Build matrix data structure
  const buildMatrix = (): MatrixCell[][] => {
    const matrix: MatrixCell[][] = [];

    // Initialize 5x5 matrix
    for (let likelihood = 5; likelihood >= 1; likelihood--) {
      const row: MatrixCell[] = [];
      for (let impact = 1; impact <= 5; impact++) {
        const cellRisks = risks.filter(
          (r) => r.likelihood === likelihood && r.impact === impact
        );
        row.push({
          likelihood,
          impact,
          count: cellRisks.length,
          risks: cellRisks,
          score: likelihood * impact,
        });
      }
      matrix.push(row);
    }

    return matrix;
  };

  const matrix = buildMatrix();

  // Get cell color based on risk score
  const getCellColor = (score: number): string => {
    if (score >= 15) return 'bg-red-500 hover:bg-red-600';
    if (score >= 10) return 'bg-orange-500 hover:bg-orange-600';
    if (score >= 6) return 'bg-yellow-500 hover:bg-yellow-600';
    if (score >= 3) return 'bg-lime-500 hover:bg-lime-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  // Get text color for contrast
  const getTextColor = (score: number): string => {
    if (score >= 6) return 'text-white';
    return 'text-gray-900';
  };

  // Handle cell click
  const handleCellClick = (cell: MatrixCell) => {
    if (cell.count > 0) {
      setSelectedCell(cell);
      setShowModal(true);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedCell(null);
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700">Low (1-5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-gray-700">Medium (6-14)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-700">High (15-25)</span>
        </div>
      </div>

      {/* Matrix */}
      <div className="flex items-center justify-center">
        <div className="inline-block">
          {/* Y-axis label (Likelihood) */}
          <div className="flex items-center mb-2">
            <div className="w-20 text-center">
              <div className="transform -rotate-90 whitespace-nowrap text-sm font-semibold text-gray-700">
                Likelihood →
              </div>
            </div>
            <div className="ml-4"></div>
          </div>

          <div className="flex">
            {/* Y-axis numbers */}
            <div className="flex flex-col-reverse justify-between pr-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="h-20 flex items-center justify-end">
                  <span className="text-sm font-medium text-gray-700">{num}</span>
                </div>
              ))}
            </div>

            {/* Matrix grid */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              {matrix.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      onClick={() => handleCellClick(cell)}
                      className={`
                        w-20 h-20 flex flex-col items-center justify-center
                        border border-gray-200 transition-all cursor-pointer
                        ${getCellColor(cell.score)}
                        ${getTextColor(cell.score)}
                        ${cell.count === 0 ? 'opacity-50 cursor-default' : ''}
                      `}
                      title={`Likelihood: ${cell.likelihood}, Impact: ${cell.impact}, Score: ${cell.score}, Risks: ${cell.count}`}
                    >
                      <div className="text-2xl font-bold">{cell.count}</div>
                      <div className="text-xs opacity-75">
                        {cell.likelihood}×{cell.impact}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* X-axis label (Impact) */}
          <div className="flex justify-center mt-2 ml-20">
            <div className="text-sm font-semibold text-gray-700">← Impact</div>
          </div>

          {/* X-axis numbers */}
          <div className="flex justify-center ml-20">
            <div className="flex justify-between w-[400px]">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="w-20 text-center">
                  <span className="text-sm font-medium text-gray-700">{num}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedCell && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Risks in Cell ({selectedCell.likelihood} × {selectedCell.impact})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Risk Score: {selectedCell.score} • {selectedCell.count} risk(s)
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedCell.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      window.location.href = `/risks/${risk.id}`;
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{risk.title}</h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          risk.status === 'IDENTIFIED'
                            ? 'bg-blue-100 text-blue-800'
                            : risk.status === 'ASSESSED'
                            ? 'bg-purple-100 text-purple-800'
                            : risk.status === 'MITIGATING'
                            ? 'bg-orange-100 text-orange-800'
                            : risk.status === 'ACCEPTED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {risk.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium">{risk.category}</span>
                      <span>Owner: {risk.owner?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
