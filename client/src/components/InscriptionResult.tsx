import { InscriptionResult as InscriptionResultType } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, RefreshCcw, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InscriptionResultProps {
  result: InscriptionResultType;
  onReset?: () => void;
  onTryAgain?: () => void;
  renderError?: (errorMessage: string) => React.ReactNode;
}

export default function InscriptionResult({ 
  result, 
  onReset, 
  onTryAgain,
  renderError 
}: InscriptionResultProps) {
  const success = result.success;
  
  // Format inscription ID for display and as link
  const inscriptionId = result.inscriptionId;
  const inscriptionLink = inscriptionId 
    ? `https://ordinals.com/inscription/${inscriptionId}i`
    : null;
  
  return (
    <Card className={success ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
      <CardHeader className={success 
        ? "bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900" 
        : "bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900"
      }>
        <CardTitle className="flex items-center">
          {success ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700 dark:text-green-300">Inscription Successful</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">Inscription Failed</span>
            </>
          )}
        </CardTitle>
        <CardDescription>
          {success 
            ? "Your file has been successfully inscribed to the ordinals node"
            : "There was an error during the inscription process"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {success ? (
          <div className="space-y-4">
            {inscriptionId && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inscription ID:</h3>
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono overflow-x-auto flex-1">
                    {inscriptionId}i
                  </code>
                  {inscriptionLink && (
                    <a 
                      href={inscriptionLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {result.transactionId && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID:</h3>
                <div className="flex items-center space-x-2">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono overflow-x-auto flex-1">
                    {result.transactionId}
                  </code>
                  <a 
                    href={`https://mempool.space/tx/${result.transactionId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
            
            {result.feePaid && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Paid:</h3>
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                  {result.feePaid} sats
                </code>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {renderError ? renderError(result.errorMessage || 'Unknown error') : (
                  <p className="text-red-600 dark:text-red-400">{result.errorMessage || 'Unknown error'}</p>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 pt-2">
        {!success && onTryAgain && (
          <Button variant="outline" onClick={onTryAgain} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        {onReset && (
          <Button variant="default" onClick={onReset}>
            Inscribe Another File
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 