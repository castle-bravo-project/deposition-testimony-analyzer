import React, { useCallback, useState } from 'react';
import { PdfIcon } from './icons/PdfIcon';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface FileUploadProps {
  file: File | null;
  onFileChange: (file: File) => void;
  onClear: () => void;
  isParsing: boolean;
  isLoading: boolean;
  sourceFileHash: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ file, onFileChange, onClear, isParsing, isLoading, sourceFileHash }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
    }
  }, [onFileChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        onFileChange(e.target.files[0]);
    }
  };

  return (
    <div>
      <label htmlFor="pdf-upload" className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
        Deposition Document
      </label>
      
      {!file && !isParsing ? (
        <label
          htmlFor="pdf-upload"
          className={`relative block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
            ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30' : 'border-slate-400 hover:border-slate-500 dark:border-slate-600 dark:hover:border-slate-500'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
            <UploadIcon className="w-10 h-10 mb-3" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Drag & Drop PDF here</span>
            <span className="mt-1 text-sm">or click to browse</span>
          </div>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={handleInputChange}
            disabled={isLoading || isParsing}
          />
        </label>
      ) : (
        <div className="w-full p-4 bg-slate-200/50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-lg flex items-start justify-between">
          <div className="flex items-start gap-3 overflow-hidden">
             {isParsing ? (
                <SpinnerIcon className="w-6 h-6 text-sky-500 dark:text-sky-400 animate-spin flex-shrink-0 mt-1" />
             ) : (
                <PdfIcon className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" />
             )}
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file?.name ?? 'Parsing PDF...'}</p>
                {file && !isParsing && <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                {sourceFileHash && !isParsing && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 truncate" title={sourceFileHash}>
                        SHA-256: {sourceFileHash}
                    </p>
                )}
                 {isParsing && <p className="text-xs text-slate-500 dark:text-slate-400">Extracting text & calculating hash...</p>}
            </div>
          </div>
          {!isParsing && !isLoading && (
            <button
              onClick={onClear}
              className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0"
              aria-label="Clear file"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;