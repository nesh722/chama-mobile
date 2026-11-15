import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  View
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { showAlert, showConfirm } from '../../services/alertService';
import {
  cancelMeeting,
  createAnnouncement,
  createMeeting,
  deleteAnnouncement,
  getAnnouncements,
  getMeeting,
  getMeetings,
  saveAttendance,
  saveMinutes,
  sendApology,
  updateMeeting
} from '../../services/meetingService';

type Counts = { present: number; apology: number; absent: number };
type MeetingItem = {
  id: number;
  title: string;
  meetingDate: string;
  venue: string | null;
  agenda: string | null;
  status: 'scheduled' | 'held' | 'cancelled';
  hasMinutes: boolean;
  counts: Counts;
  myStatus: 'present' | 'apology' | 'absent' | null;
};
type Notice = { id: number; title: string; body: string; authorName: string; createdAt: string };
type AttendanceRow = { userId: number; name: string; role: string; status: 'present' | 'apology' | 'absent' | null; reason: string | null };
type Detail = {
  canRecord: boolean;
  meeting: { id: number; title: string; meetingDate: string; venue: string | null; agenda: string | null; minutes: string | null; status: string };
  attendance: AttendanceRow[];
};

type Props = { groupId: string; groupName?: string };

const RECORD_FROM_HOURS = 0;

// Stable text form of the marks, to tell whether anything changed since the last save
const markKey = (m: Record<number, string>) => JSON.stringify(Object.entries(m).sort());

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' });
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });

// Nairobi wall-clock parts of a date, for pre-filling the edit form
const nairobiParts = (d: string) => {
  const t = new Date(new Date(d).getTime() + 3 * 3600 * 1000).toISOString();
  return { date: t.slice(0, 10), time: t.slice(11, 16) };
};

// "2026-12-05" + "14:30" (Nairobi time) -> ISO string, or null when it is not a real date/time
const toIso = (date: string, time: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^\d{1,2}:\d{2}$/.test(time.trim())) return null;
  const [h, m] = time.trim().split(':').map(Number);
  if (h > 23 || m > 59) return null;
  const d = new Date(`${date.trim()}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+03:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export default function MeetingsTab({ groupId, groupName }: Props) {
  const { colors } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [canRecord, setCanRecord] = useState(false);
  const [upcoming, setUpcoming] = useState<MeetingItem[]>([]);
  const [past, setPast] = useState<MeetingItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAllPast, setShowAllPast] = useState(false);

  // schedule / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fTitle, setFTitle] = useState('');
  const [fDate, setFDate] = useState('');
  const [fTime, setFTime] = useState('');
  const [fVenue, setFVenue] = useState('');
  const [fAgenda, setFAgenda] = useState('');
  const [formError, setFormError] = useState('');

  // notice form
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [noticeError, setNoticeError] = useState('');

  // meeting detail
  const [detail, setDetail] = useState<Detail | null>(null);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [minutesText, setMinutesText] = useState('');
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [savedKey, setSavedKey] = useState('[]');

  // apology reason form
  const [apologyFor, setApologyFor] = useState<number | null>(null);
  const [apologyReason, setApologyReason] = useState('');

  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([getMeetings(groupId), getAnnouncements(groupId)]);
      setCanRecord(!!m.canRecord);
      setUpcoming(m.upcoming || []);
      setPast(m.past || []);
      setNotices(a.announcements || []);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message || 'Could not load meetings');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const errMsg = (err: any) => err.response?.data?.message || err.message || 'Something went wrong';

  // ---------- schedule / edit ----------
  const openNew = () => {
    setEditId(null);
    setFTitle('');
    setFDate('');
    setFTime('');
    setFVenue('');
    setFAgenda('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (d: Detail['meeting']) => {
    const p = nairobiParts(d.meetingDate);
    setEditId(d.id);
    setFTitle(d.title);
    setFDate(p.date);
    setFTime(p.time);
    setFVenue(d.venue || '');
    setFAgenda(d.agenda || '');
    setFormError('');
    setDetail(null);
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (busy) return;
    if (!fTitle.trim()) return setFormError('Give the meeting a title');
    const iso = toIso(fDate, fTime);
    if (!iso) return setFormError('Enter the date as YYYY-MM-DD and the time as HH:MM (24-hour), e.g. 2026-12-05 and 14:30');
    if (new Date(iso).getTime() <= Date.now()) return setFormError('Pick a date and time in the future');
    setBusy(true);
    setFormError('');
    try {
      const body = { title: fTitle.trim(), meeting_date: iso, venue: fVenue.trim(), agenda: fAgenda.trim() };
      if (editId) await updateMeeting(editId, body);
      else await createMeeting({ group_id: groupId, ...body });
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setFormError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  // ---------- notices ----------
  const submitNotice = async () => {
    if (busy) return;
    if (!nTitle.trim() || !nBody.trim()) return setNoticeError('Add a title and a message');
    setBusy(true);
    setNoticeError('');
    try {
      await createAnnouncement({ group_id: groupId, title: nTitle.trim(), body: nBody.trim() });
      setNoticeOpen(false);
      setNTitle('');
      setNBody('');
      await load();
    } catch (err: any) {
      setNoticeError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const removeNotice = (n: Notice) => {
    showConfirm('Delete Notice', `Delete "${n.title}"? Members will no longer see it.`, async () => {
      try {
        await deleteAnnouncement(n.id);
        await load();
      } catch (err: any) {
        showAlert('Error', errMsg(err));
      }
    });
  };

  // ---------- detail ----------
  const openDetail = async (id: number) => {
    try {
      const d: Detail = await getMeeting(id);
      setDetail(d);
      const m: Record<number, string> = {};
      d.attendance.forEach((a) => {
        if (a.status) m[a.userId] = a.status;
      });
      setMarks(m);
      setSavedKey(markKey(m));
      setMinutesText(d.meeting.minutes || '');
      setEditingMinutes(false);
    } catch (err: any) {
      showAlert('Error', errMsg(err));
    }
  };

  const refreshDetail = async (id: number) => {
    await openDetail(id);
    await load();
  };

  const toggleApology = async (item: { id: number; myStatus: string | null }) => {
    if (busy) return;
    if (item.myStatus !== 'apology') {
      // sending: ask for an optional reason first (the detail window closes so the two windows never overlap)
      setApologyReason('');
      setDetail(null);
      setApologyFor(item.id);
      return;
    }
    setBusy(true);
    try {
      await sendApology(item.id, false);
      await load();
      if (detail) await openDetail(detail.meeting.id);
    } catch (err: any) {
      showAlert('Error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const submitApology = async () => {
    if (apologyFor === null || busy) return;
    const id = apologyFor;
    setBusy(true);
    try {
      await sendApology(id, true, apologyReason.trim());
      setApologyFor(null);
      await load();
      await openDetail(id);
    } catch (err: any) {
      showAlert('Error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const closeApology = async () => {
    const id = apologyFor;
    setApologyFor(null);
    if (id !== null) await openDetail(id);
  };

  const setMark = (userId: number, status: string) =>
    setMarks((prev) => {
      const next = { ...prev };
      if (next[userId] === status) delete next[userId];
      else next[userId] = status;
      return next;
    });

  const submitAttendance = async () => {
    if (!detail || busy) return;
    if (Object.keys(marks).length === 0) {
      showAlert('Nothing to save', 'Mark at least one member first');
      return;
    }
    setBusy(true);
    try {
      // everyone listed: unmarked members are cleared so a correction really removes the mark
      const records = detail.attendance.map((a) => ({ user_id: a.userId, status: marks[a.userId] || 'none' }));
      await saveAttendance(detail.meeting.id, records);
      showAlert('Saved', 'Attendance saved');
      await refreshDetail(detail.meeting.id);
    } catch (err: any) {
      showAlert('Error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const shareMinutes = async () => {
    if (!detail) return;
    const d = detail.meeting;
    const names = (s: string) => detail.attendance.filter((a) => a.status === s).map((a) => a.name);
    const line = (label: string, list: string[]) => (list.length ? `${label} (${list.length}): ${list.join(', ')}` : '');
    const attendance = [line('Present', names('present')), line('Apologies', names('apology')), line('Absent', names('absent'))]
      .filter(Boolean)
      .join('\n');
    const text =
      `${groupName ? groupName + ' - ' : ''}Minutes of "${d.title}"\n` +
      `${fmtDate(d.meetingDate)}${d.venue ? ' · ' + d.venue : ''}\n\n` +
      (attendance ? `${attendance}\n\n` : '') +
      `Minutes:\n${d.minutes || ''}`;
    try {
      await Share.share({ message: text });
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not share the minutes');
    }
  };

  const submitMinutes = async () => {
    if (!detail || busy) return;
    if (!minutesText.trim()) {
      showAlert('Minutes are empty', 'Write the minutes before saving');
      return;
    }
    setBusy(true);
    try {
      await saveMinutes(detail.meeting.id, minutesText);
      showAlert('Saved', 'Minutes saved');
      await refreshDetail(detail.meeting.id);
    } catch (err: any) {
      showAlert('Error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelIt = (d: Detail['meeting']) => {
    showConfirm('Cancel Meeting', `Cancel "${d.title}"? All members will be told.`, async () => {
      try {
        await cancelMeeting(d.id);
        setDetail(null);
        await load();
      } catch (err: any) {
        showAlert('Error', errMsg(err));
      }
    });
  };

  // ---------- small pieces ----------
  const statusColor = (s: string | null) =>
    s === 'present' ? colors.success : s === 'apology' ? colors.warning : s === 'absent' ? colors.danger : colors.textMuted;

  const renderMeetingCard = (m: MeetingItem) => {
    const total = m.counts.present + m.counts.apology + m.counts.absent;
    return (
      <TouchableOpacity
        key={m.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openDetail(m.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {m.title}
          </Text>
          {m.status === 'cancelled' && <Text style={[styles.tag, { color: colors.danger, borderColor: colors.danger }]}>Cancelled</Text>}
          {m.status === 'scheduled' && m.myStatus === 'apology' && (
            <Text style={[styles.tag, { color: colors.warning, borderColor: colors.warning }]}>Apology sent</Text>
          )}
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{fmtDate(m.meetingDate)}</Text>
        </View>
        {!!m.venue && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {m.venue}
            </Text>
          </View>
        )}
        {m.status !== 'cancelled' && (total > 0 || m.hasMinutes) && (
          <Text style={[styles.meta, { color: colors.textMuted, marginTop: 6 }]}>
            {total > 0 ? `${m.counts.present} present · ${m.counts.apology} apologies · ${m.counts.absent} absent` : ''}
            {total > 0 && m.hasMinutes ? '  ·  ' : ''}
            {m.hasMinutes ? 'Minutes posted' : ''}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ padding: 30 }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const d = detail?.meeting;
  const isScheduled = d?.status === 'scheduled';
  const recordingOpen = !!d && d.status !== 'cancelled' && new Date(d.meetingDate).getTime() - Date.now() <= RECORD_FROM_HOURS * 3600 * 1000;
  const detailItem = d ? [...upcoming, ...past].find((x) => x.id === d.id) : undefined;
  const beforeMeeting = !!d && isScheduled && new Date(d.meetingDate).getTime() > Date.now();
  const visiblePast = showAllPast ? past : past.slice(0, 5);

  return (
    <View>
      {/* ----- Notices ----- */}
      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: colors.text }]}>Notices</Text>
        {canRecord && (
          <TouchableOpacity onPress={() => { setNTitle(''); setNBody(''); setNoticeError(''); setNoticeOpen(true); }} style={styles.link}>
            <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>Post notice</Text>
          </TouchableOpacity>
        )}
      </View>
      {notices.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No notices yet.</Text>
      ) : (
        notices.slice(0, 5).map((n) => (
          <View key={n.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{n.title}</Text>
              {canRecord && (
                <TouchableOpacity onPress={() => removeNotice(n)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{n.body}</Text>
            <Text style={[styles.meta, { color: colors.textMuted, marginTop: 8 }]}>
              {n.authorName} · {fmtDay(n.createdAt)}
            </Text>
          </View>
        ))
      )}

      {/* ----- Upcoming ----- */}
      <View style={[styles.sectionHead, { marginTop: 22 }]}>
        <Text style={[styles.section, { color: colors.text }]}>Upcoming meetings</Text>
        {canRecord && (
          <TouchableOpacity onPress={openNew} style={styles.link}>
            <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>Schedule</Text>
          </TouchableOpacity>
        )}
      </View>
      {upcoming.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {canRecord ? 'No meetings scheduled. Tap Schedule to set one up.' : 'No meetings scheduled.'}
        </Text>
      ) : (
        upcoming.map(renderMeetingCard)
      )}

      {/* ----- Past ----- */}
      {past.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.text, marginTop: 22, marginBottom: 8 }]}>Past meetings</Text>
          {visiblePast.map(renderMeetingCard)}
          {past.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllPast(!showAllPast)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{showAllPast ? 'Show fewer' : `Show all ${past.length}`}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ----- Schedule / edit modal ----- */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editId ? 'Edit meeting' : 'Schedule a meeting'}</Text>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
                <TextInput value={fTitle} onChangeText={setFTitle} placeholder="e.g. Monthly meeting" placeholderTextColor={colors.placeholder} maxLength={120}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                <View style={styles.twoCols}>
                  <View style={{ flex: 1.3 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                    <TextInput value={fDate} onChangeText={setFDate} placeholder="2026-12-05" placeholderTextColor={colors.placeholder} maxLength={10}
                      keyboardType="numbers-and-punctuation" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                    <TextInput value={fTime} onChangeText={setFTime} placeholder="14:30" placeholderTextColor={colors.placeholder} maxLength={5}
                      keyboardType="numbers-and-punctuation" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                  </View>
                </View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Venue (optional)</Text>
                <TextInput value={fVenue} onChangeText={setFVenue} placeholder="Where will it be?" placeholderTextColor={colors.placeholder} maxLength={150}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>Agenda (optional)</Text>
                <TextInput value={fAgenda} onChangeText={setFAgenda} placeholder="What will be discussed?" placeholderTextColor={colors.placeholder} multiline maxLength={2000}
                  style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {editId ? 'Changing the date or venue notifies all members.' : 'Every member is notified when you schedule it.'}
                </Text>
                {!!formError && <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text>}
                <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]} onPress={submitForm} disabled={busy}>
                  {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{editId ? 'Save changes' : 'Schedule meeting'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={() => setFormOpen(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ----- Notice modal ----- */}
      <Modal visible={noticeOpen} transparent animationType="fade" onRequestClose={() => setNoticeOpen(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Post a notice</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
              <TextInput value={nTitle} onChangeText={setNTitle} placeholder="e.g. Contribution deadline" placeholderTextColor={colors.placeholder} maxLength={120}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
              <TextInput value={nBody} onChangeText={setNBody} placeholder="Write the notice" placeholderTextColor={colors.placeholder} multiline maxLength={2000}
                style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Every member is notified.</Text>
              {!!noticeError && <Text style={[styles.error, { color: colors.danger }]}>{noticeError}</Text>}
              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]} onPress={submitNotice} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Post notice</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => setNoticeOpen(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ----- Apology reason modal ----- */}
      <Modal visible={apologyFor !== null} transparent animationType="fade" onRequestClose={closeApology}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send apology</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reason (optional)</Text>
              <TextInput value={apologyReason} onChangeText={setApologyReason} placeholder="e.g. I'm sick, travelling, at work" placeholderTextColor={colors.placeholder}
                multiline maxLength={255} style={[styles.input, styles.multi, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Only the secretary and chair will see this.</Text>
              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]} onPress={submitApology} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Send apology</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={closeApology}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ----- Meeting detail modal ----- */}
      <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
            {detail && d && (
              <View style={[styles.modal, { backgroundColor: colors.surface, maxHeight: '90%' }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{d.title}</Text>
                  {d.status === 'cancelled' && <Text style={[styles.tag, { color: colors.danger, borderColor: colors.danger, alignSelf: 'center', marginTop: 6 }]}>Cancelled</Text>}
                  <View style={[styles.row, { justifyContent: 'center', marginTop: 8 }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>{fmtDate(d.meetingDate)}</Text>
                  </View>
                  {!!d.venue && (
                    <View style={[styles.row, { justifyContent: 'center' }]}>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>{d.venue}</Text>
                    </View>
                  )}
                  {!!d.agenda && (
                    <>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Agenda</Text>
                      <Text style={[styles.body, { color: colors.text }]}>{d.agenda}</Text>
                    </>
                  )}

                  {/* apology: any member, before the meeting */}
                  {beforeMeeting && (
                    <TouchableOpacity
                      style={[styles.outline, { borderColor: detailItem?.myStatus === 'apology' ? colors.warning : colors.primary }]}
                      onPress={() => detailItem && toggleApology(detailItem)}
                      disabled={busy || !detailItem}
                    >
                      <Text style={{ color: detailItem?.myStatus === 'apology' ? colors.warning : colors.primary, fontWeight: '600' }}>
                        {detailItem?.myStatus === 'apology' ? 'Apology sent. Tap to withdraw' : "I can't make it. Send apology"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* attendance */}
                  {d.status !== 'cancelled' && (
                    <>
                      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 18 }]}>Attendance</Text>
                      {detail.canRecord && !recordingOpen && (
                        <Text style={[styles.hint, { color: colors.textMuted, textAlign: 'left' }]}>
                         You can mark attendance and write minutes once the meeting starts.
                        </Text>
                      )}
                      {detail.attendance.map((a) => {
                        const current = detail.canRecord && recordingOpen ? marks[a.userId] || null : a.status;
                        return (
                          <View key={a.userId} style={[styles.attRow, { borderColor: colors.border }]}>
                            <View style={{ flexShrink: 1 }}>
                              <Text style={[styles.attName, { color: colors.text }]} numberOfLines={1}>
                                {a.name}
                              </Text>
                              {a.status === 'apology' && !!a.reason && (
                                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>"{a.reason}"</Text>
                              )}
                            </View>
                            {detail.canRecord && recordingOpen ? (
                              <View style={styles.chips}>
                                {(['present', 'apology', 'absent'] as const).map((s) => (
                                  <TouchableOpacity
                                    key={s}
                                    onPress={() => setMark(a.userId, s)}
                                    style={[styles.chip, { borderColor: statusColor(s), backgroundColor: current === s ? statusColor(s) : 'transparent' }]}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: current === s ? colors.primaryText : statusColor(s) }}>
                                      {s === 'present' ? 'Present' : s === 'apology' ? 'Apology' : 'Absent'}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor(current) }}>
                                {current === 'present' ? 'Present' : current === 'apology' ? 'Apology' : current === 'absent' ? 'Absent' : '-'}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                      {detail.canRecord && recordingOpen && (() => {
                        const unchanged = markKey(marks) === savedKey;
                        const hadSaved = savedKey !== '[]';
                        return (
                          <TouchableOpacity
                            style={[styles.primary, { backgroundColor: unchanged ? colors.border : colors.primary, opacity: busy ? 0.6 : 1 }]}
                            onPress={submitAttendance}
                            disabled={busy || unchanged}
                          >
                            <Text style={{ color: unchanged ? colors.textMuted : colors.primaryText, fontWeight: '600' }}>
                              {unchanged ? (hadSaved ? 'Attendance saved' : 'Mark members to save') : hadSaved ? 'Update attendance' : 'Save attendance'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </>
                  )}

                  {/* minutes */}
                  {d.status !== 'cancelled' && (!!d.minutes || (detail.canRecord && recordingOpen)) && (
                    <>
                      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 18 }]}>Minutes</Text>
                      {detail.canRecord && recordingOpen && (editingMinutes || !d.minutes) ? (
                        <>
                          <TextInput value={minutesText} onChangeText={setMinutesText} multiline maxLength={20000}
                            placeholder="Opened at… Matters discussed… Decisions made… Closed at…" placeholderTextColor={colors.placeholder}
                            style={[styles.input, styles.minutesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
                          <Text style={[styles.hint, { color: colors.textMuted }]}>Members are notified the first time minutes are posted.</Text>
                          <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]} onPress={submitMinutes} disabled={busy}>
                            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Save minutes</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.body, { color: colors.text }]}>{d.minutes}</Text>
                          <TouchableOpacity onPress={shareMinutes} style={[styles.outline, { borderColor: colors.primary, marginTop: 12 }]}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Share minutes</Text>
                          </TouchableOpacity>
                          {detail.canRecord && recordingOpen && (
                            <TouchableOpacity onPress={() => setEditingMinutes(true)} style={{ marginTop: 8 }}>
                              <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit minutes</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* secretary / chair actions on a scheduled meeting */}
                  {detail.canRecord && isScheduled && (
                    <View style={[styles.actions, { borderColor: colors.border }]}>
                      <TouchableOpacity onPress={() => openEdit(d)} style={styles.link}>
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={[styles.linkText, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => cancelIt(d)} style={styles.link}>
                        <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                        <Text style={[styles.linkText, { color: colors.danger }]}>Cancel meeting</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity style={styles.secondary} onPress={() => setDetail(null)}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '700' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 13, paddingVertical: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  tag: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { fontSize: 13 },
  body: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { borderRadius: 14, padding: 20, width: '92%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  label: { fontSize: 13, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  minutesInput: { minHeight: 160, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 17 },
  error: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  primary: { padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  secondary: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  outline: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  attRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  attName: { fontSize: 14, flexShrink: 1 },
  chips: { flexDirection: 'row', gap: 4 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth }
});
