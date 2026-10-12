import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Course, Todo, Transaction, Installment, SplitBill, UserAccount, CalendarEvent, SharedScheduleData } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://xjdwjrmtiutapoeikvln.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZHdqcm10aXV0YXBvZWlrdmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MDM0MjYsImV4cCI6MjEwNzI3OTQyNn0.3LoLaoS9UggTQW3x5fdAW0x5Ekiyb0vmQaVasvkb8V0';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, key?: string): SupabaseClient {
  let storedUrl = localStorage.getItem('campus_supabase_url');
  let storedKey = localStorage.getItem('campus_supabase_anon_key');

  // Auto-migration: if stored URL is the old deleted project dxoobrrjzaovwpyagzgn, purge it!
  if (storedUrl && (storedUrl.includes('dxoobrrjzaovwpyagzgn') || !storedUrl.startsWith('https://'))) {
    localStorage.removeItem('campus_supabase_url');
    localStorage.removeItem('campus_supabase_anon_key');
    storedUrl = null;
    storedKey = null;
    supabaseInstance = null;
  }

  const currentUrl = url || storedUrl || DEFAULT_SUPABASE_URL;
  const currentKey = key || storedKey || DEFAULT_SUPABASE_ANON_KEY;

  if (!supabaseInstance) {
    supabaseInstance = createClient(currentUrl, currentKey);
  }
  return supabaseInstance;
}

export function resetSupabaseClient(url: string, key: string): SupabaseClient {
  localStorage.setItem('campus_supabase_url', url);
  localStorage.setItem('campus_supabase_anon_key', key);
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

// -------------------------------------------------------------
// 👤 User Account & Authentication (Multi-User Isolation)
// -------------------------------------------------------------
export async function registerUserAccount(
  username: string,
  passwordHash: string,
  displayName: string
): Promise<{ ok: boolean; user?: UserAccount; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const cleanUsername = username.trim().toLowerCase();

    // Check if user already exists
    const { data: existing } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: '該帳號已被註冊，請直接登入或使用其他帳號！' };
    }

    // Generate unique 6-character shareCode
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CAMP';
    for (let i = 0; i < 2; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newAccount = {
      username: cleanUsername,
      password_hash: passwordHash,
      display_name: displayName.trim() || '同學',
      share_code: code,
      line_user_id: '',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('user_accounts')
      .insert(newAccount)
      .select('*')
      .single();

    if (insertErr || !inserted) {
      // Fallback: If user_accounts table not yet created on Supabase, create local-first account
      const localAccount: UserAccount = {
        id: `u_${Date.now()}`,
        username: cleanUsername,
        displayName: displayName.trim() || '同學',
        shareCode: code,
      };
      return { ok: true, user: localAccount };
    }

    return {
      ok: true,
      user: {
        id: inserted.id,
        username: inserted.username,
        displayName: inserted.display_name,
        shareCode: inserted.share_code,
        lineUserId: inserted.line_user_id || '',
        createdAt: inserted.created_at,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || '註冊失敗，請檢查網路連線' };
  }
}

export async function loginUserAccount(
  username: string,
  passwordHash: string
): Promise<{ ok: boolean; user?: UserAccount; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const cleanUsername = username.trim().toLowerCase();

    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: '找不到此帳號，請確認輸入或點擊「註冊新帳號」！' };
    }

    if (data.password_hash !== passwordHash) {
      return { ok: false, error: '密碼不正確，請重新輸入！' };
    }

    return {
      ok: true,
      user: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        shareCode: data.share_code,
        lineUserId: data.line_user_id || '',
        createdAt: data.created_at,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || '登入失敗，請檢查網路狀態' };
  }
}

export async function updateUserAccountDisplayName(
  userId: string,
  newDisplayName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const cleanName = newDisplayName.trim() || '同學';
    const { error } = await supabase
      .from('user_accounts')
      .update({ display_name: cleanName, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || '更新暱稱失敗' };
  }
}

// -------------------------------------------------------------
// 📚 Courses (Filtered by User / Device)
// -------------------------------------------------------------
export async function fetchCoursesFromSupabase(deviceIdOrUserId?: string): Promise<Course[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('courses').select('*').order('day_of_week', { ascending: true });
    if (deviceIdOrUserId) {
      query = query.eq('device_id', deviceIdOrUserId);
    } else {
      query = query.or('device_id.eq.,device_id.is.null,device_id.eq.guest');
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
      userId: c.device_id || undefined,
      name: c.name,
      code: c.code || '',
      classroom: c.classroom || '',
      instructor: c.instructor || '',
      dayOfWeek: c.day_of_week,
      startTime: c.start_time,
      endTime: c.end_time,
      colorHex: c.color_hex || '#E67E22',
      isSharedWithFriends: c.is_shared_with_friends ?? true,
    }));
  } catch (err) {
    console.warn('fetchCourses error (offline fallback):', err);
    return [];
  }
}

export async function upsertCourseToSupabase(course: Course, deviceIdOrUserId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('courses').upsert({
      id: course.id,
      device_id: deviceIdOrUserId || course.userId || '',
      name: course.name,
      code: course.code,
      classroom: course.classroom,
      instructor: course.instructor,
      day_of_week: course.dayOfWeek,
      start_time: course.startTime,
      end_time: course.endTime,
      color_hex: course.colorHex,
      is_shared_with_friends: course.isSharedWithFriends ?? true,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCourseFromSupabase(courseId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    return !error;
  } catch {
    return false;
  }
}

export async function batchUpsertCoursesToSupabase(courses: Course[], deviceIdOrUserId?: string): Promise<boolean> {
  if (!courses || courses.length === 0) return true;
  try {
    const supabase = getSupabaseClient();
    const rows = courses.map((course) => ({
      id: course.id,
      device_id: deviceIdOrUserId || course.userId || '',
      name: course.name,
      code: course.code,
      classroom: course.classroom,
      instructor: course.instructor,
      day_of_week: course.dayOfWeek,
      start_time: course.startTime,
      end_time: course.endTime,
      color_hex: course.colorHex,
      is_shared_with_friends: course.isSharedWithFriends ?? true,
    }));
    const { error } = await supabase.from('courses').upsert(rows);
    return !error;
  } catch (err) {
    console.warn('batchUpsertCourses error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// ✅ Todos
// -------------------------------------------------------------
export async function fetchTodosFromSupabase(deviceIdOrUserId?: string): Promise<Todo[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('todos').select('*').order('created_at', { ascending: false });
    if (deviceIdOrUserId) {
      query = query.eq('device_id', deviceIdOrUserId);
    } else {
      query = query.or('device_id.eq.,device_id.is.null,device_id.eq.guest');
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      userId: t.device_id || undefined,
      title: t.title,
      notes: t.notes || '',
      dueDate: t.due_date || undefined,
      startDate: t.start_date ? t.start_date.slice(0, 10) : undefined,
      endDate: t.start_date ? t.due_date?.slice(0, 10) : undefined,
      isCompleted: t.is_completed ?? false,
      priority: t.priority || 'medium',
      category: t.category || '作業',
      courseId: t.course_id || undefined,
      paperUrl: t.paper_url || undefined,
      readingStatus: t.reading_status || '未讀',
    }));
  } catch (err) {
    console.warn('fetchTodos error:', err);
    return [];
  }
}

export async function upsertTodoToSupabase(todo: Todo, deviceIdOrUserId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('todos').upsert({
      id: todo.id,
      device_id: deviceIdOrUserId || todo.userId || '',
      title: todo.title,
      notes: todo.notes,
      start_date: todo.startDate ? new Date(todo.startDate).toISOString() : undefined,
      due_date: todo.dueDate || (todo.endDate ? new Date(todo.endDate).toISOString() : undefined),
      is_completed: todo.isCompleted,
      priority: todo.priority,
      category: todo.category,
      course_id: todo.courseId,
      paper_url: todo.paperUrl,
      reading_status: todo.readingStatus,
      has_reminder: (todo as any).hasReminder ?? (todo.reminderAdvance ? todo.reminderAdvance !== 'none' : true),
      reminder_advance: todo.reminderAdvance || '1d',
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteTodoFromSupabase(todoId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('todos').delete().eq('id', todoId);
    return !error;
  } catch {
    return false;
  }
}

export async function batchUpsertTodosToSupabase(todos: Todo[], deviceIdOrUserId?: string): Promise<boolean> {
  if (!todos || todos.length === 0) return true;
  try {
    const supabase = getSupabaseClient();
    const rows = todos.map((todo) => ({
      id: todo.id,
      device_id: deviceIdOrUserId || todo.userId || '',
      title: todo.title,
      notes: todo.notes,
      start_date: todo.startDate ? new Date(todo.startDate).toISOString() : undefined,
      due_date: todo.dueDate || (todo.endDate ? new Date(todo.endDate).toISOString() : undefined),
      is_completed: todo.isCompleted,
      priority: todo.priority,
      category: todo.category,
      course_id: todo.courseId,
      paper_url: todo.paperUrl,
      reading_status: todo.readingStatus,
      has_reminder: (todo as any).hasReminder ?? (todo.reminderAdvance ? todo.reminderAdvance !== 'none' : true),
      reminder_advance: todo.reminderAdvance || '1d',
    }));
    const { error } = await supabase.from('todos').upsert(rows);
    return !error;
  } catch (err) {
    console.warn('batchUpsertTodos error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 💰 Accounting Transactions (Filtered by User / Device)
// -------------------------------------------------------------
export async function fetchTransactionsFromSupabase(deviceIdOrUserId?: string): Promise<Transaction[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('accounting_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (deviceIdOrUserId) {
      query = query.eq('device_id', deviceIdOrUserId);
    } else {
      query = query.or('device_id.eq.,device_id.is.null,device_id.eq.guest');
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      userId: t.device_id || undefined,
      amount: Number(t.amount) || 0,
      type: t.type || 'expense',
      categoryName: t.category_name || '餐飲',
      categoryIcon: t.category_icon || 'tag',
      categoryColorHex: t.category_color_hex || '#E67E22',
      paymentMethodName: t.payment_method_name || '現金',
      date: t.date || new Date().toISOString(),
      notes: t.notes || '',
      valueScore: t.value_score || 8,
      isSharedWithFriends: t.is_shared_with_friends ?? true,
    }));
  } catch (err) {
    console.warn('fetchTransactions error:', err);
    return [];
  }
}

export async function upsertTransactionToSupabase(t: Transaction, deviceIdOrUserId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('accounting_transactions').upsert({
      id: t.id,
      device_id: deviceIdOrUserId || t.userId || '',
      amount: t.amount,
      type: t.type,
      category_name: t.categoryName,
      category_icon: t.categoryIcon,
      category_color_hex: t.categoryColorHex,
      payment_method_name: t.paymentMethodName,
      date: t.date,
      notes: t.notes,
      value_score: t.valueScore,
      is_shared_with_friends: t.isSharedWithFriends ?? true,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteTransactionFromSupabase(id: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('accounting_transactions').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function batchUpsertTransactionsToSupabase(txs: Transaction[], deviceIdOrUserId?: string): Promise<boolean> {
  if (!txs || txs.length === 0) return true;
  try {
    const supabase = getSupabaseClient();
    const rows = txs.map((t) => ({
      id: t.id,
      device_id: deviceIdOrUserId || t.userId || '',
      amount: t.amount,
      type: t.type,
      category_name: t.categoryName,
      category_icon: t.categoryIcon,
      category_color_hex: t.categoryColorHex,
      payment_method_name: t.paymentMethodName,
      date: t.date,
      notes: t.notes,
      value_score: t.valueScore,
      is_shared_with_friends: t.isSharedWithFriends ?? true,
    }));
    const { error } = await supabase.from('accounting_transactions').upsert(rows);
    return !error;
  } catch (err) {
    console.warn('batchUpsertTransactions error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 📅 Calendar Events & Multi-day Spans (TimeTree style)
// -------------------------------------------------------------
export async function fetchCalendarEventsFromSupabase(deviceIdOrUserId?: string): Promise<CalendarEvent[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('calendar_events').select('*').order('start_date', { ascending: true });
    if (deviceIdOrUserId) {
      query = query.eq('device_id', deviceIdOrUserId);
    } else {
      query = query.or('device_id.eq.,device_id.is.null,device_id.eq.guest');
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((e: any) => ({
      id: e.id,
      userId: e.device_id || undefined,
      title: e.title,
      startDate: e.start_date,
      endDate: e.end_date || e.start_date,
      startTime: e.start_time || undefined,
      endTime: e.end_time || undefined,
      isAllDay: e.is_all_day ?? true,
      colorHex: e.color_hex || '#E67E22',
      category: e.category || '活動',
      notes: e.notes || '',
      isSharedWithFriends: e.is_shared_with_friends ?? true,
    }));
  } catch (err) {
    console.warn('fetchCalendarEvents error (offline/fallback):', err);
    return [];
  }
}

export async function upsertCalendarEventToSupabase(event: CalendarEvent, deviceIdOrUserId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('calendar_events').upsert({
      id: event.id,
      device_id: deviceIdOrUserId || event.userId || '',

      title: event.title,
      start_date: event.startDate,
      end_date: event.endDate,
      start_time: event.startTime,
      end_time: event.endTime,
      is_all_day: event.isAllDay,
      color_hex: event.colorHex,
      category: event.category,
      notes: event.notes,
      is_shared_with_friends: event.isSharedWithFriends ?? true,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCalendarEventFromSupabase(eventId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
    return !error;
  } catch {
    return false;
  }
}

export async function batchUpsertCalendarEventsToSupabase(events: CalendarEvent[], deviceIdOrUserId?: string): Promise<boolean> {
  if (!events || events.length === 0) return true;
  try {
    const supabase = getSupabaseClient();
    const rows = events.map((event) => ({
      id: event.id,
      device_id: deviceIdOrUserId || event.userId || '',
      title: event.title,
      start_date: event.startDate,
      end_date: event.endDate,
      start_time: event.startTime,
      end_time: event.endTime,
      is_all_day: event.isAllDay,
      color_hex: event.colorHex,
      category: event.category,
      notes: event.notes,
      is_shared_with_friends: event.isSharedWithFriends ?? true,
    }));
    const { error } = await supabase.from('calendar_events').upsert(rows);
    return !error;
  } catch (err) {
    console.warn('batchUpsertCalendarEvents error:', err);
    return false;
  }
}

export async function syncAllLocalDataToSupabase(
  userKey: string,
  localData: {
    courses: Course[];
    todos: Todo[];
    transactions: Transaction[];
    calendarEvents: CalendarEvent[];
  }
): Promise<{ ok: boolean; uploadedCount: number }> {
  try {
    const [cOk, tOk, txOk, eOk] = await Promise.all([
      batchUpsertCoursesToSupabase(localData.courses, userKey),
      batchUpsertTodosToSupabase(localData.todos, userKey),
      batchUpsertTransactionsToSupabase(localData.transactions, userKey),
      batchUpsertCalendarEventsToSupabase(localData.calendarEvents, userKey),
    ]);

    const count =
      (localData.courses?.length || 0) +
      (localData.todos?.length || 0) +
      (localData.transactions?.length || 0) +
      (localData.calendarEvents?.length || 0);

    return { ok: cOk && tOk && txOk && eOk, uploadedCount: count };
  } catch (err) {
    console.warn('syncAllLocalDataToSupabase error:', err);
    return { ok: false, uploadedCount: 0 };
  }
}

// -------------------------------------------------------------
// 🤝 Shared Schedule & Friend Calendar (課表、行事曆、記帳共享)
// -------------------------------------------------------------
export async function publishSharedSchedule(schedule: SharedScheduleData): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('shared_schedules').upsert({
      share_code: schedule.shareCode.toUpperCase(),
      owner_name: schedule.ownerName,
      is_sharing_enabled: schedule.isSharingEnabled,
      courses_data: schedule.coursesData,
      todos_data: schedule.todosData,
      accounting_data: schedule.accountingData,
      calendar_events_data: schedule.calendarEventsData,
      is_expense_sharing_enabled: schedule.isExpenseSharingEnabled,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSharedScheduleByCode(shareCode: string): Promise<SharedScheduleData | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('shared_schedules')
      .select('*')
      .eq('share_code', shareCode.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    if (data.is_sharing_enabled === false) return null;

    return {
      shareCode: data.share_code,
      ownerName: data.owner_name || '好友課表',
      isSharingEnabled: data.is_sharing_enabled ?? true,
      coursesData: Array.isArray(data.courses_data) ? data.courses_data : [],
      todosData: Array.isArray(data.todos_data) ? data.todos_data : [],
      accountingData: Array.isArray(data.accounting_data) ? data.accounting_data : [],
      calendarEventsData: Array.isArray(data.calendar_events_data) ? data.calendar_events_data : [],
      isExpenseSharingEnabled: data.is_expense_sharing_enabled ?? true,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 🤖 LINE Bot Push Settings & Isolation per User
// -------------------------------------------------------------
export async function saveUserLineBotPushSettings(
  userKey: string,
  lineUserId: string,
  shareCode: string,
  userName: string,
  pushHour: number,
  pushMinute: number,
  isEnabled: boolean,
  coursesData: Course[] = [],
  todosData: Todo[] = [],
  eveningPushEnabled: boolean = true,
  eveningPushHour: number = 18,
  eveningPushMinute: number = 0,
  accountingData: Transaction[] = [],
  todoReminderEnabled: boolean = true
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const targetUserId = lineUserId.trim() || `AUTO_${shareCode.toUpperCase()}`;

    // Map to include both camelCase and snake_case so SQL functions match seamlessly
    const normalizedCourses = (coursesData || []).map((c) => ({
      ...c,
      day_of_week: c.dayOfWeek,
      start_time: c.startTime,
      end_time: c.endTime,
      color_hex: c.colorHex,
    }));

    const normalizedTodos = (todosData || []).map((t) => ({
      ...t,
      is_completed: t.isCompleted,
      due_date: t.dueDate,
      start_date: t.startDate,
      reminder_advance: t.reminderAdvance || '1d',
    }));

    const { error } = await supabase.from('line_bot_settings').upsert({
      user_id: targetUserId,
      device_id: userKey,
      user_name: userName || '我的課表',
      share_code: shareCode.toUpperCase(),
      push_hour: pushHour,
      push_minute: pushMinute,
      is_enabled: isEnabled,
      evening_push_enabled: eveningPushEnabled,
      evening_push_hour: eveningPushHour,
      evening_push_minute: eveningPushMinute,
      todo_reminder_enabled: todoReminderEnabled,
      include_schedule: true,
      include_todos: true,
      include_weekly_plan: true,
      include_expense_summary: true,
      courses_data: normalizedCourses,
      todos_data: normalizedTodos,
      accounting_data: accountingData,
      updated_at: new Date().toISOString(),
    });

    // Update user_accounts table if user is registered
    if (userKey && !userKey.startsWith('dev_')) {
      await supabase
        .from('user_accounts')
        .update({
          line_user_id: lineUserId.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userKey);
    }

    return !error;
  } catch {
    return false;
  }
}

export async function fetchUserLineBotPushSettings(userKey: string, shareCode: string) {
  try {
    const supabase = getSupabaseClient();
    const cleanCode = shareCode.trim().toUpperCase();

    const { data } = await supabase
      .from('line_bot_settings')
      .select('*')
      .or(`device_id.eq.${userKey},share_code.eq.${cleanCode}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  } catch {
    return null;
  }
}

export async function bindLineFollower(shareCode: string, deviceId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('claim_latest_line_follower', {
      p_device_id: deviceId,
      p_share_code: shareCode.toUpperCase(),
      p_user_name: '我的課表',
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('claim_latest_line_follower error:', err);
    return null;
  }
}

export async function sendTestLineMessage(
  userId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('relay_line_message', {
      p_recipient_id: userId,
      p_is_direct_push: true,
      p_messages: [{ type: 'text', text: text }],
    });

    if (!error && data?.ok === true) {
      return { ok: true };
    }

    if (data?.error) {
      return { ok: false, error: data.error };
    }
    if (error) {
      console.warn('relay_line_message RPC error, trying direct fallback:', error);
    }
  } catch (err: any) {
    console.warn('sendTestLineMessage network error:', err);
  }

  // Fallback: Direct LINE push via token if available
  try {
    const token = await fetchAppApiConfig('line_channel_access_token');
    if (token) {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text: text }],
        }),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json();
      return { ok: false, error: errJson?.message || `LINE API 回傳 HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { ok: false, error: err.message || '連線至 LINE 失敗' };
  }

  return { ok: false, error: '請確認 Supabase app_api_configs 是否已儲存 line_channel_access_token' };
}

// -------------------------------------------------------------
// 💌 LINE Flex Message Builders (晨報、晚報、待辦到期提醒卡片)
// -------------------------------------------------------------
export function buildMorningBriefingFlex(
  userName: string,
  courses: Course[],
  todos: Todo[]
): any {
  const now = new Date();
  const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${dayNames[now.getDay()]}`;

  const todayCourses = (courses || [])
    .filter((c) => (c.dayOfWeek || (c as any).day_of_week) === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const remainingCoursesCount = (courses || []).filter(
    (c) => (c.dayOfWeek || (c as any).day_of_week) >= dayOfWeek
  ).length;

  const todayStr = now.toISOString().slice(0, 10);
  const uncompletedTodos = (todos || []).filter((t) => {
    if (t.isCompleted || (t as any).is_completed) return false;
    const due = (t.dueDate || (t as any).due_date || '').slice(0, 10);
    const start = (t.startDate || (t as any).start_date || '').slice(0, 10);
    if (start && due && todayStr >= start && todayStr <= due) return true;
    if (due && due === todayStr) return true;
    return false;
  });

  const courseBubbles =
    todayCourses.length > 0
      ? todayCourses.map((c) => ({
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '3px',
              backgroundColor: c.colorHex || '#3182CE',
              cornerRadius: '2px',
              contents: [{ type: 'text', text: ' ', size: 'xxs' }],
            },
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: c.name, weight: 'bold', size: 'sm', color: '#1C1C1E', wrap: true },
                    { type: 'text', text: `${c.startTime} - ${c.endTime}`, size: 'xs', color: '#8E8E93', align: 'end' },
                  ],
                },
                {
                  type: 'text',
                  text: `${c.classroom || '未指定教室'}${c.instructor ? ` · ${c.instructor}` : ''}`,
                  size: 'xs',
                  color: '#8E8E93',
                  margin: 'xs',
                },
              ],
            },
          ],
        }))
      : [{ type: 'text', text: '今日無排定課程喵 🐾', size: 'xs', color: '#8E8E93', margin: 'sm' }];

  const todoBubbles =
    uncompletedTodos.length > 0
      ? uncompletedTodos.slice(0, 4).map((t) => ({
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '8px',
              height: '8px',
              cornerRadius: '4px',
              backgroundColor: t.priority === 'high' ? '#FF3B30' : t.priority === 'medium' ? '#FF9500' : '#34C759',
              contents: [{ type: 'text', text: ' ', size: 'xxs' }],
            },
            { type: 'text', text: t.title, size: 'sm', color: '#1C1C1E', flex: 1, wrap: true },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#F2F2F7',
              cornerRadius: '4px',
              paddingStart: '6px',
              paddingEnd: '6px',
              paddingTop: '2px',
              paddingBottom: '2px',
              contents: [{ type: 'text', text: t.category || '待辦', size: 'xxs', color: '#8E8E93' }],
            },
          ],
        }))
      : [{ type: 'text', text: '全部待辦事項皆已完成 ✨', size: 'xs', color: '#8E8E93', margin: 'sm' }];

  return {
    type: 'flex',
    altText: `Campus 晨間簡報 (${userName || '同學'})：${dateStr}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `CAMPUS BRIEFING · ${userName || '同學'}`, size: 'xxs', weight: 'bold', color: '#8E8E93' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: dateStr, size: 'xl', weight: 'bold', color: '#1C1C1E', flex: 1 },
              {
                type: 'text',
                text: `${todayCourses.length} 堂課 · ${uncompletedTodos.length} 項待辦`,
                size: 'xs',
                color: '#8E8E93',
                align: 'end',
                gravity: 'bottom',
              },
            ],
          },
          { type: 'separator', margin: 'md', color: '#E5E5EA' },
          { type: 'text', text: '今日課表', size: 'xs', weight: 'bold', color: '#8E8E93', margin: 'lg' },
          ...courseBubbles,
          { type: 'separator', margin: 'lg', color: '#E5E5EA' },
          { type: 'text', text: '今日待辦', size: 'xs', weight: 'bold', color: '#8E8E93', margin: 'lg' },
          ...todoBubbles,
          { type: 'separator', margin: 'lg', color: '#E5E5EA' },
          { type: 'text', text: '本週規劃', size: 'xs', weight: 'bold', color: '#8E8E93', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F2F2F7',
            cornerRadius: '10px',
            paddingAll: '12px',
            margin: 'md',
            spacing: 'xs',
            contents: [
              { type: 'text', text: `• 本週後續剩餘堂數：${remainingCoursesCount} 堂課`, size: 'xs', color: '#3C3C43' },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '10px',
        paddingBottom: '16px',
        paddingStart: '20px',
        paddingEnd: '20px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '確認今日日程', text: '已確認今日日程' },
            style: 'primary',
            color: '#007AFF',
            height: 'sm',
          },
          { type: 'text', text: 'Campus · 晨間專屬簡報', size: 'xxs', color: '#C7C7CC', align: 'center', margin: 'md' },
        ],
      },
    },
  };
}

export function buildEveningBriefingFlex(
  userName: string,
  courses: Course[],
  todos: Todo[],
  transactions: Transaction[]
): any {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowDayOfWeek = (now.getDay() % 7) + 1;

  const todayExpenseList = (transactions || []).filter(
    (tx) => tx.type === 'expense' && tx.date.slice(0, 10) === todayStr
  );
  const todayExpenseSum = todayExpenseList.reduce((sum, tx) => sum + tx.amount, 0);

  const tomorrowCoursesCount = (courses || []).filter(
    (c) => (c.dayOfWeek || (c as any).day_of_week) === tomorrowDayOfWeek
  ).length;

  const uncompletedTodos = (todos || []).filter((t) => {
    if (t.isCompleted || (t as any).is_completed) return false;
    const due = (t.dueDate || (t as any).due_date || '').slice(0, 10);
    const start = (t.startDate || (t as any).start_date || '').slice(0, 10);
    if (due && due <= todayStr) return true;
    if (start && todayStr >= start) return true;
    return false;
  });

  const todoBubbles =
    uncompletedTodos.length > 0
      ? uncompletedTodos.slice(0, 4).map((t) => ({
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              width: '8px',
              height: '8px',
              cornerRadius: '4px',
              backgroundColor: '#FF3B30',
              contents: [{ type: 'text', text: ' ', size: 'xxs' }],
            },
            { type: 'text', text: t.title, size: 'sm', color: '#1C1C1E', flex: 1, wrap: true },
            { type: 'text', text: '未完成', size: 'xs', color: '#FF3B30', weight: 'bold' },
          ],
        }))
      : [{ type: 'text', text: '今日待辦已全數完成喵 🎉', size: 'xs', color: '#34C759', margin: 'sm' }];

  return {
    type: 'flex',
    altText: `Campus 晚間叮嚀：今日支出 $${todayExpenseSum} 元，尚有 ${uncompletedTodos.length} 項待辦事項`,
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `CAMPUS EVENING BRIEFING · ${userName || '同學'}`, size: 'xxs', weight: 'bold', color: '#8E8E93' },
          { type: 'text', text: '🌆 晚間叮嚀與收支總結', size: 'lg', weight: 'bold', color: '#1C1C1E', margin: 'xs' },
          { type: 'separator', margin: 'md', color: '#E5E5EA' },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FFF7ED',
            cornerRadius: '12px',
            paddingAll: '12px',
            margin: 'md',
            contents: [
              { type: 'text', text: '💰 今日累計花費', size: 'xs', color: '#C2410C', weight: 'bold' },
              {
                type: 'text',
                text: `$ ${todayExpenseSum} 元 (${todayExpenseList.length} 筆記帳)`,
                size: 'xl',
                weight: 'bold',
                color: '#EA580C',
                margin: 'xs',
              },
            ],
          },
          { type: 'text', text: `⚠️ 尚未完成的待辦事項 (${uncompletedTodos.length} 項)`, size: 'xs', weight: 'bold', color: '#8E8E93', margin: 'lg' },
          ...todoBubbles,
          { type: 'separator', margin: 'lg', color: '#E5E5EA' },
          {
            type: 'text',
            text: `📚 明日課表預告：共 ${tomorrowCoursesCount} 堂課，提早收拾書包早點休息喵！🐾`,
            size: 'xs',
            color: '#8E8E93',
            margin: 'md',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '10px',
        paddingBottom: '16px',
        paddingStart: '20px',
        paddingEnd: '20px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '前往完成待辦', text: '查詢待辦事項' },
            style: 'primary',
            color: '#EA580C',
            height: 'sm',
          },
          { type: 'text', text: 'Campus · 晚間 18:00 專屬推播', size: 'xxs', color: '#C7C7CC', align: 'center', margin: 'md' },
        ],
      },
    },
  };
}

export function buildTodoReminderFlex(
  userName: string,
  todo: Todo
): any {
  const advanceLabelMap: Record<string, string> = {
    due: '當天提醒',
    '1h': '1 小時前提醒',
    '3h': '3 小時前提醒',
    '1d': '1 天前提醒',
    '2d': '2 天前提醒',
    '3d': '3 天前提醒',
  };
  const advanceText = advanceLabelMap[todo.reminderAdvance || '1d'] || '即將到期';
  const priorityText = todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低';
  const dueDisplay = todo.dueDate ? todo.dueDate.slice(0, 16).replace('T', ' ') : '近期截止';

  return {
    type: 'flex',
    altText: `⏰ 待辦事項即將到期提醒：${todo.title}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: `CAMPUS TASK ALERT · ${userName || '同學'}`, size: 'xxs', weight: 'bold', color: '#8E8E93' },
          { type: 'text', text: '⏰ 待辦事項即將到期提醒！', size: 'lg', weight: 'bold', color: '#DC2626', margin: 'xs' },
          { type: 'separator', margin: 'md', color: '#E5E5EA' },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FEF2F2',
            cornerRadius: '12px',
            paddingAll: '14px',
            margin: 'md',
            spacing: 'xs',
            contents: [
              { type: 'text', text: todo.title, size: 'md', weight: 'bold', color: '#991B1B', wrap: true },
              { type: 'text', text: `📅 到期時間：${dueDisplay}`, size: 'xs', color: '#B91C1C', margin: 'xs' },
              { type: 'text', text: `⚠️ 提醒設定：${advanceText} · 優先級：${priorityText}`, size: 'xs', color: '#7F1D1D' },
            ],
          },
          { type: 'text', text: '請記得提早準備繳交或複習，加油喵！🐾', size: 'xs', color: '#8E8E93', margin: 'sm' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '10px',
        paddingBottom: '16px',
        paddingStart: '20px',
        paddingEnd: '20px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '查看待辦事項', text: '查詢待辦事項' },
            style: 'primary',
            color: '#DC2626',
            height: 'sm',
          },
          { type: 'text', text: 'Campus · 個人化待辦專屬提醒', size: 'xxs', color: '#C7C7CC', align: 'center', margin: 'md' },
        ],
      },
    },
  };
}

export async function sendPersonalizedBriefingTest(
  userId: string,
  type: 'morning' | 'evening' | 'reminder',
  data: {
    userName?: string;
    courses: Course[];
    todos: Todo[];
    transactions: Transaction[];
    targetTodo?: Todo;
  }
): Promise<{ ok: boolean; error?: string }> {
  let flexMessage: any;
  if (type === 'morning') {
    flexMessage = buildMorningBriefingFlex(data.userName || '同學', data.courses, data.todos);
  } else if (type === 'evening') {
    flexMessage = buildEveningBriefingFlex(data.userName || '同學', data.courses, data.todos, data.transactions);
  } else {
    const sampleTodo: Todo = data.targetTodo || data.todos.find((t) => !t.isCompleted) || {
      id: 'sample',
      title: '期中報告作業與論文閱讀',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      priority: 'high',
      category: '作業',
      isCompleted: false,
      reminderAdvance: '1d',
    };
    flexMessage = buildTodoReminderFlex(data.userName || '同學', sampleTodo);
  }

  // 1. Try relay_line_message RPC via Supabase
  try {
    const supabase = getSupabaseClient();
    const { data: resData, error } = await supabase.rpc('relay_line_message', {
      p_recipient_id: userId,
      p_is_direct_push: true,
      p_messages: [flexMessage],
    });
    if (!error && resData?.ok === true) {
      return { ok: true };
    }
  } catch (err) {
    console.warn('relay_line_message error, falling back to direct push:', err);
  }

  // 2. Direct LINE Push API fallback via token
  try {
    const token = await fetchAppApiConfig('line_channel_access_token');
    if (token) {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [flexMessage],
        }),
      });
      if (res.ok) {
        return { ok: true };
      }
      const errJson = await res.json();
      return { ok: false, error: errJson?.message || `LINE API 回傳 HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { ok: false, error: err.message || '連線至 LINE 失敗' };
  }

  return { ok: false, error: '請確認 LINE Token 設定' };
}

// -------------------------------------------------------------
// 🔑 App API Configs (Remote Vault in Supabase + LocalStorage)
// -------------------------------------------------------------
export async function fetchAppApiConfig(configKey: string): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('app_api_configs')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();
    return data?.config_value ? String(data.config_value).trim() : '';
  } catch {
    return '';
  }
}

export async function saveAppApiConfig(configKey: string, configValue: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('app_api_configs').upsert({
      config_key: configKey,
      config_value: configValue.trim(),
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn('saveAppApiConfig error:', err);
    return false;
  }
}

export async function getGeminiApiKey(): Promise<string> {
  const local = localStorage.getItem('campus_gemini_api_key');
  if (local && local.trim()) return local.trim();

  // Fallback to Supabase app_api_configs
  const remote = await fetchAppApiConfig('gemini_api_key');
  if (remote) {
    localStorage.setItem('campus_gemini_api_key', remote);
    return remote;
  }
  return '';
}

export async function saveGeminiApiKey(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim();
  localStorage.setItem('campus_gemini_api_key', clean);
  return await saveAppApiConfig('gemini_api_key', clean);
}

// -------------------------------------------------------------
// 🧠 Gemini AI Direct REST Caller (Client-Side, 0-Edge Dependency)
// -------------------------------------------------------------
export async function callDirectGeminiApi(
  base64Image: string,
  apiKey: string,
  mimeType: string = 'image/jpeg',
  customPrompt?: string
): Promise<{ ok: boolean; text?: string; model?: string; error?: string }> {
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const prompt =
    customPrompt ||
    '請辨識這張大學/大專課表圖片，並以純 JSON 陣列格式輸出所有課程。每個項目包含：name（課程名稱）、classroom（教室）、instructor（講師）、dayOfWeek（星期幾，數字 1 代表週一、7 代表週日）、periodCodes（該堂課涵蓋的節次代碼或數字陣列，例如 [1, 2] 或 [5, 6, 7] 或 ["5","6","7"]）、startTime（格式如 09:10）、endTime（格式如 12:00）。只回傳純 JSON 陣列，不需任何其他說明文字。';

  // Standard Google Generative Language Models (in priority order for 2026)
  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: cleanBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      const json = await res.json();
      if (res.ok) {
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { ok: true, text, model };
        }
      } else {
        lastError = json?.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err.message || '網路連線失敗';
    }
  }

  return { ok: false, error: lastError || 'Gemini 辨識服務無回應' };
}

// -------------------------------------------------------------
// 🧠 Gemini AI OCR Gateway (Hybrid: Direct API + Edge Function)
// -------------------------------------------------------------
export async function callGeminiOcrGateway(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  overrideApiKey?: string
): Promise<{ ok: boolean; text?: string; model?: string; error?: string; needApiKey?: boolean }> {
  // 1. First priority: Direct Client API call if API key is available
  const apiKey = (overrideApiKey || (await getGeminiApiKey())).trim();
  if (apiKey) {
    const directRes = await callDirectGeminiApi(base64Image, apiKey, mimeType);
    if (directRes.ok) {
      return directRes;
    }
    // If the direct call failed because of an actual API error (like invalid key or quota)
    if (directRes.error && !directRes.error.includes('Edge Function')) {
      return { ok: false, error: directRes.error };
    }
  }

  // 2. Second priority: Try Edge Function (if deployed on Supabase)
  try {
    const supabase = getSupabaseClient();
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: {
        action: 'gemini_ocr',
        models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'],
        base64Image: cleanBase64,
        prompt:
          '請辨識這張大學/大專課表圖片，並以 JSON 陣列格式輸出所有課程。每個項目包含：name（課程名稱）、classroom（教室）、instructor（講師）、dayOfWeek（星期幾，數字 1 代表週一、7 代表週日）、periodCodes（該堂課涵蓋的節次代碼或數字陣列，例如 [1, 2] 或 [5, 6, 7] 或 ["5","6","7"]）、startTime（格式如 09:10）、endTime（格式如 12:00）。只回傳 JSON 陣列，不需其他文字。',
      },
    });

    if (!error && data?.status !== 'error' && data?.text) {
      return { ok: true, text: data.text, model: data?.model };
    }

    if (data?.status === 'error' && data?.message) {
      return { ok: false, error: data.message };
    }
  } catch (err) {
    console.warn('Edge function invoke failed:', err);
  }

  // 3. If neither worked and we don't have an API key configured
  if (!apiKey) {
    return {
      ok: false,
      needApiKey: true,
      error: '尚未設定 Google Gemini API Key。請填入您的 Gemini API Key 即可開始辨識！',
    };
  }

  return { ok: false, error: '辨識服務連線異常，請確認網路連線或 API Key 是否正確。' };
}

export async function testGeminiApiConnection(
  overrideKey?: string
): Promise<{ ok: boolean; model?: string; message?: string }> {
  const apiKey = (overrideKey || (await getGeminiApiKey())).trim();

  // Test direct connection first
  if (apiKey) {
    const testPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';
    const directRes = await callDirectGeminiApi(
      testPng,
      apiKey,
      'image/png',
      'Ping test. Output JSON: [{"status":"ok"}]'
    );
    if (directRes.ok) {
      return {
        ok: true,
        model: directRes.model || 'gemini-3.8-flash',
        message: `連線成功！Google Gemini 官方 API (${directRes.model || 'gemini-3.8-flash'}) 運作正常`,
      };
    }
    return { ok: false, message: `測試失敗：${directRes.error}` };
  }

  // Fallback to Edge function test
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: {
        action: 'gemini_ocr',
        models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'],
        base64Image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=',
        prompt: 'Ping test. Output JSON: [{"status":"ok"}]',
      },
    });

    if (!error && data?.status !== 'error') {
      return {
        ok: true,
        model: data?.model || 'gemini-3.8-flash',
        message: '連線正常！Supabase 雲端 Gateway 運作中',
      };
    }
  } catch {}

  return {
    ok: false,
    message: '尚未設定 Gemini API Key，請先於下方填入 API Key 儲存後再測試',
  };
}

export async function fetchLineBotInfo(): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: { action: 'line_bot_info' },
    });
    if (error || data?.status === 'error') {
      return { ok: false, error: error?.message || data?.message || '無法取得 LINE Bot 資訊' };
    }
    return { ok: true, data: data?.data };
  } catch (err: any) {
    return { ok: false, error: err.message || '查詢失敗' };
  }
}


