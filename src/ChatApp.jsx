import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, UserPlus, Check, X, LogOut, Search, Trash2, ArrowLeft, Users, Shield, Settings, Ban, Unlock, UserX, Bell, User, AlertCircle } from 'lucide-react';

// ⚠️ IMPORTANT: Add your Supabase credentials here
const SUPABASE_URL = 'https://fsvuqwssdgninwzbhuny.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2anVmamFzbm1jbm9raW5oaHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjMwODMsImV4cCI6MjA3NTk5OTA4M30.cUncCbTLhFvcbiOHjPCuhJLLiHweFxsE3U6FreIXUk0';

const ADMIN_CREDENTIALS = {
  username: 'sameer',
  password: 'sameer3745'
};

// Supabase Client (Simple fetch-based)
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(table, method = 'GET', body = null, filters = '') {
    const endpoint = `${this.url}/rest/v1/${table}${filters}`;
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        }
      };

      if (body) options.body = JSON.stringify(body);

      const response = await fetch(endpoint, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase Error:', error);
      return null;
    }
  }

  async select(table, filters = '') {
    return this.request(table, 'GET', null, filters);
  }

  async insert(table, data) {
    return this.request(table, 'POST', data);
  }

  async update(table, data, filters) {
    return this.request(table, 'PATCH', data, filters);
  }

  async delete(table, filters) {
    return this.request(table, 'DELETE', null, filters);
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);

const App = () => {
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
  const [supabaseError, setSupabaseError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    if (!SUPABASE_URL.includes('supabase.co')) {
      setSupabaseError('⚠️ Supabase credentials not configured. Using demo mode.');
      return;
    }

    try {
      await supabase.select('users', '?limit=1');
      setSupabaseError('');
    } catch (error) {
      setSupabaseError('Cannot connect to Supabase. Check credentials.');
    }
  };

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
      setLoginError('Username aur password dono required hain!');
      setLoading(false);
      return;
    }

    const sanitized = sanitizeUsername(username);
    if (sanitized.length < 3) {
      setLoginError('Username atleast 3 characters hona chahiye!');
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      setLoginError('Password atleast 4 characters hona chahiye!');
      setLoading(false);
      return;
    }

    // Check if user exists
    const existingUsers = await supabase.select('users', `?username=eq.${sanitized}`);
    
    if (existingUsers && existingUsers.length > 0) {
      setLoginError('Username already taken!');
      setLoading(false);
      return;
    }

    // Create user
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
    } else {
      setLoginError('Signup failed! Try again.');
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setLoginError('Username aur password dono required hain!');
      setLoading(false);
      return;
    }

    const sanitized = sanitizeUsername(username);

    // Check admin
    if (sanitized === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const adminUser = {
        id: 'admin-001',
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
        is_admin: true,
        created_at: new Date().toISOString()
      };
      setCurrentUser(adminUser);
      setShowAuth(false);
      setUsername('');
      setPassword('');
      setLoading(false);
      return;
    }

    // Get user from database
    const dbUsers = await supabase.select('users', `?username=eq.${sanitized}`);

    if (dbUsers && dbUsers.length > 0) {
      const user = dbUsers[0];
      
      if (user.password !== password) {
        setLoginError('Invalid username or password!');
        setLoading(false);
        return;
      }

      if (user.is_blocked) {
        setLoginError('Your account has been blocked!');
        setLoading(false);
        return;
      }

      // Load profile image
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
    } else {
      setLoginError('Invalid username or password!');
    }

    setLoading(false);
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
  };

  const handleSearchUser = async (query) => {
    setSearchUser(query);
    if (query.trim()) {
      const results = await supabase.select('users', `?is_admin=eq.false&is_blocked=eq.false`);
      
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

    // Check existing request
    const existing = await supabase.select('friend_requests', `?from_user_id=eq.${currentUser.id}&to_user_id=eq.${toUserId}`);
    
    if (existing && existing.length > 0) {
      alert('Request already sent!');
      setLoading(false);
      return;
    }

    // Check if already friends
    const friendship = await supabase.select('friends', `?user1_id=eq.${currentUser.id}&user2_id=eq.${toUserId}`);
    
    if (friendship && friendship.length > 0) {
      alert('Already friends!');
      setLoading(false);
      return;
    }

    const newRequest = {
      from_user_id: currentUser.id,
      to_user_id: toUserId,
      status: 'pending'
    };

    const result = await supabase.insert('friend_requests', newRequest);
    
    if (result && result.length > 0) {
      setSearchUser('');
      setSearchResults([]);
    }

    setLoading(false);
  };

  const acceptFriendRequest = async (requestId, fromUserId) => {
    setLoading(true);

    // Delete request
    await supabase.delete('friend_requests', `?id=eq.${requestId}`);

    // Create friendship
    const friendship = {
      user1_id: fromUserId,
      user2_id: currentUser.id
    };

    await supabase.insert('friends', friendship);
    
    // Refresh
    fetchFriendRequests();
    fetchFriends();
    setLoading(false);
  };

  const rejectFriendRequest = async (requestId) => {
    setLoading(true);
    await supabase.delete('friend_requests', `?id=eq.${requestId}`);
    fetchFriendRequests();
    setLoading(false);
  };

  const fetchFriendRequests = async () => {
    if (!currentUser) return;

    const requests = await supabase.select('friend_requests', `?to_user_id=eq.${currentUser.id}&status=eq.pending`);
    
    if (requests) {
      const withUsers = await Promise.all(
        requests.map(async (req) => {
          const user = await supabase.select('users', `?id=eq.${req.from_user_id}`);
          return { ...req, fromUser: user?.[0] };
        })
      );
      setFriendRequests(withUsers.filter(r => r.fromUser));
    }
  };

  const fetchFriends = async () => {
    if (!currentUser) return;

    const friendships = await supabase.select('friends', `?user1_id=eq.${currentUser.id}`);
    
    if (friendships) {
      setFriends(friendships);
    }
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

    const result = await supabase.insert('messages', message);
    
    if (result && result.length > 0) {
      setNewMessage('');
      fetchMessages();
    }

    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;

    const chatKey = [currentUser.id, selectedChat.id].sort().join('-');
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
      alert('Sirf images upload kar sakte hain!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size 5MB se kam hona chahiye!');
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

      const result = await supabase.insert('messages', message);
      
      if (result && result.length > 0) {
        fetchMessages();
      }
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
      alert('Sirf images upload kar sakte hain!');
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

      // Update in database
      if (!isAdmin() || userId === currentUser?.id) {
        await supabase.update('users', { profile_image: imageData }, `?id=eq.${targetId}`);
      }
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
    fetchMessages();
    setLoading(false);
  };

  const getChatMessages = () => {
    if (!selectedChat) return [];
    const chatKey = [currentUser.id, selectedChat.id].sort().join('-');
    return messages[chatKey] || [];
  };

  const deleteUserAccount = async (userId) => {
    if (!isAdmin()) return;

    if (window.confirm('Delete this account permanently?')) {
      setLoading(true);
      await supabase.delete('users', `?id=eq.${userId}`);
      setLoading(false);
      // Refresh users list
    }
  };

  const blockUser = async (userId) => {
    if (!isAdmin()) return;

    setLoading(true);
    await supabase.update('users', { is_blocked: true }, `?id=eq.${userId}`);
    setLoading(false);
  };

  const unblockUser = async (userId) => {
    if (!isAdmin()) return;

    setLoading(true);
    await supabase.update('users', { is_blocked: false }, `?id=eq.${userId}`);
    setLoading(false);
  };

  const clearAllMessages = async () => {
    if (!isAdmin()) return;

    if (window.confirm('Clear all messages?')) {
      setLoading(true);
      // Note: This requires a more complex query in real Supabase
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

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const AvatarComponent = ({ userId, username, size = 'w-12 h-12' }) => {
    const img = profileImage[userId];
    if (img) {
      return <img src={img} alt={username} className={`${size} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full object-cover flex-shrink-0`} />;
    }
    return (
      <div className={`${size} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {username[0].toUpperCase()}
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
            {supabaseError && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 text-xs rounded-lg flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{supabaseError}</span>
              </div>
            )}

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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleSignup())}
                disabled={loading}
              />

              <button
                onClick={authMode === 'login' ? handleLogin : handleSignup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? 'Loading...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat Interface
  const friendsList = getFriendsList();
  const pendingRequests = friendRequests.filter(r => r.fromUser);

  if (activeTab === 'requests') {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <div className="w-full md:w-96 bg-white border-r flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell size={24} />
              Friend Requests
            </h2>
          </div>

          <div className="p-4">
            <button
              onClick={() => setActiveTab('chats')}
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition mb-4"
            >
              <ArrowLeft size={18} />
              <span>Back to Chats</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No requests</p>
              </div>
            ) : (
              pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between mb-3 bg-white p-4 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <AvatarComponent userId={req.fromUser.id} username={req.fromUser.username} size="w-12 h-12" />
                    <div>
                      <div className="text-sm font-semibold">{req.fromUser.username}</div>
                      <div className="text-xs text-gray-500">wants to connect</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(req.id, req.from_user_id)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                      disabled={loading}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(req.id)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                      disabled={loading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <Bell size={40} className="text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-gray-800">Friend Requests</p>
          </div>
        </div>
      </div>
    );
  }

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
              className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition mb-4"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                <User size={18} />
                Profile
              </h3>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <AvatarComponent userId={currentUser?.id} username={currentUser?.username} size="w-16 h-16" />
                  <div>
                    <div className="font-semibold text-gray-800">{currentUser?.username}</div>
                    <button
                      onClick={() => profileInputRef.current?.click()}
                      className="mt-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-xs font-medium"
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
                <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <Shield size={18} />
                  Admin
                </h3>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center justify-center gap-2"
                >
                  <Shield size={18} />
                  Admin Dashboard
                </button>
              </div>
            )}

            <div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Settings size={40} className="text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">Settings</p>
          </div>
        </div>
      </div>
    );
  }

  // Main chats
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
                    className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-md transition disabled:opacity-50"
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
            <h3 className="font-semibold mb-3 text-gray-700 text-sm uppercase tracking-wide">Chats</h3>
            {friendsList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No friends yet</p>
                <p className="text-xs mt-1">Search and add friends</p>
              </div>
            ) : (
              friendsList.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setSelectedChat(friend);
                    setShowSidebar(false);
                    fetchMessages();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                    selectedChat?.id === friend.id
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm'
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
            <span className="hidden sm:inline">Requests</span>
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
            <span className="hidden sm:inline">Settings</span>
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
                className="md:hidden text-white p-2 hover:bg-white/20 rounded-lg transition"
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
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
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
                            className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg disabled:opacity-50"
                            disabled={loading}
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
                  className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition flex-shrink-0 disabled:opacity-50"
                  disabled={loading}
                >
                  <Image size={22} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
              <p className="text-sm text-gray-500 mt-1">Choose a friend to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
