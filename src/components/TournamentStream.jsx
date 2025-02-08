"use client";

import React, { useState, useEffect } from 'react';

const TournamentStream = ({ tournament, isCreator, onStreamUpdate }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [streamerName, setStreamerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, [tournament.id]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournament.id}/streams`);
      if (!response.ok) {
        throw new Error('Failed to fetch streams');
      }
      const data = await response.json();
      setStreams(data);
      onStreamUpdate(data);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addStream = async (e) => {
    e.preventDefault();
    if (!newStreamUrl.trim()) return;

    try {
      setIsAdding(true);
      const response = await fetch(`/api/tournaments/${tournament.id}/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamUrl: newStreamUrl,
          streamerName,
          isOfficial: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add stream');
      }

      await fetchStreams();
      setNewStreamUrl('');
      setStreamerName('');
    } catch (error) {
      console.error('Error adding stream:', error);
      setError(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const removeStream = async (streamId) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove stream');
      }

      await fetchStreams();
    } catch (error) {
      console.error('Error removing stream:', error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  const getChannelFromUrl = (url) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-6">
      {isCreator && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Stream</h3>
          <form onSubmit={addStream} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitch Stream URL
              </label>
              <input
                type="url"
                value={newStreamUrl}
                onChange={(e) => setNewStreamUrl(e.target.value)}
                placeholder="https://twitch.tv/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Streamer Name (Optional)
              </label>
              <input
                type="text"
                value={streamerName}
                onChange={(e) => setStreamerName(e.target.value)}
                placeholder="Streamer display name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isAdding
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isAdding ? 'Adding Stream...' : 'Add Stream'}
            </button>
          </form>
        </div>
      )}

      {streams.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {streams.map((stream) => (
            <div key={stream.id} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{stream.streamerName}</h3>
                  <p className="text-sm text-gray-500">
                    {stream.isOfficial ? 'Official Stream' : 'Community Stream'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      stream.isLive
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {stream.isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                  {isCreator && (
                    <button
                      onClick={() => removeStream(stream.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="aspect-video w-full">
                <iframe
                  src={`https://player.twitch.tv/?channel=${getChannelFromUrl(
                    stream.streamUrl
                  )}&parent=${window.location.hostname}&muted=true`}
                  frameBorder="0"
                  allowFullScreen
                  scrolling="no"
                  className="w-full h-full"
                ></iframe>
              </div>

              <div className="h-[400px]">
                <iframe
                  src={`https://www.twitch.tv/embed/${getChannelFromUrl(
                    stream.streamUrl
                  )}/chat?parent=${window.location.hostname}`}
                  className="w-full h-full"
                  frameBorder="0"
                ></iframe>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No streams available for this tournament.</p>
          {isCreator && (
            <p className="text-sm text-gray-400 mt-2">
              Add a stream using the form above to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentStream;


