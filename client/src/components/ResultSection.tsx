import { CheckCircle, AlertTriangle, Info, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InscriptionResult } from "@/lib/types";

interface ResultSectionProps {
  result: InscriptionResult;
  onReset: () => void;
  onTryAgain: () => void;
}

export default function ResultSection({ result, onReset, onTryAgain }: ResultSectionProps) {
  if (result.success) {
    return (
      <section className="p-6">
        <div>
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900">Inscription Complete!</h2>
          </div>

          {result.message && (
            <div className="bg-blue-50 p-4 rounded-md mb-4 flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-700">{result.message}</p>
            </div>
          )}

          {result.manualCommand ? (
            // Show manual command section
            <div className="bg-amber-50 p-4 rounded-md mb-4">
              <h3 className="font-medium text-amber-700 mb-2 flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                Manual Execution Required
              </h3>
              <p className="text-sm text-amber-700 mb-2">
                The file has been copied successfully to the container. To complete the inscription, 
                please run the following command in your terminal:
              </p>
              <pre className="text-amber-800 text-sm whitespace-pre-wrap font-mono bg-amber-100 p-3 rounded overflow-x-auto">
                {result.manualCommand}
              </pre>
              
              {result.containerFilePath && (
                <div className="mt-2 text-sm text-amber-700">
                  <strong>File location:</strong> {result.containerFilePath}
                </div>
              )}
            </div>
          ) : (
            // Show standard inscription details
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">Inscription Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Inscription ID:</dt>
                <dd className="text-gray-800 font-mono">{result.inscriptionId || '-'}</dd>

                <dt className="text-gray-500">Transaction ID:</dt>
                <dd className="text-gray-800 font-mono">{result.transactionId || '-'}</dd>

                <dt className="text-gray-500">Fee Paid:</dt>
                <dd className="text-gray-800">{result.feePaid || '-'}</dd>
              </dl>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button onClick={onReset}>
              Inscribe Another Image
            </Button>
          </div>
        </div>
      </section>
    );
  } else {
    return (
      <section className="p-6">
        <div>
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-900">Inscription Failed</h2>
          </div>

          <div className="bg-red-50 p-4 rounded-md">
            <h3 className="font-medium text-red-800 mb-2">Error Details</h3>
            <pre className="text-red-700 text-sm whitespace-pre-wrap font-mono bg-red-100 p-3 rounded max-h-40 overflow-y-auto">
              {result.errorMessage || 'Unknown error occurred'}
            </pre>
            <div className="p-4 my-2 bg-red-50 border border-red-300 rounded-md dark:bg-red-950 dark:border-red-900">
              <div className="text-red-800 dark:text-red-300 font-medium">Error Details</div>
              <div className="mt-1 text-sm text-red-700 dark:text-red-400">
                {result.errorMessage && typeof result.errorMessage === 'object' && 'message' in result.errorMessage
                  ? result.errorMessage.message
                  : String(result.errorMessage)}
              </div>
              {(result.errorMessage && String(result.errorMessage).includes("Docker daemon socket") || String(result.errorMessage).includes("docker")) && (
                <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded-md text-sm">
                  <strong>Running in Replit:</strong> This is a preview environment. Full inscription functionality 
                  requires Docker with a Bitcoin Ordinals node running locally. 
                  The UI works, but actual Bitcoin inscriptions cannot be created in Replit.
                </div>
              )}
            </div>

            {(result.errorMessage?.includes('docker: not found') || result.errorMessage?.includes('502') || result.errorMessage?.includes('Failed to fetch')) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <p className="font-medium">Replit Environment Notice:</p>
                <p className="text-sm mt-1">
                  This tool requires a Bitcoin Ordinals node running in Docker, which is not supported in the Replit environment. 
                  The "Failed to fetch" or 502 error occurs because the application is trying to communicate with a Docker container that doesn't exist.
                </p>
                <p className="text-sm mt-2">
                  To use this tool, you would need to run it in an environment with Docker support and a Bitcoin Ordinals node.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Button onClick={onTryAgain}>
              Try Again
            </Button>
            <Button variant="outline" onClick={onReset}>
              Start Over
            </Button>
          </div>
        </div>
      </section>
    );
  }
}