import React, { useState, useEffect, useRef } from 'react';
import tmi from 'tmi.js';

// Custom Chat Component
const TwitchChat = ({ channelName }) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!channelName) return;

    // Create new client instance
    clientRef.current = new tmi.Client({
      connection: {
        secure: true,
        reconnect: true
      },
      channels: [channelName]
    });

    // Connect to channel
    clientRef.current.connect()
      .then(() => {
        setIsConnected(true);
        setError('');
      })
      .catch(err => {
        console.error('Failed to connect to chat:', err);
        setError('Failed to connect to chat. Please try again.');
      });

    // Handle incoming messages
    const handleMessage = (channel, tags, message, self) => {
      setMessages(prev => [...prev.slice(-199), {
        id: tags.id || Date.now(),
        username: tags['display-name'] || tags.username,
        color: tags.color || '#ffffff',
        message,
        timestamp: new Date(),
        isAction: tags['message-type'] === 'action',
        badges: tags.badges || {},
        subscriber: !!tags.subscriber,
        mod: !!tags.mod
      }]);
    };

    // Subscribe to events
    clientRef.current.on('message', handleMessage);
    clientRef.current.on('connected', () => setIsConnected(true));
    clientRef.current.on('disconnected', () => setIsConnected(false));

    // Cleanup
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [channelName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg">
      {/* Chat Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Chat: {channelName}</h3>
          <span className={`px-2 py-1 rounded text-xs ${
            isConnected 
              ? 'bg-green-900 text-green-300' 
              : 'bg-red-900 text-red-300'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-900 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Chat Messages */}
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`text-sm animate-fade-in ${
              msg.isAction ? 'text-purple-400' : 'text-gray-200'
            }`}
          >
            {/* Badges */}
            <span className="space-x-1">
              {msg.badges.moderator && (
                <span className="text-green-500">⚔️</span>
              )}
              {msg.badges.subscriber && (
                <span className="text-purple-500">⭐</span>
              )}
              {msg.badges.vip && (
                <span className="text-pink-500">💎</span>
              )}
            </span>

            {/* Username */}
            <span 
              className="font-semibold px-1"
              style={{ color: msg.color }}
            >
              {msg.username}
            </span>

            {/* Message */}
            <span className="break-words">
              {msg.message}
            </span>
          </div>
        ))}
      </div>

      {/* Chat Footer */}
      <div className="p-2 bg-gray-800 text-gray-400 text-xs border-t border-gray-700 rounded-b-lg">
        Chat messages: {messages.length}
      </div>
    </div>
  );
};

const TwitchStream = ({ tournament, isCreator, onStreamUpdate }) => {
  const [streams, setStreams] = useState([]);
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [streamerName, setStreamerName] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await fetch(
        `/api/tournaments/${tournament.id}/streams/${streamId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove stream');
      }
      
      setStreams(currentStreams => currentStreams.filter(stream => stream.id !== streamId));
    } catch (error) {
      console.error('Error removing stream:', error);
      setError(error.message || 'Failed to remove stream. Please try again.');
    }
  };

  const extractTwitchInfo = (url) => {
    try {
      const channelName = url.split('/').pop();
      return {
        player: `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&muted=true`,
        channelName
      };
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
      
      {/* Stream Management Form */}
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

      {/* Stream Management Section */}
      {isCreator && streams.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
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
      <div className="grid grid-cols-1 gap-4">
        {streams
          .filter(stream => stream.isLive)
          .map((stream) => {
            const embedInfo = extractTwitchInfo(stream.streamUrl);
            return (
              <div key={stream.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  {/* Stream Info */}
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 text-lg">
                      {stream.streamerName}
                    </p>
                    <div className={`text-sm ${
                      stream.isOfficial ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stream.isOfficial ? 'Official Stream' : 'Community Stream'}
                    </div>
                  </div>

                  {/* Stream and Chat Container */}
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Stream Player */}
                    <div className="lg:w-3/4">
                      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={embedInfo?.player}
                          frameBorder="0"
                          allowFullScreen
                          className="absolute top-0 left-0 w-full h-full"
                          title={`${stream.streamerName}'s stream`}
                          allow="clipboard-write; clipboard-read; fullscreen"
                        />
                      </div>
                    </div>
                    
                    {/* Custom Chat Component */}
                    <div className="lg:w-1/4 h-[600px]">
                      {embedInfo?.channelName && (
                        <TwitchChat channelName={embedInfo.channelName} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {streams.filter(stream => stream.isLive).length === 0 && (
        <p className="text-center text-gray-500">No active streams</p>
      )}
    </div>
  );
};

export default TwitchStream;