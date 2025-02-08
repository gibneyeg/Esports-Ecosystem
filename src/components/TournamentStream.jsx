import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const TournamentStream = ({ tournament, isCreator, onStreamUpdate }) => {
  const [streams, setStreams] = useState([]);
  const [newStream, setNewStream] = useState({ streamUrl: '', streamerName: '', isOfficial: false });
  const [isAddingStream, setIsAddingStream] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStreams();
  }, [tournament.id]);

  const fetchStreams = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/streams`);
      if (!response.ok) throw new Error('Failed to fetch streams');
      const data = await response.json();
      setStreams(data);
      if (onStreamUpdate) onStreamUpdate(data);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setError(error.message);
    }
  };

  const validateTwitchUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'twitch.tv' || parsedUrl.hostname === 'www.twitch.tv';
    } catch {
      return false;
    }
  };

  const getChannelName = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.split('/').pop();
    } catch {
      return '';
    }
  };

  const handleAddStream = async (e) => {
    e.preventDefault();
    
    if (!validateTwitchUrl(newStream.streamUrl)) {
      setError('Please enter a valid Twitch stream URL');
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStream),
      });

      if (!response.ok) throw new Error('Failed to add stream');

      const addedStream = await response.json();
      setStreams(prev => [...prev, addedStream]);
      setNewStream({ streamUrl: '', streamerName: '', isOfficial: false });
      setIsAddingStream(false);
      if (onStreamUpdate) onStreamUpdate([...streams, addedStream]);
    } catch (error) {
      console.error('Error adding stream:', error);
      setError(error.message);
    }
  };

  const handleRemoveStream = async (streamId) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to remove stream');

      const updatedStreams = streams.filter(stream => stream.id !== streamId);
      setStreams(updatedStreams);
      if (onStreamUpdate) onStreamUpdate(updatedStreams);
    } catch (error) {
      console.error('Error removing stream:', error);
      setError(error.message);
    }
  };

  const handleToggleStreamStatus = async (streamId, isLive) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isLive }),
        }
      );

      if (!response.ok) throw new Error('Failed to update stream status');

      const updatedStream = await response.json();
      const updatedStreams = streams.map(stream =>
        stream.id === streamId ? updatedStream : stream
      );
      setStreams(updatedStreams);
      if (onStreamUpdate) onStreamUpdate(updatedStreams);
    } catch (error) {
      console.error('Error updating stream status:', error);
      setError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tournament Streams</h2>
        {isCreator && !isAddingStream && (
          <button
            onClick={() => setIsAddingStream(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Stream
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isAddingStream && (
        <form onSubmit={handleAddStream} className="space-y-4 bg-gray-50 p-4 rounded">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Twitch Stream URL
              <input
                type="text"
                value={newStream.streamUrl}
                onChange={(e) =>
                  setNewStream((prev) => ({ ...prev, streamUrl: e.target.value }))
                }
                placeholder="https://twitch.tv/channelname"
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Streamer Name
              <input
                type="text"
                value={newStream.streamerName}
                onChange={(e) =>
                  setNewStream((prev) => ({ ...prev, streamerName: e.target.value }))
                }
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </label>
          </div>
          {isCreator && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newStream.isOfficial}
                  onChange={(e) =>
                    setNewStream((prev) => ({ ...prev, isOfficial: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Official Stream</span>
              </label>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddingStream(false)}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Stream
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6">
        {streams.length > 0 ? (
          streams.map((stream) => (
            <div key={stream.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{stream.streamerName}</h3>
                    {stream.isOfficial && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Official Stream
                      </span>
                    )}
                  </div>
                  {isCreator && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStreamStatus(stream.id, !stream.isLive)}
                        className={`px-3 py-1 rounded text-sm ${
                          stream.isLive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {stream.isLive ? 'Live' : 'Offline'}
                      </button>
                      <button
                        onClick={() => handleRemoveStream(stream.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
                <div className="lg:col-span-2 relative bg-gray-900">
                  <iframe
                    src={`https://player.twitch.tv/?channel=${getChannelName(stream.streamUrl)}&parent=${window.location.hostname}&autoplay=true`}
                    height="100%"
                    width="100%"
                    allowFullScreen
                    className="absolute inset-0"
                  />
                </div>
                <div className="h-full bg-gray-900">
                  <iframe
                    src={`https://www.twitch.tv/embed/${getChannelName(stream.streamUrl)}/chat?parent=${window.location.hostname}&darkpopout`}
                    height="100%"
                    width="100%"
                    className="border-0"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded">
            <p className="text-gray-500">No streams available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentStream;