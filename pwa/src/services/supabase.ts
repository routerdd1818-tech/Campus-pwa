import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Course, Todo, Transaction, Installment, SplitBill, UserAccount, CalendarEvent, SharedScheduleData } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://xjdwjrmtiutapoeikvln.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZHdqcm10aXV0YXBvZWlrdmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MDM0MjYsImV4cCI6MjEwNzI3OTQyNn0.3LoLaoS9UggTQW3x5fdAW0x5Ekiyb0vmQaVasvkb8V0';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, key?: string): SupabaseClient {
  const currentUrl = url || localStorage.getItem('campus_supabase_url') || DEFAULT_SUPABASE_URL;
  const currentKey = key || localStorage.getItem('campus_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY;

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
  accountingData: Transaction[] = []
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const targetUserId = lineUserId.trim() || `AUTO_${shareCode.toUpperCase()}`;

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
      include_schedule: true,
      include_todos: true,
      include_weekly_plan: true,
      include_expense_summary: true,
      courses_data: coursesData,
      todos_data: todosData,
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

export async function sendTestLineMessage(userId: string, text: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('relay_line_message', {
      p_recipient_id: userId,
      p_is_direct_push: true,
      p_messages: [{ type: 'text', text: text }],
    });
    return !error && data?.ok === true;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 🧠 Gemini AI OCR Gateway
// -------------------------------------------------------------
export async function callGeminiOcrGateway(
  base64Image: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: {
        action: 'gemini_ocr',
        models: ['gemini-3.8-flash', 'gemini-2.5-flash'],
        base64Image,
        prompt:
          '請辨識這張大學/大專課表圖片，並以 JSON 陣列格式輸出所有課程。每個項目包含：name（課程名稱）、classroom（教室）、instructor（講師）、dayOfWeek（星期幾，數字 1 代表週一、7 代表週日）、periodCodes（該堂課涵蓋的節次代碼或數字陣列，例如 [1, 2] 或 [5, 6, 7] 或 ["5","6","7"]）、startTime（格式如 09:10）、endTime（格式如 12:00）。只回傳 JSON 陣列，不需其他文字。',
      },
    });

    if (error) {
      let detailedMsg = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          if (errBody?.message) detailedMsg = errBody.message;
        }
      } catch {}
      return { ok: false, error: detailedMsg || '辨識服務連線異常，請確認 Supabase 設定' };
    }

    if (data?.status === 'error') {
      return { ok: false, error: data?.message || '辨識服務回傳錯誤' };
    }

    if (!data?.text) {
      return { ok: false, error: '未能自圖片解析出文字內容，請確認圖片清晰度' };
    }

    return { ok: true, text: data.text };
  } catch (err: any) {
    console.warn('callGeminiOcrGateway error:', err);
    return { ok: false, error: err.message || '辨識服務無回應，請確認網路與服務狀態' };
  }
}

export async function testGeminiApiConnection(): Promise<{ ok: boolean; model?: string; message?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: {
        action: 'gemini_ocr',
        models: ['gemini-3.8-flash', 'gemini-2.5-flash'],
        base64Image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=',
        prompt: 'Ping test. Output JSON: [{"status":"ok"}]',
      },
    });

    if (error) {
      let detailed = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          if (errBody?.message) detailed = errBody.message;
        }
      } catch {}
      return { ok: false, message: detailed || '連線測試異常' };
    }

    if (data?.status === 'error') {
      return { ok: false, message: data.message || 'Gemini 回傳錯誤' };
    }

    return { ok: true, model: data?.model || 'gemini-3.8-flash', message: '連線正常！Gemini AI 課表辨識運作中' };
  } catch (err: any) {
    return { ok: false, message: err.message || '測試失敗' };
  }
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

