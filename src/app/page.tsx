'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Snowflake, Calendar, Zap, BarChart2, Activity, ShieldAlert, BrainCircuit, Wallet, FileSpreadsheet, Lock, ArrowRight } from 'lucide-react'

const FadeIn = ({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s`
    }}>
      {children}
    </div>
  );
};

const CountUp = ({ end, duration = 2000 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

const TiltCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const [style, setStyle] = useState({});
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    const tiltX = (0.5 - y) * 20;
    const tiltY = (x - 0.5) * 20;
    setStyle({
      transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s ease-out'
    });
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className} style={style}>
      {children}
    </div>
  );
}


const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] shadow-sm hover:-translate-y-1 hover:shadow-md hover:bg-white/90 transition-all duration-300 ${className}`}>
    {children}
  </div>
)

export default function LandingPage() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen font-sans text-[#111827]" style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(14,165,233,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(16,185,129,0.05) 0%, transparent 55%), #F7F8FA' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes slide-dot {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .animate-slide-dot { animation: slide-dot 3s infinite linear; }
      `}} />
      
      {}
      <header 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${
          isNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/80 backdrop-blur-[16px] border border-[rgba(255,255,255,0.9)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-3 h-[52px] flex items-center gap-4">
          
          {}
          <div className="flex items-center gap-1 flex-shrink-0 pl-3">
            <span className="text-[14px] font-[800] text-[#111827]">Cold</span>
            <span className="text-[14px] font-[800] text-[#0EA5E9]">Ops</span>
          </div>

          {}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'Home', href: '/' },
              { label: 'Configure', href: '/configure' },
              { label: 'Action', href: '/actions' },
              { label: 'Dashboard', href: '/dashboard' }
            ].map((link) => {
              const isActive = link.label === 'Home'
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-5 py-2 rounded-full text-[13px] font-[600] transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0EA5E9] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          
          {}
          <Link href="/configure" className="relative flex items-center justify-center h-9 w-9 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] transition-colors flex-shrink-0 ml-1">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        {}
        <div className="flex-1 text-left flex flex-col items-start w-full">
          <h1 className="text-[56px] lg:text-[64px] font-[800] text-[#111827] leading-[1.1] max-w-[600px] mb-6 tracking-tight">
            Stop paying for cold air <span className="text-[#0EA5E9]">nobody needs.</span>
          </h1>
          <p className="text-[18px] text-[#6B7280] max-w-[500px] leading-[1.7] mb-8">
            ColdOps monitors your industrial coolers in real time and tells you exactly when to lower or raise power — so your F&B business stops wasting electricity without risking your stock.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 w-full sm:w-auto">
            <Link href="/configure" className="w-full sm:w-auto text-center bg-[#0EA5E9] text-white px-[28px] py-[14px] rounded-[10px] font-bold hover:bg-[#0284C7] hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              Start Saving Now &rarr;
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto text-center bg-white text-[#374151] border border-[#D1D5DB] px-[28px] py-[14px] rounded-[10px] font-bold hover:bg-gray-50 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              Watch How It Works
            </a>
          </div>
          <div className="text-[13px] text-[#9CA3AF]">
            ★★★★★ Built for forward-thinking F&B facilities across Malaysia
          </div>
        </div>

        {}
        <div className="flex-1 w-full lg:max-w-lg relative animate-float">
          <TiltCard>
            <GlassCard className="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
              <h3 className="text-[12px] font-bold text-gray-400 tracking-widest uppercase">Live Cooler Status</h3>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Data
              </div>
            </div>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
                <div>
                  <div className="text-sm font-bold text-gray-900">CR-01</div>
                  <div className="text-[11px] text-gray-500">Dairy Processing</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">4.0°C</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">Optimal</div>
                </div>
              </div>
              <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
                <div>
                  <div className="text-sm font-bold text-gray-900">CR-02</div>
                  <div className="text-[11px] text-gray-500">Blast Freezer</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">-18°C</div>
                  <div className="text-[11px] text-red-600 font-semibold flex items-center justify-end gap-1"><Activity className="h-3 w-3" /> Ghost Load</div>
                </div>
              </div>
              <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:scale-[1.02] transition-transform duration-300">
                <div>
                  <div className="text-sm font-bold text-gray-900">CR-03</div>
                  <div className="text-[11px] text-gray-500">Chilled Storage</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">10.5°C</div>
                  <div className="text-[11px] text-blue-600 font-semibold">Saving RM12</div>
                </div>
              </div>
            </div>
            
            {}
            <div className="h-24 bg-gray-50/50 rounded-lg flex items-end px-2 pb-2 gap-1 overflow-hidden opacity-90 border border-gray-100/50">
              {[...Array(30)].map((_, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-[#0EA5E9] to-[#38BDF8] rounded-t-sm transition-all duration-500 hover:opacity-100" style={{ height: `${Math.max(20, Math.sin(i * 0.3) * 40 + 50)}%`, opacity: i > 20 ? 0.4 : 0.8 }} />
              ))}
            </div>
            </GlassCard>
          </TiltCard>
        </div>
      </section>

      {}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-10">
            <h2 className="text-[28px] font-[800] text-[#111827]">Manual and steps to use this app</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <GlassCard className="flex-1 p-6 text-center w-full">
              <h3 className="font-bold text-[#0EA5E9] mb-2 text-[16px]">Configure</h3>
              <p className="text-[14px] text-[#6B7280] leading-[1.5]">Give your input</p>
            </GlassCard>
            <ArrowRight className="hidden md:block h-6 w-6 text-gray-300 flex-shrink-0" />
            <GlassCard className="flex-1 p-6 text-center w-full">
              <h3 className="font-bold text-[#0EA5E9] mb-2 text-[16px]">Action</h3>
              <p className="text-[14px] text-[#6B7280] leading-[1.5]">It processes, and your turn to verify</p>
            </GlassCard>
            <ArrowRight className="hidden md:block h-6 w-6 text-gray-300 flex-shrink-0" />
            <GlassCard className="flex-1 p-6 text-center w-full">
              <h3 className="font-bold text-[#0EA5E9] mb-2 text-[16px]">Dashboard</h3>
              <p className="text-[14px] text-[#6B7280] leading-[1.5]">See how the results changed, visually</p>
            </GlassCard>
          </div>
        </FadeIn>
      </section>

      {}
      <section className="py-12 border-y border-gray-200/50 bg-white/30 backdrop-blur-sm overflow-hidden">
        <FadeIn>
        <div className="text-center text-[12px] text-[#9CA3AF] mb-6">Powering smarter operations at</div>
        <div className="flex w-full overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-marquee gap-6 px-6">
            {}
            {['Dairy Processing', 'Cold Chain Logistics', 'Juice Manufacturing', 'Blast Freezer Facilities', 'Chilled Storage', 'Food Distribution', 'Marigold', 'Frozen Food Plants', 'Dairy Processing', 'Cold Chain Logistics', 'Juice Manufacturing', 'Blast Freezer Facilities', 'Chilled Storage', 'Food Distribution', 'Marigold', 'Frozen Food Plants'].map((item, idx) => (
              <div key={idx} className="bg-white border border-[#E5E7EB] rounded-full px-[16px] py-[6px] text-[13px] text-[#6B7280] shadow-sm whitespace-nowrap">
                {item}
              </div>
            ))}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
          .animate-marquee { animation: marquee 30s linear infinite; }
        `}} />
        </FadeIn>
      </section>

      {}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassCard className="p-8">
            <div className="h-10 w-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-6">
              <BarChart2 className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div className="text-[40px] font-[800] text-[#111827] leading-none mb-2">RM 43+</div>
            <div className="text-[13px] text-[#6B7280]">Average saved per night per facility</div>
          </GlassCard>
          <GlassCard className="p-8">
            <div className="h-10 w-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-6">
              <Snowflake className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div className="text-[40px] font-[800] text-[#111827] leading-none mb-2">8 coolers</div>
            <div className="text-[13px] text-[#6B7280]">Monitored simultaneously in real time</div>
          </GlassCard>
          <GlassCard className="p-8">
            <div className="h-10 w-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-6">
              <Zap className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div className="text-[40px] font-[800] text-[#111827] leading-none mb-2">&lt; 5 min</div>
            <div className="text-[13px] text-[#6B7280]">Setup time from zero to live monitoring</div>
          </GlassCard>
        </div>
        </FadeIn>
      </section>

      {}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
        <FadeIn>
        <div className="text-center mb-16">
          <div className="text-[11px] font-[700] tracking-[0.1em] text-[#0EA5E9] uppercase mb-4">HOW IT WORKS</div>
          <h2 className="text-[32px] font-[800] text-[#111827]">One system. Three steps.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px bg-[#E2E8F0] -z-10">
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0EA5E9] animate-slide-dot shadow-[0_0_8px_#0EA5E9]" />
          </div>
          
          <GlassCard className="p-8 relative">
            <div className="absolute top-4 left-4 bg-[#EFF6FF] text-[#0EA5E9] text-[13px] font-[800] rounded px-2 py-1">01</div>
            <div className="h-12 w-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mb-6 mt-6 mx-auto">
              <Calendar className="h-6 w-6 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[16px] font-[700] text-center mb-3">Input Operations Data</h3>
            <p className="text-[13px] text-[#6B7280] leading-[1.6] text-center">
              Input your <strong className="font-[700] text-[#111827]">working hours timetable</strong> and <strong className="font-[700] text-[#111827]">Warehouse Management Systems Data</strong> containing stock data for every single industrial cooler.
            </p>
          </GlassCard>
          
          <GlassCard className="p-8 relative">
            <div className="absolute top-4 left-4 bg-[#EFF6FF] text-[#0EA5E9] text-[13px] font-[800] rounded px-2 py-1">02</div>
            <div className="h-12 w-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mb-6 mt-6 mx-auto">
              <BrainCircuit className="h-6 w-6 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[16px] font-[700] text-center mb-3">AI Analysis & Optimization</h3>
            <p className="text-[13px] text-[#6B7280] leading-[1.6] text-center">
              The app analyses your facility data and decides the best optimized kWh based on your input.
            </p>
          </GlassCard>

          <GlassCard className="p-8 relative">
            <div className="absolute top-4 left-4 bg-[#EFF6FF] text-[#0EA5E9] text-[13px] font-[800] rounded px-2 py-1">03</div>
            <div className="h-12 w-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mb-6 mt-6 mx-auto">
              <BarChart2 className="h-6 w-6 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[16px] font-[700] text-center mb-3">Approve Actions & Save</h3>
            <p className="text-[13px] text-[#6B7280] leading-[1.6] text-center">
              Results and actions are sent to your workers. Once <strong className="font-[700] text-[#111827]">approved</strong>, the system will call the cooler API to control the temperature.
            </p>
          </GlassCard>
        </div>
        </FadeIn>
      </section>

      {}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
        <div className="text-center mb-16">
          <div className="text-[11px] font-[700] tracking-[0.1em] text-[#0EA5E9] uppercase mb-4">FEATURES</div>
          <h2 className="text-[32px] font-[800] text-[#111827]">Everything your ops team needs. Nothing they don't.</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <Snowflake className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">Real-Time Cooler Monitoring</h3>
            <p className="text-[13px] text-[#6B7280]">Live temperature, setpoint, and stock load for every cooler in your facility.</p>
          </GlassCard>

          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <ShieldAlert className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">Ghost Load Detection</h3>
            <p className="text-[13px] text-[#6B7280]">Identifies coolers running at full power with minimal stock — the biggest source of wasted electricity.</p>
          </GlassCard>

          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <BrainCircuit className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">AI Setpoint Recommendations</h3>
            <p className="text-[13px] text-[#6B7280]">Get precise up/down suggestions based on stock type, quantity, and your operating schedule.</p>
          </GlassCard>

          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <Wallet className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">Per-Action Savings Tracking</h3>
            <p className="text-[13px] text-[#6B7280]">Every approved recommendation shows the exact RM saved, logged and timestamped.</p>
          </GlassCard>

          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">WMS CSV Integration</h3>
            <p className="text-[13px] text-[#6B7280]">Upload your warehouse stock data in seconds. Supports 4-column and legacy 7-column formats.</p>
          </GlassCard>

          <GlassCard className="p-6 rounded-[16px]">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-[10px] flex items-center justify-center mb-4">
              <Lock className="h-4 w-4 text-[#0EA5E9]" />
            </div>
            <h3 className="text-[14px] font-[700] text-[#111827] mb-2">Auto-Pilot Mode</h3>
            <p className="text-[13px] text-[#6B7280]">Let the AI approve safe setpoint changes automatically during off-peak hours.</p>
          </GlassCard>
        </div>
        </FadeIn>
      </section>

      {}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
        <div className="bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-[24px] p-8 md:p-12 flex flex-col lg:flex-row items-center gap-12 backdrop-blur-[12px] shadow-lg shadow-sky-900/5">
          <div className="flex-1">
            <h2 className="text-[28px] font-[800] text-[#111827] mb-4 leading-tight">
              How much is your facility wasting right now?
            </h2>
            <p className="text-[14px] text-[#6B7280] leading-relaxed mb-8">
              The average F&B facility with 8 coolers wastes RM 1,200–1,800 per month in ghost load electricity. ColdOps pays for itself in the first week.
            </p>
            <Link href="/configure" className="bg-[#0EA5E9] text-white px-[28px] py-[14px] rounded-[10px] font-bold hover:bg-[#0284C7] transition-colors inline-block text-center">
              Get Your Free Savings Estimate &rarr;
            </Link>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="bg-white rounded-[16px] p-[28px] shadow-xl border border-gray-100 flex flex-col items-center text-center">
              <div className="text-[14px] font-medium text-gray-500 mb-2">Estimated Monthly Savings</div>
              <div className="text-[48px] font-[800] text-[#10B981] leading-none mb-4">RM <CountUp end={1440} /></div>
              <div className="text-[11px] text-[#9CA3AF]">
                based on 8 coolers · TNB tariff RM 0.509/kWh
              </div>
            </div>
          </div>
        </div>
        </FadeIn>
      </section>

      {}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
        <div className="rounded-[24px] p-12 md:p-16 text-center" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)' }}>
          <h2 className="text-[32px] font-[800] text-white mb-4 max-w-2xl mx-auto leading-tight">
            Your coolers are running right now. Are they costing you more than they should?
          </h2>
          <p className="text-[16px] text-white/80 mb-10 max-w-xl mx-auto">
            Join F&B facilities across Malaysia that have cut cooler electricity costs with ColdOps.
          </p>
          <Link href="/configure" className="bg-white text-[#0EA5E9] px-[32px] py-[14px] rounded-[10px] font-[700] hover:bg-gray-50 transition-colors inline-block">
            Start Free Today &rarr;
          </Link>
        </div>
        </FadeIn>
      </section>

      {}
      <footer className="bg-white border-t border-[#E5E7EB] px-[32px] py-[32px] mt-12">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 text-[12px] text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            <span>&copy; 2026 ColdOp Solutions Sdn Bhd</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
