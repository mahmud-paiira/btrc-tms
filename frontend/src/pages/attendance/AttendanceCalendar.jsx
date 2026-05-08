import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import attendanceService from '../../services/attendanceService';
import AttendanceModal from '../../components/attendance/AttendanceModal';
import QRCodeGenerator from '../../components/attendance/QRCodeGenerator';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate, getBanglaMonthName, getBanglaWeekday } from '../../utils/dateFormatter';
import './AttendanceCalendar.css';

const VIEWS = [
  { key: 'month', label: 'মাস' },
  { key: 'week', label: 'সপ্তাহ' },
  { key: 'day', label: 'দিন' },
];

export default function AttendanceCalendar() {
  const { id: batchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [batch, setBatch] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [weekPlans, setWeekPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');

  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [eligible, setEligible] = useState([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, summaryRes, batchRes, plansRes, eligRes] = await Promise.all([
        attendanceService.getBatchCalendar(batchId),
        attendanceService.getSummary(batchId),
        attendanceService.getBatchDetail(batchId),
        attendanceService.getWeekPlans(batchId),
        attendanceService.getEligibility(batchId),
      ]);
      setCalendar(calRes.data.calendar || []);
      setBatch(batchRes.data);
      setWeekPlans(plansRes.data || []);
      setSummaries(summaryRes.data.summaries || []);
      setEligible(eligRes.data.trainees || []);
    } catch (err) {
      toast.error(err.response?.data?.error || t('attendance.loadFailed', 'ডাটা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayStatus = (d) => {
    const key = getDateKey(d);
    const dayData = calendar.find((c) => c.date === key);
    if (!dayData) return 'none';
    const sessions = dayData.sessions || [];
    if (sessions.length === 0) return 'none';
    const total = sessions.length;
    const marked = sessions.filter(
      (s) => s.status !== 'absent',
    ).length;
    if (marked === total) return 'full';
    if (marked > 0) return 'partial';
    return 'none';
  };

  const getSessionsForDate = (d) => {
    const key = getDateKey(d);
    const dayData = calendar.find((c) => c.date === key);
    return dayData?.sessions || [];
  };

  const hasScheduledSession = (d) => {
    const dayOfWeek = (d.getDay() + 6) % 7;
    return weekPlans.some((wp) => wp.day_of_week === dayOfWeek);
  };

  const handleDayClick = (d) => {
    if (d <= today) {
      setSelectedDate(d);
      setShowModal(true);
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const handlePrintQR = (session) => {
    setShowQR(session);
  };

  const getTraineePercentage = (traineeId) => {
    const s = summaries.find((sm) => sm.trainee === traineeId);
    return s ? parseFloat(s.attendance_percentage) : 0;
  };

  const renderDayView = () => {
    const d = currentDate;
    const status = getDayStatus(d);
    const sessions = getSessionsForDate(d);
    const scheduled = hasScheduledSession(d);

    return (
      <div className="day-view">
        <div
          className={`day-cell ${status === 'full' ? 'bg-success' : ''} ${status === 'partial' ? 'bg-warning' : ''} ${status === 'none' && scheduled ? 'bg-danger' : ''}`}
          onClick={() => handleDayClick(d)}
        >
          <div className="day-number">{d.getDate()}</div>
          <div className="day-name">{getBanglaWeekday(d.getDay(), true)}</div>
          {status === 'full' && <small className="text-white">{t('attendance.statusFull', 'সব মার্ক করা হয়েছে')}</small>}
          {status === 'partial' && <small className="text-dark">{t('attendance.statusPartial', 'আংশিক')}</small>}
          {status === 'none' && scheduled && <small className="text-white">{t('attendance.statusNone', 'বাকি')}</small>}
          {!scheduled && <small className="text-muted">{t('attendance.statusNoSession', 'কোন সেশন নেই')}</small>}
        </div>
        {sessions.length > 0 && (
          <div className="session-list mt-2">
            {sessions.filter((s, i, arr) => arr.findIndex(x => x.session_no === s.session_no) === i).map((s) => (
              <button
                key={s.session_no}
                className="btn btn-sm btn-outline-primary me-1 mb-1"
                onClick={(e) => { e.stopPropagation(); handlePrintQR(s); }}
                title={t('attendance.sessionQR', `সেশন ${s.session_no} QR কোড`)}
              >
                <i className="bi bi-qr-code me-1"></i>{t('attendance.sessionQR', `সেশন ${s.session_no}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const dates = getWeekDates();
    return (
      <div className="week-grid">
        {dates.map((d) => {
          const key = getDateKey(d);
          const status = getDayStatus(d);
          const sessions = getSessionsForDate(d);
          const scheduled = hasScheduledSession(d);
          return (
            <div
              key={key}
              className={`week-cell ${status === 'full' ? 'bg-success text-white' : ''} ${status === 'partial' ? 'bg-warning' : ''} ${status === 'none' && scheduled ? 'bg-danger text-white' : ''} ${+d === +today ? 'border border-primary border-2' : ''}`}
              onClick={() => handleDayClick(d)}
            >
          <div className="day-name">{getBanglaWeekday(d.getDay(), true)}</div>
              <div className="day-number">{d.getDate()}</div>
              <div className="session-indicators mt-1">
                {sessions.length > 0 && (
                  <small>{t('attendance.sessionCount', `${sessions.length} টি সেশন`)}</small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const cells = [];
    for (let i = 0; i < startPad; i++) {
      cells.push(<div key={`pad-${i}`} className="calendar-cell empty"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = getDateKey(d);
      const status = getDayStatus(d);
      const sessions = getSessionsForDate(d);
      const scheduled = hasScheduledSession(d);
      const isToday = +d === +today;

      cells.push(
        <div
          key={key}
          className={`calendar-cell ${status === 'full' ? 'bg-success text-white' : ''} ${status === 'partial' ? 'bg-warning' : ''} ${status === 'none' && scheduled ? 'bg-danger text-white' : ''} ${isToday ? 'border border-primary border-2' : ''} ${!scheduled ? 'text-muted' : ''}`}
          onClick={() => handleDayClick(d)}
        >
          <div className="day-number">{day}</div>
          {sessions.length > 0 && (
            <small className="session-count">{sessions.length}</small>
          )}
        </div>,
      );
    }
    return (
      <div className="calendar-grid">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="calendar-header">{getBanglaWeekday(i, true)}</div>
        ))}
        {cells}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">{t('attendance.loading', 'লোড হচ্ছে...')}</p>
      </div>
    );
  }

  return (
    <div className="attendance-calendar">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">
            <i className="bi bi-calendar-check me-2"></i>
            {batch?.batch_name_bn || `ব্যাচ #${batchId}`}
          </h4>
          {batch && (
            <small className="text-muted">
              {batch.batch_no} | {batch.center?.name_bn}
            </small>
          )}
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1"></i>{t('site.back', 'পিছনে')}
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex justify-content-between align-items-center">
            <div className="btn-group">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  className={`btn btn-sm ${view === v.key ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setView(v.key)}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={handlePrev}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <strong>
                {view === 'month' && `${getBanglaMonthName(month)} ${year}`}
                {view === 'week' && `${getBanglaMonthName(month)} ${currentDate.getDate()}`}
                {view === 'day' && `${currentDate.getDate()} ${getBanglaMonthName(month)} ${year}`}
              </strong>
              <button className="btn btn-sm btn-outline-secondary" onClick={handleNext}>
                <i className="bi bi-chevron-right"></i>
              </button>
              <button className="btn btn-sm btn-outline-primary ms-2" onClick={handleToday}>
                {t('attendance.today', 'আজ')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex gap-3 mb-3">
        <span><span className="badge bg-success">{t('attendance.statusFull', 'সব মার্ক করা হয়েছে')}</span></span>
        <span><span className="badge bg-warning text-dark">{t('attendance.statusPartial', 'আংশিক')}</span></span>
        <span><span className="badge bg-danger">{t('attendance.statusNone', 'বাকি')}</span></span>
        <span><span className="badge bg-light text-muted border">{t('attendance.statusNoSession', 'কোন সেশন নেই')}</span></span>
      </div>

      <div className="card">
        <div className="card-body p-3">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </div>

      {showModal && selectedDate && (
        <AttendanceModal
          batchId={parseInt(batchId)}
          sessionDate={selectedDate}
          weekPlans={weekPlans}
          summaries={summaries}
          eligible={eligible}
          calendarData={calendar}
          onClose={() => { setShowModal(false); setSelectedDate(null); }}
          onRefresh={fetchData}
        />
      )}

      {showQR && (
        <QRCodeGenerator
          batchId={parseInt(batchId)}
          sessionNo={showQR.session_no}
          sessionDate={showQR.date || getDateKey(selectedDate || currentDate)}
          batchName={batch?.batch_name_bn}
          onClose={() => setShowQR(null)}
        />
      )}
    </div>
  );
}
