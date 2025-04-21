import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { CircleNotch, ArrowsClockwise, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define fee tier types
type FeeTier = {
  fee: number;
  estimatedTime: string;
  blocks?: number;
};

type FeeEstimates = {
  feeRates: {
    economy: FeeTier;
    standard: FeeTier;
    priority: FeeTier;
    current: FeeTier;
  };
  mempoolStatus: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
  source: string;
};

interface FeeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const FeeSelector: React.FC<FeeSelectorProps> = ({ value, onChange }) => {
  const [feeEstimates, setFeeEstimates] = useState<FeeEstimates | null>(null);
  const [selectedTier, setSelectedTier] = useState<'economy' | 'standard' | 'priority' | 'custom'>('standard');
  const [customFee, setCustomFee] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize with default values
  const defaultFeeRates = {
    economy: { fee: 2, estimatedTime: '1 hour+', blocks: 6 },
    standard: { fee: 4, estimatedTime: '~30 minutes', blocks: 3 },
    priority: { fee: 8, estimatedTime: '~10 minutes', blocks: 1 },
    current: { fee: 4, estimatedTime: 'Current rate' }
  };

  // Fetch fee estimates
  const fetchFeeRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('GET', '/api/fees/estimate');
      const data = await response.json();
      
      if (!data.error) {
        setFeeEstimates(data);
        
        // If this is the first load and no tier is selected yet, select standard
        if (!isCustom && !selectedTier) {
          setSelectedTier('standard');
          onChange(String(data.feeRates.standard.fee));
        }
      } else {
        // Use default values on error
        setError('Could not fetch current fee rates. Using default values.');
      }
    } catch (err) {
      console.error('Error fetching fee rates:', err);
      setError('Failed to load fee estimates. Using default values.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchFeeRates();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchFeeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle tier selection
  const handleTierSelect = (tier: 'economy' | 'standard' | 'priority') => {
    setSelectedTier(tier);
    setIsCustom(false);
    
    // Use either the fetched rates or default rates
    const rates = feeEstimates?.feeRates || defaultFeeRates;
    onChange(String(rates[tier].fee));
  };

  // Handle custom fee input
  const handleCustomFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomFee(value);
    setIsCustom(true);
    setSelectedTier('custom');
    onChange(value);
  };

  // Get the fee rates to display (either from API or defaults)
  const feeRates = feeEstimates?.feeRates || defaultFeeRates;
  const mempoolStatus = feeEstimates?.mempoolStatus || 'Medium';
  const lastUpdated = feeEstimates?.lastUpdated 
    ? new Date(feeEstimates.lastUpdated).toLocaleTimeString() 
    : 'Not available';

  return (
    <div className="fee-selector">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Select Fee Rate:</h3>
          
          <button 
            onClick={fetchFeeRates} 
            className="text-xs flex items-center text-gray-500 hover:text-orange-600"
            disabled={loading}
            title="Refresh fee estimates"
          >
            {loading ? (
              <CircleNotch className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <ArrowsClockwise className="h-3.5 w-3.5 mr-1" />
            )}
            Refresh
          </button>
        </div>
        
        {error && (
          <div className="text-xs text-amber-600 mb-2">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleTierSelect('economy')}
            className={`p-3 rounded-lg border transition text-left ${
              selectedTier === 'economy' && !isCustom
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            type="button"
          >
            <div className="font-medium">Economy</div>
            <div className="text-lg font-bold">{feeRates.economy.fee} sat/vB</div>
            <div className="text-xs text-gray-500">{feeRates.economy.estimatedTime}</div>
          </button>
          
          <button
            onClick={() => handleTierSelect('standard')}
            className={`p-3 rounded-lg border transition text-left ${
              selectedTier === 'standard' && !isCustom
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            type="button"
          >
            <div className="font-medium">Standard</div>
            <div className="text-lg font-bold">{feeRates.standard.fee} sat/vB</div>
            <div className="text-xs text-gray-500">{feeRates.standard.estimatedTime}</div>
          </button>
          
          <button
            onClick={() => handleTierSelect('priority')}
            className={`p-3 rounded-lg border transition text-left ${
              selectedTier === 'priority' && !isCustom
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            type="button"
          >
            <div className="font-medium">Priority</div>
            <div className="text-lg font-bold">{feeRates.priority.fee} sat/vB</div>
            <div className="text-xs text-gray-500">{feeRates.priority.estimatedTime}</div>
          </button>
        </div>
      </div>
      
      <div className="custom-fee mt-4 bg-orange-50 dark:bg-navy-800 p-3 rounded-lg">
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="use-custom-fee"
              checked={isCustom}
              onChange={() => {
                const newIsCustom = !isCustom;
                setIsCustom(newIsCustom);
                if (!newIsCustom) {
                  // If unchecking custom, revert to standard
                  handleTierSelect('standard');
                }
              }}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="use-custom-fee" className="text-sm font-medium">
              Use custom fee rate
            </label>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Higher fees make your transaction confirm faster but cost more. Lower fees are cheaper but may take longer to confirm.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {isCustom && (
          <div className="flex items-center mt-2">
            <input
              type="number"
              value={customFee}
              onChange={handleCustomFeeChange}
              placeholder="Enter custom fee rate"
              className="p-2 border rounded-md w-36 text-sm"
              min="1"
            />
            <span className="ml-2 text-sm text-gray-500">sat/vB</span>
          </div>
        )}
      </div>
      
      <div className="mempool-info text-xs text-gray-500 mt-3 flex justify-between items-center">
        <div className="flex items-center">
          <span>Mempool status:</span>
          <span className={`ml-1 font-medium ${
            mempoolStatus === 'High' 
              ? 'text-red-500' 
              : mempoolStatus === 'Medium' 
              ? 'text-orange-500' 
              : 'text-green-500'
          }`}>
            {mempoolStatus}
          </span>
        </div>
        <p>Last updated: {lastUpdated}</p>
      </div>
    </div>
  );
};

export default FeeSelector; 