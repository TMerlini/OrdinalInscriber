import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Clock, AlertTriangle, Copy, ExternalLink, RefreshCw, RotateCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface InscriptionStatusItem {
  id: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'success' | 'failed';
  txid?: string;
  error?: string;
  timestamp: Date;
  ordinalId?: string;
  satoshiType?: string;
}

interface InscriptionStatusProps {
  items: InscriptionStatusItem[];
  onRefresh?: () => void;
  onRefreshItem?: (id: string) => void;
  onClearAll?: () => void;
  onDeleteItem?: (id: string) => void;
}

export default function InscriptionStatus({ 
  items, 
  onRefresh, 
  onRefreshItem,
  onClearAll,
  onDeleteItem
}: InscriptionStatusProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { toast } = useToast();
  
  // Filter items based on active tab
  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.status === activeTab);
  
  // Calculate status counts
  const pendingCount = items.filter(item => item.status === 'pending').length;
  const successCount = items.filter(item => item.status === 'success').length;
  const failedCount = items.filter(item => item.status === 'failed').length;
  
  // Calculate success rate
  const completedCount = successCount + failedCount;
  const successRate = completedCount > 0 
    ? Math.round((successCount / completedCount) * 100) 
    : 0;
  
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description,
      });
    });
  };
  
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('default', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>;
      case 'success':
        return <Badge className="bg-green-500 text-white flex items-center gap-1">
          <Check className="h-3 w-3" /> Success
        </Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Failed
        </Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  if (items.length === 0) {
    return (
      <Card className="w-full bg-white dark:bg-slate-950 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-orange-800 dark:text-orange-400">
            Inscription Status
          </CardTitle>
          <CardDescription>
            No inscription attempts have been made yet. Process some inscriptions to see their status here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full bg-white dark:bg-slate-950 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-lg font-medium text-orange-800 dark:text-orange-400">
              Inscription Status
            </CardTitle>
            <CardDescription>
              Track the status of your inscription transactions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-end">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            )}
            {onClearAll && (
              <Button variant="outline" size="sm" onClick={onClearAll} className="text-red-500 border-red-200 hover:bg-red-50">
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">TOTAL</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{items.length}</div>
                <div className="text-xs text-blue-500 dark:text-blue-400">Inscriptions</div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="p-3">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">SUCCESSFUL</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{successCount}</div>
                <div className="text-xs text-green-500 dark:text-green-400">{completedCount > 0 ? `${successRate}% success rate` : 'No completed inscriptions'}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-3">
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">PENDING</div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingCount}</div>
                <div className="text-xs text-yellow-500 dark:text-yellow-400">Inscriptions in process</div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <CardContent className="p-3">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">FAILED</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{failedCount}</div>
                <div className="text-xs text-red-500 dark:text-red-400">Check logs for details</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-3">
            <Progress value={successRate} className="h-2 bg-gray-200 dark:bg-gray-700" />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {completedCount > 0 
                ? `${successRate}% success rate (${successCount} of ${completedCount} completed)` 
                : 'No completed inscriptions yet'}
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">All ({items.length})</TabsTrigger>
              <TabsTrigger value="success">Success ({successCount})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({failedCount})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <Card key={item.id} className={`
                      shadow-sm border-l-4 
                      ${item.status === 'success' ? 'border-l-green-500' : ''}
                      ${item.status === 'pending' ? 'border-l-yellow-500' : ''}
                      ${item.status === 'failed' ? 'border-l-red-500' : ''}
                    `}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{item.fileName}</h3>
                              {getStatusBadge(item.status)}
                              {item.satoshiType && (
                                <Badge variant="outline" className="text-xs">
                                  {item.satoshiType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 self-end">
                            {item.status === 'success' && item.txid && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => copyToClipboard(item.txid!, 'Transaction ID copied')}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy TXID</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {item.status === 'success' && item.ordinalId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => window.open(`https://ordinals.com/inscription/${item.ordinalId}`, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Inscription</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {(item.status === 'failed' || item.status === 'pending') && onRefreshItem && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => onRefreshItem(item.id)}
                                    >
                                      <RotateCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{item.status === 'failed' ? 'Retry' : 'Check Status'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {onDeleteItem && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('This will only remove the inscription from your local history. The inscription on the blockchain is permanent and cannot be deleted. Continue?')) {
                                          onDeleteItem(item.id);
                                        }
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove from history</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        
                        {item.status === 'success' && item.txid && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Transaction ID:</div>
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded block overflow-x-auto">
                              {item.txid}
                            </code>
                          </div>
                        )}
                        
                        {item.status === 'failed' && item.error && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-red-500 dark:text-red-400">Error:</div>
                            <code className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-1 rounded block overflow-x-auto">
                              {item.error}
                            </code>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No {activeTab !== 'all' ? activeTab : ''} inscriptions found
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
          <p>
            After an inscription is sent to the mempool, it may take some time for miners to include it in a block. 
            Check the Bitcoin explorer for the latest status.
          </p>
          <p className="italic">
            <span className="font-medium">Note:</span> This history is stored locally. Removing items only affects your local tracking, 
            not the actual inscriptions on the blockchain, which are immutable and permanent.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}