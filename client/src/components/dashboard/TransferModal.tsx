import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { TransferService } from '../../services/transfer.service';
import { DailyTransferQuota, SearchUserItem, P2PTransferReceipt } from '../../types/user';
import { ComponentState, ApiStandardError } from '../../types/common';
import {
  Send,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Users,
  Percent,
  Wallet,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onTransferSuccess: (receipt: P2PTransferReceipt) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onTransferSuccess,
}) => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [recipients, setRecipients] = useState<SearchUserItem[]>([]);
  const [quota, setQuota] = useState<DailyTransferQuota | null>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [state, setState] = useState<ComponentState>('success');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<P2PTransferReceipt | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    setState('loading');
    setErrorMsg(null);
    setReceipt(null);

    Promise.all([
      TransferService.getQuota(token),
      TransferService.getRecipients(token),
    ])
      .then(([qData, rData]) => {
        if (!isMounted) return;
        setQuota(qData);
        setRecipients(rData);
        if (rData.length > 0 && rData[0]) {
          setSelectedReceiverId(rData[0].id);
        }
        setState('success');
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const std = err as ApiStandardError;
        setErrorMsg(std.message ?? 'تعذر تحميل سقف التحويلات اليومية.');
        setState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountInput) || 0;
  const feePercent = quota?.fee_percentage ?? 2.5;
  const calculatedFee = Number(((numericAmount * feePercent) / 100).toFixed(2));
  const totalDeduction = Number((numericAmount + calculatedFee).toFixed(2));
  const hasInsufficientFunds = totalDeduction > currentBalance;
  const remainingLimit = quota?.remaining_limit ?? 10000;
  const exceedsDailyLimit = numericAmount > remainingLimit;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token) return;

    if (!selectedReceiverId) {
      setErrorMsg('يرجى اختيار المستثمر المستلم من القائمة.');
      return;
    }
    if (numericAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ تحويل صالح أكبر من $0.00.');
      return;
    }
    if (numericAmount < 1.0) {
      setErrorMsg('الحد الأدنى للتحويل المالي هو $1.00.');
      return;
    }
    if (numericAmount > 5000.0) {
      setErrorMsg('تم تجاوز الحد الأقصى المسموح به للمعاملة الواحدة ($5,000.00).');
      return;
    }
    if (hasInsufficientFunds) {
      setErrorMsg('الرصيد النقدي المتاح غير كافٍ لتغطية مبلغ التحويل ورسوم الشبكة.');
      return;
    }
    if (exceedsDailyLimit) {
      setErrorMsg(`المبلغ يتجاوز السقف اليومي المتبقي لك ($${remainingLimit.toFixed(2)}).`);
      return;
    }

    setState('loading');
    setErrorMsg(null);

    try {
      const result = await TransferService.executeTransfer(
        {
          receiver_id: selectedReceiverId,
          amount: numericAmount,
          note: noteInput.trim() || undefined,
        },
        token
      );

      setReceipt(result);
      setState('success');
      onTransferSuccess(result);
    } catch (err: unknown) {
      setState('error');
      const std = err as ApiStandardError & { code?: string };
      if (std?.code === 'COLLUSION_DETECTED') {
        setErrorMsg('حظر أمني: اكتشفت أنظمة الحماية مشاركة المرسل والمستلم لنفس الجهاز أو الشبكة المحلية.');
      } else if (std?.code === 'PROGRESSION_GATE_LOCKED' || std?.code === 'TRANSFER_LEVEL_LOCKED') {
        setErrorMsg('بوابة التقدم: يجب أن تبلغ المستوى 3 على الأقل لفتح صلاحية التحويلات المالية الخارجية.');
      } else if (std?.code === 'TRANSFERS_FROZEN' || std?.code === 'ACCOUNT_SUSPENDED') {
        setErrorMsg('إشعار الحساب: تم تجميد التحويلات الصادرة لهذا الحساب مؤقتاً لحين انتهاء المراجعة الإدارية.');
      } else if (std?.code === 'SECTOR_DISABLED' || std?.code === 'SECTOR_MAINTENANCE') {
        setErrorMsg('أعمال صيانة: خدمة التحويلات المالية متوقفة مؤقتاً لتحديث الأنظمة المصرفية.');
      } else {
        setErrorMsg(std?.message ?? 'تعذر تنفيذ التحويل بسبب قيود التحقق الأمني.');
      }
    }
  };

  const handleReset = (): void => {
    setReceipt(null);
    setAmountInput('');
    setNoteInput('');
    setErrorMsg(null);
    setState('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/85 backdrop-blur-xl">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-dark-800 p-6 md:p-8 shadow-2xl bg-dark-900/95 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-emerald-glow">
            <Send className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-slate-100 font-cairo">
            {t('transfer_modal_title')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {t('transfer_modal_desc')}
          </p>
        </div>

        {/* Success Receipt View */}
        {receipt ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-emerald-300 font-cairo">
                {t('transfer_success_title')}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {t('transfer_success_desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-950 border border-dark-800 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span className="text-slate-500">{t('transfer_receipt_number')}</span>
                <span className="text-emerald-400 font-bold">#{receipt.transaction_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span className="text-slate-500">{t('transfer_sent_to')}</span>
                <span className="text-slate-200 font-bold">{receipt.receiver_username}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span className="text-slate-500">{t('transfer_amount_label')}</span>
                <span className="text-slate-200 font-bold">${receipt.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span className="text-slate-500">{t('transfer_fee_label')}</span>
                <span className="text-cyan-400 font-bold">${receipt.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-dark-800">
                <span className="text-slate-500">{t('transfer_total_label')}</span>
                <span className="text-red-400 font-bold">-${receipt.total_deducted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">{t('dash_daily_remaining')}</span>
                <span className="text-amber-400 font-bold">${receipt.daily_cap_remaining.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleReset}
                className="w-1/2 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-bold font-cairo border border-dark-700 transition-all"
              >
                إجراء تحويل آخر
              </button>
              <button
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-bold font-cairo shadow-emerald-glow transition-all"
              >
                {t('close')}
              </button>
            </div>
          </div>
        ) : (
          /* Transfer Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Daily Quota Telemetry Meter */}
            {quota && (
              <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800">
                <div className="flex items-center justify-between text-xs mb-1.5 font-cairo">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('dash_daily_limit')}</span>
                  </div>
                  <span className="font-mono text-cyan-300 font-bold">
                    ${quota.transferred_today.toFixed(2)} / ${quota.daily_limit.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-dark-850 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                    style={{
                      width: `${Math.min(100, (quota.transferred_today / quota.daily_limit) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>الحد اليومي: $10,000.00</span>
                  <span className="text-emerald-400">${quota.remaining_limit.toFixed(2)} متبقٍ اليوم</span>
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Recipient Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t('transfer_receiver_label')}
              </label>
              {recipients.length > 0 ? (
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <select
                    id="transfer-receiver-select"
                    value={selectedReceiverId}
                    onChange={(e) => setSelectedReceiverId(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 rounded-xl py-2.5 pr-10 pl-3.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={state === 'loading'}
                  >
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.username} ({r.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs text-slate-400 text-center">
                  {t('no_recipients_found')}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t('transfer_amount_label')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <input
                  id="transfer-amount-input"
                  type="number"
                  step="0.01"
                  min="1"
                  max="5000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={t('transfer_amount_placeholder')}
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl py-2.5 pr-10 pl-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                  disabled={state === 'loading'}
                  required
                />
              </div>
            </div>

            {/* Memo Note Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t('transfer_note_label')}
              </label>
              <input
                id="transfer-note-input"
                type="text"
                maxLength={100}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={t('transfer_note_placeholder')}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                disabled={state === 'loading'}
              />
            </div>

            {/* Real-Time Mathematical Fee Breakdown Preview */}
            <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>{t('transfer_amount_label')}</span>
                <span className="text-slate-200 font-bold">${numericAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1">
                  <Percent className="w-3 h-3 text-cyan-400" />
                  <span>{t('transfer_fee_label')}</span>
                </span>
                <span className="text-cyan-400 font-bold">${calculatedFee.toFixed(2)}</span>
              </div>
              <div className="pt-1.5 border-t border-dark-800 flex justify-between items-center text-sm">
                <span className="text-slate-300 font-bold">{t('transfer_total_label')}</span>
                <span
                  className={`font-black font-mono ${
                    hasInsufficientFunds ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  ${totalDeduction.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="transfer-submit-btn"
              type="submit"
              disabled={state === 'loading' || numericAmount <= 0 || hasInsufficientFunds || exceedsDailyLimit}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-950 font-bold text-xs shadow-emerald-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {state === 'loading' ? (
                <span>{t('transfer_submitting')}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('transfer_submit_btn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
