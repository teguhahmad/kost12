import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
      
      const { data, error } = await supabase.functions.invoke('auto-billing', {
        method: 'POST',
      });

      if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response received from the Edge Function');
      }

      if (data.errors && data.errors.length > 0) {
        // Show partial success message if some tenants were processed
        if (data.processed > 0) {
          setMessage(`Processed ${data.processed} payment reminders with ${data.errors.length} errors`);
          setShowSuccess(true);
        } else {
          throw new Error(`Failed to process payment reminders: ${data.errors[0].error}`);
        }
      } else {
        setMessage(`Successfully processed ${data.processed} payment reminders`);
        setShowSuccess(true);
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