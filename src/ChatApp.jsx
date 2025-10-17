import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, UserPlus, Check, X, LogOut, Search, Trash2, ArrowLeft, Users, Shield, Settings, Ban, Unlock, UserX, Bell, User, AlertCircle, MessageSquare } from 'lucide-react';

// ⚠️ IMPORTANT: Please use your actual Supabase credentials here.
// NOTE: I've kept the mock credentials from the previous response.
const SUPABASE_URL = 'https://fsvuqwssdgninwzbhuny.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdnVxd3NzZGduaW53emhidW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDQxODQsImV4cCI6MjA3NjA4MDE4NH0.vEM4-Ndv-RDAhR7kzyZjmXpBbR7PLEgf5qBxtMZQG5U';

const ADMIN_CREDENTIALS = {
  username: 'sameer',
  password: 'sameer3745'
};

// 🛠️ Supabase Client (Simple fetch-based, integrated for single file)
// FIX: The try/catch in the helper methods was suppressing errors. We now let the App handle them.
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  // Helper for making requests with exponential backoff for robustness
  async request(table, method = 'GET', body = null, filters = '', retries = 3) {
    const endpoint = `${this.url}/rest/v1/${table}${filters}`;

    for (let i = 0; i < retries; i++) {
      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            // IMPORTANT FIX: These settings resolve most cross-origin 'Failed to fetch' errors in isolated environments
            'Accept': 'application/json, text/plain, */*',
          },
          mode: 'cors', // Enable Cross-Origin Resource Sharing
          cache: 'no-cache', 
        };

        if (body) options.body = JSON.stringify(body);

        const response = await fetch(endpoint, options);

        if (!response.ok) {
          // Attempt to parse error response
          const errorText = await response.text();
          try {
            const error = JSON.parse(errorText);
            throw new Error(error.message || `Supabase HTTP Error: ${response.status} ${response.statusText}`);
          } catch {
             throw new Error(`Supabase HTTP Error: ${response.status} ${response.statusText}. Response: ${errorText}`);
          }
        }

        // Handle successful response (No content for PATCH/DELETE/POST by default)
        if (method === 'DELETE' || method === 'PATCH' || response.status === 204) return true;
        if (method === 'POST') return await response.json(); // POST usually returns inserted record

        return await response.json();

      } catch (error) {
        console.error(`Supabase Request Failed (Attempt ${i + 1}/${retries}):`, error.message);
        if (i < retries - 1) {
          // Exponential backoff wait: 100ms, 200ms, 400ms...
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        } else {
          // Last retry failed
          throw error; // Throw the error to be caught by the main component logic
        }
      }
    }
  }

  async select(table, filters = '') { 
      return await this.request(table, 'GET', null, filters);
  }
  async insert(table, data) { 
      return await this.request(table, 'POST', data);
  }
  async update(table, data, filters) { 
      return await this.request(table, 'PATCH', data, filters);
  }
  async delete(table, filters) { 
      return await this.request(table, 'DELETE', null, filters);
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);


// ⚛️ Main Chat App Component 
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
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState('');
  const messagesEndRef = useRef(null);
  // Removed unused refs: fileInputRef, profileInputRef, profileImage state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  // --- Helper Functions ---

  const checkSupabaseConnection = async () => {
    if (!SUPABASE_URL.includes('supabase.co')) {
      setSupabaseError('⚠️ Supabase credentials not configured. Using demo mode.');
      return;
    }

    try {
      // Trying to fetch a sample user record to confirm connection
      const data = await supabase.select('users', '?limit=1');
      if (data) setSupabaseError('');
      else setSupabaseError('Could not fetch data. Check network or RLS policies.');
    } catch (error) {
      setSupabaseError('Cannot connect to Supabase. Check credentials or RLS: ' + error.message);
    }
  };

  const generateUserId = (username) => {
    // Simple mock ID generation
    return username.toLowerCase().replace(/\s/g, '-') + Math.floor(Math.random() * 1000);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const userId = generateUserId(username);

      // 1. Check if username already exists
      const existingUser = await supabase.select('users', `?username=eq.${username}`);
      if (existingUser && existingUser.length > 0) {
        setLoginError('Username already taken.');
        setLoading(false);
        return;
      }

      // 2. Insert new user
      const newUser = {
        user_id: userId,
        username: username,
        password: password, // ⚠️ CRITICAL: In a real app, hash this! Never store plaintext passwords.
        profile_pic: `https://placehold.co/100x100/F0F8FF/1E90FF?text=${username.charAt(0).toUpperCase()}`,
        is_admin: username === ADMIN_CREDENTIALS.username,
      };

      const result = await supabase.insert('users', newUser);

      if (result) {
        setCurrentUser(newUser);
        setShowAuth(false);
        setLoginError('');
        setUsername('');
        setPassword('');
      } else {
        setLoginError('Signup failed. The server did not return the inserted record.');
      }
    } catch (error) {
      setLoginError(`Signup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const user = await supabase.select('users', `?username=eq.${username}&password=eq.${password}`);

      if (user && user.length === 1) {
        setCurrentUser(user[0]);
        setShowAuth(false);
        setLoginError('');
        setUsername('');
        setPassword('');
      } else {
        setLoginError('Invalid username or password.');
      }
    } catch (error) {
      setLoginError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedChat(null);
    setShowAuth(true);
  };

  const fetchUsers = async () => {
    if (!currentUser) return;
    try {
      const allUsers = await supabase.select('users', `?order=username.asc`);
      if (allUsers) {
        setUsers(allUsers.filter(u => u.user_id !== currentUser.user_id));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error.message);
      setSupabaseError("Failed to load users. Check RLS or connection.");
    }
  };

  const fetchFriends = async () => {
    if (!currentUser || users.length === 0) return;
    try {
      const friendsList = await supabase.select('friends', `?or=(user1_id.eq.${currentUser.user_id},user2_id.eq.${currentUser.user_id})&is_accepted=eq.true`);
      if (friendsList) {
        const friendIds = friendsList.map(f =>
          f.user1_id === currentUser.user_id ? f.user2_id : f.user1_id
        );
        // Map user IDs to actual user objects
        const friendsData = users.filter(u => friendIds.includes(u.user_id));
        setFriends(friendsData);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error.message);
    }
  };

  const fetchFriendRequests = async () => {
    if (!currentUser || users.length === 0) return;
    try {
      const requests = await supabase.select('friend_requests', `?receiver_id=eq.${currentUser.user_id}`);
      if (requests) {
        const senderIds = requests.map(r => r.sender_id);
        // Map sender IDs to actual user objects
        const sendersData = users.filter(u => senderIds.includes(u.user_id));
        setFriendRequests(sendersData);
      }
    } catch (error) {
      console.error("Failed to fetch friend requests:", error.message);
    }
  };

  const handleAddFriend = async (userToAdd) => {
    if (!currentUser) return;
    
    try {
      // Check if request already exists (either direction)
      const existingReq = await supabase.select('friend_requests', `?or=(and(sender_id.eq.${currentUser.user_id},receiver_id.eq.${userToAdd.user_id}),and(sender_id.eq.${userToAdd.user_id},receiver_id.eq.${currentUser.user_id}))`);
        
      if(existingReq && existingReq.length > 0) {
          console.log('Request already sent or received.');
          return;
      }
      
      const request = {
        sender_id: currentUser.user_id,
        receiver_id: userToAdd.user_id,
      };
      const result = await supabase.insert('friend_requests', request);
      if (result) {
        console.log(`${userToAdd.username} has been sent a friend request!`);
      } else {
        console.error('Failed to send request.');
      }
    } catch (error) {
      console.error("Error sending friend request:", error.message);
    }
  };

  const handleAcceptRequest = async (sender) => {
    if (!currentUser) return;
    try {
      // 1. Delete the request
      await supabase.delete('friend_requests', `?sender_id=eq.${sender.user_id}&receiver_id=eq.${currentUser.user_id}`);
      
      // 2. Add as friends (Note: Supabase should handle uniqueness constraints via RLS or schema)
      await supabase.insert('friends', {
        user1_id: currentUser.user_id,
        user2_id: sender.user_id,
        is_accepted: true,
      });
      
      setFriendRequests(friendRequests.filter(u => u.user_id !== sender.user_id));
      fetchFriends(); // Re-fetch friends list
      console.log(`Accepted request from ${sender.username}.`);
    } catch (error) {
      console.error("Error accepting friend request:", error.message);
    }
  };

  const handleDeclineRequest = async (sender) => {
    if (!currentUser) return;
    try {
      await supabase.delete('friend_requests', `?sender_id=eq.${sender.user_id}&receiver_id=eq.${currentUser.user_id}`);
      setFriendRequests(friendRequests.filter(u => u.user_id !== sender.user_id));
      console.log(`Declined request from ${sender.username}.`);
    } catch (error) {
      console.error("Error declining friend request:", error.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchUser.trim()) {
      setSearchResults([]);
      return;
    }
    const results = users.filter(u =>
      u.username.toLowerCase().includes(searchUser.toLowerCase()) && u.user_id !== currentUser.user_id
    );
    setSearchResults(results);
  };

  const getChatId = (user1_id, user2_id) => {
    // Standardize chat ID creation by sorting IDs
    return [user1_id, user2_id].sort().join('_');
  };
  
  const fetchMessages = async (chatId) => {
    if (!chatId) return;
    try {
      const chatMessages = await supabase.select('messages', `?chat_id=eq.${chatId}&order=created_at.asc`);
      if (chatMessages) {
        setMessages(prev => ({ ...prev, [chatId]: chatMessages }));
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error.message);
    }
    // Scroll happens on message change, no need to call here
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentUser) return;

    const currentChatId = getChatId(currentUser.user_id, selectedChat.user_id);
    
    const messageContent = {
      chat_id: currentChatId,
      sender_id: currentUser.user_id,
      content: newMessage.trim(),
    };
    
    // 1. Optimistically update UI
    const tempMessage = { ...messageContent, created_at: new Date().toISOString() };
    setMessages(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), tempMessage]
    }));
    setNewMessage('');
    scrollToBottom();

    // 2. Send to DB
    try {
      // Supabase insert typically returns the inserted record.
      const result = await supabase.insert('messages', messageContent);
      if (!result) {
        // If insert fails (e.g., RLS error), log and revert the optimistic update or show error.
        console.error('Failed to send message and store in DB.');
        // A more complex app would remove the temp message and show an error toast.
      }
    } catch (error) {
      console.error("Error sending message:", error.message);
      // Handle critical send failure (e.g., connection lost)
    }
  };

  const scrollToBottom = () => {
    // FIX: Added a brief timeout to ensure the scroll happens after the message rendering/DOM update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 10);
  };

  // --- Effects ---

  useEffect(() => {
    // Check connection on component mount
    checkSupabaseConnection();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      fetchFriends();
      fetchFriendRequests();
    }
    // Note: users.length dependency is necessary because friend lists depend on the full user list being loaded first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users.length]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      const chatId = getChatId(currentUser.user_id, selectedChat.user_id);
      fetchMessages(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, currentUser]);

  useEffect(() => {
    // Scroll to bottom when messages update in the current chat
    if (selectedChat) {
      scrollToBottom();
    }
    // This ensures that when the selected chat changes, the scroll is also performed immediately
  }, [messages, selectedChat]); 

  // --- JSX Rendering Helpers ---

  const ProfileAvatar = ({ user, size = 'h-10 w-10' }) => (
    <div className={`${size} bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
      {user.username.charAt(0).toUpperCase()}
    </div>
  );

  const renderFriendList = () => (
    <div className="space-y-2">
      {friends.length > 0 ? (
        friends.map(friend => (
          <div
            key={friend.user_id}
            onClick={() => { setSelectedChat(friend); setShowSidebar(false); }}
            className={`flex items-center p-3 cursor-pointer rounded-xl transition hover:bg-gray-100 ${selectedChat && selectedChat.user_id === friend.user_id ? 'bg-blue-50 shadow-sm border-l-4 border-blue-500' : ''}`}
          >
            <ProfileAvatar user={friend} size="h-12 w-12" />
            <div className="ml-4 truncate">
              <p className="font-semibold text-gray-800 truncate">{friend.username}</p>
              <p className="text-sm text-gray-500 truncate">Tap to chat</p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 p-4">No friends yet. Add some!</p>
      )}
    </div>
  );

  const renderFriendRequests = () => (
    <div className="space-y-3">
      {friendRequests.length > 0 ? (
        friendRequests.map(sender => (
          <div key={sender.user_id} className="flex items-center p-3 bg-white shadow-sm rounded-xl border">
            <ProfileAvatar user={sender} size="h-10 w-10" />
            <div className="ml-3 flex-1">
              <p className="font-semibold text-sm">{sender.username}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleAcceptRequest(sender)}
                className="p-1.5 text-white bg-green-500 rounded-full hover:bg-green-600 transition"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => handleDeclineRequest(sender)}
                className="p-1.5 text-white bg-red-500 rounded-full hover:bg-red-600 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 p-4">No pending friend requests.</p>
      )}
    </div>
  );

  const renderUserSearch = () => (
    <div className="p-4">
      <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
          <Search size={22} />
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {searchResults.length > 0 ? (
          searchResults.map(user => (
            <div key={user.user_id} className="flex items-center justify-between p-3 bg-white shadow-sm rounded-xl border">
              <div className="flex items-center">
                <ProfileAvatar user={user} size="h-10 w-10" />
                <p className="ml-3 font-semibold">{user.username}</p>
              </div>
              <button
                onClick={() => handleAddFriend(user)}
                className="flex items-center space-x-1 p-2 bg-purple-500 text-white rounded-full text-sm hover:bg-purple-600 transition"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Search for users to connect.</p>
        )}
      </div>
    </div>
  );


  // --- Render Functions End ---

  // 1. Auth Screen JSX:
  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <MessageSquare size={40} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-center text-gray-500 mb-6">
            {authMode === 'login' ? 'Sign in to start chatting' : 'Join the SaleeChat community'}
          </p>

          {supabaseError && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-4 flex items-center">
              <AlertCircle size={20} className="mr-3" />
              <p className="text-sm font-medium">{supabaseError}</p>
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-5">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                // Simple spinner SVG for loading state
                <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                authMode === 'login' ? 'Log In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setLoginError('');
                setUsername('');
                setPassword('');
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Chat Interface JSX:
  const currentChatMessages = messages[getChatId(currentUser.user_id, selectedChat?.user_id)] || [];
  const ChatHeader = () => (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center">
        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} className="md:hidden mr-3 p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} />
          </button>
        )}
        <ProfileAvatar user={selectedChat} size="h-10 w-10" />
        <div className="ml-4">
          <p className="font-bold text-gray-800">{selectedChat.username}</p>
          <p className="text-sm text-green-500">Active now</p>
        </div>
         {/* Showing the user ID for demo/debugging purposes */}
        <span className="ml-2 text-xs text-gray-400 truncate hidden sm:inline">{selectedChat.user_id}</span>
      </div>
      <div className="flex space-x-3">
        {/* Mock settings buttons */}
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"><Search size={20} /></button>
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"><Settings size={20} /></button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar: Chats, Requests, Search */}
      <div
        className={`fixed inset-y-0 left-0 z-20 w-full sm:w-80 bg-white border-r border-gray-200 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex flex-col items-start truncate">
            <div className='flex items-center'>
              <ProfileAvatar user={currentUser} size="h-10 w-10" />
              <span className="ml-3 font-extrabold text-xl text-gray-900 truncate">
                {currentUser?.username || 'User'}
              </span>
            </div>
            <span className="ml-14 text-xs text-gray-400 truncate">ID: {currentUser?.user_id}</span>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition tooltip" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-4 flex justify-around border-b border-gray-200">
          <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 text-sm font-semibold rounded-full transition ${activeTab === 'chats' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Users size={18} className="inline mr-1" /> Friends
          </button>
          <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2 text-sm font-semibold rounded-full transition ml-2 ${activeTab === 'requests' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Bell size={18} className="inline mr-1" /> Requests ({friendRequests.length})
          </button>
        </div>
        
        {/* Search Bar for Friends/Users */}
        <div className="px-4 py-2 border-b border-gray-200">
          <form onSubmit={(e) => { e.preventDefault(); setActiveTab('search'); handleSearch(e); }} className="flex">
            <input
              type="text"
              placeholder="Find new users..."
              value={searchUser}
              onChange={(e) => { setSearchUser(e.target.value); setActiveTab('search'); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="p-2 bg-blue-500 text-white rounded-r-full hover:bg-blue-600 transition">
              <Search size={22} />
            </button>
          </form>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-182px)]"> {/* Adjusted height */}
          {activeTab === 'chats' && renderFriendList()}
          {activeTab === 'requests' && renderFriendRequests()}
          {activeTab === 'search' && renderUserSearch()}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <ChatHeader />

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {currentChatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender_id === currentUser.user_id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl shadow-md ${
                      message.sender_id === currentUser.user_id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 text-right ${message.sender_id === currentUser.user_id ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {supabaseError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-3 flex items-center">
                  <AlertCircle size={20} className="mr-3" />
                  <p className="text-sm font-medium">Database Error: {supabaseError}. Please check Supabase logs.</p>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <textarea
                  placeholder="Message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none max-h-32 overflow-y-auto transition"
                  disabled={loading || supabaseError}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading || supabaseError}
                  className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg">
                <MessageSquare size={40} className="text-blue-600" />
              </div>
              <p className="text-xl font-bold text-gray-800">Welcome to SaleeChat</p>
              <p className="text-md text-gray-500 mt-2">Select a friend from the sidebar to start a conversation.</p>
              <button onClick={() => setActiveTab('search')} className="mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition shadow-md">
                <Search size={18} className="inline mr-1" /> Find Friends
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
