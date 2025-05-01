import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const TestBillingButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    try {
      setIsLoading(true);
      setShowSuccess(false);
      setShowError(false);

      console.log('Invoking auto-billing function...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-billing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Function response:', data);

      if (!data) {
        throw new Error('No response received from the Edge Function');
      }

      // Handle the response
      if (data.success) {
        setMessage(data.message || `Successfully processed ${data.processed} payment reminders`);
        setShowSuccess(true);
      } else {
        throw new Error(data.error || 'Auto-billing process failed');
      }

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.warn('Processing errors:', data.errors);
        if (data.processed > 0) {
          setMessage(`Processed ${data.processed} payment reminders with ${data.errors.length} errors`);
          setShowSuccess(true);
        } else {
          throw new Error(`Failed to process payment reminders: ${data.errors[0].error}`);
        }
      }

      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error('Error processing auto billing:', err);
      setMessage(err.message || 'Failed to process payment reminders');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="fixed bottom-24 right-20 z-50 p-3 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:scale-110"
        title="Test Payment Reminders"
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Mail className="h-6 w-6" />
        )}
      </button>

      {showSuccess && (
        <div className="fixed bottom-36 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center z-50">
          <CheckCircle size={20} className="mr-2" />
          {message}
        </div>
      )}

      {showError && (
        <div className="fixed bottom-36 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center z-50">
          <AlertCircle size={20} className="mr-2" />
          {message}
        </div>
      )}
    </>
  );
};

export default TestBillingButton;