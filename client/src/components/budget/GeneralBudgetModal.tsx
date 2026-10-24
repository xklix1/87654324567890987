import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SectorsService } from '../../services/sectors.service';
import { BudgetStatement, BudgetPolicyKey } from '../../types/budget';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Briefcase,
  DollarSign,
  PiggyBank,
  X,
  RefreshCw,
  Sliders,
  Building,
  Factory,
  Wheat,
  Car,
  Plane,
  Cpu,
  LineChart,
} from 'lucide-react';

interface GeneralBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const GeneralBudgetModal: React.FC<GeneralBudgetModalProps> = ({
  isOpen,
  onClose,
  onBalanceUpdated,
}) => {
  const { token } = useAuth();
  const [statement, setStatement] = useState<BudgetStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [showWithdrawInput, setShowWithdrawInput] = useState<boolean>(false);

  const fetchStatement = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await SectorsService.getBudgetStatement(token);
      setStatement(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تحميل بيانات الموازنة العامة');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchStatement();
    }
  }, [isOpen, fetchStatement]);

  const handleTogglePolicy = async (policyKey: BudgetPolicyKey) => {
    if (!token || actionLoading) return;
    try {
      setActionLoading(policyKey);
      const res = await SectorsService.toggleBudgetPolicy(token, policyKey);
      setStatement(res.statement);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل تغيير السياسة المالية');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawReserve = async () => {
    if (!token || actionLoading || !withdrawAmount) return;
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      setActionLoading('WITHDRAW');
      const res = await SectorsService.withdrawEmergencyReserve(token, amountNum);
      setStatement(res.statement);
      if (onBalanceUpdated) {
        onBalanceUpdated(res.newBalance);
      }
      setWithdrawAmount('');
      setShowWithdrawInput(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل سحب السيولة من صندوق الطوارئ');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const getSectorIcon = (sectorId: string) => {
    switch (sectorId) {
      case 'jobs':
        return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'real_estate':
        return <Building className="w-4 h-4 text-emerald-400" />;
      case 'factories':
        return <Factory className="w-4 h-4 text-orange-400" />;
      case 'farms':
        return <Wheat className="w-4 h-4 text-green-400" />;
      case 'dealership':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'aviation':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'crypto':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'stocks':
        return <LineChart className="w-4 h-4 text-blue-400" />;
      default:
        return <Scale className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden font-cairo"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 text-amber-400">
              <Scale className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  الموازنة العامة للدولة المصغرة وإمبراطورية الأعمال
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  بث لحظي معتمد
                </span>
              </div>
              <p className="text-xs text-slate-400">
                التحليل المالي الشامل للتدفقات الساعية، الرسوم التشغيلية، وقرارات السياسة الاقتصادية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatement}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="تحديث الأرقام"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Maintenance Freeze Safety Alert */}
          {statement?.is_in_freeze ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-300 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-rose-200">
                  حالة تجميد الصيانة الآمن (Maintenance Freeze) نشطة!
                </p>
                <p className="text-xs text-rose-300/90 mt-1">
                  نظراً لنفاد السيولة النقدية، تم تجميد الرسوم التشغيلية والإنتاج التلقائي مؤقتاً لحماية أصولك وممتلكاتك من أي مصادرة. يمكنك فك التجميد واستئناف الأرباح فور تحقيق أي دخل نقدي جديد.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <span>حالة الموازنة العامة: <strong>مستقرة ونشطة بالكامل</strong> (الأصول محمية من العجز)</span>
              </div>
              <span className="text-slate-400">
                شريحة الضريبة السيادية: <strong className="text-amber-400">%{statement?.tax_bracket_percentage || 0.5}</strong>
              </span>
            </div>
          )}

          {/* 4 Main Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Inflow */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">إجمالي الإيراد الساعي</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                +${statement?.total_hourly_inflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">لكل ساعة تدفق تلقائي</div>
            </div>

            {/* Total Outflow */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-rose-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">إجمالي المصروف والضرائب</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
                -${statement?.total_hourly_outflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">صيانة + ضرائب + مرافق</div>
            </div>

            {/* Net Hourly Profit */}
            <div className={`p-4 rounded-xl border relative overflow-hidden transition ${
              (statement?.net_hourly_flow || 0) >= 0
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">صافي التدفق الساعي</span>
                <DollarSign className={`w-4 h-4 ${(statement?.net_hourly_flow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${
                (statement?.net_hourly_flow || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {(statement?.net_hourly_flow || 0) >= 0 ? '+' : ''}$
                {statement?.net_hourly_flow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">صافي الأرباح المودعة/ساعة</div>
            </div>

            {/* Operating Margin */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">هامش الربح التشغيلي</span>
                <Sliders className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                %{statement?.net_operating_margin || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">كفاءة الأداء المالي</div>
            </div>
          </div>

          {/* Interactive Fiscal Policy Levers */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-800/70 to-slate-900/80 border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>قرارات السياسة الاقتصادية وإدارة الأزمات (Fiscal Policy Levers)</span>
              </div>
              <span className="text-xs text-amber-300/80">تحديث فوري للقواعد المالية</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. Eco Mode Lever */}
              <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                statement?.policies.eco_mode
                  ? 'bg-emerald-950/30 border-emerald-500/50'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      وضع الترشيد البيئي (Eco-Mode)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      statement?.policies.eco_mode
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {statement?.policies.eco_mode ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يخفض تكاليف الصيانة والكهرباء بنسبة <strong>-25%</strong> مقابل تخفيض طفيف <strong>-8%</strong> في الإنتاج الآلي.
                  </p>
                </div>

                <button
                  onClick={() => handleTogglePolicy('ECO_MODE')}
                  disabled={actionLoading !== null}
                  className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    statement?.policies.eco_mode
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {actionLoading === 'ECO_MODE' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : statement?.policies.eco_mode ? (
                    'إلغاء وضع الترشيد'
                  ) : (
                    'تفعيل وضع الترشيد'
                  )}
                </button>
              </div>

              {/* 2. Tax Advisor Lever */}
              <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                statement?.policies.tax_advisor
                  ? 'bg-blue-950/30 border-blue-500/50'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      المستشار الضريبي المؤسسي
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      statement?.policies.tax_advisor
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {statement?.policies.tax_advisor ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يخفض الضرائب العقارية والتجارية بنسبة <strong>-15%</strong> مقابل أتعاب استشارية ثابتة <strong>$350/ساعة</strong>.
                  </p>
                </div>

                <button
                  onClick={() => handleTogglePolicy('TAX_ADVISOR')}
                  disabled={actionLoading !== null}
                  className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    statement?.policies.tax_advisor
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {actionLoading === 'TAX_ADVISOR' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : statement?.policies.tax_advisor ? (
                    'إنهاء عقد المستشار'
                  ) : (
                    'تعيين المستشار الضريبي'
                  )}
                </button>
              </div>

              {/* 3. Emergency Buffer Lever */}
              <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                statement?.policies.emergency_buffer
                  ? 'bg-amber-950/30 border-amber-500/50'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      <PiggyBank className="w-4 h-4 text-amber-400" />
                      صندوق التحوط والطوارئ
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      statement?.policies.emergency_buffer
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {statement?.policies.emergency_buffer ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يحجز <strong>%10</strong> من صافي الأرباح في خزنة مصرفية آمنة لا تسحب منها فواتير الصيانة تلقائياً.
                  </p>
                  <div className="mt-2 text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span>الرصيد المحمي:</span>
                    <span>${statement?.emergency_reserve_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => handleTogglePolicy('EMERGENCY_BUFFER')}
                    disabled={actionLoading !== null}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      statement?.policies.emergency_buffer
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {actionLoading === 'EMERGENCY_BUFFER' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : statement?.policies.emergency_buffer ? (
                      'إيقاف الاستقطاع'
                    ) : (
                      'تفعيل الصندوق'
                    )}
                  </button>

                  {(statement?.emergency_reserve_balance || 0) > 0 && (
                    <div>
                      {showWithdrawInput ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="المبلغ المراد سحبه"
                            className="w-full text-xs bg-slate-900 border border-amber-500/40 rounded px-2 py-1 text-white"
                          />
                          <button
                            onClick={handleWithdrawReserve}
                            disabled={actionLoading === 'WITHDRAW' || !withdrawAmount}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded font-bold"
                          >
                            تأكيد
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowWithdrawInput(true)}
                          className="w-full py-1 px-2 text-[11px] text-amber-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700 transition"
                        >
                          تحويل السيولة المحمية للحساب
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sector-by-Sector Cashflow Breakdown Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <span>قائمة الدخل وتفصيل التدفقات حسب القطاع (Sector P&L Breakdown)</span>
              </h3>
              <span className="text-xs text-slate-400">8 قطاعات أعمال مؤتمتة</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">القطاع الاستثماري</th>
                      <th className="py-3 px-3 font-bold text-emerald-400">الإيراد الساعي</th>
                      <th className="py-3 px-3 font-bold text-slate-400">الصيانة</th>
                      <th className="py-3 px-3 font-bold text-slate-400">الضرائب والمرافق</th>
                      <th className="py-3 px-3 font-bold text-white">صافي الربح/ساعة</th>
                      <th className="py-3 px-4 font-bold text-center">هامش التشغيل %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {statement?.sectors.map((sec) => (
                      <tr key={sec.sector_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          {getSectorIcon(sec.sector_id)}
                          <span>{sec.name}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          +${sec.inflow_hourly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          -${sec.maintenance_hourly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          -${(sec.tax_hourly + sec.utilities_hourly).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-3 font-black ${
                          sec.net_hourly >= 0 ? 'text-emerald-300' : 'text-rose-400'
                        }`}>
                          {sec.net_hourly >= 0 ? '+' : ''}${sec.net_hourly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            sec.operating_margin >= 60
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : sec.operating_margin >= 30
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            %{sec.operating_margin}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs text-slate-400">
            آخر تحديث معتمد للموازنة: {new Date(statement?.last_calculated_at || Date.now()).toLocaleTimeString('ar-EG')}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition"
          >
            إغلاق الموازنة العامة
          </button>
        </div>
      </div>
    </div>
  );
};
