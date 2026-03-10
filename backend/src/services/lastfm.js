const crypto = require('crypto');
const axios = require('axios');

const LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/';

class LastFMService {
  constructor(apiKey, secret, username) {
    this.apiKey = apiKey;
    this.secret = secret;
    this.username = username;
  }

  /**
   * Generate Last.fm authentication signature for API calls
   */
  getSignature(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join('');
    const message = sortedParams + this.secret;
    return crypto.createMd5Hash(message).digest('hex');
  }

  /**
   * Make an authenticated Last.fm API call
   */
  async makeRequest(method, params = {}) {
    const payload = {
      method,
      user: this.username,
      api_key: this.apiKey,
      format: 'json',
      ...params,
    };

    try {
      const response = await axios.get(LASTFM_API_URL, { params: payload });
      
      if (response.data.error) {
        throw new Error(`Last.fm API error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error(`Last.fm API call failed for method ${method}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch loved tracks from Last.fm with pagination
   * @returns {Array} Array of track objects { artist, title, url, album, image }
   */
  async getLovedTracks() {
    try {
      const allTracks = [];
      let page = 1;
      const limit = 200;
      
      while (true) {
        const response = await this.makeRequest('user.getLovedTracks', {
          limit,
          page,
          extended: 1,
        });

        if (!response.lovedtracks || !response.lovedtracks.track) {
          break;
        }

        const tracks = Array.isArray(response.lovedtracks.track)
          ? response.lovedtracks.track
          : [response.lovedtracks.track];

        allTracks.push(...tracks.map((track) => {
          // Extract artist more defensively - handle various Last.fm API formats
          let artist = '';
          if (track.artist) {
            if (typeof track.artist === 'object' && track.artist.name) {
              artist = this.normalizeString(track.artist.name);
            } else if (typeof track.artist === 'string') {
              artist = this.normalizeString(track.artist);
            }
          }
          
          const title = this.normalizeString(track.name);
          
          return {
            artist,
            title,
            lastfm_url: track.url,
            album: track.album?.name ? this.normalizeString(track.album.name) : null,
            album_art_url: this.getImageUrl(track.image),
          };
        }).filter((track) => {
          // Skip tracks with missing or "NA" artist or title
          if (!track.artist || track.artist === 'NA' || !track.title || track.title === 'NA') {
            console.warn('[lastfm] Skipping loved track with missing artist or title:', track);
            return false;
          }
          return true;
        }));

        // Check if there are more pages
        if (!response.lovedtracks['@attr'] || page >= parseInt(response.lovedtracks['@attr'].totalPages || 1)) {
          break;
        }
        page++;
      }

      return allTracks;
    } catch (error) {
      console.error('Error fetching loved tracks:', error);
      throw error;
    }
  }

  /**
   * Fetch library albums from Last.fm with pagination
   * @returns {Array} Array of album objects { artist, album, playcount, url, image }
   */
  async getLibraryAlbums() {
    try {
      const allAlbums = [];
      let page = 1;
      const limit = 200;

      while (true) {
        const response = await this.makeRequest('library.getalbums', {
          limit,
          page,
        });

        if (!response.albums || !response.albums.album) {
          break;
        }

        const albums = Array.isArray(response.albums.album)
          ? response.albums.album
          : [response.albums.album];

        allAlbums.push(...albums.map((album) => ({
          artist: this.normalizeString(album.artist.name || album.artist),
          album: this.normalizeString(album.name),
          playcount: parseInt(album.playcount) || 0,
          url: album.url,
          image: this.getImageUrl(album.image),
        })));

        if (!response.albums['@attr'] || page >= parseInt(response.albums['@attr'].totalPages || 1)) {
          break;
        }
        page++;
      }

      return allAlbums;
    } catch (error) {
      console.error('Error fetching library albums:', error);
      throw error;
    }
  }

  /**
   * Fetch all tracks from a specific album
   * @param {string} artist
   * @param {string} album
   * @returns {Array} Array of track objects { artist, title, url, albumName, albumImage }
   */
  async getAlbumTracks(artist, album) {
    try {
      const response = await this.makeRequest('album.getInfo', {
        artist,
        album,
      });

      if (!response.album || !response.album.tracks || !response.album.tracks.track) {
        return [];
      }

      const tracks = Array.isArray(response.album.tracks.track)
        ? response.album.tracks.track
        : [response.album.tracks.track];

      return tracks.map((track) => {
        // Extract artist defensively
        let artist = '';
        if (response.album && response.album.artist) {
          if (typeof response.album.artist === 'object' && response.album.artist.name) {
            artist = this.normalizeString(response.album.artist.name);
          } else if (typeof response.album.artist === 'string') {
            artist = this.normalizeString(response.album.artist);
          }
        }
        
        return {
          artist,
          title: this.normalizeString(track.name),
          url: track.url,
          albumName: this.normalizeString(response.album.name),
          albumImage: this.getImageUrl(response.album.image),
        };
      }).filter((track) => {
        // Skip tracks with missing or "NA" artist or title
        if (!track.artist || track.artist === 'NA' || !track.title || track.title === 'NA') {
          console.warn('[lastfm] Skipping album track with missing artist or title:', track);
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error(`Error fetching album tracks for ${artist} - ${album}:`, error);
      return [];
    }
  }

  /**
   * Fetch user playlists
   * @returns {Array} Array of playlist objects { id, title, trackCount, url }
   */
  async getUserPlaylists() {
    try {
      const response = await this.makeRequest('user.getplaylists');

      if (!response.playlists || !response.playlists.playlist) {
        console.warn('No playlists found or endpoint deprecated');
        return [];
      }

      const playlists = Array.isArray(response.playlists.playlist)
        ? response.playlists.playlist
        : [response.playlists.playlist];

      return playlists.map((playlist) => ({
        id: playlist.id,
        title: this.normalizeString(playlist.title),
        trackCount: parseInt(playlist.size) || 0,
        url: playlist.url,
      }));
    } catch (error) {
      console.warn('Error fetching playlists (may be deprecated endpoint):', error.message);
      return [];
    }
  }

  /**
   * Fetch tracks from a specific playlist
   * @param {string} playlistId
   * @returns {Array} Array of track objects { artist, title, url }
   */
  async getPlaylistTracks(playlistId) {
    try {
      const allTracks = [];
      let page = 1;
      const limit = 200;

      while (true) {
        const response = await this.makeRequest('playlist.fetch', {
          playlistURL: `lastfm://playlist/${playlistId}`,
          limit,
          page,
        });

        if (!response.playlist || !response.playlist.track) {
          break;
        }

        const tracks = Array.isArray(response.playlist.track)
          ? response.playlist.track
          : [response.playlist.track];

        allTracks.push(...tracks.map((track) => {
          // Extract artist defensively - handle various formats: creator, artist.name, artist (string)
          let artist = '';
          if (track.creator) {
            artist = this.normalizeString(track.creator);
          } else if (track.artist) {
            if (typeof track.artist === 'object' && track.artist.name) {
              artist = this.normalizeString(track.artist.name);
            } else if (typeof track.artist === 'string') {
              artist = this.normalizeString(track.artist);
            }
          }
          
          // Use artist as fallback if still empty
          if (!artist) {
            artist = 'Unknown';
          }
          
          const title = this.normalizeString(track.title || track.name);
          
          return {
            artist,
            title,
            url: track.url,
          };
        }).filter((track) => {
          // Skip tracks with missing or "NA" artist or title
          if (!track.artist || track.artist === 'NA' || !track.title || track.title === 'NA') {
            console.warn('[lastfm] Skipping playlist track with missing artist or title:', track);
            return false;
          }
          return true;
        }));

        if (!response.playlist['@attr'] || page >= parseInt(response.playlist['@attr'].totalPages || 1)) {
          break;
        }
        page++;
      }

      return allTracks;
    } catch (error) {
      console.warn(`Error fetching playlist tracks for ${playlistId}:`, error.message);
      return [];
    }
  }

  /**
   * Normalize string: trim whitespace and decode HTML entities
   * Returns empty string if input is falsy or becomes empty after trimming
   */
  normalizeString(str) {
    if (!str) return '';
    
    let normalized = str;
    
    // Handle case where str is an object (shouldn't happen, but defensive coding)
    if (typeof str === 'object') {
      return '';
    }
    
    normalized = String(str)
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
    
    return normalized;
  }

  /**
   * Get the best quality image URL from Last.fm image array
   */
  getImageUrl(images) {
    if (!images || !Array.isArray(images)) return null;

    // Last.fm provides images in order: small, medium, large, extralarge
    // Return the largest available
    const extralarge = images.find((img) => img.size === 'extralarge');
    if (extralarge) return extralarge['#text'];

    const large = images.find((img) => img.size === 'large');
    if (large) return large['#text'];

    const medium = images.find((img) => img.size === 'medium');
    if (medium) return medium['#text'];

    return images[images.length - 1]?.['#text'] || null;
  }

  /**
   * Test Last.fm credentials
   */
  async testConnection() {
    try {
      await this.makeRequest('user.getInfo');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTrackInfo(artist, title) {
    try {
      const response = await this.makeRequest('track.getInfo', {
        artist,
        track: title,
      });

      if (!response.track) return null;

      const track = response.track;
      const album = track.album || null;

      let albumArtUrl = null;
      if (album && album.image) {
        albumArtUrl = this.getImageUrl(album.image);
        // Reject the generic placeholder image
        if (albumArtUrl && albumArtUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          albumArtUrl = null;
        }
      }

      return {
        album_name: album?.title || null,
        album_art_url: albumArtUrl,
      };
    } catch (error) {
      console.warn(`[lastfm] Could not get track info for ${artist} - ${title}:`, error.message);
      return null;
    }
  }

}

module.exports = LastFMService;
