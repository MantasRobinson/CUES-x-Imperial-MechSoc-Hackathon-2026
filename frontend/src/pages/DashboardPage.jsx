import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SummaryCards     from '../components/Dashboard/SummaryCards';
import StreakHeatmap    from '../components/Dashboard/StreakHeatmap';
import SessionTable     from '../components/Dashboard/SessionTable';
import PersonalBests    from '../components/Dashboard/PersonalBests';
import LevelProgressBar from '../components/common/LevelProgressBar';
import PhoneFreeBarChart from '../components/Charts/PhoneFreeBarChart';
import XPCurveChart     from '../components/Charts/XPCurveChart';
import NoisePieChart    from '../components/Charts/NoisePieChart';
import SessionHistogram from '../components/Charts/SessionHistogram';
import LiveSession      from '../components/Dashboard/LiveSession';

export default function DashboardPage() {
  const { user } = useAuth();

  const [dashboard,  setDashboard]  = useState(null);
  const [sessions,   setSessions]   = useState([]);
  const [chartData,  setChartData]  = useState(null);
  const [bests,      setBests]      = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [period,     setPeriod]     = useState('weekly');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSessionEnd = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    Promise.all([
      api.get('/users/dashboard'),
      api.get('/sessions?limit=50'),
      api.get('/users/personal-bests'),
      api.get('/challenges'),
    ])
      .then(([dash, sess, b, ch]) => {
        setDashboard(dash.data);
        setSessions(sess.data.sessions);
        setBests(b.data);
        setChallenges(ch.data);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    api.get(`/sessions/chart-data?period=${period}`)
      .then((r) => setChartData(r.data))
      .catch(() => {});
  }, [period]);

  if (loading) return <p className="text-gray-400 animate-pulse">Loading…</p>;
  if (error)   return <p className="text-red-400">{error}</p>;

  const lp = dashboard?.levelProgress;

  return (
    <div className="space-y-6">
      {/* Live session animation — appears automatically when phone is in box */}
      <LiveSession
        userId={user?.id}
        userXp={user?.totalXp}
        userLevel={user?.level}
        challenges={challenges ? [...(challenges.daily||[]), ...(challenges.weekly||[]), ...(challenges.community||[])] : []}
        onSessionEnd={handleSessionEnd}
      />

      {/* Motivational message */}
      {dashboard?.motivationalMessage && (
        <div className="card border-l-4 border-brand-500 text-gray-300 text-sm">
          {dashboard.motivationalMessage}
        </div>
      )}

      {/* Summary cards */}
      <SummaryCards
        todayMinutes={dashboard?.todayMinutes}
        todayXP={dashboard?.todayXP}
        currentStreak={user?.currentStreak}
        level={user?.level}
      />

      {/* Level progress */}
      {lp && (
        <div className="card">
          <LevelProgressBar
            level={lp.level}
            progress={lp.progress}
            currentLevelXP={lp.currentLevelXP}
            nextLevelXP={lp.nextLevelXP}
            totalXp={user?.totalXp}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="flex gap-3 mb-1">
        {['daily','weekly','monthly'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              period === p ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PhoneFreeBarChart data={chartData?.timeSeries} />
        <XPCurveChart      data={chartData?.timeSeries} />
        <NoisePieChart     distribution={chartData?.noiseDistribution} />
        <SessionHistogram  histogram={chartData?.sessionLengthHistogram} />
      </div>

      {/* Streak heatmap */}
      <StreakHeatmap sessions={sessions} />

      {/* Personal bests */}
      {bests && (
        <PersonalBests
          longestSession={bests.longestSession}
          longestStreak={bests.longestStreak}
          highestXpSession={bests.highestXpSession}
        />
      )}

      {/* Active challenges */}
      {challenges && (
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-3">Active Challenges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...challenges.daily, ...challenges.weekly, ...challenges.community].map((ch) => (
              <div key={ch.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{ch.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ch.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ml-2 shrink-0 ${
                    ch.type === 'daily'     ? 'bg-blue-900 text-blue-300' :
                    ch.type === 'weekly'    ? 'bg-purple-900 text-purple-300' :
                                             'bg-green-900 text-green-300'
                  }`}>
                    {ch.type}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{ch.completed ? '✅ Complete!' : `${ch.progress} / ${ch.criteriaValue}`}</span>
                    <span>+{ch.xpReward} XP</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (ch.progress / ch.criteriaValue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      <SessionTable sessions={sessions} />
    </div>
  );
}
