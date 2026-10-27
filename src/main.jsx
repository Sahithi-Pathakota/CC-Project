import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowRight, Bell, BookOpen, Building2, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, FileCheck2, GraduationCap, LayoutDashboard, LoaderCircle, MapPin, Menu, Search, Sparkles, Ticket, Users, Utensils, X } from 'lucide-react';
import './styles.css';

const API = '/api';
const ICONS = { FileCheck2, Building2, GraduationCap, BookOpen, Utensils };
const fmtTime = (date) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));

async function readApiResponse(response) {
  const body = await response.text();
  if (!body) throw new Error('The queue server returned an empty response. Restart the app with npm run dev.');
  let data;
  try { data = JSON.parse(body); }
  catch { throw new Error('The queue server sent an invalid response. Restart the app with npm run dev.'); }
  if (!response.ok) throw new Error(data.error || `Queue request failed (${response.status}).`);
  return data;
}

function friendlyNetworkError(error) {
  return error instanceof TypeError
    ? 'Can’t reach the queue server. Start the app with npm run dev.'
    : error.message || 'Something went wrong while contacting the queue server.';
}

function App() {
  const [offices, setOffices] = useState([]);
  const [activeId, setActiveId] = useState('examination');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [myTicket, setMyTicket] = useState(() => { try { return JSON.parse(localStorage.getItem('campusline-ticket') || 'null'); } catch { return null; } });
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [staffPin, setStaffPin] = useState('');
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(`${API}/offices`);
      setOffices(await readApiResponse(response)); setError('');
    } catch (error) { if (!quiet) setError(friendlyNetworkError(error)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(() => refresh(true), 5000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);
  const active = offices.find((item) => item.id === activeId) || offices[0];
  const myOffice = offices.find((item) => item.id === myTicket?.officeId);
  const myPosition = myOffice && myTicket ? myOffice.waiting.findIndex((item) => item.number === myTicket.number) + 1 : 0;

  async function issueToken(event) {
    event.preventDefault(); if (!active || !name.trim()) return;
    setIssuing(true);
    try {
      const response = await fetch(`${API}/offices/${active.id}/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await readApiResponse(response);
      const ticket = { officeId: active.id, officeName: active.name, number: data.token.number, name: data.token.name, issuedAt: data.token.joinedAt };
      setMyTicket(ticket); localStorage.setItem('campusline-ticket', JSON.stringify(ticket)); setName(''); setModal(false); setToast(`You’re in the ${active.short} queue!`); await refresh(true);
    } catch (e) { setError(friendlyNetworkError(e)); }
    finally { setIssuing(false); }
  }
  async function staffAction(action) {
    if (!active) return;
    try {
      const response = await fetch(`${API}/offices/${active.id}/${action}`, { method: 'POST', headers: { 'x-staff-pin': staffPin } });
      await readApiResponse(response); await refresh(true); setToast(action === 'next' ? 'Next student called' : 'Current visit completed');
    } catch (e) {
      if (e.message.includes('PIN')) { setStaffUnlocked(false); setStaffPin(''); }
      setError(friendlyNetworkError(e));
    }
  }
  async function unlockStaff(event) {
    event.preventDefault(); setUnlocking(true);
    try {
      const response = await fetch(`${API}/staff/unlock`, { method: 'POST', headers: { 'x-staff-pin': staffPin } });
      await readApiResponse(response); setStaffUnlocked(true); setToast('Staff controls unlocked');
    } catch (e) { setError(friendlyNetworkError(e)); }
    finally { setUnlocking(false); }
  }
  function lockStaff() { setStaffUnlocked(false); setStaffPin(''); }
  function clearTicket() { setMyTicket(null); localStorage.removeItem('campusline-ticket'); setToast('Your ticket was cleared'); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={20} strokeWidth={2.6} /></div><span>campus<span className="brand-light">line</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-label">CAMPUS WORKSPACE</div>
      <div className="campus-select"><div className="campus-avatar">N</div><div className="campus-copy"><strong>Northfield College</strong><span>Student services</span></div><ChevronDown size={16} /></div>
      <nav><div className="nav-label">MENU</div><button className="nav-link active"><LayoutDashboard size={17}/><span>Overview</span></button><button className="nav-link" onClick={() => document.getElementById('offices')?.scrollIntoView({ behavior: 'smooth' })}><Ticket size={17}/><span>My queue</span>{myTicket && <span className="nav-dot"/>}</button>
      <div className="nav-label office-nav-label">OFFICES <span>{offices.length || 5}</span></div>
      <div className="office-nav">{offices.map((office) => { const Icon = ICONS[office.icon] || Building2; return <button key={office.id} onClick={() => { setActiveId(office.id); setMobileNav(false); }} className={`nav-link office-link ${activeId === office.id ? 'office-selected' : ''}`}><span className={`mini-icon ${office.color}`}><Icon size={15}/></span><span>{office.short}</span><span className="online-dot"/></button>; })}</div></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={16}/></div><div><strong>Need a hand?</strong><p>Ask your campus team</p></div><ArrowRight size={15}/></div><div className="user-profile"><div className="profile-avatar">S</div><div className="profile-text"><strong>Student account</strong><span>Northfield College</span></div><ChevronDown size={15}/></div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}

    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div><div className="top-actions"><div className="open-indicator"><span/>All offices open</div><button className="top-icon icon-button" aria-label="Notifications" onClick={() => setToast('You’re all caught up')}><Bell size={18}/><i/></button><div className="top-divider"/><div className="top-user"><div className="profile-avatar">S</div><ChevronDown size={14}/></div></div></header>
      <div className="page-content">
        <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> YOUR CAMPUS, IN FLOW</div><h1>Good morning<span className="greeting-dot">.</span></h1><p className="subtitle">Skip the line. Get on with your day.</p></div><div className="date-chip"><span className="date-dot"/>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</div></div>
        {error && <div className="error-banner">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
        <section className="hero-card"><div className="hero-copy"><div className="hero-kicker"><span/>A LITTLE MORE TIME, A LOT LESS WAITING</div><h2>Your time is<br/>yours again.</h2><p>Join a queue from wherever you are.<br/>We’ll let you know when it’s your turn.</p><button className="hero-button" onClick={() => { if (!active) return; setModal(true); }}><Ticket size={16}/> Get a queue ticket <ArrowRight size={16}/></button><div className="hero-note"><CheckCircle2 size={14}/> Free for all Northfield students</div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-circle circle-back"/><div className="hero-circle circle-front"><div className="clock-face"><div className="clock-tick"/><div className="clock-hand hour-hand"/><div className="clock-hand minute-hand"/><span className="clock-center"/></div></div><div className="floating-card queue-float"><span className="float-icon"><Ticket size={15}/></span><div><small>YOUR QUEUE</small><strong>Just a little way to go</strong></div><span className="float-status"/></div><div className="floating-card time-float"><span className="time-icon"><Clock3 size={15}/></span><div><small>TIME SAVED</small><strong>~24 min today</strong></div></div><div className="sparkle s-one">✳</div><div className="sparkle s-two">✦</div><div className="sparkle s-three">·</div></div><div className="hero-footnote"><span>✳</span> Made for campus life</div></section>

        {myTicket && <section className="ticket-banner"><div className="ticket-badge"><Ticket size={19}/></div><div className="ticket-main"><div className="ticket-overline">YOU’RE IN LINE <span className="live-pill"><i/> LIVE</span></div><strong>{myTicket.officeName} · Token #{myTicket.number}</strong><span>{myPosition ? `${myPosition} ${myPosition === 1 ? 'person' : 'people'} ahead · about ${myPosition * 4} min` : myOffice?.currentToken === myTicket.number ? 'It’s your turn! Head to the counter.' : 'Your visit is complete or your token was served.'}</span></div><div className="ticket-progress"><div><span>YOUR TURN</span><b>{myPosition ? `#${myOffice?.waiting[0]?.number ?? '—'}` : 'SOON'}</b></div><div className="progress-track"><i style={{ width: `${myPosition ? Math.max(13, 100 / (myPosition + 1)) : 100}%` }}/></div></div><button className="clear-ticket" onClick={clearTicket} aria-label="Clear ticket"><X size={17}/></button></section>}

        <section className="section-head" id="offices"><div><div className="section-kicker">HERE FOR YOU</div><h2>Find your office<span className="greeting-dot">.</span></h2><p>Pick a destination to see how things are moving.</p></div><button className="text-button" onClick={() => refresh()}><Activity size={15}/> Refresh status</button></section>
        <div className="office-grid">{loading && offices.length === 0 ? <div className="loading-state"><LoaderCircle className="spin"/> Loading campus queues…</div> : offices.map((office) => <OfficeCard key={office.id} office={office} selected={activeId === office.id} onSelect={() => setActiveId(office.id)} onJoin={() => { setActiveId(office.id); setModal(true); }}/>)}</div>
        <section className="lower-grid"><div className="status-panel"><div className="panel-head"><div><div className="section-kicker">LIVE RIGHT NOW</div><h3>Queue activity</h3></div><span className="live-pill"><i/> UPDATING LIVE</span></div><div className="activity-bars">{offices.map((office, i) => <div className="activity-row" key={office.id}><span>{office.short}</span><div className="bar-track"><i className={`bar-fill bar-${i}`} style={{ width: `${Math.min(92, 18 + office.waitingCount * 13)}%` }}/></div><strong>{office.waitingCount} waiting</strong></div>)}</div><div className="staff-desk"><div><span>STAFF DESK · {active?.short || 'SELECT AN OFFICE'}</span><strong>{active?.serving ? `Now serving #${active.serving.number}` : 'No student at the counter'}</strong></div>{staffUnlocked ? <div className="staff-actions"><button onClick={lockStaff}>Lock controls</button><button onClick={() => staffAction('complete')} disabled={!active?.serving}>Complete visit</button><button className="call-next" onClick={() => staffAction('next')} disabled={!active?.waitingCount}>Call next <ArrowRight size={13}/></button></div> : <form className="staff-unlock" onSubmit={unlockStaff}><input aria-label="Staff PIN" type="password" value={staffPin} onChange={(event) => setStaffPin(event.target.value)} placeholder="Staff PIN" maxLength={64} required/><button className="call-next" disabled={unlocking}>{unlocking ? 'Checking…' : 'Unlock controls'}</button></form>}</div><div className="panel-foot"><span><span className="legend-dot"/> Typical campus wait</span><strong>4 min per person</strong></div></div><div className="tip-card"><div className="tip-top"><div className="tip-icon"><Bell size={16}/></div><span>QUICK TIP</span></div><h3>We’ll save your spot.</h3><p>After you get a ticket, keep this page open or check back any time. Your place updates automatically.</p><button onClick={() => setToast('Ticket status refreshes automatically every few seconds')}>How it works <ArrowRight size={14}/></button><div className="tip-decoration">✳</div></div></section>
        <footer className="footer"><span>© {new Date().getFullYear()} CampusLine <span className="footer-separator">·</span> Northfield College</span><span><span className="footer-live"/> Systems operational <span className="footer-separator">·</span> Built for better campus days</span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setModal(false); }}><form className="ticket-modal" onSubmit={issueToken}><button className="modal-close icon-button" type="button" onClick={() => setModal(false)} aria-label="Close"><X size={18}/></button><div className="modal-symbol"><Ticket size={22}/></div><div className="section-kicker">YOUR NEXT STOP</div><h2>Get in the queue<span className="greeting-dot">.</span></h2><p className="modal-desc">You’ll get a digital ticket and your place will update live.</p><label className="field-label">CHOOSE AN OFFICE</label><div className="select-wrap"><select value={activeId} onChange={(e) => setActiveId(e.target.value)}>{offices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={16}/></div><label className="field-label" htmlFor="student-name">YOUR NAME</label><input id="student-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Patel" maxLength={40} required/><div className="modal-queue-info"><Users size={16}/><span><strong>{active?.waitingCount ?? 0} people</strong> currently waiting</span><span className="modal-estimate">~{active?.estimatedWait ?? 0} min wait</span></div><button className="modal-submit" disabled={issuing || !active}>{issuing ? <><LoaderCircle className="spin" size={17}/> Getting your ticket…</> : <>Get my ticket <ArrowRight size={16}/></>}</button><div className="modal-privacy"><Check size={13}/> Your name is only used to call your turn</div></form></div>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}

function OfficeCard({ office, selected, onSelect, onJoin }) {
  const Icon = ICONS[office.icon] || Building2;
  return <article className={`office-card ${selected ? 'card-selected' : ''}`} onClick={onSelect}><div className="card-top"><div className={`office-icon ${office.color}`}><Icon size={19}/></div><button className="card-more" onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label={`Select ${office.name}`}><ArrowRight size={16}/></button></div><div className="office-title-row"><h3>{office.name}</h3><span className="status-open"><i/> Open</span></div><p className="office-description">{office.description}</p><div className="location"><MapPin size={13}/>{office.location}</div><div className="queue-stats"><div className="current-token"><span>CURRENTLY SERVING</span><strong>#{office.currentToken ?? '—'}</strong></div><div className="stat-divider"/><div><span>IN THE QUEUE</span><strong>{String(office.waitingCount).padStart(2, '0')} <small>people</small></strong></div><div className="wait-estimate"><Clock3 size={13}/>{office.estimatedWait} min</div></div><div className="card-bottom"><div className="people-stack">{['A','M','J'].slice(0, Math.min(office.waitingCount, 3)).map((letter, index) => <span key={letter} className={`person-dot person-${index}`}>{letter}</span>)}<span className="people-caption">{office.waitingCount ? `${office.waitingCount} students in line` : 'No wait right now'}</span></div><button className="join-button" onClick={(e) => { e.stopPropagation(); onJoin(); }}>Join queue <ArrowRight size={14}/></button></div></article>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
