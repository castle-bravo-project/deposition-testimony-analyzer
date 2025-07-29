import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'gemini_api_key';

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
    setSaved(true);
  };

  const handleClear = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setApiKey('');
    setSaved(false);
  };

  return (
    <div className="p-4 border-t mt-4">
      <h3 className="font-semibold mb-2 text-sm">Gemini API Key</h3>
      <input
        type="password"
        className="w-full border rounded px-2 py-1 text-sm mb-2"
        placeholder="Paste your Gemini API key"
        value={apiKey}
        onChange={handleChange}
        autoComplete="off"
      />
      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-400"
          onClick={handleClear}
        >
          Clear
        </button>
        {saved && <span className="text-green-600 text-xs ml-2">Saved!</span>}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Your API key is stored only in your browser and never sent anywhere else.
      </p>
    </div>
  );
}
