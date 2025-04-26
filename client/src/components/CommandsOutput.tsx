import React from 'react';

interface CommandsOutputProps {
  commands: string;
  className?: string;
}

const CommandsOutput: React.FC<CommandsOutputProps> = ({ commands, className = '' }) => {
  return (
    <div className={`bg-gray-900 rounded-md p-4 overflow-x-auto ${className}`}>
      <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap">{commands}</pre>
    </div>
  );
};

export default CommandsOutput; 