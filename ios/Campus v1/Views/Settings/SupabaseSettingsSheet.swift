//
//  SupabaseSettingsSheet.swift
//  Campus v1
//

import SwiftUI

struct SupabaseSettingsSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    @ObservedObject var apiVault = SupabaseApiVault.shared
    
    @State private var projectURL: String = ""
    @State private var anonKey: String = ""
    @State private var geminiApiKey: String = ""
    @State private var lineChannelId: String = ""
    @State private var lineChannelSecret: String = ""
    @State private var lineAccessToken: String = ""
    @State private var lineDefaultUserId: String = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingLineBotSheet = false
    @State private var sqlCopied = false
    
    var body: some View {
        NavigationStack {
            Form {
                // MARK: - 1. 連線狀態展示
                Section {
                    HStack(spacing: 12) {
                        CalicoCatAvatar(size: 40, mood: dataManager.isUsingCloud ? .happy : .normal)
                        
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(dataManager.isUsingCloud ? "Supabase 雲端同步已連線" : "目前處於本地離線模式")
                                    .font(.system(.headline, design: .rounded).weight(.bold))
                                Image(systemName: dataManager.isUsingCloud ? "checkmark.seal.fill" : "icloud.slash")
                                    .font(.caption)
                                    .foregroundColor(dataManager.isUsingCloud ? CalicoTheme.sageGreen : .secondary)
                            }
                            Text(dataManager.isUsingCloud ? "課表、待辦、記帳與雲端 API 保險箱皆已連線" : "填入下方專案資訊即可啟用跨裝置同步與雲端代發")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("連線狀態")
                }
                
                // MARK: - 2. ☁️ Supabase 雲端 API 保險箱與代發中心 (App 只負責傳送)
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Label("雲端 API 保險箱架構", systemImage: "lock.icloud.fill")
                                .font(.system(.subheadline, design: .rounded).weight(.bold))
                                .foregroundColor(CalicoTheme.warmOrange)
                            Spacer()
                            Text(apiVault.isSyncingVault ? "同步中..." : "雲端託管")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(CalicoTheme.warmOrange.opacity(0.14))
                                .foregroundColor(CalicoTheme.warmOrange)
                                .clipShape(Capsule())
                        }
                        Text("第三方 API 金鑰（Gemini OCR、LINE Messaging API）不再寫死於 App 程式碼中，統一儲存於 Supabase `app_api_configs` 並由雲端 RPC 代發。")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 2)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Gemini AI 課表辨識 API Key (雲端)")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondary)
                        SecureField("儲存在 Supabase 的 Gemini API Key", text: $geminiApiKey)
                            .font(.caption.monospaced())
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("LINE Bot Channel ID (雲端)")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondary)
                        TextField("儲存在 Supabase 的 LINE Channel ID", text: $lineChannelId)
                            .font(.caption.monospaced())
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("LINE Bot Channel Secret (雲端)")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondary)
                        SecureField("儲存在 Supabase 的 LINE Channel Secret", text: $lineChannelSecret)
                            .font(.caption.monospaced())
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("LINE 預設推播 User ID (雲端)")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.secondary)
                        TextField("U 開頭 33 碼或 AUTO_分享碼", text: $lineDefaultUserId)
                            .font(.caption.monospaced())
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    
                    HStack(spacing: 10) {
                        Button {
                            Task {
                                await apiVault.fetchCloudApiConfigs()
                                loadVaultFields()
                                alertMessage = "已從 Supabase 雲端保險箱拉取最新 API 設定！"
                                showingAlert = true
                            }
                        } label: {
                            Label("從雲端拉取", systemImage: "icloud.and.arrow.down.fill")
                                .font(.caption.weight(.bold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(CalicoTheme.cocoaBrown)
                        
                        Button {
                            Task {
                                applyFieldsLocally()
                                let ok = await apiVault.saveApiConfigsToSupabase(
                                    lineChannelId: lineChannelId,
                                    lineChannelSecret: lineChannelSecret,
                                    lineAccessToken: lineAccessToken,
                                    lineDefaultUserId: lineDefaultUserId,
                                    geminiApiKey: geminiApiKey
                                )
                                alertMessage = ok
                                    ? "已成功將所有 API 金鑰上傳至 Supabase 雲端保險箱！"
                                    : "已暫存於本機，請確認網路連線或先在 Supabase 執行建表 SQL。"
                                showingAlert = true
                            }
                        } label: {
                            Label("上傳至 Supabase", systemImage: "icloud.and.arrow.up.fill")
                                .font(.caption.weight(.bold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(CalicoTheme.warmOrange)
                    }
                    .padding(.vertical, 4)
                    
                    Button {
                        copyCloudVaultSql()
                    } label: {
                        HStack {
                            Image(systemName: sqlCopied ? "checkmark.circle.fill" : "doc.on.doc.fill")
                                .foregroundColor(sqlCopied ? CalicoTheme.sageGreen : CalicoTheme.warmOrange)
                            Text(sqlCopied ? "已複製雲端 API 保險箱與代發 RPC SQL！" : "複製 Supabase 雲端 API 保險箱 & 代發 SQL")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.primary)
                            Spacer()
                        }
                    }
                } header: {
                    Text("☁️ Supabase 雲端 API 保險箱與代發中心")
                } footer: {
                    Text(apiVault.lastSyncStatus)
                }
                
                // MARK: - 3. LINE Bot 晨間推播快捷入口
                Section {
                    Button {
                        showingLineBotSheet = true
                    } label: {
                        HStack {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .foregroundColor(CalicoTheme.sageGreen)
                            Text("LINE Bot 每日晨報與多使用者獨立推播")
                                .foregroundColor(.primary)
                            Spacer()
                            Text(LineBotService.shared.isConfigured ? "已啟用" : "未設定")
                                .font(.caption)
                                .foregroundColor(LineBotService.shared.isConfigured ? CalicoTheme.sageGreen : .secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("智慧推播服務")
                }
                
                // MARK: - 4. 記帳週期設定
                Section {
                    Picker("每月重置日 (發薪日)", selection: $dataManager.accountingResetDay) {
                        ForEach(1...31, id: \.self) { day in
                            Text("\(day) 號").tag(day)
                        }
                    }
                    .onChange(of: dataManager.accountingResetDay) { _, newValue in
                        UserDefaults.standard.set(newValue, forKey: "accountingResetDay")
                        dataManager.recalculateAccountingMetrics()
                    }
                    
                    Toggle("依收入自動計算每日限額", isOn: $dataManager.isIncomeBasedDailyLimit)
                        .tint(CalicoTheme.warmOrange)
                        .onChange(of: dataManager.isIncomeBasedDailyLimit) { _, newValue in
                            UserDefaults.standard.set(newValue, forKey: "isIncomeBasedDailyLimit")
                            dataManager.recalculateAccountingMetrics()
                        }
                    
                    if !dataManager.isIncomeBasedDailyLimit {
                        HStack {
                            Text("每日花費限額")
                            Spacer()
                            TextField("300", value: $dataManager.customDailyLimit, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 80)
                            Text("元")
                                .foregroundColor(.secondary)
                        }
                        .onChange(of: dataManager.customDailyLimit) { _, newValue in
                            UserDefaults.standard.set(newValue, forKey: "customDailyLimit")
                            dataManager.recalculateAccountingMetrics()
                        }
                    } else {
                        HStack {
                            Text("自動限額")
                            Spacer()
                            Text("$\(Int(dataManager.calculateTodayBudget().effectiveLimit)) / 天")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("記帳週期設定")
                }

                Section {
                    TextField("https://xxxx.supabase.co", text: $projectURL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                    
                    SecureField("eyJhbGciOi...", text: $anonKey)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Supabase 憑證設定")
                } footer: {
                    Text("前往 Supabase 控制台 > Project Settings > API 即可複製 Project URL 與 anon public key。")
                }
                
                Section {
                    Button(role: .destructive) {
                        SupabaseConfig.shared.resetToDefaults()
                        projectURL = ""
                        anonKey = ""
                        dataManager.loadInitialData()
                        alertMessage = "已重置為預設雲端設定"
                        showingAlert = true
                    } label: {
                        Text("重置連線設定")
                    }
                }
            }
            .navigationTitle("可樂雲端與 API 中心")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("關閉") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存連線") {
                        saveAndConnect()
                    }
                    .disabled(projectURL.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                projectURL = SupabaseConfig.shared.projectURL
                anonKey = SupabaseConfig.shared.anonPublicKey
                loadVaultFields()
                Task {
                    await apiVault.fetchCloudApiConfigs()
                    loadVaultFields()
                }
            }
            .alert("雲端設定", isPresented: $showingAlert) {
                Button("確定", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingLineBotSheet) {
                LineBotSettingsSheet()
            }
        }
    }
    
    private func loadVaultFields() {
        geminiApiKey = GeminiScheduleOCRService.shared.apiKey.isEmpty
            ? apiVault.value(for: "gemini_api_key")
            : GeminiScheduleOCRService.shared.apiKey
        lineChannelId = LineBotService.shared.channelId.isEmpty
            ? apiVault.value(for: "line_channel_id")
            : LineBotService.shared.channelId
        lineChannelSecret = LineBotService.shared.channelSecret.isEmpty
            ? apiVault.value(for: "line_channel_secret")
            : LineBotService.shared.channelSecret
        lineAccessToken = LineBotService.shared.channelAccessToken.isEmpty
            ? apiVault.value(for: "line_channel_access_token")
            : LineBotService.shared.channelAccessToken
        lineDefaultUserId = LineBotService.shared.userId.isEmpty
            ? apiVault.value(for: "line_default_user_id")
            : LineBotService.shared.userId
    }
    
    private func applyFieldsLocally() {
        GeminiScheduleOCRService.shared.apiKey = geminiApiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        LineBotService.shared.channelId = lineChannelId.trimmingCharacters(in: .whitespacesAndNewlines)
        LineBotService.shared.channelSecret = lineChannelSecret.trimmingCharacters(in: .whitespacesAndNewlines)
        if !lineAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            LineBotService.shared.channelAccessToken = lineAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if !lineDefaultUserId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            LineBotService.shared.userId = lineDefaultUserId.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }
    
    private func copyCloudVaultSql() {
        let sql = """
        CREATE EXTENSION IF NOT EXISTS pg_net;

        CREATE TABLE IF NOT EXISTS public.app_api_configs (
            config_key TEXT PRIMARY KEY,
            config_value TEXT NOT NULL DEFAULT '',
            description TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.app_api_configs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on app_api_configs" ON public.app_api_configs;
        CREATE POLICY "Allow public all access on app_api_configs"
        ON public.app_api_configs FOR ALL TO public USING (true) WITH CHECK (true);

        INSERT INTO public.app_api_configs (config_key, config_value, description)
        VALUES
            ('line_channel_id', '\(lineChannelId)', 'LINE Messaging API Channel ID'),
            ('line_channel_secret', '\(lineChannelSecret)', 'LINE Messaging API Channel Secret'),
            ('line_channel_access_token', '\(lineAccessToken)', 'LINE Messaging API Access Token'),
            ('line_default_user_id', '\(lineDefaultUserId)', 'LINE Default Recipient User ID'),
            ('gemini_api_key', '\(geminiApiKey)', 'Google Gemini Multimodal OCR API Key')
        ON CONFLICT (config_key) DO UPDATE SET
            config_value = CASE WHEN EXCLUDED.config_value <> '' THEN EXCLUDED.config_value ELSE public.app_api_configs.config_value END,
            updated_at = now();

        CREATE TABLE IF NOT EXISTS public.line_followers (
            line_user_id TEXT PRIMARY KEY,
            display_name TEXT DEFAULT 'LINE 好友',
            picture_url TEXT DEFAULT '',
            bound_share_code TEXT DEFAULT '',
            bound_device_id TEXT DEFAULT '',
            is_following BOOLEAN DEFAULT true,
            followed_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.line_followers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on line_followers" ON public.line_followers;
        CREATE POLICY "Allow public all access on line_followers"
        ON public.line_followers FOR ALL TO public USING (true) WITH CHECK (true);

        CREATE TABLE IF NOT EXISTS public.line_bind_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id TEXT NOT NULL,
            share_code TEXT NOT NULL,
            user_name TEXT DEFAULT '我的課表',
            is_claimed BOOLEAN DEFAULT false,
            claimed_line_user_id TEXT DEFAULT '',
            claimed_display_name TEXT DEFAULT '',
            expires_at TIMESTAMPTZ DEFAULT (now() + interval '15 minutes'),
            created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE public.line_bind_sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public all access on line_bind_sessions" ON public.line_bind_sessions;
        CREATE POLICY "Allow public all access on line_bind_sessions"
        ON public.line_bind_sessions FOR ALL TO public USING (true) WITH CHECK (true);

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
        BEGIN
            IF v_clean_uid = '' OR NOT (v_clean_uid LIKE 'U%') THEN
                RETURN jsonb_build_object('ok', false, 'error', 'Invalid LINE user_id');
            END IF;

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

            IF v_clean_code = '' THEN
                SELECT share_code, device_id, user_name INTO v_auto_row
                FROM public.line_bind_sessions
                WHERE is_claimed = false AND expires_at > now()
                ORDER BY created_at DESC LIMIT 1;

                IF FOUND THEN
                    v_clean_code := upper(trim(COALESCE(v_auto_row.share_code, '')));
                    v_clean_dev := trim(COALESCE(v_auto_row.device_id, ''));
                    UPDATE public.line_bind_sessions SET is_claimed = true, claimed_line_user_id = v_clean_uid WHERE share_code = v_auto_row.share_code;
                    UPDATE public.line_followers SET bound_share_code = v_clean_code, bound_device_id = v_clean_dev WHERE line_user_id = v_clean_uid;
                END IF;
            END IF;

            RETURN jsonb_build_object('ok', true, 'line_user_id', v_clean_uid, 'display_name', v_clean_name, 'bound_share_code', v_clean_code);
        END;
        $$;

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
            v_follower RECORD;
        BEGIN
            SELECT * INTO v_follower FROM public.line_followers
            WHERE (v_clean_code <> '' AND upper(bound_share_code) = v_clean_code)
               OR (v_clean_dev <> '' AND bound_device_id = v_clean_dev)
            ORDER BY updated_at DESC LIMIT 1;

            IF NOT FOUND THEN
                SELECT * INTO v_follower FROM public.line_followers
                WHERE is_following = true AND (bound_share_code IS NULL OR bound_share_code = '' OR upper(bound_share_code) = v_clean_code)
                ORDER BY followed_at DESC, updated_at DESC LIMIT 1;
            END IF;

            IF FOUND THEN
                PERFORM public.bind_line_user_to_schedule(v_follower.line_user_id, v_follower.display_name, v_clean_code, v_clean_dev, v_follower.picture_url);
                RETURN jsonb_build_object('ok', true, 'line_user_id', v_follower.line_user_id, 'display_name', v_follower.display_name, 'share_code', v_clean_code);
            END IF;

            RETURN jsonb_build_object('ok', false, 'error', 'No unbound LINE follower found yet');
        END;
        $$;

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
            SELECT config_value INTO v_token FROM public.app_api_configs WHERE config_key = 'line_channel_access_token' LIMIT 1;
            IF v_token IS NULL OR v_token = '' THEN
                SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id = v_resolved_recipient AND channel_access_token <> '' LIMIT 1;
            END IF;
            IF v_token IS NULL OR v_token = '' THEN
                SELECT channel_access_token INTO v_token FROM public.line_bot_settings WHERE user_id NOT LIKE 'SHARE_%' AND user_id <> 'CLOUD_API_VAULT' AND channel_access_token <> '' LIMIT 1;
            END IF;

            IF v_token IS NULL OR v_token = '' THEN
                RETURN jsonb_build_object('ok', false, 'error', 'Missing LINE token in Supabase');
            END IF;

            IF NOT (v_resolved_recipient LIKE 'U%' AND length(v_resolved_recipient) >= 25) THEN
                IF v_resolved_recipient LIKE 'AUTO_%' THEN
                    v_share_code := upper(replace(v_resolved_recipient, 'AUTO_', ''));
                    SELECT line_user_id INTO v_bound_uid FROM public.line_followers WHERE upper(bound_share_code) = v_share_code AND is_following = true ORDER BY updated_at DESC LIMIT 1;
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

            RETURN jsonb_build_object('ok', true, 'relayed_by', 'supabase_pg_net', 'recipient', v_resolved_recipient);
        END;
        $$;

        NOTIFY pgrst, 'reload schema';
        """
        UIPasteboard.general.string = sql
        withAnimation { sqlCopied = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation { sqlCopied = false }
        }
    }
    
    private func saveAndConnect() {
        SupabaseConfig.shared.projectURL = projectURL
        SupabaseConfig.shared.anonPublicKey = anonKey
        applyFieldsLocally()
        Task {
            _ = await apiVault.saveApiConfigsToSupabase(
                lineChannelId: lineChannelId,
                lineChannelSecret: lineChannelSecret,
                lineAccessToken: lineAccessToken,
                lineDefaultUserId: lineDefaultUserId,
                geminiApiKey: geminiApiKey
            )
        }
        dataManager.loadInitialData()
        alertMessage = "設定已儲存！正在連接您的 Supabase 資料庫與雲端 API 保險箱..."
        showingAlert = true
    }
}
