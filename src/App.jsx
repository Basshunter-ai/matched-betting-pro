import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Wallet, Plus, Edit3, Trash2, Check, X, Bell, Clock, ExternalLink, RefreshCw } from 'lucide-react';

const MatchedBettingApp = () => {
  // State management
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('mb_balance');
    return saved ? parseFloat(saved) : 1000;
  });
  
  const [bets, setBets] = useState(() => {
    const saved = localStorage.getItem('mb_bets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('mb_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [editingBet, setEditingBet] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Calculator states
  const [betType, setBetType] = useState('qualifying');
  const [backStake, setBackStake] = useState(10);
  const [backOdds, setBackOdds] = useState(2.0);
  const [layOdds, setLayOdds] = useState(2.1);
  const [bookmaker, setBookmaker] = useState('Bonus Bookmaker');
  const [exchange, setExchange] = useState('Betfair');
  const [exchangeCommission, setExchangeCommission] = useState(2);
  const [eventName, setEventName] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(30);

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem('mb_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('mb_bets', JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    localStorage.setItem('mb_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  }, []);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (!reminder.sent && new Date(reminder.time) <= now) {
          if (notificationsEnabled) {
            new Notification(`Match Starting Soon!`, {
              body: `${reminder.eventName} starts in ${reminder.minutesBefore} minutes`,
              icon: '/favicon.ico'
            });
          }
          setReminders(prev => prev.map(r => 
            r.id === reminder.id ? { ...r, sent: true } : r
          ));
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [reminders, notificationsEnabled]);

  // Sports data API integration (placeholder for external APIs)
  const fetchMatchResult = async (eventName) => {
    // This would connect to Flashscore API or similar
    // Example API endpoints:
    // - The Sports DB API
    // - Football-Data API
    // - Flashscore API (requires scraping)
    try {
      // Placeholder for API call
      const response = await fetch(`/api/match-result?event=${encodeURIComponent(eventName)}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching match result:', error);
    }
    return null;
  };

  // Calculate matched betting
  const calculateMatchedBet = () => {
    const commission = exchangeCommission / 100;
    let layStake, liability, backProfit, layProfit, totalResult;

    switch(betType) {
      case 'qualifying':
        layStake = (backOdds * backStake) / (layOdds - (layOdds - 1) * commission);
        liability = layStake * (layOdds - 1);
        backProfit = (backOdds - 1) * backStake - liability;
        layProfit = layStake * (1 - commission) - backStake;
        totalResult = (backProfit + layProfit) / 2;
        break;

      case 'snr':
        layStake = ((backOdds - 1) / (layOdds - (layOdds - 1) * commission)) * backStake;
        liability = layStake * (layOdds - 1);
        backProfit = (backOdds - 1) * backStake - liability;
        layProfit = layStake * (1 - commission);
        totalResult = (backProfit + layProfit) / 2;
        break;

      case 'sr':
        layStake = (backOdds * backStake) / (layOdds - (layOdds - 1) * commission);
        liability = layStake * (layOdds - 1);
        backProfit = backOdds * backStake - liability;
        layProfit = layStake * (1 - commission);
        totalResult = (backProfit + layProfit) / 2;
        break;

      default:
        layStake = 0;
        liability = 0;
        backProfit = 0;
        layProfit = 0;
        totalResult = 0;
    }

    return {
      layStake: Math.round(layStake * 100) / 100,
      liability: Math.round(liability * 100) / 100,
      backProfit: Math.round(backProfit * 100) / 100,
      layProfit: Math.round(layProfit * 100) / 100,
      totalResult: Math.round(totalResult * 100) / 100,
      isGoodBet: betType === 'qualifying' ? Math.abs(totalResult) < 1 : totalResult > 0
    };
  };

  const result = calculateMatchedBet();

  const addBet = () => {
    if (!eventName.trim()) return;
    
    const newBet = {
      id: Date.now(),
      eventName,
      betType,
      bookmaker,
      exchange,
      backOdds,
      layOdds,
      backStake,
      layStake: result.layStake,
      liability: result.liability,
      exchangeCommission,
      expectedResult: result.totalResult,
      expectedBackProfit: result.backProfit,
      expectedLayProfit: result.layProfit,
      eventDateTime,
      status: 'pending',
      actualResult: null,
      dateCreated: new Date().toISOString().split('T')[0]
    };
    
    setBets([...bets, newBet]);
    
    // Add reminder if event time is set
    if (eventDateTime && reminderMinutes > 0) {
      const eventTime = new Date(eventDateTime);
      const reminderTime = new Date(eventTime.getTime() - (reminderMinutes * 60 * 1000));
      
      if (reminderTime > new Date()) {
        const newReminder = {
          id: Date.now() + 1,
          eventName,
          time: reminderTime.toISOString(),
          minutesBefore: reminderMinutes,
          sent: false
        };
        setReminders(prev => [...prev, newReminder]);
      }
    }
    
    if (betType === 'qualifying') {
      setBalance(prev => prev - backStake);
    }
    
    // Reset form
    setEventName('');
    setEventDateTime('');
  };

  const updateBetResult = (id, backWon) => {
    setBets(prev => prev.map(bet => {
      if (bet.id === id) {
        let actualResult;
        if (backWon) {
          actualResult = bet.expectedBackProfit;
        } else {
          actualResult = bet.expectedLayProfit;
        }
        
        setBalance(prevBalance => {
          if (bet.betType === 'qualifying') {
            return prevBalance + bet.backStake + actualResult;
          } else {
            return prevBalance + actualResult;
          }
        });
        
        return {
          ...bet,
          status: 'completed',
          actualResult: Math.round(actualResult * 100) / 100,
          backWon
        };
      }
      return bet;
    }));
    setEditingBet(null);
  };

  const autoFetchResult = async (betId) => {
    const bet = bets.find(b => b.id === betId);
    if (!bet) return;

    const result = await fetchMatchResult(bet.eventName);
    if (result) {
      // Auto-update based on API result
      updateBetResult(betId, result.homeWin);
    }
  };

  const deleteBet = (id) => {
    const bet = bets.find(b => b.id === id);
    if (bet && bet.status === 'pending' && bet.betType === 'qualifying') {
      setBalance(prev => prev + bet.backStake);
    }
    setBets(prev => prev.filter(b => b.id !== id));
    
    // Remove associated reminders
    setReminders(prev => prev.filter(r => !r.eventName.includes(bet?.eventName || '')));
  };

  const totalProfit = bets.reduce((sum, bet) => {
    return sum + (bet.actualResult || 0);
  }, 0);

  const pendingBets = bets.filter(bet => bet.status === 'pending');
  const upcomingReminders = reminders.filter(r => !r.sent && new Date(r.time) > new Date());

  const getBetTypeLabel = (type) => {
    switch(type) {
      case 'qualifying': return 'Qualifying Bet';
      case 'snr': return 'Free Bet (SNR)';
      case 'sr': return 'Free Bet (SR)';
      default: return type;
    }
  };

  const getBetTypeColor = (type) => {
    switch(type) {
      case 'qualifying': return 'bg-blue-50 border-blue-400';
      case 'snr': return 'bg-purple-50 border-purple-400';
      case 'sr': return 'bg-green-50 border-green-400';
      default: return 'bg-gray-50 border-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Calculator className="text-blue-600" />
            Matched Betting Pro
          </h1>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <Bell size={20} className={notificationsEnabled ? 'text-green-600' : 'text-gray-400'} />
              <span className="text-sm text-gray-600">
                {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
              </span>
            </div>
            {upcomingReminders.length > 0 && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {upcomingReminders.length} upcoming reminders
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <Wallet className="text-green-600" size={24} />
              <div>
                <p className="text-gray-600">Balance</p>
                <p className="text-2xl font-bold text-green-600">€{balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-600" size={24} />
              <div>
                <p className="text-gray-600">Total Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <Calculator className="text-purple-600" size={24} />
              <div>
                <p className="text-gray-600">Active Bets</p>
                <p className="text-2xl font-bold text-purple-600">{pendingBets.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
            <div className="flex items-center gap-3">
              <Clock className="text-orange-600" size={24} />
              <div>
                <p className="text-gray-600">Reminders</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingReminders.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <Calculator className="text-blue-600" />
              Matched Betting Calculator
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bet Type</label>
                <select
                  value={betType}
                  onChange={(e) => setBetType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="qualifying">Qualifying Bet</option>
                  <option value="snr">Free Bet - Stake Not Returned (SNR)</option>
                  <option value="sr">Free Bet - Stake Returned (SR)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Arsenal vs Chelsea"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bookmaker</label>
                  <input
                    type="text"
                    value={bookmaker}
                    onChange={(e) => setBookmaker(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exchange</label>
                  <input
                    type="text"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {betType === 'qualifying' ? 'Back Stake (€)' : 'Free Bet (€)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={backStake}
                    onChange={(e) => setBackStake(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={exchangeCommission}
                    onChange={(e) => setExchangeCommission(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (min)</label>
                  <input
                    type="number"
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Back Odds</label>
                  <input
                    type="number"
                    step="0.01"
                    value={backOdds}
                    onChange={(e) => setBackOdds(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lay Odds</label>
                  <input
                    type="number"
                    step="0.01"
                    value={layOdds}
                    onChange={(e) => setLayOdds(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Results */}
            <div className={`mt-6 p-4 rounded-lg ${
              betType === 'qualifying' 
                ? (result.isGoodBet ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200')
                : (result.isGoodBet ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')
            }`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">{getBetTypeLabel(betType)} Results</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.isGoodBet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {betType === 'qualifying' ? 'Low Loss' : result.isGoodBet ? 'Profitable' : 'Check Odds'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded">
                    <p className="font-medium text-blue-800">{bookmaker} (Back)</p>
                    <p className="text-sm text-gray-600">Stake: €{backStake}</p>
                    <p className="text-sm text-gray-600">Odds: {backOdds}</p>
                    <p className="text-sm font-medium">If wins: €{result.backProfit.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="font-medium text-red-800">{exchange} (Lay)</p>
                    <p className="text-sm text-gray-600">Stake: €{result.layStake}</p>
                    <p className="text-sm text-gray-600">Odds: {layOdds}</p>
                    <p className="text-sm text-gray-600">Liability: €{result.liability}</p>
                    <p className="text-sm font-medium">If wins: €{result.layProfit.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border-2 border-dashed border-gray-300">
                  <p className="text-center font-bold text-lg">
                    {betType === 'qualifying' ? 'Expected Loss: ' : 'Expected Profit: '}
                    <span className={result.totalResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                      €{Math.abs(result.totalResult).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={addBet}
              disabled={!eventName.trim() || (betType === 'qualifying' && balance < backStake)}
              className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add {getBetTypeLabel(betType)}
            </button>
          </div>
          
          {/* Portfolio */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-green-600" />
              Portfolio & Results
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bets.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="text-gray-500 mt-2">No bets added yet</p>
                </div>
              ) : (
                bets.map(bet => (
                  <div key={bet.id} className={`p-4 rounded-lg border-l-4 ${getBetTypeColor(bet.betType)} ${
                    bet.status === 'pending' ? '' : 
                    bet.actualResult >= 0 ? 'bg-opacity-30' : 'bg-red-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{bet.eventName}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {getBetTypeLabel(bet.betType)}
                          </span>
                          {bet.eventDateTime && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {new Date(bet.eventDateTime).toLocaleDateString()} {new Date(bet.eventDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {bet.status === 'pending' && (
                          <>
                            <button
                              onClick={() => autoFetchResult(bet.id)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Auto-fetch result"
                            >
                              <RefreshCw size={16} />
                            </button>
                            {editingBet !== bet.id && (
                              <button
                                onClick={() => setEditingBet(bet.id)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              >
                                <Edit3 size={16} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => deleteBet(bet.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                      <div>{bet.bookmaker}: €{bet.backStake} @ {bet.backOdds}</div>
                      <div>{bet.exchange}: €{bet.layStake} @ {bet.layOdds}</div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-gray-600">
                        Expected: €{Math.abs(bet.expectedResult).toFixed(2)} {bet.betType === 'qualifying' ? 'loss' : 'profit'}
                      </span>
                      {bet.actualResult !== null && (
                        <span className={`ml-4 font-semibold ${bet.actualResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Actual: €{bet.actualResult.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {editingBet === bet.id && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateBetResult(bet.id, true)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                        >
                          <Check size={14} />
                          {bet.bookmaker} Won
                        </button>
                        <button
                          onClick={() => updateBetResult(bet.id, false)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                        >
                          <Check size={14} />
                          {bet.exchange} Won
                        </button>
                        <button
                          onClick={() => setEditingBet(null)}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* API Integration Notes */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ExternalLink className="text-blue-600" />
            API Integration Setup
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Notification Features:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Browser push notifications</li>
                <li>• Event start reminders</li>
                <li>• Bet settlement alerts</li>
                <li>• Auto result fetching</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> This app includes localStorage for data persistence and notification API integration. 
              For full functionality with live sports data, you'll need to add API keys and configure the backend endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchedBettingApp;semibold text-gray-700 mb-2">Sports Data APIs:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• The Sports DB API (free tier available)</li>
                <li>• Football-Data.org API</li>
                <li>• API-Sports (RapidAPI)</li>
                <li>• Flashscore web scraping</li>
              </ul>
            </div>
            <div>
              <h4 className="font-