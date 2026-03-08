'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

interface Player {
  id: string;
  username: string;
  personality: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Simple hardcoded password for prototype
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const loadPlayers = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setPlayers(data || []);
        }
        setLoading(false);
      };

      loadPlayers();

      // Subscribe to real-time changes
      const channel = supabase
        .channel('admin_players')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players' },
          () => {
            loadPlayers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('players')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      console.error('Error approving player:', error);
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('players')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      console.error('Error rejecting player:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting player:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 text-center">
          <h1 className="text-2xl font-bold mb-4 text-blue-400">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white mb-4"
          />
          <button
            onClick={() => {
              if (password === 'zahid') { // Simple password for prototype
                setIsAuthenticated(true);
              } else {
                alert('Incorrect password');
              }
            }}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const pendingPlayers = players.filter(p => p.status === 'pending');
  const approvedPlayers = players.filter(p => p.status === 'approved');

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">Manage players and game rooms</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Logged in as</p>
            <p className="font-medium text-white">Zahid Arman</p>
          </div>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Pending Players */}
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span>
              Pending Approvals ({pendingPlayers.length})
            </h2>
            
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : pendingPlayers.length === 0 ? (
              <p className="text-slate-500 italic bg-slate-900/50 p-6 rounded-xl border border-slate-800">No pending players.</p>
            ) : (
              <div className="space-y-4">
                {pendingPlayers.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/80 border border-slate-700 p-5 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-white">{player.username}</h3>
                      <p className="text-sm text-blue-300 font-medium">{player.personality}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Joined: {new Date(player.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleReject(player.id)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-red-900/50 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-200 rounded-lg transition-colors text-sm font-medium"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(player.id)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-colors text-sm font-medium"
                      >
                        Approve
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Approved Players */}
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Approved Players ({approvedPlayers.length})
            </h2>
            
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : approvedPlayers.length === 0 ? (
              <p className="text-slate-500 italic bg-slate-900/50 p-6 rounded-xl border border-slate-800">No approved players.</p>
            ) : (
              <div className="space-y-4">
                {approvedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <h3 className="text-base font-medium text-slate-200">{player.username}</h3>
                      <p className="text-xs text-slate-500">{player.personality}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="text-xs text-red-500 hover:text-red-400 underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
