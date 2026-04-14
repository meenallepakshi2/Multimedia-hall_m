const db = require('../config/db');

const logAudit = async (action, performedBy, targetBookingId, details) => {
  try {
    await db.query(
      'INSERT INTO audit_logs (action, performed_by, target_booking_id, details) VALUES (?, ?, ?, ?)',
      [action, performedBy, targetBookingId, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAudit };
