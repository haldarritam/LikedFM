import { useState, useEffect } from 'react';

export default function BookmarkManager() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const response = await fetch('/api/bookmarks');
      const data = await response.json();
      setBookmarks(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch bookmarks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    if (!artist.trim() || !album.trim()) {
      setError('Artist and album name required');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: artist.trim(), album: album.trim() }),
      });

      if (!response.ok) throw new Error('Failed to add bookmark');

      setArtist('');
      setAlbum('');
      setError('');
      fetchBookmarks();
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteBookmark = async (id) => {
    if (!confirm('Remove this bookmark?')) return;

    try {
      const response = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete bookmark');
      fetchBookmarks();
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-700">
      <h2 className="text-2xl font-bold mb-4">Album Bookmarks</h2>
      <p className="text-gray-400 text-sm mb-4">Add albums to sync automatically on each sync cycle</p>

      {/* Add Bookmark Form */}
      <form onSubmit={handleAddBookmark} className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g., Coldplay"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Album</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="e.g., Ghost Stories"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={adding}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium"
        >
          {adding ? 'Adding...' : 'Add Bookmark'}
        </button>
      </form>

      {/* Bookmarks List */}
      {loading ? (
        <p className="text-gray-400">Loading bookmarks...</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-gray-400">No bookmarks yet</p>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Artist</th>
                <th className="px-4 py-2 text-left">Album</th>
                <th className="px-4 py-2 text-left">Added</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookmarks.map((bookmark) => (
                <tr key={bookmark.id} className="border-t border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-3">{bookmark.artist}</td>
                  <td className="px-4 py-3">{bookmark.album}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(bookmark.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
