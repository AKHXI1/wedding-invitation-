import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';

const EVENTS = {
  m: { id: 'm', title: 'Madhuramveppu', date: '29th December 2026', time: '06:00 PM', venue: "Bride's Residence", desc: 'Join us for the traditional Madhuramveppu ceremony.', mapLinks: [{ label: 'View Location on Map', url: 'https://maps.app.goo.gl/29ekFMhbyP2zPGen6' }] },
  e: { id: 'e', title: 'Betrothal', date: '30th December 2026', time: '04:00 PM', venue: "St. Joseph's Forane Church, Olavakkode", desc: 'Reception to follow at Ebrason Convention Centre starting at 6:00 PM.', mapLinks: [{ label: 'Church Location', url: 'https://maps.app.goo.gl/d2w3V1AVH3dHo3TAA' }, { label: 'Reception Location', url: 'https://maps.app.goo.gl/ZyiMxWJzSzfBKfC68' }] },
  w: { id: 'w', title: 'Wedding', date: '2nd January 2027', time: '11:00 AM', venue: 'Lourde Matha Forane Church, Vadakkencherry', desc: 'Reception to follow at Thevarcad Convention Centre starting at 1:00 PM.', mapLinks: [{ label: 'Church Location', url: 'https://maps.app.goo.gl/1GU2K4SwSfxgFhr17' }, { label: 'Reception Location', url: 'https://maps.app.goo.gl/JASTYNC4MSmvniFMA' }] }
};

function InvitationViewer() {
  const [isOpened, setIsOpened] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const revealRefs = useRef([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isIntroDismissed, setIsIntroDismissed] = useState(false);
  const [searchParams] = useSearchParams();
  const eventKeysParam = searchParams.get('e') || searchParams.get('events');
  const activeEvents = eventKeysParam ? eventKeysParam.split(',').filter(k => EVENTS[k]) : ['m', 'e', 'w'];
  const showFamilies = searchParams.get('f') !== '0' && searchParams.get('showFamilies') !== 'false';
  const showRSVP = searchParams.get('r') !== '0' && searchParams.get('showRSVP') !== 'false';
  const showWardrobe = searchParams.get('w') !== '0' && searchParams.get('showWardrobe') !== 'false';

  const startAnimation = () => {
    if (isPlaying || isOpened) return;
    setIsPlaying(true);
    
    // Auto complete opening animation after 2.5 seconds
    setTimeout(() => {
      handleVideoEnd();
    }, 2500);
  };

  const handleVideoEnd = () => {
    setIsOpened(true);
    document.body.classList.remove('locked');
    setTimeout(() => {
      revealRefs.current.forEach(el => {
        if (el) el.classList.add('in');
      });
      setIsIntroDismissed(true);
    }, 500);
  };

  useEffect(() => {
    document.body.classList.add('locked');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    }, { threshold: 0.15 });

    const nodes = document.querySelectorAll('.hero .reveal, main > .reveal, main .card');
    nodes.forEach(el => observer.observe(el));

    const stagger = (el, i) => { el.classList.add('fx'); el.style.setProperty('--i', i); };
    document.querySelectorAll('.hero .reveal').forEach((el, i) => el.style.setProperty('--i', i));
    document.querySelectorAll('main > .reveal').forEach(sec => [...sec.children].forEach(stagger));
    document.querySelectorAll('.clock > *').forEach((el, i) => stagger(el, 1 + i));

    const heroText = document.querySelector('.hero > div');
    const onScroll = () => {
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        if (heroText) heroText.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.6));
      });
    };
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      nodes.forEach(el => observer.unobserve(el));
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const eventDates = {
      m: new Date("2026-12-29T18:00:00+05:30").getTime(),
      e: new Date("2026-12-30T16:00:00+05:30").getTime(),
      w: new Date("2027-01-02T11:00:00+05:30").getTime()
    };
    
    // Find the earliest active event
    let target = eventDates['w']; // Default to wedding
    if (activeEvents.includes('m')) target = eventDates['m'];
    else if (activeEvents.includes('e')) target = eventDates['e'];
    else if (activeEvents.includes('w')) target = eventDates['w'];

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, target - now) / 1000;
      setTimeLeft({
        d: Math.floor(left / 86400),
        h: Math.floor((left / 3600) % 24),
        m: Math.floor((left / 60) % 60),
        s: Math.floor(left % 60)
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeEvents]);

  const pad = n => String(n).padStart(2, '0');
  const addToRefs = el => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRSVPSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      side: formData.get('side'),
      count: formData.get('count'),
      attending: formData.get('attending') === 'yes',
      remarks: formData.get('remarks'),
      invitedEvents: activeEvents.map(k => EVENTS[k].title).join(', '),
      submittedAt: new Date().toLocaleString(),
      createdAt: serverTimestamp()
    };
    
    try {
      await addDoc(collection(db, 'rsvps'), data);
      alert('Thank you! Your RSVP has been saved securely.');
      e.target.reset();
    } catch (error) {
      console.error(error);
      alert('Error saving RSVP. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      {!isIntroDismissed && (
        <div 
          className={`luxury-intro ${isOpened ? 'open' : ''} ${isPlaying ? 'playing' : ''}`} 
          onClick={startAnimation}
          role="button"
          tabIndex={0}
          aria-label="Open Wedding Invitation"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startAnimation(); }}
        >
          <div className="curtain left">
            <span className="initial j">J</span>
          </div>
          <div className="curtain right">
            <div className="curtain-seal" title="Tap or click to open">
              <div className="seal-pulse-ring"></div>
              <div className="seal-pulse-ring delay"></div>
              <span>&</span>
            </div>
            <span className="initial a">A</span>
          </div>
          
          <div className="luxury-intro-content">
            <div className="pointer-arrow-anim" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="6 11 12 5 18 11"></polyline>
              </svg>
            </div>
            <div className="tap-hint">Tap anywhere to enter</div>
            <div className="luxury-text">A CELEBRATION OF LOVE</div>
          </div>
        </div>
      )}

      <main>
        <header className="hero">
          <div>
            <p className="kicker reveal" ref={addToRefs}>Kindly join us<br />to celebrate with</p>
            <h1 className="names reveal" ref={addToRefs}>JOE EMMANUEL JACOB<span className="and">and</span>ANJITHA SABU</h1>
            <p className="script reveal" ref={addToRefs}>We can't wait to celebrate</p>
          </div>
          <div className="art" role="img" aria-label="Illustration of the couple at the villa"></div>
        </header>

        <section className="reveal quote-section" style={{ padding: '44px 28px', textAlign: 'center' }} ref={addToRefs}>
          <p className="script" style={{ fontSize: '32px', lineHeight: '1.4', color: 'var(--ink)' }}>
            "I have found the one whom my soul loves."
          </p>
          <p style={{ fontSize: '13px', letterSpacing: '0.18em', color: 'var(--soft)', marginTop: '14px', textTransform: 'uppercase', fontWeight: 600 }}>
            Song of Solomon 3:4
          </p>
        </section>

        {showFamilies && (
        <section className="reveal families-section card" ref={addToRefs} style={{ borderTop: 'none', background: 'transparent' }}>
          <h2 className="underline">Our Families</h2>
          
          <div className="family-grid" style={{ display: 'grid', gap: '30px', marginTop: '40px' }}>
            <div className="family-card">
              <h3 style={{ fontSize: '16px', color: 'var(--soft)', marginBottom: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Groom's Parents</h3>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '22px', marginBottom: '6px', color: 'var(--ink)', lineHeight: '1.4', fontWeight: 600 }}>
                Mr. K.J Chacko<br/>
                <span style={{ fontStyle: 'italic', fontSize: '18px', color: 'var(--soft)', fontWeight: 400 }}>&amp;</span><br/>
                Mrs. Rani Chacko
              </p>
              <p style={{ fontSize: '15px', color: 'var(--soft)', lineHeight: '1.6', fontWeight: 500 }}>Kappyaruthottathil House<br/>Vadakkencherry, Palakkad</p>
            </div>

            <div className="family-card">
              <h3 style={{ fontSize: '16px', color: 'var(--soft)', marginBottom: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Bride's Parents</h3>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '22px', marginBottom: '6px', color: 'var(--ink)', lineHeight: '1.4', fontWeight: 600 }}>
                Mr. Sabu George<br/>
                <span style={{ fontStyle: 'italic', fontSize: '18px', color: 'var(--soft)', fontWeight: 400 }}>&amp;</span><br/>
                Mrs. Stella Sabu
              </p>
              <p style={{ fontSize: '15px', color: 'var(--soft)', lineHeight: '1.6', fontWeight: 500 }}>Pulikkottil House<br/>Olavakkode, Palakkad</p>
            </div>
          </div>
        </section>
        )}

        <section className="reveal" style={{ paddingTop: '0' }} ref={addToRefs}>
          <div className="divider"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></div>
          <p className="lead" style={{ fontSize: '18px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>We are inviting you to</p>
        </section>

        {activeEvents.map(key => {
          const ev = EVENTS[key];
          return (
            <div key={key} className="card reveal" ref={addToRefs}>
              <h3>{ev.title}</h3>
              <p style={{ fontSize: '16px', lineHeight: '1.8', color: 'var(--ink)' }}>
                <strong style={{ fontSize: '18px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>{ev.date}</strong>
                <span style={{ fontSize: '15px', color: 'var(--soft)', fontWeight: 600 }}>{ev.time} at {ev.venue}</span>
              </p>
              <p style={{ marginTop: '14px', fontSize: '15px', lineHeight: '1.6', color: 'var(--ink)' }}>{ev.desc}</p>
              {ev.mapLinks && (
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '18px' }}>
                  {ev.mapLinks.map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--btn)', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '2px solid var(--btn)', paddingBottom: '3px' }}>
                      <span aria-hidden="true">📍</span> {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {showWardrobe && (
        <section className="reveal" ref={addToRefs} style={{ textAlign: 'center', paddingTop: 0 }}>
          <div className="divider"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></div>
          <h2 className="underline" style={{ fontSize: '24px' }}>Wardrobe Plans</h2>
          <p className="lead" style={{ fontSize: '15px', marginTop: '15px', fontWeight: 500 }}>Click below to view the dress code & color palette.</p>
          <button className="btn" onClick={() => setIsWardrobeOpen(true)} style={{ marginTop: '20px', padding: '14px 34px', fontSize: '12px' }}>VIEW WARDROBE PLANS</button>
        </section>
        )}

        <section className="countdown reveal" ref={addToRefs}>
          <p className="kicker">Counting down to forever</p>
          <div className="clock">
            <div><b>{pad(timeLeft.d)}</b><small>DAYS</small></div>
            <div><b>{pad(timeLeft.h)}</b><small>HOURS</small></div>
            <div><b>{pad(timeLeft.m)}</b><small>MIN</small></div>
            <div><b>{pad(timeLeft.s)}</b><small>SEC</small></div>
          </div>
        </section>

        {showRSVP && (
        <section className="rsvp reveal" id="rsvp" ref={addToRefs}>
          <h2>RSVP</h2>
          <form className="rsvp-form" onSubmit={handleRSVPSubmit}>
            <input type="text" name="name" placeholder="Full Name(s)" required />
            <select name="side" required className="rsvp-select" defaultValue="">
              <option value="" disabled>...</option>
              <option value="GROOM SIDE">Groom Side</option>
              <option value="BRIDE SIDE">Bride Side</option>
            </select>
            <input type="number" name="count" placeholder="Number of Guests" required min="1" max="10" />

            <div className="radio-group">
              <label><input type="radio" name="attending" value="yes" defaultChecked /> Joyfully Accepts</label>
              <label><input type="radio" name="attending" value="no" /> Regretfully Declines</label>
            </div>

            <textarea name="remarks" placeholder="Any dietary requirements or special notes?" rows="3"></textarea>
            <button type="submit" className="btn" disabled={isSubmitting}>
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
          </form>
        </section>
        )}

        <footer>
          <p className="script">Joe & Anjitha</p>
        </footer>
      </main>

      {isWardrobeOpen && (
        <div className="wardrobe-modal" onClick={() => setIsWardrobeOpen(false)}>
          <div className="wardrobe-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsWardrobeOpen(false)}>×</button>
            <h3 style={{ marginBottom: '15px', color: 'var(--ink)' }}>Wardrobe Plans</h3>
            <img src="/assets/images/wardrobe.jpeg" alt="Wardrobe Plans" style={{ width: '100%', borderRadius: '8px', border: '1px solid #eee' }} />
          </div>
        </div>
      )}
    </>
  );
}

function AdminPanel({ onLogout }) {
  const [rsvps, setRsvps] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState({ m: true, e: true, w: true });
  const [showFamilies, setShowFamilies] = useState(true);
  const [showRSVP, setShowRSVP] = useState(true);
  const [showWardrobe, setShowWardrobe] = useState(true);
  const [generatedLink, setGeneratedLink] = useState('');
  const [filterSide, setFilterSide] = useState('ALL');

  const filteredRsvps = rsvps.filter(r => filterSide === 'ALL' || r.side === filterSide);

  useEffect(() => {
    // We don't want body locked on the admin page
    document.body.classList.remove('locked');
    
    const fetchRsvps = async () => {
      try {
        const q = query(collection(db, 'rsvps'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRsvps(fetchedData);
      } catch (error) {
        console.error("Error fetching RSVPs: ", error);
        // Fallback for when index is building or query fails
        try {
          const fallbackSnapshot = await getDocs(collection(db, 'rsvps'));
          const fallbackData = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRsvps(fallbackData.reverse());
        } catch(e) {}
      }
    };
    
    fetchRsvps();
  }, []);

  const handleToggle = (e) => {
    setSelectedEvents({ ...selectedEvents, [e.target.name]: e.target.checked });
  };

  const generateLink = () => {
    const keys = Object.keys(selectedEvents).filter(k => selectedEvents[k]);
    const params = new URLSearchParams();
    if (keys.length !== 3) params.set('e', keys.join(','));
    if (!showFamilies) params.set('f', '0');
    if (!showRSVP) params.set('r', '0');
    if (!showWardrobe) params.set('w', '0');
    const qs = params.toString();
    const url = `${window.location.origin}/${qs ? '?' + qs : ''}`;
    setGeneratedLink(url);
  };

  const deleteRsvp = async (id) => {
    if (window.confirm('Are you sure you want to delete this RSVP?')) {
      try {
        await deleteDoc(doc(db, 'rsvps', id));
        setRsvps(rsvps.filter(r => r.id !== id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Could not delete RSVP. Please try again.");
      }
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={onLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'var(--ink)', fontSize: '13px' }}>Logout</button>
          <Link to="/" className="btn-small">View Site</Link>
        </div>
      </header>

      <div className="admin-content">
        <section className="admin-card">
          <h2>Generate Invitation Link</h2>
          <p>Select which events this guest is invited to:</p>
          <div className="toggles">
            <label className="toggle-label">
              <input type="checkbox" name="m" checked={selectedEvents.m} onChange={handleToggle} />
              Madhuramveppu
            </label>
            <label className="toggle-label">
              <input type="checkbox" name="e" checked={selectedEvents.e} onChange={handleToggle} />
              Engagement
            </label>
            <label className="toggle-label">
              <input type="checkbox" name="w" checked={selectedEvents.w} onChange={handleToggle} />
              Wedding
            </label>
            <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
            <label className="toggle-label">
              <input type="checkbox" checked={showFamilies} onChange={(e) => setShowFamilies(e.target.checked)} />
              Include "Our Families" Section
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={showWardrobe} onChange={(e) => setShowWardrobe(e.target.checked)} />
              Include "Wardrobe Plans" Section
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={showRSVP} onChange={(e) => setShowRSVP(e.target.checked)} />
              Include "RSVP" Section
            </label>
          </div>
          <button className="btn" onClick={generateLink} style={{ marginTop: '20px' }}>Generate Link</button>

          {generatedLink && (
            <div className="link-result">
              <input type="text" readOnly value={generatedLink} onClick={e => e.target.select()} />
              <small>Copy and send this link to the guest.</small>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>RSVP Responses ({filteredRsvps.length})</h2>
            <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', color: 'var(--ink)' }}>
              <option value="ALL">All RSVPs</option>
              <option value="GROOM SIDE">Groom Side</option>
              <option value="BRIDE SIDE">Bride Side</option>
            </select>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Side</th>
                  <th>Guests</th>
                  <th>Attending</th>
                  <th>Invited Events</th>
                  <th>Remarks</th>
                  <th>Date Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRsvps.map(r => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td><small>{r.side}</small></td>
                    <td>{r.count}</td>
                    <td>
                      <span className={`badge ${r.attending ? 'yes' : 'no'}`}>
                        {r.attending ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td><small>{r.invitedEvents}</small></td>
                    <td>{r.remarks || '-'}</td>
                    <td><small>{r.submittedAt}</small></td>
                    <td>
                      <button onClick={() => deleteRsvp(r.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRsvps.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No RSVPs match your filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('wedding_admin_auth') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') { // Simple hardcoded password
      sessionStorage.setItem('wedding_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('wedding_admin_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="admin-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px' }}>Admin Login</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              required 
              style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '15px', background: 'transparent', color: 'var(--ink)' }}
            />
            {loginError && <p style={{ color: '#ff4d4f', fontSize: '13px', margin: '0' }}>{loginError}</p>}
            <button type="submit" className="btn" style={{ marginTop: '10px' }}>Login</button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel onLogout={handleLogout} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InvitationViewer />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
