import { useState } from 'react';

export default function SettingsForm({ onSave, initialSettings }) {
  const [formData, setFormData] = useState(initialSettings || {});
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Filter out masked values (***) so we don't overwrite existing keys
      const dataToSave = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '***') {
          dataToSave[key] = value;
        }
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);

      if (onSave) onSave();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLastfm = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/settings/test-lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      setTestResults({ lastfm: result });
    } catch (error) {
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestYtdlp = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/settings/test-ytdlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      setTestResults({ ytdlp: result });
    } catch (error) {
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-6">Settings</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.includes('Error')
              ? 'bg-red-900 text-red-200'
              : 'bg-green-900 text-green-200'
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Last.fm Settings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white text-lg">Last.fm</h3>

          <input
            type="text"
            name="lastfm_username"
            placeholder="Username"
            value={formData.lastfm_username || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          <input
            type="password"
            name="lastfm_api_key"
            placeholder="API Key"
            value={formData.lastfm_api_key || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          <input
            type="password"
            name="lastfm_secret"
            placeholder="Secret"
            value={formData.lastfm_secret || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Download Settings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white text-lg">Download Settings</h3>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Music Output Directory
            </label>
            <input
              type="text"
              name="music_output_dir"
              placeholder="/music"
              value={formData.music_output_dir || '/music'}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Audio Format
            </label>
            <select
              name="audio_format"
              value={formData.audio_format || 'mp3'}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
              <option value="opus">Opus</option>
              <option value="m4a">M4A</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Audio Quality
            </label>
            <select
              name="audio_quality"
              value={formData.audio_quality || '320k'}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="128k">128 kbps (Low)</option>
              <option value="192k">192 kbps (Medium)</option>
              <option value="256k">256 kbps (High)</option>
              <option value="320k">320 kbps (Very High)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Max Concurrent Downloads
            </label>
            <input
              type="number"
              name="max_concurrent_downloads"
              value={formData.max_concurrent_downloads || 2}
              onChange={handleChange}
              min="1"
              max="5"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              YouTube Search Preference
            </label>
            <select
              name="search_preference"
              value={formData.search_preference || 'auto'}
              onChange={handleChange}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto (Official Audio)</option>
              <option value="official_audio">Official Audio Only</option>
              <option value="lyrics">Lyrics Videos</option>
            </select>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white text-lg">Sync Settings</h3>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              name="sync_interval"
              value={formData.sync_interval || 360}
              onChange={handleChange}
              min="1"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              File Scan Interval (minutes)
            </label>
            <input
              type="number"
              name="scan_interval"
              min="1"
              max="1440"
              value={formData.scan_interval ?? 10}
              onChange={(e) => setFormData({ 
                ...formData, 
                scan_interval: parseInt(e.target.value) 
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              How often LikedFM scans your music directory to detect already-downloaded 
              tracks. Minimum 1 minute, maximum 1440 (24 hours). Default: 10 minutes.
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Max Download Retry Attempts
            </label>
            <input
              type="number"
              name="max_retries"
              min="0"
              max="10"
              value={formData.max_retries ?? 3}
              onChange={(e) => setFormData({ 
                ...formData, 
                max_retries: parseInt(e.target.value) 
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Number of times to retry a failed download before marking it as permanently failed.
              File scanner will retry missing files during each scan. Default: 3 attempts.
            </p>
          </div>

          <h4 className="font-semibold text-gray-300 text-sm mt-4">Sync Sources</h4>

          <div>
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                name="sync_loved"
                checked={formData.sync_loved !== false}
                onChange={handleChange}
                disabled={true}
                className="mr-3"
              />
              ❤️ Loved Tracks
              <span className="text-xs text-gray-400 ml-2">(always enabled)</span>
            </label>
          </div>

          <div>
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                name="sync_albums"
                checked={formData.sync_albums || false}
                onChange={handleChange}
                className="mr-3"
              />
              💿 Library Albums
            </label>
          </div>

          <div>
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                name="sync_playlists"
                checked={formData.sync_playlists || false}
                onChange={handleChange}
                className="mr-3"
              />
              📋 Playlists
            </label>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-700 rounded p-4">
            <h4 className="font-semibold text-white mb-2">Connection Test Results</h4>
            {testResults.error ? (
              <p className="text-red-400 text-sm">{testResults.error}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {testResults.lastfm && (
                  <p className={testResults.lastfm.success ? 'text-green-400' : 'text-red-400'}>
                    Last.fm: {testResults.lastfm.success ? '✓ Connected' : '✗ Failed'}
                  </p>
                )}
                {testResults.ytdlp && (
                  <div className={testResults.ytdlp.success ? 'text-green-400' : 'text-red-400'}>
                    <p>yt-dlp: {testResults.ytdlp.success ? '✓ Installed' : '✗ Not Found'}</p>
                    {testResults.ytdlp.version && (
                      <p className="text-xs text-gray-300">Version: {testResults.ytdlp.version}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleTestLastfm}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-semibold transition"
          >
            {loading ? 'Testing...' : 'Test Last.fm'}
          </button>

          <button
            onClick={handleTestYtdlp}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-semibold transition"
          >
            {loading ? 'Testing...' : 'Test yt-dlp'}
          </button>
        </div>
      </div>
    </div>
  );
}
