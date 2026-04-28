import React, { useState, useEffect } from "react";
import "./BookingModal.css";

// Helper to get the auth token
const getToken = () => localStorage.getItem("jv_token") || "";

/**
 * BookingModal — used for both NEW bookings and EDITING existing ones.
 *
 * Props:
 *  - room           {Object}  Room data (required for new bookings)
 *  - onClose        {fn}      Close the modal
 *  - existingBooking {Object} Booking to edit (only for edit mode)
 *  - mode           {string}  "new" | "edit"  (default: "new")
 *  - onBookingUpdated {fn}    Called after a successful edit (optional)
 */
function BookingModal({ room, onClose, existingBooking, mode = "new", onBookingUpdated }) {
  const today = new Date().toISOString().split("T")[0];

  // In edit mode, pre-fill from the existing booking
  const [formData, setFormData] = useState({
    checkIn:  mode === "edit" ? existingBooking?.checkIn?.split("T")[0]  || "" : "",
    checkOut: mode === "edit" ? existingBooking?.checkOut?.split("T")[0] || "" : "",
    guests:   mode === "edit" ? existingBooking?.guests || 1 : 1,
  });

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState("");

  // The room object — for new mode it's prop `room`, for edit mode derive from booking
  const activeRoom = mode === "edit"
    ? { type: existingBooking?.roomType, icon: existingBooking?.roomIcon, roomNumber: existingBooking?.roomId, price: existingBooking ? Math.round(existingBooking.totalPrice / existingBooking.nights) : 0 }
    : room;

  // Escape key closes modal
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const calcNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const diff = new Date(formData.checkOut) - new Date(formData.checkIn);
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const nights = calcNights();
  const pricePerNight = activeRoom?.price || 0;
  const total = nights * pricePerNight;

  const handleChange = (e) => {
    setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.checkIn || !formData.checkOut) {
      setError("Please select check-in and check-out dates.");
      return;
    }
    if (nights <= 0) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    setLoading(true);

    const submitBooking = async () => {
      try {
        const token = getToken();

        if (mode === "edit") {
          // ── EDIT MODE — PUT /api/bookings/:id ─────────────────────────────
          const response = await fetch(`http://localhost:5000/api/bookings/${existingBooking._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              checkIn:  formData.checkIn,
              checkOut: formData.checkOut,
              guests:   Number(formData.guests)
            })
          });

          const updatedBooking = await response.json();
          if (!response.ok) throw new Error(updatedBooking.message || "Failed to update booking");

          setLoading(false);
          setSuccess(true);
          if (onBookingUpdated) onBookingUpdated(updatedBooking);

        } else {
          // ── NEW MODE — POST /api/bookings ──────────────────────────────────
          // We send roomType (not roomId) — the backend auto-assigns
          // the first available room of this type with no date conflict.
          const response = await fetch("http://localhost:5000/api/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              customerId: localStorage.getItem("jv_user_email") || "guest",
              roomType:   room.type,
              roomIcon:   room.icon,
              checkIn:    formData.checkIn,
              checkOut:   formData.checkOut,
              totalPrice: Math.round(total * 1.12),
              guests:     Number(formData.guests),
              nights
            })
          });

          const savedBooking = await response.json();
          if (!response.ok) throw new Error(savedBooking.message || "Failed to book");

          setBookingId(savedBooking._id.slice(-6).toUpperCase());
          setLoading(false);
          setSuccess(true);
        }
      } catch (err) {
        setLoading(false);
        setError(err.message);
      }
    };

    submitBooking();
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    return isNaN(dateObj) ? "Invalid Date" : dateObj.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const isEdit = mode === "edit";

  return (
    <div className="bm-overlay" onClick={onClose}>
      <div className="bm-card" onClick={(e) => e.stopPropagation()}>

        {!success ? (
          <>
            {/* Header */}
            <div className="bm-header">
              <div className="bm-room-info">
                <span className="bm-room-icon">{activeRoom?.icon}</span>
                <div>
                  <h2>{isEdit ? "Modify Booking" : `Book ${activeRoom?.type} Room`}</h2>
                  <p className="bm-price-label">
                    ₹{pricePerNight.toLocaleString("en-IN")}
                    <span>/night</span>
                  </p>
                </div>
              </div>
              <button className="bm-close" onClick={onClose}>✕</button>
            </div>

            {isEdit && (
              <div className="bm-edit-notice">
                ✏️ Editing booking for <strong>{activeRoom?.type} Room #{activeRoom?.roomNumber}</strong>
              </div>
            )}

            <form className="bm-form" onSubmit={handleSubmit}>
              {/* Date Row */}
              <div className="bm-date-row">
                <div className="bm-field">
                  <label>📅 Check-In</label>
                  <input
                    type="date"
                    name="checkIn"
                    min={today}
                    value={formData.checkIn}
                    onChange={handleChange}
                  />
                </div>
                <div className="bm-field">
                  <label>📅 Check-Out</label>
                  <input
                    type="date"
                    name="checkOut"
                    min={formData.checkIn || today}
                    value={formData.checkOut}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="bm-field">
                <label>👥 Number of Guests</label>
                <select name="guests" value={formData.guests} onChange={handleChange}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>

              {/* Price Summary */}
              {nights > 0 && (
                <div className="bm-summary">
                  <div className="bm-summary-row">
                    <span>₹{pricePerNight.toLocaleString("en-IN")} × {nights} night{nights > 1 ? "s" : ""}</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bm-summary-row tax">
                    <span>Taxes & fees (12%)</span>
                    <span>₹{Math.round(total * 0.12).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="bm-summary-total">
                    <span>Total</span>
                    <span>₹{Math.round(total * 1.12).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && <div className="bm-error">{error}</div>}

              {/* Submit */}
              <button className="bm-confirm-btn" type="submit" disabled={loading}>
                {loading ? (
                  <span className="bm-spinner" />
                ) : isEdit ? (
                  "Update Booking ✓"
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="bm-success">
            <div className="bm-success-icon">{isEdit ? "✏️" : "✅"}</div>
            <h2>{isEdit ? "Booking Updated!" : "Booking Confirmed!"}</h2>
            {!isEdit && <p className="bm-booking-id">Booking ID: <strong>{bookingId}</strong></p>}
            <div className="bm-success-details">
              <div>{activeRoom?.icon} {activeRoom?.type} Room · Room {activeRoom?.roomNumber}</div>
              <div>📅 {formatDate(formData.checkIn)} → {formatDate(formData.checkOut)}</div>
              <div>🌙 {nights} Night{nights > 1 ? "s" : ""} · 👥 {formData.guests} Guest{formData.guests > 1 ? "s" : ""}</div>
              <div className="bm-total-final">
                Total Price: ₹{Math.round(total * 1.12).toLocaleString("en-IN")}
              </div>
            </div>
            {!isEdit && (
              <p className="bm-success-note">
                View your booking in <strong>My Account</strong> dashboard.
              </p>
            )}
            <button className="bm-confirm-btn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
