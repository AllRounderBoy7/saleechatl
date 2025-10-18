import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, UserPlus, Check, X, LogOut, Search, Trash2, ArrowLeft, Users, Shield, Settings, Ban, Unlock, UserX, Bell, User } from 'lucide-react';

// Supabase Configuration
const SUPABASE_URL = 'https://cvjufjasnmcnokinhhsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2anVmamFzbm1jbm9raW5oaHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjMwODMsImV4cCI6MjA3NTk5OTA4M30.cUncCbTLhFvcbiOHjPCuhJLLiHweFxsE3U6FreIXUk0';

const ADMIN_CREDENTIALS = {
  username: 'sameer',
  password: 'sameer3745'
};

// Supabase Client
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(table, method = 'GET', body = null, filters = '') {
    const endpoint = `${this.url}/rest/v1/${table}${filters}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Supabase error:', error);
      return null;
    }
  }

  async select(table, filters = '') {
    return this.request(table, 'GET', null, filters);
  }

  async insert(table, data) {
    return this.request(table, 'POST', data);
  }

  async update(table, data, filters = '') {
    return this.request(table, 'PATCH', data, filters);
  }

  async delete(table, filters = '') {
    return this.request(table, 'DELETE', null, filters);
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ChatApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [users, setUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');
  const [profileImage, setProfileImage] = useState({});
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isAdmin = () => {
    return currentUser?.username === ADMIN_CREDENTIALS.username && currentUser?.is_admin === true;
  };

  const sanitizeUsername = (user) => {
    return user.trim().toLowerCase().replace(/\s+/g, '');
  };

  const handleSignup = async () => {
    setLoginError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setLoginError('Username aur password required!');
      setLoading(false);
      return;
    }

    const sanitized = sanitizeUsername(username);

    if (sanitized.length < 3) {
      setLoginError('Username min 3 characters!');
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      setLoginError('Password min 4 characters!');
      setLoading(false);
      return;
    }

    const existingUsers = await supabase.select('users', `?username=eq.${sanitized}`);

    if (existingUsers && existingUsers.length > 0) {
      setLoginError('Username already taken!');
      setLoading(false);
      return;
    }

    const newUser = {
      username: sanitized,
      password,
      is_admin: false,
      is_blocked: false
    };

    const result = await supabase.insert('users', newUser);

    if (result && result.length > 0) {
      setCurrentUser(result[0]);
      setShowAuth(false);
      setUsername('');
      setPassword('');
      loadFriendsAndRequests(result[0].id);
    } else {
      setLoginError('Signup failed!');
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setLoginError('Username aur password required!');
      setLoading(false);
      return;
    }

    const sanitized = sanitizeUsername(username);

    if (sanitized === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const adminUser = {
        id: 'admin-001',
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
        is_admin: true,
        is_blocked: false
      };
      setCurrentUser(adminUser);
      setShowAuth(false);
      setUsername('');
      setPassword('');
      setLoading(false);
      return;
    }

    const dbUsers = await supabase.select('users', `?username=eq.${sanitized}`);

    if (dbUsers && dbUsers.length > 0) {
      const user = dbUsers[0];

      if (user.password !== password) {
        setLoginError('Invalid username or password!');
        setLoading(false);
        return;
      }

      if (user.is_blocked) {
        setLoginError('Account blocked!');
        setLoading(false);
        return;
      }

      if (user.profile_image) {
        setProfileImage(prev => ({
          ...prev,
          [user.id]: user.profile_image
        }));
      }

      setCurrentUser(user);
      setShowAuth(false);
      setUsername('');
      setPassword('');
      loadFriendsAndRequests(user.id);
    } else {
      setLoginError('Invalid username or password!');
    }

    setLoading(false);
  };

  const loadFriendsAndRequests = async (userId) => {
    const friendData = await supabase.select('friends', `?or=(user1_id.eq.${userId},user2_id.eq.${userId})`);
    if (friendData) {
      setFriends(friendData);
    }

    const requestData = await supabase.select('friend_requests', `?to_user_id=eq.${userId}&status=eq.pending`);
    if (requestData) {
      setFriendRequests(requestData);
    }

    const usersData = await supabase.select('users');
    if (usersData) {
      setUsers(usersData);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuth(true);
    setSelectedChat(null);
    setSearchUser('');
    setSearchResults([]);
    setShowSidebar(true);
    setActiveTab('chats');
    setLoginError('');
    setMessages({});
  };

  const handleSearchUser = async (query) => {
    setSearchUser(query);
    if (query.trim()) {
      const results = await supabase.select('users', '?is_admin=eq.false&is_blocked=eq.false');

      if (results) {
        const filtered = results.filter(u =>
          u.id !== currentUser?.id &&
          u.username.includes(query.toLowerCase().replace(/\s+/g, ''))
        );
        setSearchResults(filtered);
      }
    } else {
      setSearchResults([]);
    }
  };

  const sendFriendRequest = async (toUserId) => {
    setLoading(true);

    const existing = await supabase.select('friend_requests', `?from_user_id=eq.${currentUser.id}&to_user_id=eq.${toUserId}`);

    if (existing && existing.length > 0) {
      alert('Request already sent!');
      setLoading(false);
      return;
    }

    const newRequest = {
      from_user_id: currentUser.id,
      to_user_id: toUserId,
      status: 'pending'
    };

    await supabase.insert('friend_requests', newRequest);
    setSearchUser('');
    setSearchResults([]);
    setLoading(false);
  };

  const acceptFriendRequest = async (requestId, fromUserId) => {
    setLoading(true);

    await supabase.delete('friend_requests', `?id=eq.${requestId}`);

    const friendship = {
      user1_id: fromUserId,
      user2_id: currentUser.id
    };

    await supabase.insert('friends', friendship);
    loadFriendsAndRequests(currentUser.id);
    setLoading(false);
  };

  const rejectFriendRequest = async (requestId) => {
    setLoading(true);
    await supabase.delete('friend_requests', `?id=eq.${requestId}`);
    loadFriendsAndRequests(currentUser.id);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setLoading(true);
    const chatKey = [currentUser.id, selectedChat.id].sort().join('-');

    const message = {
      chat_id: chatKey,
      from_user_id: currentUser.id,
      text: newMessage.trim(),
      message_type: 'text'
    };

    await supabase.insert('messages', message);
    setNewMessage('');
    await fetchMessages(chatKey);
    setLoading(false);
  };

  const fetchMessages = async (chatKey) => {
    const data = await supabase.select('messages', `?chat_id=eq.${chatKey}&order=created_at.asc`);

    if (data) {
      setMessages(prev => ({
        ...prev,
        [chatKey]: data
      }));
    }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    if (!file.type.startsWith('image/')) {
      alert('Only images allowed!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Max 5MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const chatKey = [currentUser.id, selectedChat.id].sort().join('-');

      const message = {
        chat_id: chatKey,
        from_user_id: currentUser.id,
        image_url: event.target.result,
        message_type: 'image'
      };

      await supabase.insert('messages', message);
      await fetchMessages(chatKey);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProfileImage = async (e, userId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only images allowed!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const targetId = userId || currentUser?.id;
      const imageData = event.target.result;

      setProfileImage(prev => ({
        ...prev,
        [targetId]: imageData
      }));

      await supabase.update('users', { profile_image: imageData }, `?id=eq.${targetId}`);
    };

    reader.readAsDataURL(file);
    if (profileInputRef.current) {
      profileInputRef.current.value = '';
    }
  };

  const deleteMessage = async (messageId) => {
    if (!selectedChat) return;

    setLoading(true);
    await supabase.delete('messages', `?id=eq.${messageId}`);
    const chatKey = [currentUser.id, selectedChat.id].sort().join('-');
    await fetchMessages(chatKey);
    setLoading(false);
  };

  const getChatMessages = () => {
    if (!selectedChat) return [];
    const chatKey = [currentUser.id, selectedChat.id].sort().join('-');
    return messages[chatKey] || [];
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const blockUser = async (userId) => {
    if (!isAdmin()) return;
    setLoading(true);
    await supabase.update('users', { is_blocked: true }, `?id=eq.${userId}`);
    loadFriendsAndRequests(currentUser.id);
    setLoading(false);
  };

  const unblockUser = async (userId) => {
    if (!isAdmin()) return;
    setLoading(true);
    await supabase.update('users', { is_blocked: false }, `?id=eq.${userId}`);
    loadFriendsAndRequests(currentUser.id);
    setLoading(false);
  };

  const deleteUserAccount = async (userId) => {
    if (!isAdmin()) return;
    if (window.confirm('Delete account?')) {
      setLoading(true);
      await supabase.delete('users', `?id=eq.${userId}`);
      loadFriendsAndRequests(currentUser.id);
      setLoading(false);
    }
  };

  const clearAllMessages = async () => {
    if (!isAdmin()) return;
    if (window.confirm('Clear all messages?')) {
      setLoading(true);
      const allMessages = await supabase.select('messages');
      if (allMessages && allMessages.length > 0) {
        for (let msg of allMessages) {
          await supabase.delete('messages', `?id=eq.${msg.id}`);
        }
      }
      setMessages({});
      setLoading(false);
    }
  };

  const getFriendsList = () => {
    if (!currentUser || !friends) return [];

    return friends
      .filter(f => f.user1_id === currentUser.id || f.user2_id === currentUser.id)
      .map(f => {
        const friendId = f.user1_id === currentUser.id ? f.user2_id : f.user1_id;
        return users.find(u => u.id === friendId);
      })
      .filter(Boolean);
  };

  const AvatarComponent = ({ userId, username, size = 'w-12 h-12' }) => {
    const img = profileImage[userId];
    if (img) {
      return <img src={img} alt={username} className={`${size} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full object-cover flex-shrink-0`} />;
    }
    return (
      <div className={`${size} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {username?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  // Auth Screen
  if (showAuth) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <h1 className="text-3xl font-bold text-white mb-1">SaleeChat</h1>
            <p className="text-blue-100 text-sm">Connect with friends instantly</p>
          </div>

          <div className="p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setAuthMode('login'); setLoginError(''); }}
                className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setLoginError(''); }}
                className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())}
                disabled={loading}
              />

              <button
                onClick={authMode === 'login' ? handleLogin : handleSignup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const friendsList = getFriendsList();
  const pendingRequests = friendRequests.filter(r => users.find(u => u.id === r.from_user_id));

  // Requests Tab
  if (activeTab === 'requests') {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <div className="w-full md:w-96 bg-white border-r flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell size={24} />
              Requests
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => setActiveTab('chats')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 mb-4"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No requests</p>
              </div>
            ) : (
              pendingRequests.map(req => {
                const fromUser = users.find(u => u.id === req.from_user_id);
                return (
                  <div key={req.id} className="flex items-center justify-between mb-3 bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <AvatarComponent userId={fromUser?.id} username={fromUser?.username} size="w-12 h-12" />
                      <div>
                        <div className="text-sm font-semibold">{fromUser?.username}</div>
                        <div className="text-xs text-gray-500">wants to connect</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id, req.from_user_id)}
                        disabled={loading}
                        className="p-2 bg-green-500 text-white rounded-lg"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        disabled={loading}
                        className="p-2 bg-red-500 text-white rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Bell size={40} className="text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold">Friend Requests</p>
          </div>
        </div>
      </div>
    );
  }

  // Settings Tab
  if (activeTab === 'settings') {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <div className="w-full md:w-96 bg-white border-r flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={24} />
              Settings
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => setActiveTab('chats')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 mb-4"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-700">Profile</h3>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <AvatarComponent userId={currentUser?.id} username={currentUser?.username} size="w-16 h-16" />
                  <div>
                    <div className="font-semibold text-gray-800">{currentUser?.username}</div>
                    <button
                      onClick={() => profileInputRef.current?.click()}
                      className="mt-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium"
                    >
                      Change Photo
                    </button>
                    <input
                      type="file"
                      ref={profileInputRef}
                      onChange={(e) => handleProfileImage(e, currentUser?.id)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isAdmin() && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-gray-700">Admin</h3>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium"
                >
                  Admin Dashboard
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
          <Settings size={40} className="text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  // Admin Tab
  if (activeTab === 'admin' && isAdmin()) {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <div className="w-full md:w-96 bg-white border-r flex flex-col">
          <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={24} />
              Admin Panel
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => setActiveTab('chats')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg mb-4"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-700">System</h3>
              <div className="space-y-2">
                <button
                  onClick={clearAllMessages}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm"
                >
                  Clear Messages
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Users ({users.length})</h3>
              {users.map(user => (
                <div key={user.id} className="bg-white border rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <AvatarComponent userId={user.id} username={user.username} size="w-10 h-10" />
                    <div>
                      <div className="font-semibold text-sm">{user.username}</div>
                      {user.is_blocked && <div className="text-xs text-red-600">Blocked</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.is_blocked ? (
                      <button
                        onClick={() => unblockUser(user.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => blockUser(user.id)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-xs"
                      >
                        Block
                      </button>
                    )}
                    <button
                      onClick={() => deleteUserAccount(user.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
          <Shield size={40} className="text-red-600 mx-auto" />
        </div>
      </div>
    );
  }

  // Main Chat
  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <div className={`${showSidebar ? 'flex' : 'hidden md:flex'} w-full md:w-96 bg-white border-r flex-col`}>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
          <h2 className="text-xl font-bold text-white mb-3">SaleeChat</h2>
          <div className="flex items-center gap-3">
            <AvatarComponent userId={currentUser?.id} username={currentUser?.username} size="w-12 h-12" />
            <div className="flex-1 text-white">
              <div className="font-semibold text-lg">{currentUser?.username}</div>
              {isAdmin() && <div className="text-xs text-blue-100">ADMIN</div>}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchUser}
              onChange={(e) => handleSearchUser(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <AvatarComponent userId={user.id} username={user.username} size="w-10 h-10" />
                    <div className="text-sm font-semibold text-gray-800">{user.username}</div>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    disabled={loading}
                    className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-3 text-gray-700 text-sm uppercase">Chats</h3>
            {friendsList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No friends yet</p>
                <p className="text-xs mt-1">Search to add friends</p>
              </div>
            ) : (
              friendsList.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setSelectedChat(friend);
                    setShowSidebar(false);
                    const chatKey = [currentUser.id, friend.id].sort().join('-');
                    fetchMessages(chatKey);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                    selectedChat?.id === friend.id
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <AvatarComponent userId={friend.id} username={friend.username} size="w-12 h-12" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{friend.username}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border-t p-3 flex gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 p-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'requests'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Bell size={18} />
            <span className="hidden sm:inline text-xs">Requests</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 p-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings size={18} />
            <span className="hidden sm:inline text-xs">Settings</span>
          </button>
        </div>
      </div>

      <div className={`${!showSidebar || selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white`}>
        {selectedChat ? (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center gap-3 shadow-md">
              <button
                onClick={() => {
                  setSelectedChat(null);
                  setShowSidebar(true);
                }}
                className="md:hidden text-white p-2 hover:bg-white/20 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <AvatarComponent userId={selectedChat.id} username={selectedChat.username} size="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{selectedChat.username}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {getChatMessages().length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Send size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No messages</p>
                    <p className="text-xs mt-1">Start chatting!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {getChatMessages().map(msg => (
                    <div key={msg.id} className={`flex ${msg.from_user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className="group relative max-w-[75%] md:max-w-md">
                        <div
                          className={`rounded-2xl p-3 shadow-sm ${
                            msg.from_user_id === currentUser.id
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                          }`}
                        >
                          {msg.message_type === 'text' ? (
                            <p className="break-words">{msg.text}</p>
                          ) : (
                            <img src={msg.image_url} alt="Sent" className="max-w-full rounded-lg" />
                          )}
                          <div className={`text-xs mt-1 ${
                            msg.from_user_id === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.created_at)}
                          </div>
                        </div>
                        {msg.from_user_id === currentUser.id && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={loading}
                            className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="bg-white border-t p-4">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={sendImage}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-50"
                >
                  <Image size={22} />
                </button>
                <input
                  type="text"
                  placeholder="Type message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full disabled:opacity-50"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Send size={40} className="text-blue-600" />
              </div>
              <p className="text-lg font-semibold text-gray-800">Select a chat</p>
              <p className="text-sm text-gray-500">Choose friend to message</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
