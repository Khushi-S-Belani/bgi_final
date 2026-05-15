import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplets, 
  Activity, 
  Waves, 
  Zap, 
  Unlink, 
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  User,
  Settings,
  Bell,
  Cpu
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

function App() {
  const [govData, setGovData] = useState({ flow: 0, tds: 0, turbidity: 0, total_flow: 0 });
  const [consumer1, setConsumer1] = useState({ id: 'C1', flow: 0, total: 0, valve: false, tamper: false, emergency: false });
  const [consumer2, setConsumer2] = useState({ id: 'C2', flow: 0, total: 0, valve: false, tamper: false, emergency: false });
  
  const [ports, setPorts] = useState({ gov: null, c1: null, c2: null });
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('gov'); // 'gov' or 'consumer'

  // Theft Detection Logic: If Gov Flow > (Consumer1 Flow + Consumer2 Flow) + Tolerance
  const totalConsumerFlow = consumer1.flow + consumer2.flow;
  const theftDetected = govData.flow > (totalConsumerFlow + 2.0) && govData.flow > 1.0;

  const connectNode = async (type) => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      setPorts(prev => ({ ...prev, [type]: port }));
      readLoop(port, type);
    } catch (err) {
      console.error(`Error connecting ${type}:`, err);
    }
  };

  const sendCommand = async (type, command) => {
    const port = ports[type];
    if (!port) return;
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    await writer.write(encoder.encode(JSON.stringify(command) + '\n'));
    writer.releaseLock();
  };

  const readLoop = async (port, type) => {
    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        try {
          const data = JSON.parse(line.trim());
          if (type === 'gov') {
            setGovData(data);
            setHistory(prev => [...prev.slice(-19), { ...data, time: new Date().toLocaleTimeString() }]);
          } else if (type === 'c1') {
            setConsumer1(prev => ({ ...prev, ...data }));
          } else if (type === 'c2') {
            setConsumer2(prev => ({ ...prev, ...data }));
          }
        } catch (e) {}
      }
    }
  };

  return (
    <div className="bg-space min-h-screen text-white font-sans">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="glass-container max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 glass p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Droplets className="text-blue-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">JAL BOARD <span className="text-blue-400">PRO</span></h1>
              <p className="text-white/50 text-sm">Smart Water Management & Theft Detection</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setView('gov')}
              className={`px-6 py-2 rounded-xl transition-all ${view === 'gov' ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white/5 hover:bg-white/10'}`}
            >
              Gov Dashboard
            </button>
            <button 
              onClick={() => setView('consumer')}
              className={`px-6 py-2 rounded-xl transition-all ${view === 'consumer' ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-white/5 hover:bg-white/10'}`}
            >
              Consumer Hub
            </button>
          </div>
        </header>

        {/* Alerts Section */}
        {(theftDetected || consumer1.tamper || consumer2.tamper) && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {theftDetected && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                <AlertTriangle className="text-red-500" size={24} />
                <div>
                  <h4 className="font-bold text-red-500">Water Theft Detected!</h4>
                  <p className="text-xs opacity-80">Supply mismatch: +{(govData.flow - totalConsumerFlow).toFixed(2)} L/min</p>
                </div>
              </div>
            )}
            {consumer1.tamper && (
              <div className="bg-orange-500/20 border border-orange-500/50 p-4 rounded-xl flex items-center gap-4">
                <ShieldCheck className="text-orange-500" size={24} />
                <div>
                  <h4 className="font-bold text-orange-500">Consumer 1 Tamper!</h4>
                  <p className="text-xs opacity-80">Meter movement detected.</p>
                </div>
              </div>
            )}
            {consumer2.tamper && (
              <div className="bg-orange-500/20 border border-orange-500/50 p-4 rounded-xl flex items-center gap-4">
                <ShieldCheck className="text-orange-500" size={24} />
                <div>
                  <h4 className="font-bold text-orange-500">Consumer 2 Tamper!</h4>
                  <p className="text-xs opacity-80">Meter movement detected.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'gov' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Gov Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-3xl relative overflow-hidden">
                <div className="flex justify-between mb-4">
                  <h3 className="text-white/60 font-medium">Main Supply Flow</h3>
                  <Activity className="text-blue-400" size={20} />
                </div>
                <div className="text-4xl font-bold mb-4">{govData.flow.toFixed(2)} <span className="text-lg font-normal text-white/40">L/min</span></div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="flow" stroke="#60a5fa" fillOpacity={1} fill="url(#colorFlow)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass p-6 rounded-3xl">
                <div className="flex justify-between mb-4">
                  <h3 className="text-white/60 font-medium">System Diagnostics</h3>
                  <Cpu className="text-purple-400" size={20} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-60">Purity (TDS)</span>
                    <span className="font-bold text-blue-400">{govData.tds} PPM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-60">Turbidity</span>
                    <span className="font-bold text-emerald-400">{govData.turbidity} NTU</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <button 
                      onClick={() => connectNode('gov')}
                      className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${ports.gov ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {ports.gov ? <ShieldCheck size={18} /> : <LinkIcon size={18} />}
                      {ports.gov ? 'Gov Node Active' : 'Connect Gov Node'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Consumer Control Cards */}
              <ConsumerControlCard 
                id="1" 
                data={consumer1} 
                onConnect={() => connectNode('c1')} 
                isConnected={!!ports.c1}
                onToggleValve={(val) => sendCommand('c1', { valve: val })}
                onResetTamper={() => sendCommand('c1', { resetTamper: true })}
              />
              <ConsumerControlCard 
                id="2" 
                data={consumer2} 
                onConnect={() => connectNode('c2')} 
                isConnected={!!ports.c2}
                onToggleValve={(val) => sendCommand('c2', { valve: val })}
                onResetTamper={() => sendCommand('c2', { resetTamper: true })}
              />
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="glass p-6 rounded-3xl border-l-4 border-blue-500">
                <h3 className="text-lg font-bold mb-4">Grid Summary</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="text-xs opacity-50 mb-1">Net Supply Volume</div>
                    <div className="text-2xl font-bold">{govData.total_flow.toFixed(2)} L</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="text-xs opacity-50 mb-1">Total Consumption</div>
                    <div className="text-2xl font-bold">{(consumer1.total + consumer2.total).toFixed(2)} L</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Consumer Hub View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConsumerHubView id="1" data={consumer1} />
            <ConsumerHubView id="2" data={consumer2} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConsumerControlCard({ id, data, onConnect, isConnected, onToggleValve, onResetTamper }) {
  return (
    <div className={`glass p-6 rounded-3xl border-t-2 transition-all ${data.tamper ? 'border-orange-500 bg-orange-500/5' : 'border-white/5'}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg text-white/60">
            <User size={20} />
          </div>
          <h3 className="font-bold text-lg">Consumer {id}</h3>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {isConnected ? 'Connected' : 'Offline'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-2xl">
          <div className="text-[10px] opacity-40 uppercase mb-1">Flow Rate</div>
          <div className="text-xl font-bold">{data.flow.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl">
          <div className="text-[10px] opacity-40 uppercase mb-1">Total Used</div>
          <div className="text-xl font-bold">{data.total.toFixed(2)} L</div>
        </div>
      </div>

      <div className="space-y-3">
        {!isConnected ? (
          <button onClick={onConnect} className="w-full py-3 bg-blue-600 rounded-xl font-bold flex items-center justify-center gap-2">
            <LinkIcon size={18} /> Connect Node {id}
          </button>
        ) : (
          <>
            <button 
              onClick={() => onToggleValve(!data.valve)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${data.valve ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}
            >
              {data.valve ? <Lock size={18} /> : <Unlock size={18} />}
              {data.valve ? 'Close Valve' : 'Open Valve'}
            </button>
            {data.tamper && (
              <button onClick={onResetTamper} className="w-full py-2 bg-orange-500/20 text-orange-500 rounded-lg text-sm font-medium">
                Reset Tamper Alert
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConsumerHubView({ id, data }) {
  return (
    <div className="glass p-8 rounded-[2rem] relative overflow-hidden">
      {data.emergency && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
      )}
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <span className="text-blue-400 font-bold tracking-widest text-xs uppercase">Consumer Dashboard</span>
          <h2 className="text-3xl font-black mt-2">ACCOUNT #{id}00-BGI</h2>
        </div>
        <div className={`p-4 rounded-2xl ${data.valve ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {data.valve ? <Unlock size={32} /> : <Lock size={32} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="p-6 bg-white/5 rounded-3xl flex justify-between items-center">
          <div>
            <div className="text-sm opacity-50 mb-1">Current Usage</div>
            <div className="text-4xl font-bold">{data.total.toFixed(3)} <span className="text-lg opacity-30">Litres</span></div>
          </div>
          <Activity className="text-blue-400 opacity-20" size={48} />
        </div>

        {data.emergency && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
            <div className="flex items-center gap-3 text-red-500 mb-2 font-bold">
              <Bell size={20} className="animate-bounce" />
              EMERGENCY ACCESS ACTIVE
            </div>
            <p className="text-sm text-red-500/70">You are using emergency water quota. Access will be cut automatically after 5.000 Litres.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-xs opacity-40 mb-1">Flow Velocity</div>
          <div className="text-xl font-bold">{data.flow.toFixed(2)} L/m</div>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-xs opacity-40 mb-1">Security Status</div>
          <div className={`text-xl font-bold ${data.tamper ? 'text-orange-500' : 'text-emerald-500'}`}>
            {data.tamper ? 'Alert' : 'Secure'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
