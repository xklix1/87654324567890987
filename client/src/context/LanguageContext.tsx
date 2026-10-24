import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Direction } from '../types/common';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // App Brand
    app_title: 'سباق الثراء',
    app_subtitle: 'منظومة الألعاب المالية المتعددة اللاعبين',
    app_version: 'الإصدار',

    // Pipeline Steps
    step_network_health: 'فحص اتصال الشبكة بالخادم',
    step_version_check: 'التحقق من بوابة توافق الإصدار',
    step_auth_verification: 'التحقق من الجلسة الأمنية المشفرة',
    step_state_sync: 'مزامنة الحالة وحساب الأرباح غير المتصلة',

    // Pipeline Status
    status_idle: 'قيد الانتظار',
    status_running: 'جاري المعالجة...',
    status_completed: 'مكتمل بنجاح',
    status_failed: 'تعذر التنفيذ',

    // Loading Screen
    splash_initializing: 'تهيئة بيئة التداول الرقمية...',
    splash_progress: 'معدل الإنجاز',
    splash_retry_btn: 'إعادة محاولة الاتصال',
    splash_error_title: 'فشل في دورة التهيئة الأولية',
    splash_error_desc: 'تعذر إكمال بروتوكول المصافحة مع خادم اللعبة. يرجى التحقق من الشبكة وإعادة المحاولة.',
    splash_sim_error: 'محاكاة خطأ الشبكة',
    splash_sim_outdated: 'محاكاة إصدار قديم',

    // Force Update Modal
    update_required_title: 'تحديث أمني إلزامي مطلوب',
    update_required_desc: 'الإصدار الحالي المثبت لديك قديم ولم يعد مدعوماً من الخادم المركزي لضمان سلامة التعاملات المالية المتزامنة.',
    update_current_ver: 'إصدار العميل الحالي:',
    update_min_ver: 'الحد الأدنى المطلوب:',
    update_download_btn: 'تحديث التطبيق الآن (APK)',
    update_restart_btn: 'إعادة فحص الإصدار',

    // Auth Card
    auth_tab_login: 'تسجيل الدخول',
    auth_tab_register: 'إنشاء حساب جديد',
    auth_username_label: 'اسم المستخدم (بالإنجليزي فقط)',
    auth_username_placeholder: 'أدخل اسم المستخدم (e.g. trader_vip)...',
    auth_email_label: 'البريد الإلكتروني المعتمد',
    auth_email_placeholder: 'name@gmail.com أو hotmail.com أو yahoo.com...',
    auth_password_label: 'كلمة المرور المشفرة',
    auth_password_placeholder: '8 خانات تشمل حروفاً وأرقاماً ورمزاً (e.g. Pass@123)...',
    auth_submit_login: 'دخول لمنصة الثراء',
    auth_submit_register: 'إنشاء الحساب وبدء السباق',
    auth_submitting: 'جاري التوثيق والتشفير...',
    auth_welcome_title: 'بوابة المستثمر المالي',
    auth_welcome_desc: 'سجل دخولك أو أنشئ حساباً لبدء منافسة أثرياء المدينة في الوقت الفعلي.',
    auth_starter_bonus: 'رصيد ترحيبي تأسيسي: $1,000.00 فور التسجيل',

    // Dashboard
    dash_total_balance: 'صافي السيولة النقدية',
    dash_active_job: 'الوظيفة الحالية',
    dash_hourly_salary: 'الأجر بالساعة',
    dash_required_lvl: 'المستوى المطلوب',
    dash_offline_earnings: 'أرباح الفترة غير المتصلة',
    dash_recent_transactions: 'سجل التحويلات المالية',
    dash_no_transactions: 'لا توجد حركات مالية مسجلة حتى الآن.',
    dash_sync_btn: 'مزامنة فورية',
    dash_logout_btn: 'تسجيل الخروج',
    dash_synced_just_now: 'تم التحديث للتو',
    dash_offline_accrual_notice: 'تم احتساب العائد التراكمي لساعات الغياب وإيداعه مباشرة في محفظتك المالية.',
    dash_accrued_amount: 'المبلغ المودع:',
    dash_time_elapsed: 'الزمن المنقضي:',
    dash_close_btn: 'متابعة',

    // Phase 2: Anti-Fraud and Transfers
    dash_transfer_btn: 'إرسال حوالة مالية فورية',
    dash_daily_limit: 'سقف التحويلات اليومية',
    dash_daily_remaining: 'المتبقي لليوم (24 ساعة)',
    transfer_modal_title: 'التحويل المالي المباشر والمشفر',
    transfer_modal_desc: 'نظام المعاملات الذرية مع حماية ضد الاحتيال وتأمين الأرصدة عبر القفل على مستوى الصفوف.',
    transfer_receiver_label: 'اختر المستثمر المستلم',
    transfer_receiver_placeholder: 'اختر المستلم من القائمة...',
    transfer_amount_label: 'مبلغ التحويل ($)',
    transfer_amount_placeholder: '0.00',
    transfer_fee_label: 'رسوم العملية (2.5%)',
    transfer_total_label: 'إجمالي الخصم من الرصيد',
    transfer_limit_notice: 'الحد اليومي: $10,000.00 | الحد الأقصى للمعاملة: $5,000.00',
    transfer_submit_btn: 'تنفيذ التحويل الفوري',
    transfer_submitting: 'جاري تنفيذ القفل والتحويل الذري...',
    transfer_success_title: 'اكتمل التحويل البنكي بنجاح',
    transfer_success_desc: 'تم خصم المبلغ والرسوم وتأكيد الإيداع في حساب المستلم في نفس اللحظة.',
    transfer_receipt_number: 'رقم الإشعار المالي:',
    transfer_sent_to: 'المستلم:',
    transfer_note_label: 'ملاحظة المعاملة (اختياري)',
    transfer_note_placeholder: 'سبب التحويل أو مذكرة الاستثمار...',
    no_recipients_found: 'لا يوجد مستثمرون آخرون متاحون حالياً.',

    // Component 4-States Inspector
    state_inspector_title: 'مفتش الحالات الأربعة للعناصر',
    state_loading: 'حالة التحميل',
    state_error: 'حالة الخطأ',
    state_empty: 'حالة الفراغ',
    state_success: 'حالة النجاح',
    state_force_update: 'بوابة الإصدار الإلزامي',
    state_normal_mode: 'الوضع الطبيعي للتهيئة',

    // Sector & Navigation Tabs
    nav_overview: 'نظرة عامة',
    nav_jobs: 'الوظائف والمهن',
    nav_stocks: 'سوق الأسهم',
    nav_real_estate: 'العقارات والمشاريع',
    nav_dealership: 'معرض السيارات',
    nav_airport: 'إمبراطورية الطيران',
    nav_factory: 'المصانع وخطوط الإنتاج',
    nav_farm: 'المزارع الزراعية',
    nav_logistics: 'الشحن والاستيراد',
    nav_crypto: 'تعدين العملات الرقمية',
    nav_leaderboard: 'قائمة الأثرياء',
    nav_chat: 'غرفة المحادثات',
    nav_profile: 'الملف الاستثماري',
    nav_achievements: 'الإنجازات والجوائز',

    // Sector Actions & Labels
    action_buy: 'شراء',
    action_sell: 'بيع',
    action_upgrade: 'ترقية',
    action_dispatch: 'إطلاق الرحلة',
    action_land: 'هبوط وتحصيل العائد',
    action_plant: 'زراعة المحصول',
    action_harvest: 'حصاد وبيع',
    action_claim_reward: 'استلام المكافأة',
    action_mine: 'تعدين',
    action_order: 'طلب مركبة',
    action_produce: 'بدء دورة الإنتاج',
    action_send_msg: 'إرسال',
    action_faucet: 'طلب دعم تمويلي ($50,000)',
    action_tick: 'تسريع تدفق الاقتصاد (ساعة واحدة)',

    // Metric Labels
    metric_net_worth: 'صافي الثروة الشاملة',
    metric_liquid_cash: 'السيولة النقدية',
    metric_total_assets: 'قيمة الأصول الاستثمارية',
    metric_hourly_yield: 'العائد الساعي التقديري',
    metric_prestige_title: 'اللقب الاستثماري',
    metric_player_level: 'المستوى الاستثماري',
    metric_rank: 'الترتيب العالمي',

    // Common
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    refresh: 'تحديث',
    system_connected: 'الخادم متصل',
    system_disconnected: 'الخادم غير متاح',
    socket_connected: 'البث الحي متصل',
    socket_disconnected: 'البث الحي منقطع',
  },
  en: {
    // App Brand
    app_title: 'Wealth Race',
    app_subtitle: 'Real-Time Multiplayer Financial Tycoon',
    app_version: 'Version',

    // Pipeline Steps
    step_network_health: 'Verify Server Network Health',
    step_version_check: 'Version Gatekeeping Verification',
    step_auth_verification: 'Encrypted Session Token Validation',
    step_state_sync: 'State Synchronization & Offline Salary Accrual',

    // Pipeline Status
    status_idle: 'Pending',
    status_running: 'Processing...',
    status_completed: 'Completed',
    status_failed: 'Failed',

    // Loading Screen
    splash_initializing: 'Initializing Financial Trading Engine...',
    splash_progress: 'Pipeline Progress',
    splash_retry_btn: 'Retry Connection Protocol',
    splash_error_title: 'Initialization Pipeline Failure',
    splash_error_desc: 'Could not complete the handshake protocol with the backend server. Please verify your connection and retry.',
    splash_sim_error: 'Simulate Network Error',
    splash_sim_outdated: 'Simulate Outdated Client',

    // Force Update Modal
    update_required_title: 'Mandatory Security Update Required',
    update_required_desc: 'Your installed client version is deprecated and no longer supported by the central server to protect multiplayer transaction integrity.',
    update_current_ver: 'Current Client Version:',
    update_min_ver: 'Minimum Supported Version:',
    update_download_btn: 'Download Update (APK)',
    update_restart_btn: 'Recheck Version',

    // Auth Card
    auth_tab_login: 'Sign In',
    auth_tab_register: 'Create Account',
    auth_username_label: 'Trader Username (English Only)',
    auth_username_placeholder: 'Enter username (e.g. trader_vip)...',
    auth_email_label: 'Verified Email',
    auth_email_placeholder: 'name@gmail.com, hotmail.com, or yahoo.com...',
    auth_password_label: 'Master Password',
    auth_password_placeholder: '8+ chars with letters, numbers, and symbol...',
    auth_submit_login: 'Enter Trading Dashboard',
    auth_submit_register: 'Start Wealth Journey',
    auth_submitting: 'Authenticating Credentials...',
    auth_welcome_title: 'Tycoon Investor Portal',
    auth_welcome_desc: 'Sign in or register to compete with city tycoons in real-time.',
    auth_starter_bonus: 'Starter Capital: $1,000.00 upon registration',

    // Dashboard
    dash_total_balance: 'Liquid Cash Balance',
    dash_active_job: 'Current Position',
    dash_hourly_salary: 'Hourly Rate',
    dash_required_lvl: 'Required Level',
    dash_offline_earnings: 'Offline Accrued Earnings',
    dash_recent_transactions: 'Financial Ledger',
    dash_no_transactions: 'No transaction records found.',
    dash_sync_btn: 'Sync State',
    dash_logout_btn: 'Log Out',
    dash_synced_just_now: 'Synchronized Just Now',
    dash_offline_accrual_notice: 'Offline earnings for elapsed hours have been accrued and deposited into your vault.',
    dash_accrued_amount: 'Accrued Amount:',
    dash_time_elapsed: 'Elapsed Time:',
    dash_close_btn: 'Acknowledge',

    // Phase 2: Anti-Fraud and Transfers
    dash_transfer_btn: 'Send P2P Transfer',
    dash_daily_limit: '24-Hour Transfer Limit',
    dash_daily_remaining: 'Remaining Today (24h)',
    transfer_modal_title: 'P2P Encrypted Money Transfer',
    transfer_modal_desc: 'Atomic financial transaction protected with anti-fraud engine and row-level locking.',
    transfer_receiver_label: 'Select Recipient Trader',
    transfer_receiver_placeholder: 'Select recipient trader...',
    transfer_amount_label: 'Transfer Amount ($)',
    transfer_amount_placeholder: '0.00',
    transfer_fee_label: 'Network Fee (2.5%)',
    transfer_total_label: 'Total Liquid Deduction',
    transfer_limit_notice: 'Daily Cap: $10,000.00 | Single Transaction Max: $5,000.00',
    transfer_submit_btn: 'Execute Atomic Transfer',
    transfer_submitting: 'Locking rows & executing transfer...',
    transfer_success_title: 'Transfer Executed Successfully',
    transfer_success_desc: 'Funds and fee deducted atomically; recipient credited instantly.',
    transfer_receipt_number: 'Receipt Number:',
    transfer_sent_to: 'Recipient:',
    transfer_note_label: 'Transaction Memo (Optional)',
    transfer_note_placeholder: 'Investment note or transfer memo...',
    no_recipients_found: 'No other registered traders found yet.',

    // Component 4-States Inspector
    state_inspector_title: '4-State Component Coverage Inspector',
    state_loading: 'Loading State',
    state_error: 'Error State',
    state_empty: 'Empty State',
    state_success: 'Success State',
    state_force_update: 'Force Update Gateway',
    state_normal_mode: 'Pipeline Normal Mode',

    // Sector & Navigation Tabs
    nav_overview: 'Overview',
    nav_jobs: 'Careers & Jobs',
    nav_stocks: 'Stock Market',
    nav_real_estate: 'Real Estate',
    nav_dealership: 'Car Dealership',
    nav_airport: 'Airport Fleet',
    nav_factory: 'Industrial Factories',
    nav_farm: 'Agri Farms',
    nav_logistics: 'Maritime Logistics',
    nav_crypto: 'Crypto Mining',
    nav_leaderboard: 'Rich List',
    nav_chat: 'Live Chat',
    nav_profile: 'Tycoon Profile',
    nav_achievements: 'Achievements',

    // Sector Actions & Labels
    action_buy: 'Buy',
    action_sell: 'Sell',
    action_upgrade: 'Upgrade',
    action_dispatch: 'Dispatch Flight',
    action_land: 'Land & Collect Revenue',
    action_plant: 'Plant Crops',
    action_harvest: 'Harvest & Sell',
    action_claim_reward: 'Claim Reward',
    action_mine: 'Mine',
    action_order: 'Order Vehicle',
    action_produce: 'Start Production Run',
    action_send_msg: 'Send',
    action_faucet: 'Claim Grant ($50,000)',
    action_tick: 'Accelerate Economy (1 Hour)',

    // Metric Labels
    metric_net_worth: 'Aggregated Net Worth',
    metric_liquid_cash: 'Liquid Cash',
    metric_total_assets: 'Total Asset Valuation',
    metric_hourly_yield: 'Estimated Hourly Yield',
    metric_prestige_title: 'Prestige Title',
    metric_player_level: 'Investor Level',
    metric_rank: 'Global Rank',

    // Common
    retry: 'Retry',
    close: 'Close',
    refresh: 'Refresh',
    system_connected: 'Connected',
    system_disconnected: 'Disconnected',
    socket_connected: 'Live Socket Active',
    socket_disconnected: 'Live Socket Inactive',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (lang: Language): void => {
    setLanguageState(lang);
  };

  const toggleLanguage = (): void => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string): string => {
    const langDict = translations[language];
    if (langDict && key in langDict) {
      return langDict[key] ?? key;
    }
    const fallbackDict = translations['en'];
    return (fallbackDict && fallbackDict[key]) ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
