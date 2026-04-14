const db = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ─── Helper: fetch bookings for report ───────────────────────────────────────
async function fetchBookingsForReport(filters, userId = null) {
  let query = `
    SELECT b.id, b.college_name, b.title, b.purpose, b.event_date,
           b.start_time, b.end_time, b.status, b.admin_note, b.created_at
    FROM bookings b
    WHERE 1=1
  `;
  const params = [];

  if (userId) { query += ' AND b.user_id = ?'; params.push(userId); }
  if (filters.college) { query += ' AND b.college_name = ?'; params.push(filters.college); }
  if (filters.status)  { query += ' AND b.status = ?'; params.push(filters.status); }
  if (filters.from)    { query += ' AND b.event_date >= ?'; params.push(filters.from); }
  if (filters.to)      { query += ' AND b.event_date <= ?'; params.push(filters.to); }

  query += ' ORDER BY b.event_date DESC';
  const [rows] = await db.query(query, params);
  return rows;
}

// ─── Generate PDF report ──────────────────────────────────────────────────────
const generatePDF = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;

  try {
    const bookings = await fetchBookingsForReport(filters, userId);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Auditorium Booking Report', { align: 'center' });
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    if (!isAdmin) doc.text(`College: ${req.user.college_name}`, { align: 'center' });
    doc.moveDown(2);

    // Table headers
    const headers = ['#', 'College', 'Title', 'Date', 'Time', 'Status'];
    const colWidths = [30, 100, 130, 80, 100, 70];
    let x = 50;

    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, x, doc.y, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    // Rows
    doc.font('Helvetica').fontSize(9);
    bookings.forEach((b, idx) => {
      const rowY = doc.y;
      const cols = [
        `${idx + 1}`,
        b.college_name,
        b.title,
        new Date(b.event_date).toLocaleDateString(),
        `${b.start_time} - ${b.end_time}`,
        b.status.toUpperCase(),
      ];

      x = 50;
      cols.forEach((col, i) => {
        doc.text(col, x, rowY, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      doc.moveDown(1);

      if (doc.y > 700) doc.addPage(); // Pagination
    });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Failed to generate PDF.' });
  }
};

// ─── Generate CSV/Excel report ────────────────────────────────────────────────
const generateExcel = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const filters = req.query;
  const userId = isAdmin ? null : req.user.id;

  try {
    const bookings = await fetchBookingsForReport(filters, userId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bookings');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'College', key: 'college_name', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Purpose', key: 'purpose', width: 30 },
      { header: 'Date', key: 'event_date', width: 15 },
      { header: 'Start Time', key: 'start_time', width: 12 },
      { header: 'End Time', key: 'end_time', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Admin Note', key: 'admin_note', width: 30 },
      { header: 'Submitted At', key: 'created_at', width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    bookings.forEach(b => sheet.addRow(b));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel generation error:', err);
    res.status(500).json({ message: 'Failed to generate Excel report.' });
  }
};

// ─── Admin: Analytics summary ────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const [totalByCollege] = await db.query(
      `SELECT college_name, COUNT(*) as total,
              SUM(status='approved') as approved,
              SUM(status='rejected') as rejected,
              SUM(status='pending') as pending
       FROM bookings GROUP BY college_name`
    );

    const [monthlyTrend] = await db.query(
      `SELECT DATE_FORMAT(event_date, '%Y-%m') as month, COUNT(*) as count
       FROM bookings WHERE status='approved'
       GROUP BY month ORDER BY month DESC LIMIT 12`
    );

    res.json({ totalByCollege, monthlyTrend });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { generatePDF, generateExcel, getAnalytics };
