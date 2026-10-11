-- ============================================================================
-- 🐾 Campus v1 (可樂助教) — Supabase 終極全合一資料庫、雲端 API 中心與 LINE 自動綁定腳本
-- 檔案位置：supabase/supabase_all_in_one.sql
--
-- 【核心架構亮點】：
-- 1. ☁️ API 全部寫在 Supabase 雲端 (`public.app_api_configs` + 雲端 RPC 函數)：
--    - App 程式碼不寫死任何第三方金鑰（LINE Channel ID/Secret/Token、Gemini API Key）。
--    - App 只負責傳送資料或訊息 Payload，由 Supabase 在雲端讀取金鑰並透過 `pg_net` 代發！
-- 2. 🤝 LINE Bot 加好友自動知道使用者的 LINE ID (`public.line_followers` + `public.line_bind_sessions`)：
--    - 當使用者點擊「加入 LINE 好友」或傳送訊息給機器人時，自動擷取其 `U` 開頭 33 碼 LINE User ID 與 LINE 暱稱。
--    - 自動將 `AUTO_<分享碼>` 升級綁定為真實的 `U...` LINE User ID，實現 100% 單人專屬精準推播！
-- 3. ⏰ 24/7 全自動多使用者分開推播 (`pg_cron` 每分鐘排程)：
--    - 即使手機關機或未開 App，Supabase 也會依每位使用者設定的時間與課表獨立發送晨報。
--
-- 【使用步驟（只需 1 分鐘）】：
-- 1. 登入 Supabase 控制台：https://supabase.com/dashboard/project/dxoobrrjzaovwpyagzgn
-- 2. 點選左側「SQL Editor」->「+ New query」。
-- 3. 將本檔案全部內容複製貼上，點擊右下角綠色「Run」執行即可！
-- ============================================================================

-- 啟用雲端背景排程與雲端 HTTP 代發擴充套件
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- PART 1: 課表、待辦、共用行事曆、記帳與使用者多帳號資料表
-- ============================================================================

-- 0. 使用者帳號資料表 (user_accounts)
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT '同學',
    share_code TEXT NOT NULL,
    line_user_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on user_accounts" ON public.user_accounts;
CREATE POLICY "Allow public all access on user_accounts" ON public.user_accounts FOR ALL TO public USING (true) WITH CHECK (true);

-- 1. 課程資料表 (courses)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT DEFAULT '',
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    classroom TEXT DEFAULT '',
    instructor TEXT DEFAULT '',
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    color_hex TEXT DEFAULT '#4F46E5',
    is_shared_with_friends BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_shared_with_friends BOOLEAN DEFAULT true;

-- 2. 待辦與作業資料表 (todos)
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT DEFAULT '作業',
    custom_category_name TEXT,
    custom_category_color_hex TEXT,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    paper_authors TEXT DEFAULT '',
    paper_url TEXT DEFAULT '',
    reading_status TEXT DEFAULT '未讀' CHECK (reading_status IN ('未讀', '閱讀中', '已讀畢')),
    has_reminder BOOLEAN DEFAULT false,
    reminder_date TIMESTAMPTZ,
    remind_1_day_before BOOLEAN DEFAULT true,
    remind_3_days_before BOOLEAN DEFAULT true,
    is_shared_with_friends BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS custom_category_name TEXT;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS custom_category_color_hex TEXT;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS has_reminder BOOLEAN DEFAULT false;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS remind_1_day_before BOOLEAN DEFAULT true;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS remind_3_days_before BOOLEAN DEFAULT true;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS is_shared_with_friends BOOLEAN DEFAULT true;

-- 3. 好友共用課表與記帳資料表 (shared_schedules)
CREATE TABLE IF NOT EXISTS public.shared_schedules (
    share_code TEXT PRIMARY KEY,
    owner_name TEXT NOT NULL DEFAULT '我的課表',
    is_sharing_enabled BOOLEAN DEFAULT true,
    courses_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    todos_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    accounting_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_expense_sharing_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT '我的課表';
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS is_sharing_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS courses_data JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS todos_data JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS accounting_data JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.shared_schedules ADD COLUMN IF NOT EXISTS is_expense_sharing_enabled BOOLEAN DEFAULT true;

-- 4. 記帳收支明細資料表 (accounting_transactions)
CREATE TABLE IF NOT EXISTS public.accounting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    category_id UUID,
    category_name TEXT NOT NULL,
    category_icon TEXT DEFAULT 'cart.fill',
    category_color_hex TEXT DEFAULT '#6366F1',
    payment_method_name TEXT DEFAULT '現金',
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT DEFAULT '',
    value_score INT DEFAULT 8,
    peer_rating NUMERIC(3, 1),
    peer_feedback TEXT DEFAULT '',
    is_shared_with_friends BOOLEAN DEFAULT true,
    meal_type TEXT DEFAULT '',
    related_installment_id UUID,
    related_split_bill_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS value_score INT DEFAULT 8;
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS peer_rating NUMERIC(3, 1);
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS peer_feedback TEXT DEFAULT '';
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS is_shared_with_friends BOOLEAN DEFAULT true;
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT '';

-- 5. 分期付款資料表 (accounting_installments)
CREATE TABLE IF NOT EXISTS public.accounting_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    total_periods INT NOT NULL DEFAULT 1,
    paid_periods INT NOT NULL DEFAULT 0,
    period_amount NUMERIC(12, 2) NOT NULL,
    start_date TIMESTAMPTZ DEFAULT now(),
    billing_day INT DEFAULT 15,
    payment_method_name TEXT DEFAULT '信用卡',
    category_name TEXT DEFAULT '數位 3C',
    notes TEXT DEFAULT '',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 墊錢分帳資料表 (accounting_split_bills)
CREATE TABLE IF NOT EXISTS public.accounting_split_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    my_amount NUMERIC(12, 2) NOT NULL,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT DEFAULT '',
    is_settled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 每月固定收支資料表 (accounting_recurring_items)
CREATE TABLE IF NOT EXISTS public.accounting_recurring_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    day_of_month INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
    category_name TEXT NOT NULL,
    category_icon TEXT DEFAULT 'cart.fill',
    category_color_hex TEXT DEFAULT '#6366F1',
    payment_method_name TEXT DEFAULT '現金',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_courses_day ON public.courses(day_of_week);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_shared_code ON public.shared_schedules(share_code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.accounting_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.accounting_transactions(type);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON public.accounting_recurring_items(is_active);

-- 開放 RLS 讀寫權限
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_recurring_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all operations on courses for anon" ON public.courses;
    DROP POLICY IF EXISTS "Allow all operations on todos for anon" ON public.todos;
    DROP POLICY IF EXISTS "Allow all operations on shared_schedules for anon" ON public.shared_schedules;
    DROP POLICY IF EXISTS "Allow all operations on accounting_transactions for anon" ON public.accounting_transactions;
    DROP POLICY IF EXISTS "Allow all operations on accounting_installments for anon" ON public.accounting_installments;
    DROP POLICY IF EXISTS "Allow all operations on accounting_split_bills for anon" ON public.accounting_split_bills;
    DROP POLICY IF EXISTS "Allow all operations on accounting_recurring_items for anon" ON public.accounting_recurring_items;
END $$;

CREATE POLICY "Allow all operations on courses for anon" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on todos for anon" ON public.todos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on shared_schedules for anon" ON public.shared_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on accounting_transactions for anon" ON public.accounting_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on accounting_installments for anon" ON public.accounting_installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on accounting_split_bills for anon" ON public.accounting_split_bills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on accounting_recurring_items for anon" ON public.accounting_recurring_items FOR ALL USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 2: ☁️ 雲端 API 金鑰保險箱 (`app_api_configs`) — 所有 API 寫在 Supabase 上
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_api_configs (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_api_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on app_api_configs" ON public.app_api_configs;
DROP POLICY IF EXISTS "Allow all operations on app_api_configs for anon" ON public.app_api_configs;
CREATE POLICY "Allow public all access on app_api_configs"
ON public.app_api_configs FOR ALL TO public USING (true) WITH CHECK (true);

-- 將所有第三方 API 金鑰統一儲存在 Supabase 雲端保險箱 (App 端只負責傳送請求)
INSERT INTO public.app_api_configs (config_key, config_value, description)
VALUES
    ('line_channel_id', '', 'LINE Messaging API Channel ID'),
    ('line_channel_secret', '', 'LINE Messaging API Channel Secret'),
    ('line_channel_access_token', '', 'LINE Messaging API Long-lived Channel Access Token'),
    ('line_default_user_id', '', 'LINE Default Recipient User ID'),
    ('gemini_api_key', '', 'Google Gemini Multimodal OCR API Key')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = CASE WHEN public.app_api_configs.config_value = '' THEN EXCLUDED.config_value ELSE public.app_api_configs.config_value END,
    updated_at = now();


-- ============================================================================
-- PART 3: 🤝 LINE 好友自動識別與自動綁定資料表 (`line_followers` & `line_bind_sessions`)
-- ============================================================================

-- 1. 儲存所有加入 LINE Bot 好友的使用者清單 (由 Webhook 或 API 自動寫入)
CREATE TABLE IF NOT EXISTS public.line_followers (
    line_user_id TEXT PRIMARY KEY,               -- 真實的 33 碼 LINE User ID (U開頭)
    display_name TEXT DEFAULT 'LINE 好友',        -- 使用者的 LINE 顯示暱稱
    picture_url TEXT DEFAULT '',                 -- 使用者的 LINE 大頭貼
    status_message TEXT DEFAULT '',              -- 狀態消息
    bound_share_code TEXT DEFAULT '',            -- 已綁定的 Campus 6 碼課表分享碼
    bound_device_id TEXT DEFAULT '',             -- 已綁定的手機裝置識別碼
    follow_source TEXT DEFAULT 'webhook',        -- 來源：webhook_follow / webhook_message / api_sync
    is_following BOOLEAN DEFAULT true,           -- 是否維持好友狀態
    followed_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.line_followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on line_followers" ON public.line_followers;
CREATE POLICY "Allow public all access on line_followers"
ON public.line_followers FOR ALL TO public USING (true) WITH CHECK (true);

-- 預先將預設主使用者加入好友名冊
INSERT INTO public.line_followers (line_user_id, display_name, follow_source, is_following)
VALUES ('U13454cc9b1940c43887043382887308c', '我的課表 (預設主帳號)', 'preset', true)
ON CONFLICT (line_user_id) DO NOTHING;

-- 2. 手機端點擊「加好友自動綁定」時的臨時配對佇列 (15 分鐘內加好友自動配對)
CREATE TABLE IF NOT EXISTS public.line_bind_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    share_code TEXT NOT NULL,
    user_name TEXT DEFAULT '',
    claimed_line_user_id TEXT DEFAULT '',
    claimed_display_name TEXT DEFAULT '',
    is_claimed BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes'),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.line_bind_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on line_bind_sessions" ON public.line_bind_sessions;
CREATE POLICY "Allow public all access on line_bind_sessions"
ON public.line_bind_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. 多使用者 LINE 推播設定表 (line_bot_settings)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'line_bot_settings' AND column_name = 'id'
    ) THEN
        DROP TABLE public.line_bot_settings;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.line_bot_settings (
    user_id TEXT PRIMARY KEY,                     -- LINE User ID (U開頭33碼，或未綁定前的 AUTO_<分享碼>)
    device_id TEXT DEFAULT '',                    -- 裝置識別碼
    user_name TEXT DEFAULT '我的課表',             -- 使用者顯示名稱
    share_code TEXT DEFAULT '',                   -- 綁定的 6 碼分享代碼
    channel_access_token TEXT NOT NULL DEFAULT '',-- LINE Bot Access Token (留空時自動從 app_api_configs 讀取)
    is_enabled BOOLEAN DEFAULT true,              -- 是否啟用每日自動推播
    push_hour INT DEFAULT 7,                      -- 推播小時 (0-23，台灣時間)
    push_minute INT DEFAULT 0,                    -- 推播分鐘 (0-59，台灣時間)
    include_schedule BOOLEAN DEFAULT true,        -- 是否推送今日課表
    include_todos BOOLEAN DEFAULT true,           -- 是否推送今日待辦
    include_weekly_plan BOOLEAN DEFAULT true,     -- 是否推送本週規劃
    include_expense_summary BOOLEAN DEFAULT false,-- 是否推送記帳開銷摘要
    courses_data JSONB DEFAULT '[]'::jsonb,       -- 課表快照
    todos_data JSONB DEFAULT '[]'::jsonb,         -- 待辦快照
    last_sent_date TEXT DEFAULT '',               -- 上次發送日期 (YYYY-MM-DD)
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '我的課表';
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS share_code TEXT DEFAULT '';
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS push_hour INT DEFAULT 7;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS push_minute INT DEFAULT 0;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS include_schedule BOOLEAN DEFAULT true;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS include_todos BOOLEAN DEFAULT true;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS include_weekly_plan BOOLEAN DEFAULT true;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS include_expense_summary BOOLEAN DEFAULT false;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS courses_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS todos_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.line_bot_settings ADD COLUMN IF NOT EXISTS last_sent_date TEXT DEFAULT '';

ALTER TABLE public.line_bot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on line_bot_settings" ON public.line_bot_settings;
CREATE POLICY "Allow public all access on line_bot_settings"
ON public.line_bot_settings FOR ALL TO public USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 4: 🚀 Supabase 雲端代發與 LINE ID 自動綁定 RPC 函數群
-- ============================================================================

-- 函數 1：取得雲端 LINE Access Token 的內部輔助函數
CREATE OR REPLACE FUNCTION public.get_cloud_line_token(p_recipient_id TEXT DEFAULT '')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
BEGIN
    SELECT config_value INTO v_token FROM public.app_api_configs WHERE config_key = 'line_channel_access_token' AND config_value <> '' LIMIT 1;
    IF v_token IS NULL OR v_token = '' THEN
        SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id = p_recipient_id AND channel_access_token <> '' LIMIT 1;
    END IF;
    IF v_token IS NULL OR v_token = '' THEN
        SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id NOT LIKE 'SHARE_%' AND user_id <> 'CLOUD_API_VAULT' AND channel_access_token <> '' LIMIT 1;
    END IF;
    RETURN COALESCE(v_token, '');
END;
$$;

-- 函數 2：自動將使用者的真實 LINE User ID (U...) 綁定至其 6 碼分享代碼與課表設定
CREATE OR REPLACE FUNCTION public.bind_line_user_to_schedule(
    p_line_user_id TEXT,
    p_display_name TEXT DEFAULT '',
    p_share_code TEXT DEFAULT '',
    p_device_id TEXT DEFAULT '',
    p_picture_url TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_uid TEXT := trim(p_line_user_id);
    v_clean_code TEXT := upper(trim(COALESCE(p_share_code, '')));
    v_clean_dev TEXT := trim(COALESCE(p_device_id, ''));
    v_clean_name TEXT := trim(COALESCE(p_display_name, ''));
    v_auto_row RECORD;
    v_token TEXT;
BEGIN
    IF v_clean_uid = '' OR NOT (v_clean_uid LIKE 'U%') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid LINE user_id');
    END IF;

    -- 1. 寫入或更新 line_followers 好友名冊
    INSERT INTO public.line_followers (
        line_user_id, display_name, picture_url, bound_share_code, bound_device_id, is_following, updated_at
    )
    VALUES (
        v_clean_uid,
        CASE WHEN v_clean_name = '' THEN 'LINE 好友' ELSE v_clean_name END,
        COALESCE(p_picture_url, ''),
        v_clean_code,
        v_clean_dev,
        true,
        now()
    )
    ON CONFLICT (line_user_id) DO UPDATE SET
        display_name = CASE WHEN EXCLUDED.display_name <> 'LINE 好友' AND EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE public.line_followers.display_name END,
        picture_url = CASE WHEN EXCLUDED.picture_url <> '' THEN EXCLUDED.picture_url ELSE public.line_followers.picture_url END,
        bound_share_code = CASE WHEN EXCLUDED.bound_share_code <> '' THEN EXCLUDED.bound_share_code ELSE public.line_followers.bound_share_code END,
        bound_device_id = CASE WHEN EXCLUDED.bound_device_id <> '' THEN EXCLUDED.bound_device_id ELSE public.line_followers.bound_device_id END,
        is_following = true,
        updated_at = now();

    -- 2. 若未指定 share_code，嘗試從最近 15 分鐘內未認領的 line_bind_sessions 自動配對
    IF v_clean_code = '' THEN
        SELECT share_code, device_id, user_name
        INTO v_auto_row
        FROM public.line_bind_sessions
        WHERE is_claimed = false AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            v_clean_code := upper(trim(COALESCE(v_auto_row.share_code, '')));
            v_clean_dev := trim(COALESCE(v_auto_row.device_id, ''));
            IF v_clean_name = '' THEN
                v_clean_name := COALESCE(v_auto_row.user_name, '');
            END IF;

            UPDATE public.line_bind_sessions
            SET is_claimed = true,
                claimed_line_user_id = v_clean_uid,
                claimed_display_name = v_clean_name
            WHERE share_code = v_auto_row.share_code AND is_claimed = false;

            UPDATE public.line_followers
            SET bound_share_code = v_clean_code,
                bound_device_id = v_clean_dev,
                updated_at = now()
            WHERE line_user_id = v_clean_uid;
        END IF;
    ELSE
        -- 標記對應 share_code 的綁定階段已完成
        UPDATE public.line_bind_sessions
        SET is_claimed = true,
            claimed_line_user_id = v_clean_uid,
            claimed_display_name = v_clean_name
        WHERE upper(share_code) = v_clean_code AND is_claimed = false;
    END IF;

    -- 3. 若在 line_bot_settings 中已有 AUTO_<share_code> 或相同 device_id 的紀錄，自動將它升級為真實的 U... LINE User ID！
    v_token := public.get_cloud_line_token(v_clean_uid);

    IF v_clean_code <> '' THEN
        SELECT * INTO v_auto_row
        FROM public.line_bot_settings
        WHERE (upper(share_code) = v_clean_code OR user_id = 'AUTO_' || v_clean_code)
          AND user_id NOT LIKE 'SHARE_%'
          AND user_id <> 'CLOUD_API_VAULT'
        ORDER BY updated_at DESC
        LIMIT 1;

        IF FOUND THEN
            INSERT INTO public.line_bot_settings (
                user_id, device_id, user_name, share_code, channel_access_token,
                is_enabled, push_hour, push_minute,
                include_schedule, include_todos, include_weekly_plan, include_expense_summary,
                courses_data, todos_data, last_sent_date, updated_at
            )
            VALUES (
                v_clean_uid,
                CASE WHEN v_clean_dev <> '' THEN v_clean_dev ELSE v_auto_row.device_id END,
                CASE WHEN v_auto_row.user_name <> '' AND v_auto_row.user_name <> '我的課表' THEN v_auto_row.user_name
                     WHEN v_clean_name <> '' THEN v_clean_name
                     ELSE '我的課表' END,
                v_clean_code,
                CASE WHEN v_auto_row.channel_access_token <> '' THEN v_auto_row.channel_access_token ELSE v_token END,
                v_auto_row.is_enabled,
                v_auto_row.push_hour,
                v_auto_row.push_minute,
                COALESCE(v_auto_row.include_schedule, true),
                COALESCE(v_auto_row.include_todos, true),
                COALESCE(v_auto_row.include_weekly_plan, true),
                COALESCE(v_auto_row.include_expense_summary, false),
                v_auto_row.courses_data,
                v_auto_row.todos_data,
                v_auto_row.last_sent_date,
                now()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                share_code = EXCLUDED.share_code,
                device_id = CASE WHEN EXCLUDED.device_id <> '' THEN EXCLUDED.device_id ELSE public.line_bot_settings.device_id END,
                courses_data = CASE WHEN jsonb_array_length(EXCLUDED.courses_data) > 0 THEN EXCLUDED.courses_data ELSE public.line_bot_settings.courses_data END,
                todos_data = CASE WHEN jsonb_array_length(EXCLUDED.todos_data) > 0 THEN EXCLUDED.todos_data ELSE public.line_bot_settings.todos_data END,
                updated_at = now();

            -- 刪除過渡期的 AUTO_ 紀錄，避免重複推播
            IF v_auto_row.user_id LIKE 'AUTO_%' THEN
                DELETE FROM public.line_bot_settings WHERE user_id = v_auto_row.user_id;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'line_user_id', v_clean_uid,
        'display_name', v_clean_name,
        'bound_share_code', v_clean_code
    );
END;
$$;

-- 函數 3：App 端一鍵詢問並認領最新加好友的 LINE User ID
CREATE OR REPLACE FUNCTION public.claim_latest_line_follower(
    p_device_id TEXT,
    p_share_code TEXT,
    p_user_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_code TEXT := upper(trim(COALESCE(p_share_code, '')));
    v_clean_dev TEXT := trim(COALESCE(p_device_id, ''));
    v_session RECORD;
    v_follower RECORD;
BEGIN
    -- 1. 優先檢查是否已有透過 Webhook 自動配對成功的 session 或 follower
    SELECT * INTO v_follower
    FROM public.line_followers
    WHERE (v_clean_code <> '' AND upper(bound_share_code) = v_clean_code)
       OR (v_clean_dev <> '' AND bound_device_id = v_clean_dev)
    ORDER BY updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        PERFORM public.bind_line_user_to_schedule(
            v_follower.line_user_id,
            v_follower.display_name,
            v_clean_code,
            v_clean_dev,
            v_follower.picture_url
        );
        RETURN jsonb_build_object(
            'ok', true,
            'matched_by', 'bound_follower',
            'line_user_id', v_follower.line_user_id,
            'display_name', v_follower.display_name,
            'share_code', v_clean_code
        );
    END IF;

    -- 2. 檢查是否有剛加入好友且尚未綁定給別人的最新 Follower
    SELECT * INTO v_follower
    FROM public.line_followers
    WHERE is_following = true
      AND (bound_share_code IS NULL OR bound_share_code = '' OR upper(bound_share_code) = v_clean_code)
    ORDER BY followed_at DESC, updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        PERFORM public.bind_line_user_to_schedule(
            v_follower.line_user_id,
            CASE WHEN p_user_name <> '' THEN p_user_name ELSE v_follower.display_name END,
            v_clean_code,
            v_clean_dev,
            v_follower.picture_url
        );
        RETURN jsonb_build_object(
            'ok', true,
            'matched_by', 'latest_follower',
            'line_user_id', v_follower.line_user_id,
            'display_name', v_follower.display_name,
            'share_code', v_clean_code
        );
    END IF;

    RETURN jsonb_build_object('ok', false, 'error', 'No unbound LINE follower found yet');
END;
$$;

-- 函數 4：純 SQL 版 LINE Webhook 處理器 (`handle_line_webhook`)
-- 即使不部署 Edge Function，也可透過 PostgREST RPC 處理 LINE follow 與 message 事件！
CREATE OR REPLACE FUNCTION public.handle_line_webhook(p_body JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ev JSONB;
    v_event_type TEXT;
    v_user_id TEXT;
    v_reply_token TEXT;
    v_msg_text TEXT;
    v_share_code TEXT := '';
    v_bind_result JSONB;
    v_token TEXT;
    v_reply_msg TEXT;
    v_matched_codes TEXT[];
BEGIN
    v_token := public.get_cloud_line_token('');

    IF p_body IS NULL OR jsonb_typeof(p_body->'events') <> 'array' THEN
        RETURN jsonb_build_object('ok', true, 'message', 'No events');
    END IF;

    FOR ev IN SELECT * FROM jsonb_array_elements(p_body->'events')
    LOOP
        v_event_type := COALESCE(ev->>'type', '');
        v_user_id := COALESCE(ev->'source'->>'userId', '');
        v_reply_token := COALESCE(ev->>'replyToken', '');
        v_msg_text := trim(COALESCE(ev->'message'->>'text', ''));

        IF v_user_id LIKE 'U%' THEN
            -- 若使用者傳送了 6 碼分享代碼（例如 "綁定_AB12CD"、"綁定 AB12CD" 或直接輸入 6 碼英數 "AB12CD"）
            IF v_event_type = 'message' AND v_msg_text <> '' THEN
                v_matched_codes := regexp_match(upper(v_msg_text), '([A-Z0-9]{6})');
                IF v_matched_codes IS NOT NULL AND array_length(v_matched_codes, 1) >= 1 THEN
                    v_share_code := v_matched_codes[1];
                END IF;
            END IF;

            -- 自動記錄該使用者的 LINE ID 並綁定課表
            v_bind_result := public.bind_line_user_to_schedule(
                p_line_user_id := v_user_id,
                p_display_name := '',
                p_share_code := v_share_code,
                p_device_id := '',
                p_picture_url := ''
            );

            -- 自動回覆使用者綁定成功與其專屬 LINE ID
            IF v_token <> '' AND v_reply_token <> '' AND (v_event_type = 'follow' OR v_share_code <> '' OR upper(v_msg_text) IN ('ID', 'MYID', '查詢ID', '綁定')) THEN
                IF COALESCE(v_bind_result->>'bound_share_code', '') <> '' THEN
                    v_reply_msg := '🐾 可樂助教已自動識別您的 LINE ID 並完成綁定！' || chr(10)
                        || '• 綁定課表代碼：' || (v_bind_result->>'bound_share_code') || chr(10)
                        || '• 您的 LINE ID：' || v_user_id || chr(10)
                        || '現在起您將準時收到專屬的單人課表與待辦推播！';
                ELSE
                    v_reply_msg := '🐾 歡迎加入可樂校園助教！' || chr(10)
                        || '已自動記錄您的 LINE ID：' || chr(10)
                        || v_user_id || chr(10) || chr(10)
                        || '💡 您可以直接回到 Campus App 點擊「自動偵測已加好友的 LINE ID」，或在此對話框直接輸入您的「6 碼課表分享代碼」即可自動完成綁定！';
                END IF;

                PERFORM net.http_post(
                    url := 'https://api.line.me/v2/bot/message/reply',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_token
                    ),
                    body := jsonb_build_object(
                        'replyToken', v_reply_token,
                        'messages', jsonb_build_array(
                            jsonb_build_object('type', 'text', 'text', v_reply_msg)
                        )
                    )
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- 函數 5：雲端代發 LINE 訊息 RPC 函數 (`relay_line_message`)
-- App 只負責傳送訊息內容，由 Supabase 自動查找該使用者的真實 LINE ID 並讀取雲端 Token 發送！
CREATE OR REPLACE FUNCTION public.relay_line_message(
    p_recipient_id TEXT,
    p_is_direct_push BOOLEAN,
    p_messages JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_resolved_recipient TEXT := trim(COALESCE(p_recipient_id, ''));
    v_is_direct BOOLEAN := COALESCE(p_is_direct_push, false);
    v_share_code TEXT := '';
    v_bound_uid TEXT := '';
    v_target_url TEXT;
    v_payload JSONB;
BEGIN
    v_token := public.get_cloud_line_token(v_resolved_recipient);

    IF v_token = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Missing LINE token in Supabase app_api_configs');
    END IF;

    -- ✨ 智慧升級：若傳入的是 AUTO_<分享碼>，自動從 line_followers 查找該分享碼是否已加好友並綁定真實 U... ID！
    IF NOT (v_resolved_recipient LIKE 'U%' AND length(v_resolved_recipient) >= 25) THEN
        IF v_resolved_recipient LIKE 'AUTO_%' THEN
            v_share_code := upper(replace(v_resolved_recipient, 'AUTO_', ''));
        END IF;

        IF v_share_code <> '' THEN
            SELECT line_user_id INTO v_bound_uid
            FROM public.line_followers
            WHERE upper(bound_share_code) = v_share_code AND is_following = true
            ORDER BY updated_at DESC
            LIMIT 1;

            IF v_bound_uid IS NOT NULL AND v_bound_uid LIKE 'U%' THEN
                v_resolved_recipient := v_bound_uid;
                v_is_direct := true;
            END IF;
        END IF;
    ELSE
        v_is_direct := true;
    END IF;

    IF v_is_direct AND v_resolved_recipient LIKE 'U%' AND length(v_resolved_recipient) >= 25 THEN
        v_target_url := 'https://api.line.me/v2/bot/message/push';
        v_payload := jsonb_build_object('to', v_resolved_recipient, 'messages', p_messages);
    ELSE
        v_target_url := 'https://api.line.me/v2/bot/message/broadcast';
        v_payload := jsonb_build_object('messages', p_messages);
    END IF;

    PERFORM net.http_post(
        url := v_target_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_token
        ),
        body := v_payload
    );

    RETURN jsonb_build_object(
        'ok', true,
        'relayed_by', 'supabase_pg_net',
        'resolved_recipient', v_resolved_recipient,
        'is_direct_push', v_is_direct
    );
END;
$$;


-- ============================================================================
-- PART 5: ⏰ 24/7 雲端多使用者分開定時推播引擎 (`send_line_daily_briefing`)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_line_daily_briefing()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    cfg RECORD;
    shared_rec RECORD;
    now_tw TIMESTAMP;
    today_date DATE;
    today_date_str TEXT;
    current_hour INT;
    current_minute INT;
    today_weekday INT;
    v_token TEXT;
    v_target_uid TEXT;
    v_share_code TEXT;
    v_courses JSONB;
    v_todos JSONB;
    courses_count INT;
    todos_count INT;
    remaining_courses_count INT;
    date_str TEXT;
    weekday_str TEXT;
    header_title TEXT;
    eyebrow_text TEXT;
    footer_time_str TEXT;
    summary_text TEXT;
    course_bubbles JSONB;
    todo_bubbles JSONB;
    week_info_bubbles JSONB;
    body_contents JSONB;
    flex_messages JSONB;
    flex_payload JSONB;
    target_url TEXT;
BEGIN
    now_tw := now() AT TIME ZONE 'Asia/Taipei';
    today_date := now_tw::date;
    today_date_str := to_char(now_tw, 'YYYY-MM-DD');
    current_hour := EXTRACT(HOUR FROM now_tw)::INT;
    current_minute := EXTRACT(MINUTE FROM now_tw)::INT;

    today_weekday := CASE EXTRACT(DOW FROM now_tw)
        WHEN 0 THEN 7
        ELSE EXTRACT(DOW FROM now_tw)::INT
    END;

    date_str := to_char(now_tw, 'FMMM"月"FMDD"日"');
    weekday_str := CASE today_weekday
        WHEN 1 THEN '星期一'
        WHEN 2 THEN '星期二'
        WHEN 3 THEN '星期三'
        WHEN 4 THEN '星期四'
        WHEN 5 THEN '星期五'
        WHEN 6 THEN '星期六'
        WHEN 7 THEN '星期日'
    END;

    header_title := date_str || ' ' || weekday_str;

    FOR cfg IN
        SELECT * FROM public.line_bot_settings
        WHERE is_enabled = true
          AND user_id IS NOT NULL AND user_id <> ''
          AND user_id NOT LIKE 'SHARE_%'
          AND user_id <> 'CLOUD_API_VAULT'
          AND (last_sent_date IS NULL OR last_sent_date <> today_date_str)
          AND (current_hour > push_hour OR (current_hour = push_hour AND current_minute >= push_minute))
    LOOP
        v_token := CASE WHEN cfg.channel_access_token <> '' THEN cfg.channel_access_token ELSE public.get_cloud_line_token(cfg.user_id) END;
        IF v_token = '' THEN
            CONTINUE;
        END IF;

        -- 若為 AUTO_<分享碼>，自動檢查 line_followers 是否已有對應的真實 U... LINE User ID
        v_target_uid := cfg.user_id;
        IF NOT (v_target_uid LIKE 'U%' AND length(v_target_uid) >= 25) THEN
            v_share_code := upper(COALESCE(NULLIF(cfg.share_code, ''), replace(v_target_uid, 'AUTO_', '')));
            IF v_share_code <> '' THEN
                SELECT line_user_id INTO v_target_uid
                FROM public.line_followers
                WHERE upper(bound_share_code) = v_share_code AND is_following = true
                ORDER BY updated_at DESC
                LIMIT 1;
                IF v_target_uid IS NULL OR v_target_uid = '' THEN
                    v_target_uid := cfg.user_id;
                END IF;
            END IF;
        END IF;

        v_courses := COALESCE(cfg.courses_data, '[]'::jsonb);
        v_todos := COALESCE(cfg.todos_data, '[]'::jsonb);

        IF cfg.share_code IS NOT NULL AND cfg.share_code <> '' THEN
            BEGIN
                SELECT courses_data, todos_data INTO shared_rec
                FROM public.shared_schedules
                WHERE share_code = cfg.share_code
                LIMIT 1;

                IF FOUND THEN
                    IF jsonb_typeof(v_courses) <> 'array' OR jsonb_array_length(v_courses) = 0 THEN
                        v_courses := COALESCE(shared_rec.courses_data, '[]'::jsonb);
                    END IF;
                    IF jsonb_typeof(v_todos) <> 'array' OR jsonb_array_length(v_todos) = 0 THEN
                        v_todos := COALESCE(shared_rec.todos_data, '[]'::jsonb);
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        IF jsonb_typeof(v_courses) = 'array' AND jsonb_array_length(v_courses) > 0 THEN
            SELECT COUNT(*) INTO courses_count
            FROM jsonb_array_elements(v_courses) AS c
            WHERE COALESCE((c->>'day_of_week')::INT, 0) = today_weekday;

            SELECT COUNT(*) INTO remaining_courses_count
            FROM jsonb_array_elements(v_courses) AS c
            WHERE COALESCE((c->>'day_of_week')::INT, 0) >= today_weekday;

            SELECT jsonb_agg(jsonb_build_object(
                'type', 'box',
                'layout', 'horizontal',
                'margin', 'md',
                'spacing', 'md',
                'contents', jsonb_build_array(
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'width', '3px',
                        'backgroundColor', COALESCE(NULLIF(c->>'color_hex', ''), '#007AFF'),
                        'cornerRadius', '2px',
                        'contents', jsonb_build_array(jsonb_build_object('type', 'text', 'text', ' ', 'size', 'xxs'))
                    ),
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'flex', 1,
                        'contents', jsonb_build_array(
                            jsonb_build_object(
                                'type', 'box',
                                'layout', 'horizontal',
                                'contents', jsonb_build_array(
                                    jsonb_build_object('type', 'text', 'text', COALESCE(c->>'name', '課程'), 'weight', 'bold', 'size', 'sm', 'color', '#1C1C1E', 'wrap', true),
                                    jsonb_build_object('type', 'text', 'text', COALESCE(c->>'start_time', '') || ' - ' || COALESCE(c->>'end_time', ''), 'size', 'xs', 'color', '#8E8E93', 'align', 'end')
                                )
                            ),
                            jsonb_build_object('type', 'text', 'text', COALESCE(NULLIF(c->>'classroom', ''), '未指定地點') || CASE WHEN c->>'instructor' IS NOT NULL AND c->>'instructor' <> '' THEN ' · ' || (c->>'instructor') ELSE '' END, 'size', 'xs', 'color', '#8E8E93', 'margin', 'xs')
                        )
                    )
                )
            )) INTO course_bubbles
            FROM (
                SELECT c FROM jsonb_array_elements(v_courses) AS c
                WHERE COALESCE((c->>'day_of_week')::INT, 0) = today_weekday
                ORDER BY c->>'start_time' ASC
            ) sub_c;
        ELSE
            courses_count := 0;
            remaining_courses_count := 0;
            course_bubbles := NULL;
        END IF;

        IF course_bubbles IS NULL THEN
            course_bubbles := jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', '今日無排定課程', 'size', 'xs', 'color', '#8E8E93', 'margin', 'sm')
            );
        END IF;

        IF jsonb_typeof(v_todos) = 'array' AND jsonb_array_length(v_todos) > 0 THEN
            SELECT COUNT(*) INTO todos_count
            FROM jsonb_array_elements(v_todos) AS t
            WHERE COALESCE((t->>'is_completed')::BOOLEAN, false) = false
              AND (
                  (NULLIF(t->>'start_date', '') IS NOT NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                   AND today_date >= ((t->>'start_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date
                   AND today_date <= ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date)
                  OR
                  (NULLIF(t->>'start_date', '') IS NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                   AND ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date = today_date)
              );

            SELECT jsonb_agg(jsonb_build_object(
                'type', 'box',
                'layout', 'horizontal',
                'margin', 'md',
                'spacing', 'md',
                'contents', jsonb_build_array(
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'width', '8px',
                        'height', '8px',
                        'cornerRadius', '4px',
                        'backgroundColor', CASE COALESCE(t->>'priority', 'medium') WHEN 'high' THEN '#FF3B30' WHEN 'medium' THEN '#FF9500' ELSE '#34C759' END,
                        'contents', jsonb_build_array(jsonb_build_object('type', 'text', 'text', ' ', 'size', 'xxs'))
                    ),
                    jsonb_build_object('type', 'text', 'text', COALESCE(t->>'title', '待辦事項'), 'size', 'sm', 'color', '#1C1C1E', 'flex', 1, 'wrap', true),
                    jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'backgroundColor', '#F2F2F7',
                        'cornerRadius', '4px',
                        'paddingStart', '6px',
                        'paddingEnd', '6px',
                        'paddingTop', '2px',
                        'paddingBottom', '2px',
                        'contents', jsonb_build_array(
                            jsonb_build_object('type', 'text', 'text', COALESCE(NULLIF(t->>'custom_category_name', ''), COALESCE(t->>'category', '待辦')), 'size', 'xxs', 'color', '#8E8E93')
                        )
                    )
                )
            )) INTO todo_bubbles
            FROM (
                SELECT t FROM jsonb_array_elements(v_todos) AS t
                WHERE COALESCE((t->>'is_completed')::BOOLEAN, false) = false
                  AND (
                      (NULLIF(t->>'start_date', '') IS NOT NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                       AND today_date >= ((t->>'start_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date
                       AND today_date <= ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date)
                      OR
                      (NULLIF(t->>'start_date', '') IS NULL AND NULLIF(t->>'due_date', '') IS NOT NULL
                       AND ((t->>'due_date')::timestamptz AT TIME ZONE 'Asia/Taipei')::date = today_date)
                  )
                ORDER BY CASE COALESCE(t->>'priority', 'medium') WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
                LIMIT 4
            ) sub_t;
        ELSE
            todos_count := 0;
            todo_bubbles := NULL;
        END IF;

        IF todo_bubbles IS NULL THEN
            todo_bubbles := jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', '全部待辦事項皆已完成', 'size', 'xs', 'color', '#8E8E93', 'margin', 'sm')
            );
        END IF;

        summary_text := courses_count || ' 堂課 · ' || todos_count || ' 項待辦';
        eyebrow_text := 'CAMPUS BRIEFING' || CASE WHEN cfg.user_name IS NOT NULL AND cfg.user_name <> '' THEN ' · ' || cfg.user_name ELSE '' END;
        footer_time_str := 'Campus · 晨間簡報 ' || LPAD(cfg.push_hour::text, 2, '0') || ':' || LPAD(cfg.push_minute::text, 2, '0');

        week_info_bubbles := jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', '• 本週後續剩餘堂數：' || remaining_courses_count || ' 堂', 'size', 'xs', 'color', '#3C3C43')
        );

        body_contents := jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', eyebrow_text, 'size', 'xxs', 'weight', 'bold', 'color', '#8E8E93'),
            jsonb_build_object(
                'type', 'box',
                'layout', 'horizontal',
                'margin', 'xs',
                'contents', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', header_title, 'size', 'xl', 'weight', 'bold', 'color', '#1C1C1E', 'flex', 1),
                    jsonb_build_object('type', 'text', 'text', summary_text, 'size', 'xs', 'color', '#8E8E93', 'align', 'end', 'gravity', 'bottom')
                )
            ),
            jsonb_build_object('type', 'separator', 'margin', 'md', 'color', '#E5E5EA'),
            jsonb_build_object('type', 'text', 'text', '今日課表', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg')
        ) || course_bubbles || jsonb_build_array(
            jsonb_build_object('type', 'separator', 'margin', 'lg', 'color', '#E5E5EA'),
            jsonb_build_object('type', 'text', 'text', '今日待辦', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg')
        ) || todo_bubbles || jsonb_build_array(
            jsonb_build_object('type', 'separator', 'margin', 'lg', 'color', '#E5E5EA'),
            jsonb_build_object('type', 'text', 'text', '本週規劃', 'size', 'xs', 'weight', 'bold', 'color', '#8E8E93', 'margin', 'lg'),
            jsonb_build_object(
                'type', 'box',
                'layout', 'vertical',
                'backgroundColor', '#F2F2F7',
                'cornerRadius', '10px',
                'paddingAll', '12px',
                'margin', 'md',
                'spacing', 'xs',
                'contents', week_info_bubbles
            )
        );

        flex_messages := jsonb_build_array(
            jsonb_build_object(
                'type', 'flex',
                'altText', 'Campus 晨間簡報 (' || COALESCE(cfg.user_name, '今日課表') || ')：' || header_title,
                'contents', jsonb_build_object(
                    'type', 'bubble',
                    'size', 'mega',
                    'body', jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'backgroundColor', '#FFFFFF',
                        'paddingAll', '20px',
                        'contents', body_contents
                    ),
                    'footer', jsonb_build_object(
                        'type', 'box',
                        'layout', 'vertical',
                        'paddingTop', '10px',
                        'paddingBottom', '16px',
                        'paddingStart', '20px',
                        'paddingEnd', '20px',
                        'backgroundColor', '#FFFFFF',
                        'contents', jsonb_build_array(
                            jsonb_build_object(
                                'type', 'button',
                                'action', jsonb_build_object('type', 'message', 'label', '確認今日日程', 'text', '已確認今日日程'),
                                'style', 'primary',
                                'color', '#007AFF',
                                'height', 'sm'
                            ),
                            jsonb_build_object('type', 'text', 'text', footer_time_str, 'size', 'xxs', 'color', '#C7C7CC', 'align', 'center', 'margin', 'md')
                        )
                    )
                )
            )
        );

        IF v_target_uid LIKE 'U%' AND length(v_target_uid) >= 25 THEN
            target_url := 'https://api.line.me/v2/bot/message/push';
            flex_payload := jsonb_build_object(
                'to', v_target_uid,
                'messages', flex_messages
            );
        ELSE
            target_url := 'https://api.line.me/v2/bot/message/broadcast';
            flex_payload := jsonb_build_object(
                'messages', flex_messages
            );
        END IF;

        PERFORM net.http_post(
            url := target_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_token
            ),
            body := flex_payload
        );

        UPDATE public.line_bot_settings
        SET last_sent_date = today_date_str,
            updated_at = now()
        WHERE user_id = cfg.user_id;
    END LOOP;
END;
$$;

-- 註冊每分鐘檢查一次的雲端排程
DO $$
BEGIN
    PERFORM cron.unschedule('daily-line-briefing-7am');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    PERFORM cron.unschedule('daily-line-briefing-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'daily-line-briefing-every-minute',
    '* * * * *',
    $$ SELECT public.send_line_daily_briefing(); $$
);

NOTIFY pgrst, 'reload schema';
