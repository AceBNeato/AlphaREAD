import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from './ui/button';

export function ApiKeyTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApiKey = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3736f45/test-api-key`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md border-2 border-blue-500 z-50">
      <h3 className="text-lg font-bold mb-2">🔑 API Key Test</h3>
      <Button onClick={testApiKey} disabled={loading} className="mb-3">
        {loading ? 'Testing...' : 'Test ElevenLabs API Key'}
      </Button>
      
      {result && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto max-h-64">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      {result && !result.configured && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900 rounded text-sm">
          <strong>❌ API Key Not Set!</strong>
          <p className="mt-1">You need to add your API key to the environment variables.</p>
        </div>
      )}
      
      {result && result.configured && !result.isValid && (
        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
          <strong>⚠️ Invalid API Key!</strong>
          <p className="mt-1">The key is set but ElevenLabs rejected it.</p>
          <p className="mt-1 font-mono text-xs break-all">
            Key: {result.keyPrefix}...
          </p>
          <p className="mt-2">
            Go to <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" className="underline text-blue-600">
              ElevenLabs Settings
            </a> and verify your key.
          </p>
        </div>
      )}
      
      {result && result.isValid && (
        <div className="mt-3 p-3 bg-green-100 dark:bg-green-900 rounded text-sm">
          <strong>✅ API Key Valid!</strong>
          <p className="mt-1">
            Subscription: {result.userInfo?.subscription || 'Free'}
          </p>
          <p>
            Characters: {result.userInfo?.characterCount}/{result.userInfo?.characterLimit}
          </p>
        </div>
      )}
    </div>
  );
}
