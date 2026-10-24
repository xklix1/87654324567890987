import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ComponentState, ApiStandardError } from '../../types/common';
import { Lock, User, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthCardProps {
  onSuccess: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [state, setState] = useState<ComponentState>('success');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validation rules
  const isEnglishOnlyUsername = /^[a-zA-Z0-9_]+$/.test(username);
  const isUsernameValidLength = username.length >= 3 && username.length <= 30;
  const isUsernameValid = isEnglishOnlyUsername && isUsernameValidLength;

  const isEmailAllowed = /^[^@\s]+@(gmail\.com|hotmail\.com|yahoo\.(com|[a-z]{2}))$/i.test(email.trim());

  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9\s]/.test(password);
  const isPasswordValid = hasMinLength && hasLetters && hasNumbers && hasSymbols;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'login') {
      if (!username.trim() || !password.trim()) {
        setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور للمتابعة.');
        return;
      }

      setState('loading');
      try {
        await login({ username: username.trim(), password: password.trim() });
        setState('success');
        onSuccess();
      } catch (err: unknown) {
        setState('error');
        const standardErr = err as ApiStandardError;
        setErrorMsg(standardErr?.message ?? 'فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.');
      }
      return;
    }

    // Register mode validations
    if (!username.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم.');
      return;
    }

    if (!isEnglishOnlyUsername) {
      setErrorMsg('اسم المستخدم يجب أن يكون باللغة الإنجليزية فقط (أحرف A-Z وأرقام _ وبدون حروف عربية أو مسافات).');
      return;
    }

    if (!isUsernameValidLength) {
      setErrorMsg('اسم المستخدم يجب أن يتراوح طوله بين 3 إلى 30 خانة.');
      return;
    }

    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    if (!isEmailAllowed) {
      setErrorMsg('البريد الإلكتروني غير مقبول. النظام يقبل فقط حسابات: Gmail (@gmail.com) أو Hotmail (@hotmail.com) أو Yahoo (@yahoo.com).');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('كلمة المرور غير مطابقة للشروط: يجب أن تكون 8 خانات على الأقل وتحتوي على حروف وأرقام ورمز خاص واحد على الأقل.');
      return;
    }

    setState('loading');
    try {
      await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      setState('success');
      onSuccess();
    } catch (err: unknown) {
      setState('error');
      const standardErr = err as ApiStandardError;
      setErrorMsg(standardErr?.message ?? 'فشل إنشاء الحساب. يرجى التأكد من البيانات والمحاولة مجدداً.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="glass-panel rounded-2xl border border-dark-800 p-6 md:p-8 shadow-2xl bg-dark-900/90 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-emerald-glow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-100 font-cairo">
            {t('auth_welcome_title')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('auth_welcome_desc')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-dark-950 border border-dark-800 mb-6">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setState('success');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-emerald-500 text-dark-950 shadow-emerald-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('auth_tab_login')}
          </button>
          <button
            id="auth-tab-register"
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              setState('success');
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-emerald-500 text-dark-950 shadow-emerald-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('auth_tab_register')}
          </button>
        </div>

        {/* Starter Bonus Banner for Registration */}
        {mode === 'register' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mb-5 font-medium">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{t('auth_starter_bonus')}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                {t('auth_username_label')}
              </label>
              {mode === 'register' && (
                <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  English Only
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="auth-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth_username_placeholder')}
                className={`w-full bg-dark-950 border rounded-xl py-2.5 pr-10 pl-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
                  mode === 'register' && username.length > 0
                    ? isUsernameValid
                      ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-dark-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
                disabled={state === 'loading'}
                autoComplete="username"
                dir="ltr"
                required
              />
            </div>
            {mode === 'register' && username.length > 0 && !isUsernameValid && (
              <p className="text-[11px] text-red-400 mt-1">
                {!isEnglishOnlyUsername
                  ? 'يجب أن يحتوي الاسم على أحرف إنجليزية فقط وبدون مسافات أو رموز خاصة.'
                  : 'الطول المطلوب بين 3 و 30 حرفاً.'}
              </p>
            )}
          </div>

          {/* Email Input (Register only) */}
          {mode === 'register' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  {t('auth_email_label')}
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Gmail</span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Hotmail</span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Yahoo</span>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth_email_placeholder')}
                  className={`w-full bg-dark-950 border rounded-xl py-2.5 pr-10 pl-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
                    email.length > 0
                      ? isEmailAllowed
                        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        : 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-dark-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  }`}
                  disabled={state === 'loading'}
                  autoComplete="email"
                  dir="ltr"
                  required
                />
              </div>
              {email.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {isEmailAllowed ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 inline" />
                      نطاق البريد معتمد ومقبول
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      يقبل فقط: @gmail.com أو @hotmail.com أو @yahoo.com
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('auth_password_label')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth_password_placeholder')}
                className={`w-full bg-dark-950 border rounded-xl py-2.5 pr-10 pl-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
                  mode === 'register' && password.length > 0
                    ? isPasswordValid
                      ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-dark-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    : 'border-dark-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
                disabled={state === 'loading'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                dir="ltr"
                required
              />
            </div>

            {/* Password Validation Checklist in Register Mode */}
            {mode === 'register' && (
              <div className="mt-2.5 p-3 rounded-xl bg-dark-950/70 border border-dark-800 space-y-1.5 text-[11px]">
                <div className="text-slate-400 font-semibold mb-1">شروط أمان كلمة المرور:</div>
                <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>8 خانات على الأقل</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors ${hasLetters ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLetters ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>يحتوي على حروف إنجليزية (A-Z, a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors ${hasNumbers ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumbers ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>يحتوي على أرقام (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors ${hasSymbols ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasSymbols ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>يحتوي على رمز خاص واحد على الأقل (مثال: @, #, $, !, %)</span>
                </div>
              </div>
            )}
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={state === 'loading'}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-bold text-xs shadow-emerald-glow transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {state === 'loading' ? (
              <span>{t('auth_submitting')}</span>
            ) : (
              <>
                <span>{mode === 'login' ? t('auth_submit_login') : t('auth_submit_register')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

