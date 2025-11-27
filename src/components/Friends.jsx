import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Users, UserPlus, Check, X, Loader2, Search, Trash2 } from 'lucide-react';

const tabOptions = [
  { id: 'requests', label: 'Requests' },
  { id: 'sent', label: 'Sent' },
  { id: 'friends', label: 'Friends' },
];

const Friends = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [sent, setSent] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUserId(user.id);

    // Incoming requests
    const { data: incoming } = await supabase
      .from('friends')
      .select(`
        id, status, requester_id, addressee_id,
        requester:requester_id ( id, username, display_name, total_xp, current_level )
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
    setRequests(incoming || []);

    // Sent requests
    const { data: outgoing } = await supabase
      .from('friends')
      .select(`
        id, status, requester_id, addressee_id,
        addressee:addressee_id ( id, username, display_name, total_xp, current_level )
      `)
      .eq('requester_id', user.id)
      .eq('status', 'pending');
    setSent(outgoing || []);

    // Accepted friends via view if present, else join manually
    const { data: friendList, error: viewError } = await supabase
      .from('friend_profiles')
      .select('*')
      .order('total_xp', { ascending: false });

    if (!viewError && friendList) {
      setFriends(friendList);
    } else {
      const { data: fallback } = await supabase
        .from('friends')
        .select(`
          id, status, requester_id, addressee_id,
          requester:requester_id ( id, username, display_name, total_xp, current_level ),
          addressee:addressee_id ( id, username, display_name, total_xp, current_level )
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const list = (fallback || []).map((f) => {
        const other = f.requester_id === user.id ? f.addressee : f.requester;
        return {
          friendship_id: f.id,
          friend_id: other?.id,
          username: other?.username,
          display_name: other?.display_name,
          total_xp: other?.total_xp,
          current_level: other?.current_level,
        };
      });
      setFriends(list);
    }

    setLoading(false);
  };

  const handleAccept = async (friendId) => {
    setSaving(true);
    await supabase.rpc('respond_friend', { p_friend_id: friendId, p_action: 'accept' });
    await fetchData();
    setSaving(false);
  };

  const handleDecline = async (friendId) => {
    setSaving(true);
    await supabase.rpc('respond_friend', { p_friend_id: friendId, p_action: 'decline' });
    await fetchData();
    setSaving(false);
  };

  const handleRemove = async (friendshipId) => {
    setSaving(true);
    const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendshipId });
    if (error) console.error(error);
    await fetchData();
    setSaving(false);
  };

  const handleAdd = async (addresseeId) => {
    setSaving(true);
    await supabase.rpc('request_friend', { p_addressee: addresseeId });
    setSaving(false);
    setSearchResults((prev) => prev.filter((p) => p.id !== addresseeId));
    await fetchData();
    setActiveTab('sent');
  };

  const search = useMemo(() => {
    let timeoutId;
    return (term) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!term || term.length < 2) {
          setSearchResults([]);
          return;
        }
        setSearching(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, total_xp, current_level')
          .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(15);
        const excludeIds = new Set([
          user?.id,
          ...requests.map((r) => r.requester_id),
          ...sent.map((s) => s.addressee_id),
          ...friends.map((f) => f.friend_id),
        ].filter(Boolean));
        setSearchResults((data || []).filter((p) => !excludeIds.has(p.id)));
        setSearching(false);
      }, 250);
    };
  }, [requests, sent, friends]);

  const onSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    search(term);
  };

  const renderIncoming = () => (
    requests.length === 0 ? (
      <p className="text-sm text-slate-500">No incoming requests.</p>
    ) : (
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
            <div>
              <p className="text-white font-semibold">{req.requester?.display_name || req.requester?.username || 'Player'}</p>
              <p className="text-xs text-slate-500">Level {req.requester?.current_level || 1}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(req.id)}
                disabled={saving}
                className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => handleDecline(req.id)}
                disabled={saving}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const renderSent = () => (
    sent.length === 0 ? (
      <p className="text-sm text-slate-500">No pending requests.</p>
    ) : (
      <div className="space-y-3">
        {sent.map((req) => (
          <div key={req.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
            <div>
              <p className="text-white font-semibold">{req.addressee?.display_name || req.addressee?.username || 'Player'}</p>
              <p className="text-xs text-slate-500">Level {req.addressee?.current_level || 1}</p>
            </div>
            <span className="text-xs text-slate-400">Pending</span>
          </div>
        ))}
      </div>
    )
  );

  const renderFriends = () => (
    friends.length === 0 ? (
      <p className="text-sm text-slate-500">No friends yet.</p>
    ) : (
      <div className="space-y-3">
        {friends.map((f) => (
          <div key={f.friendship_id || f.friend_id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
            <div>
              <p className="text-white font-semibold">{f.display_name || f.username || 'Player'}</p>
              <p className="text-xs text-slate-500">Level {f.current_level || 1}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-xs font-semibold">{f.total_xp ?? 0} XP</span>
              <button
                onClick={() => handleRemove(f.friendship_id)}
                disabled={saving}
                className="p-2 rounded-lg bg-slate-800 text-red-300 hover:bg-red-600 hover:text-white disabled:opacity-50"
                title="Remove friend"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans safe-area-pb">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Users className="text-blue-400" size={22} />
          <h1 className="text-xl font-bold">Friends</h1>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 mb-4 flex">
        {tabOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveTab(opt.id)}
            className={`flex-1 py-2 rounded-lg text-sm ${activeTab === opt.id ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Find by display name or username"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {searching ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={14} /> Searching...</div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white font-semibold">{p.display_name || p.username || 'Player'}</p>
                  <p className="text-xs text-slate-500">Level {p.current_level || 1}</p>
                </div>
                <button
                  onClick={() => handleAdd(p.id)}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1"
                >
                  <UserPlus size={14} /> Add
                </button>
              </div>
            ))}
          </div>
        ) : searchTerm.length >= 2 ? (
          <p className="text-xs text-slate-500">No users found.</p>
        ) : (
          <p className="text-xs text-slate-500">Type at least 2 characters to search.</p>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="animate-spin" size={14} /> Loading...
          </div>
        ) : (
          <>
            {activeTab === 'requests' && renderIncoming()}
            {activeTab === 'sent' && renderSent()}
            {activeTab === 'friends' && renderFriends()}
          </>
        )}
      </div>
    </div>
  );
};

export default Friends;
