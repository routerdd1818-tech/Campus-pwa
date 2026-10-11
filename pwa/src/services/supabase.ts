import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Course, Todo, Transaction, Installment, SplitBill } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://dxoobrrjzaovwpyagzgn.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b29icnJqemFvdndweWFnemduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDAxNDksImV4cCI6MjEwNDYxNjE0OX0.MRF3i5yXveFpalZOPcquDtsbCa7lg_fDRWMZsA8uXm0';

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
// Courses
// -------------------------------------------------------------
export async function fetchCoursesFromSupabase(): Promise<Course[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('courses').select('*').order('day_of_week', { ascending: true });
    if (error) throw error;
    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
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

export async function upsertCourseToSupabase(course: Course): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('courses').upsert({
      id: course.id,
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

// -------------------------------------------------------------
// Todos
// -------------------------------------------------------------
export async function fetchTodosFromSupabase(): Promise<Todo[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      title: t.title,
      notes: t.notes || '',
      dueDate: t.due_date || undefined,
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

export async function upsertTodoToSupabase(todo: Todo): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('todos').upsert({
      id: todo.id,
      title: todo.title,
      notes: todo.notes,
      due_date: todo.dueDate,
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

// -------------------------------------------------------------
// Accounting Transactions
// -------------------------------------------------------------
export async function fetchTransactionsFromSupabase(): Promise<Transaction[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('accounting_transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      amount: Number(t.amount) || 0,
      type: t.type || 'expense',
      categoryName: t.category_name || '餐飲',
      categoryIcon: t.category_icon || 'cart',
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

export async function upsertTransactionToSupabase(t: Transaction): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('accounting_transactions').upsert({
      id: t.id,
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

// -------------------------------------------------------------
// LINE Bot & RPC
// -------------------------------------------------------------
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
// Gemini AI OCR Gateway
// -------------------------------------------------------------
export async function callGeminiOcrGateway(base64Image: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('campus-api-gateway', {
      body: {
        action: 'gemini_ocr',
        base64Image,
        prompt:
          '請辨識這張大學課表圖片，並以 JSON 陣列格式輸出所有課程。每個項目包含：name（課程名稱）、classroom（教室）、instructor（講師）、dayOfWeek（星期幾，數字 1 代表週一、7 代表週日）、startTime（格式如 09:00）、endTime（格式如 12:00）。只回傳 JSON 陣列，不需其他文字。',
      },
    });
    if (error) throw error;
    return data?.text || null;
  } catch (err) {
    console.warn('callGeminiOcrGateway error:', err);
    return null;
  }
}
