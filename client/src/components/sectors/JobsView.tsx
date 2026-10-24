import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JobRecord } from '../../types/user';
import { ComponentState } from '../../types/common';
import { SectorsService } from '../../services/sectors.service';
import { ComponentStateWrapper } from '../common/ComponentStateWrapper';
import { SectorCockpitLayout, SectorMetric, SectorTabId } from './SectorCockpitLayout';
import { JobsInteriorConsole } from './interior/JobsInteriorConsole';
import { GameAudio } from '../../utils/audio';
import {
  Briefcase,
  DollarSign,
  Award,
  Crown,
  Scale,
} from 'lucide-react';

interface JobsViewProps {
  forcedState?: ComponentState;
  currentJobId?: number;
  onBalanceUpdate?: (newBalance: number) => void;
  onOpenBudget?: () => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ forcedState, currentJobId, onBalanceUpdate, onOpenBudget }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number>(currentJobId ?? user?.current_job_id ?? 1);
  const [activeTab, setActiveTab] = useState<SectorTabId>('overview');

  // Tactical governance & staff state
  const [boardDirectives, setBoardDirectives] = useState<Record<string, boolean>>({
    dir_dividend: true,
    dir_tax: false,
    dir_merger: false,
  });

  const [hiredExecs, setHiredExecs] = useState<Record<string, boolean>>({
    exec_cfo: true,
    exec_counsel: false,
    exec_cso: false,
  });

  const [researchedTech, setResearchedTech] = useState<Record<string, boolean>>({
    tech_boardroom: true,
    tech_jet: false,
    tech_halloffame: false,
  });

  const fetchJobs = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await SectorsService.getJobs();
      setJobs(data);
    } catch {
      setError('تعذر تحميل بيانات المهن وقائمة الوظائف.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApplyJob = (job: JobRecord) => {
    GameAudio.playLevelUpSound();
    setSelectedJobId(job.id);
    showToast('success', 'تم اعتماد الترقية', `تمت ترقيتك إلى منصب ${job.title}. الراتب الجديد: $${job.hourly_salary}/ساعة.`);
  };

  const handleToggleDirective = (dirId: string) => {
    GameAudio.playCashSound();
    setBoardDirectives((prev) => ({ ...prev, [dirId]: !prev[dirId] }));
    showToast('success', 'تم اعتماد قرار مجلس الإدارة', 'سياسة الحوكمة المؤسسية مفعلة الآن بنجاح.');
  };

  const handleToggleExec = (execId: string) => {
    GameAudio.playTapSound();
    setHiredExecs((prev) => ({ ...prev, [execId]: !prev[execId] }));
    showToast('success', 'تم تعيين المسؤول التنفيذي', 'تم تسليم المهام للمسؤول بنجاح.');
  };

  const handleResearchTech = (techId: string) => {
    GameAudio.playTapSound();
    setResearchedTech((prev) => ({ ...prev, [techId]: true }));
    showToast('success', 'تم تدشين صرح الهيبة', 'تمت ترقية مكانة ونفوذ الإمبراطورية بنجاح.');
  };

  const activeJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
  const activeSalary = activeJob?.hourly_salary ?? 25;

  const metrics: SectorMetric[] = [
    {
      label: 'المنصب التنفيذي الحالي',
      value: activeJob ? activeJob.title : 'الرئيس التنفيذي',
      change: `المستوى ${activeJob?.required_level ?? 1}`,
      isPositive: true,
      subtext: 'أعلى مرتبة في الهيكل الإداري',
      icon: <Briefcase className="w-4 h-4 text-pink-400" />,
    },
    {
      label: 'الراتب الإداري بالساعة',
      value: `+$${activeSalary.toLocaleString()}/ساعة`,
      change: 'تدفق نشط',
      isPositive: true,
      subtext: 'تحويل نقدي آلي للخزينة',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'علاوة مجلس الإدارة',
      value: '+25.0% مكافأة',
      change: 'معتمدة',
      isPositive: true,
      subtext: 'مكافآت سنوية وأسهم إدارية',
      icon: <Award className="w-4 h-4 text-amber-300" />,
    },
    {
      label: 'نفوذ الإمبراطورية المالية',
      value: 'مكانة سيادية',
      change: 'سيطرة 100%',
      isPositive: true,
      subtext: 'حق الفيتو في القرارات الكبرى',
      icon: <Crown className="w-4 h-4 text-pink-300" />,
    },
  ];

  const activeState: ComponentState = forcedState ?? (loading ? 'loading' : error ? 'error' : jobs.length === 0 ? 'empty' : 'success');

  return (
    <ComponentStateWrapper state={activeState} errorMessage={error ?? undefined} onRetry={fetchJobs}>
      <SectorCockpitLayout
        sectorId="jobs"
        themeColor="#ec4899"
        titleAr="المقر المالي العام وإدارة المناصب التنفيذية"
        titleEn="Corporate Financial Headquarters"
        statusBadge="مجلس الإدارة والمقر المالي نشط"
        level={activeJob?.required_level ?? 1}
        tier={activeJob?.required_level ?? 1}
        metrics={metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        interiorConsole={<JobsInteriorConsole onBalanceUpdate={onBalanceUpdate} />}
        // Tab 1: Career Ladder
        renderOverview={() => (
          <div className="space-y-6">
            {/* Active Executive Banner */}
            {activeJob && (
              <div className="glass-panel rounded-3xl p-6 border border-pink-500/30 bg-gradient-to-r from-pink-950/25 to-dark-900 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <Crown className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                      المسمى الوظيفي المعتمد في السجل التجاري
                    </span>
                    <h4 className="text-xl font-black font-cairo text-slate-100 mt-0.5">
                      {activeJob.title}
                    </h4>
                    <span className="text-xs font-mono text-emerald-400 block mt-1">
                      الراتب المعتمد: +${activeJob.hourly_salary.toLocaleString()}/ساعة
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenBudget && (
                    <button
                      onClick={onOpenBudget}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-cairo font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <Scale className="w-4 h-4" />
                      <span>الموازنة العامة للدولة</span>
                    </button>
                  )}
                  <span className="px-3.5 py-2 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-mono font-bold">
                    منصب قيادي نشط
                  </span>
                </div>
              </div>
            )}

            {/* Career Ladder Tiers */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-100 font-cairo flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-pink-400" />
                <span>سلم الترقيات والمناصب القيادية العليا ({jobs.length} مناصب)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => {
                  const isActive = job.id === selectedJobId;
                  return (
                    <div
                      key={job.id}
                      className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                        isActive
                          ? 'border-pink-500 bg-pink-950/20 shadow-lg shadow-pink-500/10'
                          : 'border-slate-800 bg-dark-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                            المستوى {job.required_level}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            +${job.hourly_salary}/ساعة
                          </span>
                        </div>
                        <h5 className="text-base font-bold text-slate-100 font-cairo">
                          {job.title}
                        </h5>
                        <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">
                          منصب قيادي يمنح نفوذاً واسعاً وتدفقاً مالياً متزايداً للميزانية.
                        </p>
                      </div>

                      <button
                        onClick={() => handleApplyJob(job)}
                        disabled={isActive}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-pink-500 hover:bg-pink-400 text-dark-950'
                        }`}
                      >
                        {isActive ? 'المنصب المعتمد حالياً' : 'الترقية واستلام المنصب'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        // Tab 2: Boardroom Directives
        renderTactical={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                قرارات مجلس الإدارة والحوكمة المؤسسية
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                إصدار مراسيم حوكمة ملزمة لجميع القطاعات لتحسين تدفق السيولة وحماية الأصول.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'dir_dividend',
                  title: 'إلزام الشركات بتوزيع أرباح ربع سنوية استثنائية',
                  benefit: '+15% سيولة إضافية في الخزينة',
                  requirement: 'موافقة الأغلبية',
                },
                {
                  id: 'dir_tax',
                  title: 'هيكلة الملاذات الضريبية الدولية',
                  benefit: 'إعفاء ضريبي كامل على جميع المعاملات',
                  requirement: 'تأييد المستشار القانوني',
                },
                {
                  id: 'dir_merger',
                  title: 'خطة الاندماج والاستحواذ وحماية الكيان',
                  benefit: 'حماية إمبراطوريتك من هبوط الأسواق المفاجئ',
                  requirement: 'احتياطي سيولة ضخم',
                },
              ].map((dir) => {
                const isEnacted = boardDirectives[dir.id];
                return (
                  <div
                    key={dir.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-pink-400">{dir.benefit}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300">
                          {dir.requirement}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 font-cairo">{dir.title}</h5>
                    </div>

                    <button
                      onClick={() => handleToggleDirective(dir.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold font-cairo transition-all ${
                        isEnacted
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                          : 'bg-pink-500 hover:bg-pink-400 text-dark-950'
                      }`}
                    >
                      {isEnacted ? 'مرسوم سارٍ ومطبق' : 'إصدار القرار التنفيذي'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        // Tab 3: C-Suite Staff
        renderStaff={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                فريق الإدارة التنفيذية العليا
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                تعيين كبار المسؤولين التنفيذيين للإشراف على خزينة الإمبراطورية وشؤونها القانونية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'exec_cfo',
                  name: 'د. فيكتور ستيرلينغ',
                  role: 'الرئيس المالي التنفيذي',
                  effect: 'يرفع عوائد الرواتب والتدفقات بنسبة 25%',
                  cost: 30000,
                },
                {
                  id: 'exec_counsel',
                  name: 'ألكسندرا فوستر',
                  role: 'المستشارة القانونية العامة',
                  effect: 'حماية كاملة من المخالفات والضرائب والرقابة المالية',
                  cost: 45000,
                },
                {
                  id: 'exec_cso',
                  name: 'م. راشد المهيري',
                  role: 'رئيس الاستراتيجية والنمو المؤسسي',
                  effect: 'مضاعفة نقاط الهيبة المكتسبة من جميع الإنجازات',
                  cost: 60000,
                },
              ].map((exec) => {
                const isHired = hiredExecs[exec.id];
                return (
                  <div
                    key={exec.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center font-bold text-base font-cairo">
                        {exec.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-100 font-cairo">{exec.name}</h5>
                        <span className="text-[11px] font-mono text-pink-300 block">{exec.role}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 text-xs font-cairo text-slate-300">
                      {exec.effect}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        {isHired ? 'نشط في الجناح التنفيذي' : `$${exec.cost.toLocaleString()}`}
                      </span>
                      <button
                        onClick={() => handleToggleExec(exec.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isHired
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-pink-500 hover:bg-pink-400 text-dark-950'
                        }`}
                      >
                        {isHired ? 'إنهاء التعاقد' : 'توظيف وتعيين'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        // Tab 4: Prestige R&D
        renderRd={() => (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-100 font-cairo">
                صروح الهيبة والمكانة السيادية
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                أيقونات الفخامة التي تخلّد اسمك في قائمة أعظم أباطرة المال والأعمال.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'tech_boardroom',
                  title: 'قاعة المجلس البانورامية في الطابق 100',
                  desc: 'إطلالة 360 درجة على كامل المدينة تمنح هيبة قصوى وتقدير مضاعف.',
                  cost: 50000,
                },
                {
                  id: 'tech_jet',
                  title: 'أسطول طائرات الأعمال النفاثة الخاصة',
                  desc: 'تنقل فوري بدون أي تأخير لجميع المؤتمرات والقمم الاقتصادية.',
                  cost: 100000,
                },
                {
                  id: 'tech_halloffame',
                  title: 'النصب التذكاري في قاعة مشاهير أثرياء العالم',
                  desc: 'تخليد اسمك كملياردير مؤسس مع شارة ذهبية متوهجة في ملفك الشخصي.',
                  cost: 250000,
                },
              ].map((tech) => {
                const isResearched = researchedTech[tech.id];
                return (
                  <div
                    key={tech.id}
                    className="glass-panel rounded-2xl p-5 border border-slate-800 bg-dark-900/60 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/30 flex items-center justify-center mb-3">
                        <Crown className="w-5 h-5" />
                      </div>
                      <h5 className="text-sm font-bold text-slate-100 font-cairo">{tech.title}</h5>
                      <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">{tech.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {isResearched ? 'صرح قائم' : `$${tech.cost.toLocaleString()}`}
                      </span>
                      <button
                        onClick={() => handleResearchTech(tech.id)}
                        disabled={isResearched}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo transition-all ${
                          isResearched
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 cursor-default'
                            : 'bg-pink-500 hover:bg-pink-400 text-dark-950'
                        }`}
                      >
                        {isResearched ? 'مفعّل بنجاح' : 'تدشين الصرح'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      />
    </ComponentStateWrapper>
  );
};
