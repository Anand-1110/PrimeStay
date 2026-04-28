import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookingModal from "./BookingModal";
import "./Dashboard.css";

const getToken = () => localStorage.getItem("jv_token") || "";

function Dashboard() {
  const navigate = useNavigate();

  // Redirect to home if no JWT token
  useEffect(() => {
    if (!localStorage.getItem("jv_token")) navigate("/");
  }, [navigate]);

  const userName    = localStorage.getItem("jv_user_name")   || "Guest";
  const userEmail   = localStorage.getItem("jv_user_email")  || "—";
  const memberSince = localStorage.getItem("jv_member_since") || "2026";

  const [bookings, setBookings] = useState([]);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editingBooking, setEditingBooking]   = useState(null);
  const [showEditModal,  setShowEditModal]    = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchBookings = () => {
    fetch(`http://localhost:5000/api/bookings?customerId=${userEmail}`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching bookings:", err));
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const handleCancel = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (response.ok) {
        setBookings(prev =>
          prev.map(b => b._id === id ? { ...b, status: "Cancelled" } : b)
        );
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
    }
  };

  const handleOpenEdit = (booking) => {
    setEditingBooking(booking);
    setShowEditModal(true);
  };

  const handleBookingUpdated = (updatedBooking) => {
    setBookings(prev =>
      prev.map(b => b._id === updatedBooking._id ? updatedBooking : b)
    );
    setShowEditModal(false);
    setEditingBooking(null);
  };

  const handleSignOut = () => {
    ["jv_token","jv_logged_in","jv_user_name","jv_user_email","jv_user_role","jv_member_since"]
      .forEach(k => localStorage.removeItem(k));
    navigate("/");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const dateObj = new Date(d);
    return isNaN(dateObj) ? "Invalid Date" : dateObj.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const isUpcoming = (b) => b.status === "Confirmed" && new Date(b.checkOut) >= new Date();

  const upcoming   = bookings.filter(b => isUpcoming(b));
  const cancelled  = bookings.filter(b => b.status === "Cancelled");
  const past       = bookings.filter(b => b.status === "Confirmed" && new Date(b.checkOut) < new Date());

  return (
    <div className="dashboard">

      {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
        <BookingModal
          mode="edit"
          existingBooking={editingBooking}
          onClose={() => { setShowEditModal(false); setEditingBooking(null); }}
          onBookingUpdated={handleBookingUpdated}
        />
      )}

      {/* Navbar */}
      <nav className="db-navbar">
        <div className="db-logo">
          <span style={{color: 'var(--accent)'}}>🏨</span> Prime Stay
        </div>
        <div className="db-nav-right">
          <button className="db-back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
          <button className="db-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="db-content">

        {/* Welcome Banner */}
        <div className="db-welcome">
          <div className="db-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <h1>Welcome back, <span>{userName}</span>! 👋</h1>
            <p>Manage your bookings and account details below.</p>
          </div>
        </div>

        <div className="db-grid">

          {/* LEFT — Bookings Panel */}
          <div className="db-main">

            {/* Upcoming Bookings */}
            <section className="db-section">
              <div className="db-section-header">
                <h2>🗓️ Upcoming Bookings</h2>
                <span className="db-count">{upcoming.length}</span>
              </div>

              {upcoming.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">🏖️</div>
                  <p>No upcoming bookings yet.</p>
                  <button className="db-book-btn" onClick={() => navigate("/")}>
                    Browse Rooms
                  </button>
                </div>
              ) : (
                <div className="db-bookings-list">
                  {upcoming.map((b) => (
                    <div className="db-booking-card" key={b._id}>
                      <div className="db-bc-header">
                        <span className="db-bc-icon">{b.roomIcon}</span>
                        <div>
                          <h3>{b.roomType} Room</h3>
                          <span className="db-badge upcoming">Confirmed</span>
                        </div>
                        <div className="db-bc-id">#{b._id.slice(-6).toUpperCase()} · Room {b.roomId}</div>
                      </div>
                      <div className="db-bc-body">
                        <div className="db-bc-detail">
                          <span>📅 Check-In</span>
                          <strong>{formatDate(b.checkIn)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>📅 Check-Out</span>
                          <strong>{formatDate(b.checkOut)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>🌙 Nights</span>
                          <strong>{b.nights}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>👥 Guests</span>
                          <strong>{b.guests}</strong>
                        </div>
                        <div className="db-bc-detail" style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '5px' }}>
                          <span>🕒 Booked On</span>
                          <strong>{formatDate(b.bookedOn)}</strong>
                        </div>
                      </div>
                      <div className="db-bc-footer">
                        <span className="db-bc-total">
                          Total: ₹{Math.round(b.totalPrice * 1.12).toLocaleString("en-IN")}
                        </span>
                        <div className="db-bc-actions">
                          <button
                            className="db-modify-btn"
                            onClick={() => handleOpenEdit(b)}
                          >
                            ✏️ Modify
                          </button>
                          <button
                            className="db-cancel-btn"
                            onClick={() => handleCancel(b._id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past Bookings */}
            {past.length > 0 && (
              <section className="db-section">
                <div className="db-section-header">
                  <h2>🕐 Past Bookings</h2>
                  <span className="db-count">{past.length}</span>
                </div>
                <div className="db-bookings-list">
                  {past.map((b) => (
                    <div className="db-booking-card past" key={b._id}>
                      <div className="db-bc-header">
                        <span className="db-bc-icon">{b.roomIcon}</span>
                        <div>
                          <h3>{b.roomType} Room</h3>
                          <span className="db-badge past">Completed</span>
                        </div>
                        <div className="db-bc-id">#{b._id.slice(-6).toUpperCase()}</div>
                      </div>
                      <div className="db-bc-body">
                        <div className="db-bc-detail">
                          <span>📅 Check-In</span><strong>{formatDate(b.checkIn)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>📅 Check-Out</span><strong>{formatDate(b.checkOut)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>🌙 Nights</span><strong>{b.nights}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>👥 Guests</span><strong>{b.guests}</strong>
                        </div>
                        <div className="db-bc-detail" style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '5px' }}>
                          <span>🕒 Booked On</span><strong>{formatDate(b.bookedOn)}</strong>
                        </div>
                      </div>
                      <div className="db-bc-footer">
                        <span className="db-bc-total">
                          Total: ₹{Math.round(b.totalPrice * 1.12).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled Bookings */}
            {cancelled.length > 0 && (
              <section className="db-section">
                <div className="db-section-header">
                  <h2>❌ Cancelled Bookings</h2>
                  <span className="db-count">{cancelled.length}</span>
                </div>
                <div className="db-bookings-list">
                  {cancelled.map((b) => (
                    <div className="db-booking-card past" key={b._id}>
                      <div className="db-bc-header">
                        <span className="db-bc-icon">{b.roomIcon}</span>
                        <div>
                          <h3>{b.roomType} Room</h3>
                          {b.paymentStatus === "Declined" ? (
                            <span className="db-badge" style={{background:"#fee2e2",color:"#dc2626",border:"1px solid #fca5a5"}}>🚫 Rejected by Admin</span>
                          ) : (
                            <span className="db-badge" style={{background:"#fff3e0",color:"#e65100",border:"1px solid #ffcc80"}}>Cancelled</span>
                          )}
                        </div>
                        <div className="db-bc-id">#{b._id.slice(-6).toUpperCase()}</div>
                      </div>
                      <div className="db-bc-body">
                        <div className="db-bc-detail">
                          <span>📅 Check-In</span><strong>{formatDate(b.checkIn)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>📅 Check-Out</span><strong>{formatDate(b.checkOut)}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>🌙 Nights</span><strong>{b.nights}</strong>
                        </div>
                        <div className="db-bc-detail">
                          <span>👥 Guests</span><strong>{b.guests}</strong>
                        </div>
                        <div className="db-bc-detail" style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '5px' }}>
                          <span>🕒 Booked On</span><strong>{formatDate(b.bookedOn)}</strong>
                        </div>
                      </div>
                      <div className="db-bc-footer">
                        <span className="db-bc-total" style={{color:"#9e9e9e",textDecoration:"line-through"}}>
                          ₹{Math.round(b.totalPrice * 1.12).toLocaleString("en-IN")}
                        </span>
                        {b.paymentStatus === "Declined" && (
                          <span style={{fontSize:'12px', color:'#dc2626', fontWeight:'600'}}>
                            Payment was declined by hotel administration
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT — Account Info */}
          <aside className="db-sidebar">
            <div className="db-account-card">
              <div className="db-account-avatar">{userName.charAt(0).toUpperCase()}</div>
              <h3>{userName}</h3>
              <p className="db-account-email">{userEmail}</p>

              <div className="db-account-stats">
                <div className="db-acc-stat">
                  <span>{bookings.length}</span>
                  <p>Total Bookings</p>
                </div>
                <div className="db-acc-stat">
                  <span>{upcoming.length}</span>
                  <p>Upcoming</p>
                </div>
              </div>

              <div className="db-account-info">
                <div className="db-info-row">
                  <span>📧 Email</span>
                  <strong>{userEmail}</strong>
                </div>
                <div className="db-info-row">
                  <span>🏷️ Member Type</span>
                  <strong>Gold Member</strong>
                </div>
                <div className="db-info-row">
                  <span>📆 Member Since</span>
                  <strong>{memberSince}</strong>
                </div>
              </div>

              <button className="db-browse-btn" onClick={() => navigate("/")}>
                🏨 Browse Rooms
              </button>
              <button className="db-signout-full" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </aside>

        </div>
      </div>

      {/* Footer */}
      <footer className="db-footer">
        © 2026 Prime Stay Hotel · All rights reserved · Privacy Policy
      </footer>
    </div>
  );
}

export default Dashboard;
