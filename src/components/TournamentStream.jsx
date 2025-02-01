import React, { useState, useEffect } from 'react';

const TwitchStream = ({ tournament, isCreator, onStreamUpdate }) => {
  const [streams, setStreams] = useState([]);
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [streamerName, setStreamerName] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial fetch of streams
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
      setError('');
    } catch (error) {
      console.error('Error fetching streams:', error);
      setError('Failed to fetch streams');
    }
  };

  const addStream = async (e) => {
    e.preventDefault();
    if (!newStreamUrl || !streamerName) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: newStreamUrl,
          streamerName,
          isOfficial,
          isLive: false 
        }),
      });

      if (!response.ok) throw new Error('Failed to add stream');
      await fetchStreams();
      
      setNewStreamUrl('');
      setStreamerName('');
      setIsOfficial(false);
    } catch (error) {
      console.error('Error adding stream:', error);
      setError('Failed to add stream. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStreamStatus = async (streamId, currentStatus) => {
    try {
      setError('');
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLive: !currentStatus })
        }
      );

      if (!response.ok) throw new Error('Failed to update stream status');
      await fetchStreams();
    } catch (error) {
      console.error('Error updating stream status:', error);
      setError('Failed to update stream status. Please try again.');
    }
  };

  const removeStream = async (streamId) => {
    try {
      setError('');
      console.log('Removing stream:', streamId); // Debug log
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove stream');
      }
      
      // Remove the stream from local state
      setStreams(currentStreams => currentStreams.filter(stream => stream.id !== streamId));
      
      // Refresh the streams list
      await fetchStreams();
    } catch (error) {
      console.error('Error removing stream:', error);
      setError(error.message || 'Failed to remove stream. Please try again.');
    }
  };

  const extractTwitchEmbed = (url) => {
    try {
      const channelName = url.split('/').pop();
      return `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&muted=true`;
    } catch (error) {
      console.error('Error parsing Twitch URL:', error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tournament Streams</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
      
      {isCreator && (
        <form onSubmit={addStream} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="url"
              placeholder="Twitch Stream URL"
              value={newStreamUrl}
              onChange={(e) => setNewStreamUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Streamer Name"
              value={streamerName}
              onChange={(e) => setStreamerName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOfficial"
                checked={isOfficial}
                onChange={(e) => setIsOfficial(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="isOfficial" className="text-gray-700">Official Stream</label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Adding...' : 'Add Stream'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {/* Stream Management Section */}
        {isCreator && streams.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Manage Streams</h3>
            <div className="space-y-2">
              {streams.map((stream) => (
                <div key={`manage-${stream.id}`} 
                     className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="font-medium">{stream.streamerName}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStreamStatus(stream.id, stream.isLive)}
                      className={`px-3 py-1 rounded-lg ${
                        stream.isLive 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {stream.isLive ? 'End Stream' : 'Start Stream'}
                    </button>
                    <button
                      onClick={() => removeStream(stream.id)}
                      className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Streams Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams
            .filter(stream => stream.isLive)
            .map((stream) => (
              <div key={stream.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <div className="aspect-video w-full">
                    <iframe
                      src={extractTwitchEmbed(stream.streamUrl)}
                      frameBorder="0"
                      allowFullScreen
                      className="w-full h-full"
                      title={`${stream.streamerName}'s stream`}
                    />
                  </div>
                  <div className="mt-2">
                    <p className="font-semibold text-gray-900">{stream.streamerName}</p>
                    <div className={`text-sm ${stream.isOfficial ? 'text-blue-600' : 'text-gray-500'}`}>
                      {stream.isOfficial ? 'Official Stream' : 'Community Stream'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {streams.filter(stream => stream.isLive).length === 0 && (
          <p className="text-center text-gray-500">No active streams</p>
        )}
      </div>
    </div>
  );
};

export default TwitchStream;