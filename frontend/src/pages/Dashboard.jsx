import { useState, useEffect } from 'react';
import TrackCard from '../components/TrackCard';
import SyncStats from '../components/SyncStats';
import ActivityLog from '../components/ActivityLog';

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [retryingFailed, setRetryingFailed] = useState(false);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchTracksAndStats();
    const interval = setInterval(fetchTracksAndStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [statusFilter, sourceFilter, searchQuery, pageSize]);

  // SSE listener for real-time track updates
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle all track update event types
        if (
          data.type === 'track_updated' ||
          data.type === 'track_downloaded' ||
          data.type === 'track_downloading' ||
          data.type === 'track_failed'
        ) {
          setTracks((prev) =>
            prev.map((t) => {
              if (t.id !== data.trackId) return t;
              return {
                ...t,
                status: data.status ?? t.status,
                // Explicitly set to null when server says null
                // Use 'in' operator to detect explicit null from server
                download_error: 'download_error' in data ? data.download_error : t.download_error,
                file_path: data.filePath ?? t.file_path,
              };
            })
          );
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchTracksAndStats = async () => {
    try {
      let url = `/api/tracks?sort=created_at&order=desc&limit=${pageSize}&page=${currentPage}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (sourceFilter !== 'all') url += `&source=${sourceFilter}`;

      const [tracksRes, statsRes] = await Promise.all([
        fetch(url),
        fetch('/api/stats'),
      ]);

      const tracksData = await tracksRes.json();
      const statsData = await statsRes.json();

      // Filter tracks by search query client-side
      let filteredTracks = tracksData.data;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredTracks = tracksData.data.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query) ||
            (t.album && t.album.toLowerCase().includes(query))
        );
      }

      setTracks(filteredTracks);
      setStats(statsData);
      setTotalPages(tracksData.pages || 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (trackId) => {
    try {
      await fetch(`/api/tracks/${trackId}/ignore`, { method: 'PATCH' });
      await fetchTracksAndStats();
    } catch (error) {
      console.error('Error ignoring track:', error);
    }
  };

  const handleUnignore = async (trackId) => {
    try {
      await fetch(`/api/tracks/${trackId}/unignore`, { method: 'PATCH' });
      await fetchTracksAndStats();
    } catch (error) {
      console.error('Error un-ignoring track:', error);
    }
  };

  const handleDownloadTrack = async (trackId) => {
    try {
      const response = await fetch(`/api/sync/tracks/${trackId}/download`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchTracksAndStats();
      }
    } catch (error) {
      console.error('Error triggering download:', error);
    }
  };

  const handleRetryTrack = async (trackId) => {
    try {
      await fetch(`/api/sync/tracks/${trackId}/download`, { method: 'POST' });
    } catch (error) {
      console.error('Error retrying track:', error);
    }
  };

  const handleRetryAllFailed = async () => {
    setRetryingFailed(true);
    
    // Optimistic UI update: clear errors on all failed tracks and set to pending
    setTracks(prevTracks =>
      prevTracks.map(track =>
        track.status === 'failed'
          ? { ...track, status: 'pending', download_error: null }
          : track
      )
    );
    
    try {
      await fetch('/api/sync/retry-failed', { method: 'POST' });
    } catch (error) {
      console.error('Error retrying failed tracks:', error);
    } finally {
      setRetryingFailed(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      setTimeout(() => {
        fetchTracksAndStats();
        setSyncing(false);
      }, 2000);
    } catch (error) {
      console.error('Error triggering sync:', error);
      setSyncing(false);
    }
  };

  const handleManualFileScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/sync/file-scan', { method: 'POST' });
      setTimeout(() => {
        fetchTracksAndStats();
        setScanning(false);
      }, 2000);
    } catch (error) {
      console.error('Error triggering file scan:', error);
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const failedCount = stats?.status?.failed || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">🎵 LikedFM</h1>
            <p className="text-gray-400 mt-1">Music taste sync for Last.fm + YouTube</p>
          </div>

          <div className="flex gap-2">
            {failedCount > 0 && (
              <button
                onClick={handleRetryAllFailed}
                disabled={retryingFailed}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              >
                {retryingFailed ? '🔄 Retrying...' : `🔄 Retry ${failedCount} Failed`}
              </button>
            )}

            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
            >
              {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
            </button>

            <button
              onClick={handleManualFileScan}
              disabled={scanning}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
              title="Scan music directory and verify downloads"
            >
              {scanning ? '📁 Scanning...' : '📁 Scan Files'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && <SyncStats stats={stats} />}

        {/* Status Filters */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Status</h3>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'pending', 'downloading', 'downloaded', 'failed', 'ignored'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filters */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Source</h3>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'loved', 'album', 'playlist'].map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                  sourceFilter === source
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {source === 'all' && 'All Sources'}
                {source === 'loved' && '❤️ Loved'}
                {source === 'album' && '💿 Albums'}
                {source === 'playlist' && '📋 Playlists'}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Pagination Controls */}
        <div className="mb-6 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="text-sm font-semibold text-gray-300 mb-2 block">
              🔍 Search by artist, title, or album
            </label>
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">
              Per page
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Pagination Info */}
        {tracks.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              Showing page <span className="font-semibold text-white">{currentPage}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span>
              {searchQuery && ` (filtered by search)`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 transition"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Track List */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          {tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No tracks to display</p>
              <p className="text-sm mt-2">Try clicking "Sync Now" to get started</p>
            </div>
          ) : (
            tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onIgnore={handleIgnore}
                onUnignore={handleUnignore}
                onDownload={handleDownloadTrack}
                onRetry={handleRetryTrack}
              />
            ))
          )}
        </div>

        {/* Activity Log */}
        <ActivityLog />
      </div>
    </div>
  );
}
