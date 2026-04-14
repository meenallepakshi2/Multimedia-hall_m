const db = require('../config/db');
const { sendStatusEmail } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');

// ─── College User: Submit a booking request ─────────────────────────────────
const createBooking = async (req, res) => {
  const { title, purpose, event_date, start_time, end_time } = req.body;
  const { id: user_id, college_name } = req.user;

  if (!title || !event_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Title, date, start time, and end time are required.' });
  }

  // Conflict detection: check for overlapping approved bookings on the same date
  const conflictQuery = `
    SELECT id FROM bookings
    WHERE event_date = ?
      AND status = 'approved'
      AND (
        (start_time < ? AND end_time > ?)
        OR (start_time < ? AND end_time > ?)
        OR (start_time >= ? AND end_time <= ?)
      )
  `;
  try {
    const [conflicts] = await db.query(conflictQuery, [
      event_date,
      end_time, start_time,
      end_time, start_time,
      start_time, end_time,
    ]);

    if (conflicts.length > 0) {
      return res.status(409).json({ message: 'Time slot conflicts with an existing approved booking.' });
    }

    const [result] = await db.query(
      'INSERT INTO bookings (user_id, college_name, title, purpose, event_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, college_name, title, purpose, event_date, start_time, end_time]
    );

    await logAudit('BOOKING_CREATED', user_id, result.insertId, `${college_name} submitted a booking for ${event_date}`);

    res.status(201).json({ message: 'Booking request submitted successfully.', bookingId: result.insertId });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── College User: Get own bookings ─────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY event_date DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Common: Get all approved bookings (for calendar) ───────────────────────
const getApprovedBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.title, b.college_name, b.event_date, b.start_time, b.end_time, b.purpose
       FROM bookings b
       WHERE b.status = 'approved'
       ORDER BY b.event_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get all bookings (with optional filters) ────────────────────────
const getAllBookings = async (req, res) => {
  const { college, status, from, to } = req.query;
  let query = 'SELECT b.*, u.email as user_email FROM bookings b JOIN users u ON b.user_id = u.id WHERE 1=1';
  const params = [];

  if (college) { query += ' AND b.college_name = ?'; params.push(college); }
  if (status)  { query += ' AND b.status = ?'; params.push(status); }
  if (from)    { query += ' AND b.event_date >= ?'; params.push(from); }
  if (to)      { query += ' AND b.event_date <= ?'; params.push(to); }

  query += ' ORDER BY b.created_at DESC';

  try {
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Get pending requests ─────────────────────────────────────────────
const getPendingBookings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.email as user_email FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin: Update booking status ───────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, admin_note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected.' });
  }

  try {
    // Check for conflicts before approving
    if (status === 'approved') {
      const [booking] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
      if (booking.length === 0) return res.status(404).json({ message: 'Booking not found.' });

      const b = booking[0];
      const conflictQuery = `
        SELECT id FROM bookings
        WHERE id != ?
          AND event_date = ?
          AND status = 'approved'
          AND (
            (start_time < ? AND end_time > ?)
            OR (start_time < ? AND end_time > ?)
            OR (start_time >= ? AND end_time <= ?)
          )
      `;
      const [conflicts] = await db.query(conflictQuery, [
        id, b.event_date,
        b.end_time, b.start_time,
        b.end_time, b.start_time,
        b.start_time, b.end_time,
      ]);

      if (conflicts.length > 0) {
        return res.status(409).json({ message: 'Cannot approve: conflicts with an existing approved booking.' });
      }
    }

    await db.query(
      'UPDATE bookings SET status = ?, admin_note = ? WHERE id = ?',
      [status, admin_note || null, id]
    );

    // Fetch booking + user email to send notification
    const [rows] = await db.query(
      `SELECT b.*, u.email, u.name as user_name FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (rows.length > 0) {
      const booking = rows[0];
      await sendStatusEmail(booking.email, booking.user_name, booking, status, admin_note);
      await logAudit('BOOKING_STATUS_UPDATED', req.user.id, id, `Status set to ${status}`);
    }

    res.json({ message: `Booking ${status} successfully.` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getApprovedBookings,
  getAllBookings,
  getPendingBookings,
  updateBookingStatus,
};
