import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RotateCw, Trash2 } from "lucide-react";
import InscriptionStatus, { InscriptionStatusItem } from './InscriptionStatus';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

/**
 * Component that fetches and displays the status of inscriptions
 */
export default function InscriptionStatusDisplay() {
  const [inscriptions, setInscriptions] = useState<InscriptionStatusItem[]>([]);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', '/api/inscriptions');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inscriptions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert date strings to Date objects
      const inscriptionsWithDates = data.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      
      setInscriptions(inscriptionsWithDates);
    } catch (err) {
      console.error('Failed to fetch inscriptions:', err);
      setError('Failed to fetch inscription status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInscriptionStatus = async (id: string) => {
    try {
      const response = await apiRequest('POST', `/api/inscriptions/${id}/check`);
      
      if (!response.ok) {
        throw new Error(`Failed to refresh inscription: ${response.statusText}`);
      }
      
      // Refresh the full list to get the updated status
      await fetchInscriptions();
      
      toast({
        title: "Inscription Status Updated",
        description: "The inscription status has been refreshed.",
      });
    } catch (err) {
      console.error('Failed to refresh inscription status:', err);
      toast({
        title: "Failed to Update",
        description: "Couldn't refresh the inscription status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearAllInscriptions = async () => {
    if (!confirm('Are you sure you want to clear all inscription history?')) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', '/api/inscriptions');
      
      if (!response.ok) {
        throw new Error(`Failed to clear inscriptions: ${response.statusText}`);
      }
      
      setInscriptions([]);
      
      toast({
        title: "All Inscriptions Cleared",
        description: "Your inscription history has been cleared.",
      });
    } catch (err) {
      console.error('Failed to clear inscriptions:', err);
      toast({
        title: "Failed to Clear",
        description: "Couldn't clear the inscription history. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const deleteInscription = async (id: string) => {
    try {
      const response = await apiRequest('DELETE', `/api/inscriptions/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to delete inscription: ${response.statusText}`);
      }
      
      // Remove the deleted inscription from the state
      setInscriptions(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Inscription Deleted",
        description: "The inscription record has been removed from history.",
      });
    } catch (err) {
      console.error('Failed to delete inscription:', err);
      toast({
        title: "Failed to Delete",
        description: "Couldn't delete the inscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInscriptions();
    
    // Set up polling to refresh inscription status automatically every 60 seconds
    const interval = setInterval(() => {
      fetchInscriptions();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading && inscriptions.length === 0) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin h-6 w-6 border-4 border-orange-500 dark:border-orange-400 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error && inscriptions.length === 0) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchInscriptions} 
          className="ml-auto"
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <Card className="bg-white dark:bg-navy-900 border-orange-200 dark:border-navy-700">
        <CardHeader>
          <CardTitle>Inscription History</CardTitle>
          <CardDescription>Track your inscription transactions here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No inscriptions yet. After you inscribe files, they will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get the limited list based on the display limit
  const limitedInscriptions = inscriptions.slice(0, displayLimit);
  
  // Calculate remaining count
  const hasMore = inscriptions.length > displayLimit;
  const remainingCount = inscriptions.length - displayLimit;

  return (
    <Card className="bg-white dark:bg-navy-900 border-orange-200 dark:border-navy-700">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Inscription History</CardTitle>
          <CardDescription>Track the status of your inscriptions</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Show:</span>
            <select 
              value={displayLimit} 
              onChange={(e) => setDisplayLimit(Number(e.target.value))}
              className="bg-white dark:bg-navy-900 text-sm border border-orange-200 dark:border-navy-700 rounded px-2 py-1"
            >
              <option value={10}>10 items</option>
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
              <option value={100}>100 items</option>
              <option value={1000}>All items</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchInscriptions}
              className="flex items-center text-orange-600 dark:text-orange-400"
            >
              <RotateCw size={16} className="mr-1" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllInscriptions}
              className="flex items-center text-red-600 dark:text-red-400"
            >
              <Trash2 size={16} className="mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <InscriptionStatus 
          items={limitedInscriptions} 
          onRefresh={fetchInscriptions}
          onRefreshItem={refreshInscriptionStatus}
          onClearAll={clearAllInscriptions}
          onDeleteItem={deleteInscription}
        />
        
        {hasMore && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <p>Showing {limitedInscriptions.length} of {inscriptions.length} inscriptions.</p>
            <p>Use the dropdown above to show more inscriptions or clear old history.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}