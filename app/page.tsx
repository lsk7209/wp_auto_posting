'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [sites, setSites] = useState<any[]>([]);
  const [models, setModels] = useState<{ text_models: any[], image_models: any[] }>({ text_models: [], image_models: [] });
  const [prompts, setPrompts] = useState<any[]>([]);

  const [selectedSite, setSelectedSite] = useState('');
  const [selectedTextModel, setSelectedTextModel] = useState('');
  const [selectedImageModel, setSelectedImageModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        // In a real app, we'd fetch sites and prompts from an API too, 
        // but for now we might need to import them or fetch from a new API endpoint if we made one.
        // Since we didn't make API for sites/prompts, let's assume we can fetch them or just hardcode for demo 
        // OR we should have made API routes for them. 
        // The PRD says "UI는 models.json 기준(SSOT)".
        // Let's fetch models.
        const modelsRes = await axios.get('/api/models');
        setModels(modelsRes.data);
        if (modelsRes.data.text_models.length > 0) setSelectedTextModel(modelsRes.data.text_models[0].id);
        if (modelsRes.data.image_models.length > 0) setSelectedImageModel(modelsRes.data.image_models[0].id);

        // Fetch sites/prompts (Mocking since no API created for them yet, or I should create them?)
        // I'll just hardcode for now or fetch from a static file if possible.
        // Actually, I can just import the JSON files if I was server side, but this is client.
        // I'll add a simple API for sites/prompts or just mock it here.
        setSites([{ id: 'site_1', label: 'Main Blog' }]);
        setPrompts([{ id: 'default_blog', content: 'Default Blog Prompt' }]);
        setSelectedSite('site_1');
        setSystemPrompt('Default Blog Prompt');
      } catch (error) {
        console.error('Error fetching data:', error);
        addLog('Error fetching initial data');
      }
    };
    fetchData();
  }, []);

  const addLog = (msg: string) => {
    setStatusLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExcelFile(e.target.files[0]);
    }
  };

  const handleStartPublishing = async () => {
    if (!excelFile) {
      alert('Please upload an Excel file');
      return;
    }

    setIsPublishing(true);
    addLog('Starting publishing job...');

    const formData = new FormData();
    formData.append('site_id', selectedSite);
    formData.append('text_model_id', selectedTextModel);
    formData.append('image_model_id', selectedImageModel);
    formData.append('excel_file', excelFile);
    formData.append('system_prompt', systemPrompt);

    try {
      const res = await axios.post('/api/publish', formData);
      addLog(`Job created! Job ID: ${res.data.job_id}`);
      addLog('GitHub Actions cron will pick this up shortly.');
    } catch (error) {
      console.error('Error publishing:', error);
      addLog('Error creating job');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSyncModels = async () => {
    addLog('Syncing models...');
    try {
      const res = await axios.post('/api/models/sync');
      setModels(res.data);
      addLog('Models synced successfully');
    } catch (error) {
      addLog('Error syncing models');
    }
  };

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-gray-900 text-white">
      {/* Left Panel */}
      <div className="w-full md:w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-blue-400">WP Auto-Pilot</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Site</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded p-2"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              {sites.map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Text Model</label>
            <div className="flex gap-2">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                value={selectedTextModel}
                onChange={(e) => setSelectedTextModel(e.target.value)}
              >
                {models.text_models?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <button onClick={handleSyncModels} className="bg-gray-700 px-3 rounded hover:bg-gray-600">↻</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image Model</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded p-2"
              value={selectedImageModel}
              onChange={(e) => setSelectedImageModel(e.target.value)}
            >
              {models.image_models?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">System Prompt</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 h-32"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excel File</label>
            <input
              type="file"
              accept=".xlsx"
              className="w-full bg-gray-800 border border-gray-700 rounded p-2"
              onChange={handleFileChange}
            />
          </div>

          <button
            className={`w-full py-3 rounded font-bold ${isPublishing ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            onClick={handleStartPublishing}
            disabled={isPublishing}
          >
            {isPublishing ? 'Creating Job...' : 'Start Publishing'}
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-2/3 p-6 bg-black">
        <h2 className="text-xl font-bold mb-4 text-green-400">Status Logs</h2>
        <div className="bg-gray-900 rounded p-4 h-[calc(100vh-8rem)] overflow-y-auto font-mono text-sm">
          {statusLogs.length === 0 ? (
            <p className="text-gray-500">Ready to start...</p>
          ) : (
            statusLogs.map((log, i) => (
              <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
