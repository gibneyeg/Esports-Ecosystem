import React, { useState } from 'react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  const [formData, setFormData] = useState({
    notifications: {
      emailNotifications: true,
      tournamentReminders: true,
      matchResults: true,
    },
    privacy: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      showStats: true
    },
    account: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked
      }
    }));
  };

  const handlePrivacyChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [name]: type === 'checkbox' ? e.target.checked : value
      }
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (formData.account.newPassword !== formData.account.confirmPassword) {
      setMessage({ type: 'error', content: 'New passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.account.currentPassword,
          newPassword: formData.account.newPassword
        })
      });

      if (!response.ok) throw new Error('Failed to update password');

      setMessage({ type: 'success', content: 'Password updated successfully' });
      setFormData(prev => ({
        ...prev,
        account: {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }
      }));
    } catch (error) {
      setMessage({ type: 'error', content: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium ${activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 font-medium ${activeTab === 'privacy'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 font-medium ${activeTab === 'account'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Account
          </button>
        </div>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="emailNotifications"
                checked={formData.notifications.emailNotifications}
                onChange={handleNotificationChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Email Notifications</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="tournamentReminders"
                checked={formData.notifications.tournamentReminders}
                onChange={handleNotificationChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Tournament Reminders</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="matchResults"
                checked={formData.notifications.matchResults}
                onChange={handleNotificationChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Match Results</span>
            </label>


          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Profile Visibility</label>
              <select
                name="profileVisibility"
                value={formData.privacy.profileVisibility}
                onChange={handlePrivacyChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="showOnlineStatus"
                checked={formData.privacy.showOnlineStatus}
                onChange={handlePrivacyChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Show Online Status</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="showStats"
                checked={formData.privacy.showStats}
                onChange={handlePrivacyChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Show Game Statistics</span>
            </label>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>

          {message.content && (
            <div className={`p-4 mb-4 rounded ${message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
              {message.content}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                value={formData.account.currentPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  account: { ...prev.account, currentPassword: e.target.value }
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                value={formData.account.newPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  account: { ...prev.account, newPassword: e.target.value }
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                value={formData.account.confirmPassword}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  account: { ...prev.account, confirmPassword: e.target.value }
                }))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;