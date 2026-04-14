import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { getCalendarBookings } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PageBackButton from '../components/common/PageBackButton';
import './Calendar.css';

const COLLEGE_COLORS = {
  'College A': '#3b82f6',
  'College B': '#10b981',
  'College C': '#f59e0b',
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingsByDate, setBookingsByDate] = useState({});

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await getCalendarBookings();
      const grouped = res.data.reduce((acc, booking) => {
        const dateKey = booking.event_date.split('T')[0];
        const startMinutes = toMinutes(booking.start_time);
        const endMinutes = toMinutes(booking.end_time);

        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push({
          id: booking.id,
          title: booking.title,
          college_name: booking.college_name,
          start_time: booking.start_time,
          end_time: booking.end_time,
          startMinutes,
          durationMinutes: Math.max(endMinutes - startMinutes, 30),
          color: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        });
        return acc;
      }, {});

      Object.values(grouped).forEach((items) => {
        items.sort((a, b) => a.startMinutes - b.startMinutes);
      });

      const mapped = res.data.map((booking) => ({
        id: booking.id,
        title: `${booking.college_name}: ${booking.title}`,
        start: `${booking.event_date.split('T')[0]}T${booking.start_time}`,
        end: `${booking.event_date.split('T')[0]}T${booking.end_time}`,
        backgroundColor: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        borderColor: COLLEGE_COLORS[booking.college_name] || '#6366f1',
        extendedProps: booking,
      }));

      setBookingsByDate(grouped);
      setEvents(mapped);
    } catch (err) {
      console.error('Failed to load calendar events');
    }
  };

  const handleEventClick = ({ event }) => {
    setSelectedEvent(event.extendedProps);
  };

  const handleDateClick = (info) => {
    if (user?.role !== 'college') return;
    const selectedDate = info.dateStr.split('T')[0];
    navigate(`/user/new-booking?date=${selectedDate}`, {
      state: { selectedDate },
    });
  };

  const renderDayCell = (arg) => {
    const dateKey = formatDateKey(arg.date);
    const dayBookings = bookingsByDate[dateKey] || [];

    return (
      <div className="calendar-day-cell">
        <div className="calendar-day-number">{arg.dayNumberText}</div>
        {dayBookings.length > 0 && (
          <div className="calendar-day-bars">
            {dayBookings.map((booking) => (
              <span
                key={booking.id}
                className="calendar-day-bar"
                title={`${booking.college_name}: ${booking.start_time} - ${booking.end_time}`}
                style={{
                  left: `${(booking.startMinutes / 1440) * 100}%`,
                  width: `${Math.max((booking.durationMinutes / 1440) * 100, 4)}%`,
                  backgroundColor: booking.color,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <div className="calendar-page">
        <PageBackButton fallback={user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} />
        <div className="page-header">
          <h2>Auditorium Calendar</h2>
          <p>All confirmed bookings are shown below. Click a date to start a booking.</p>
        </div>

        <div className="legend">
          {Object.entries(COLLEGE_COLORS).map(([college, color]) => (
            <span key={college} className="legend-item">
              <span className="legend-dot" style={{ background: color }} />
              {college}
            </span>
          ))}
        </div>

        <div className="calendar-wrap">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            dayCellContent={renderDayCell}
            fixedWeekCount={false}
            contentHeight={780}
            aspectRatio={1.65}
          />
        </div>

        {selectedEvent && (
          <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="event-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedEvent(null)}>Close</button>
              <h3>{selectedEvent.title}</h3>
              <div className="event-details">
                <p><strong>College:</strong> {selectedEvent.college_name}</p>
                <p><strong>Date:</strong> {new Date(selectedEvent.event_date).toDateString()}</p>
                <p><strong>Time:</strong> {selectedEvent.start_time} - {selectedEvent.end_time}</p>
                {selectedEvent.purpose && <p><strong>Purpose:</strong> {selectedEvent.purpose}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
