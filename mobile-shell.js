/* =========================================================================
   طبقة عرض للجوال فقط — لا تُحمَّل ولا تعمل إطلاقاً على الكمبيوتر
   تعتمد على صنف html.is-mobile الذي يحدده سكريبت الكشف في رأس الصفحة.
   لا تغيّر منطق الأعمال: تستدعي دوال النظام الحالية كما هي.
   ========================================================================= */
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('is-mobile')) return;

    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const BAR_SELECTOR = '#mobile-bottom-nav';
    const ADMIN_ID = 'admin-screen';
    const SETTINGS_BACKUP_VIEW = 'desktop';

/* ------------------------- هوية الزجاج: أزرق · أسود · رصاصي · أبيض -------------------------
   كل قاعدة تبدأ بـ html.is-mobile: لا يصل شيء منها إلى نسخة الكمبيوتر.
   متغيرات النظام (--gold وغيرها) تُعاد تعريفها هنا على وسم html، فتتلوّن كل
   reference في index.html و style.css تلقائياً بلا لمس أي ملف مشترك.            */
    const CSS = `
html.is-mobile {
    --m-bg: #04060a;
    --m-card: #0b111b;
    --m-card2: #121a26;
    --m-text: #eef4ff;
    --m-ink: #eef4ff;
    --m-muted: #93a6bd;
    --m-faint: #62778f;
    --m-line: rgba(150,190,235,.15);
    --m-hair: rgba(255,255,255,.07);
    --m-accent: #4da3ff;
    --m-accent2: #86dcff;
    --m-deep: #1d5c9e;
    --m-glass-bg: rgba(10,16,26,.66);
    --m-glass: linear-gradient(158deg, rgba(255,255,255,.085) 0%, rgba(255,255,255,.018) 46%, rgba(255,255,255,.05) 100%);
    --m-sheen: radial-gradient(125% 62% at 50% -22%, rgba(255,255,255,.20), rgba(255,255,255,0) 62%);
    --m-edge: rgba(255,255,255,.11);
    --m-edge-hi: rgba(255,255,255,.26);
    --m-lift: 0 14px 34px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.17), inset 0 0 0 1px rgba(255,255,255,.05);
    /* الهندسة: وجه مشطوف للوحات الكبيرة، وصحن ثماني للأيقونات، وخدش زجاجي مائل */
    --m-facet: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
    --m-facet-xl: polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px);
    --m-facet-sm: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
    --m-plate: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
    --m-etch: repeating-linear-gradient(122deg, rgba(255,255,255,.055) 0 1px, transparent 1px 13px);
    --m-gold: #4da3ff;
    --m-gold-soft: rgba(77,163,255,.14);
    --m-green: #3ddc97;
    --m-red: #ff5d6c;
    --m-blue: #4da3ff;
    --m-radius-card: 20px;
    --m-radius-sheet: 26px;
    --m-radius-bar: 26px;
    --m-radius-pill: 19px;
    --m-radius-grain: 99px;
    --m-ease: cubic-bezier(.22,.9,.24,1);
    --m-ease-out: cubic-bezier(.16,1,.3,1);
    --m-bar-h: 64px;
    --m-kb: 0px;
    --m-n: 1;
    color-scheme: dark;

    --gold: #4da3ff;
    --gold-gradient: linear-gradient(135deg, #e4f3ff 0%, #4da3ff 52%, #1d5c9e 100%);
    --black-bg: #04060a;
    --dark-gray: #0c121c;
    --light-gray: #223047;
    --text-white: #f2f7ff;
    --text-gray: #93a6bd;
    --blue-electronic: #86dcff;
    --green-success: #3ddc97;
    --red-danger: #ff5d6c;
}

html.is-mobile { height: 100%; overflow: hidden; overscroll-behavior: none; }

/* المستند مثبّت لا يُتمرَّر: في safari هذا هو السبب الوحيد الذي يحرّك العناصر
   المثبتة — المستند يرتد بالمط عند نهاية السحب وشريط العنوان ينكمش فيعيد حساب
   الأسفل. بتثبيت body يبقى الشريط في مكانه، وكل تمرير يحدث داخل اللوحات وحدها. */
html.is-mobile body {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
    background: var(--m-bg);
    color: var(--m-text);
    font-family: -apple-system, "SF Arabic", "Segoe UI", Cairo, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    margin: 0;
}

/* مشهد الخلفية: أسود أزرق عميق مع حقل هندسي محفور — شبكة خطوط شعرية بميلين،
   وضوء علني باهت من طرف الزجاج. لا هالات ولا توهّج: الفخامة من الطبقات والحواف.
   الطبقتان مثبّتان خارج مسار التمرير فلا تُعاد رسمتهما أي حركة. */
html.is-mobile body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background:
        repeating-linear-gradient(122deg, rgba(174,210,245,.045) 0 1px, transparent 1px 96px),
        repeating-linear-gradient(58deg, rgba(174,210,245,.032) 0 1px, transparent 1px 96px),
        linear-gradient(180deg, rgba(196,226,255,.07) 0, rgba(196,226,255,0) 34%),
        linear-gradient(180deg, #070b12 0%, #05070c 46%, #080e18 100%);
}
/* شريط ضوء زجاجي ينزلق على الحقل ببطء: انكسار، لا إشعاع */
html.is-mobile body::after {
    content: "";
    position: fixed;
    inset: -20%;
    z-index: -1;
    pointer-events: none;
    opacity: .5;
    will-change: transform;
    background: linear-gradient(104deg,
        transparent 38%,
        rgba(180,214,248,.055) 46%,
        rgba(232,244,255,.085) 50%,
        rgba(180,214,248,.055) 54%,
        transparent 62%);
    animation: mSilk 26s var(--m-ease) infinite alternate;
}
@keyframes mSilk { from { transform: translate3d(-16%, -8%, 0); } to { transform: translate3d(16%, 8%, 0); } }

html.is-mobile .screen { height: 100%; }
html.is-mobile #pos-screen.active-screen,
html.is-mobile #main-screen.active-screen {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
}

html.is-mobile #admin-screen.active-screen {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: 720px !important;
    margin-inline: auto;
    height: 100%;
    overflow: hidden;
    padding-top: env(safe-area-inset-top);
}

html.is-mobile .admin-sidebar { display: none; }

/* الارتفاع يُقسم بعد الترويسة: لو بقيت الحاوية على 100% من الشاشة فإن آخر الصفحة
   يقع تحت الشريط السفلي ولا يصل إليه التمرير (سبب نقص صفحة المزيد). */
html.is-mobile .admin-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: auto;
}
html.is-mobile .admin-content {
    position: relative;
    flex: 1;
    min-height: 0;
    height: auto;
    padding: 0;
    overflow: hidden;
}

/* ------------------------- الترويسة: زجاج مثبت ------------------------- */
html.is-mobile .m-head {
    position: relative;
    z-index: 6;
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px 10px;
    border-bottom: 1px solid var(--m-hair);
    background: linear-gradient(180deg, rgba(9,14,23,.94), rgba(9,14,23,.80));
    -webkit-backdrop-filter: blur(18px) saturate(150%);
    backdrop-filter: blur(18px) saturate(150%);
    box-shadow: 0 10px 26px rgba(0,0,0,.42);
    /* الترويسة مثبتة: السحب عليها لا يحرك المستند */
    touch-action: none;
}
html.is-mobile .m-head:empty { display: none; }
html.is-mobile .m-head::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -1px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(226,240,255,.42), transparent);
}
/* اللوغو: معدن مصلّى — تدرّج من أبيض ثلجي إلى فضّي ازرقاق بلا أي هالة خلف الحروف
   (text-shadow مع background-clip:text يظهر ورائها كتوهّج، فحُذف تماماً) */
.m-brand {
    font-size: 21px;
    font-weight: 900;
    letter-spacing: .3px;
    background: linear-gradient(168deg, #ffffff 6%, #dceaf8 42%, #9fb8cf 78%, #e9f3fb 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #dfeaf5;
    filter: none;
}
.m-conn { margin-inline-start: auto; display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--m-muted); }
/* نقطة الاتصال: قرينة صلبة بحلقة ضوئية رفيعة بدل الهالة */
.m-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--m-green); box-shadow: inset 0 0 0 1px rgba(255,255,255,.45), 0 0 0 3px rgba(61,220,151,.14); }
.m-dot.off { background: var(--m-red); box-shadow: inset 0 0 0 1px rgba(255,255,255,.45), 0 0 0 3px rgba(255,93,108,.16); }
.m-time {
    font-size: 12px; color: var(--m-muted); font-variant-numeric: tabular-nums; min-width: 46px; text-align: end;
    padding: 3px 8px; border-radius: 99px; border: 1px solid var(--m-hair); background: rgba(255,255,255,.04);
}

/* ------------------------- اللوحات (كاروسيل هندسي) -------------------------
   الموضع مشتق بالكامل من متغيرات على وسم html: --m-p للصفحة العشرية، --m-w لعرضها،
   --m-dir لاتجاه RTL، و --m-i لموضع اللوحة (تُكتب في ورقة أنماط مستقلة بالـ id).
   السبب: switchAdminTab الأصلية تنفّذ style.cssText = '' على كل لوحة فتمسح أي
   transform سطري. الأنماط في ورقة الأنماط لا تُمسح. */
html.is-mobile .admin-section {
    --m-d: calc(var(--m-i, 0) - var(--m-p, 0));
    --m-ad: max(var(--m-d), calc(var(--m-d) * -1));
    display: none;
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: none;
    contain: layout style;
    padding: 16px 13px calc(var(--m-bar-h) + 84px + env(safe-area-inset-bottom));
    scrollbar-width: none;
    transform: translate3d(calc(var(--m-d) * var(--m-dir, 1) * var(--m-w, 100vw)), 0, 0);
    opacity: calc(1 - min(1, var(--m-ad)) * 0.24);
}
html.is-mobile .admin-section::-webkit-scrollbar { display: none; }
html.is-mobile .admin-section.m-seen { display: block; }
html.is-mobile .m-calc-probe {
    position: absolute; visibility: hidden; pointer-events: none;
    transform: translate3d(calc((2 - var(--m-q, 0)) * 10px), 0, 0);
}
html.is-mobile .admin-section.m-seen:not(.m-cur):not(.active),
html.is-mobile body.m-dragging .admin-section { pointer-events: none; }
html.is-mobile body.m-dragging #admin-screen,
html.is-mobile body.m-dragging #admin-screen * { transition: none !important; }
/* الزجاج الحقيقي يُترك للمثبت فقط: أي blur فوق لوحة تتحرك يعيد رسم الشاشة كاملة
   كل إطار على الآيفون، وهو سبب التقطيع الذي ظهر في الجولات السابقة. */
html.is-mobile #admin-screen .admin-section,
html.is-mobile #admin-screen .admin-section * {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
}

/* ------------------------- الحركة التدريجية للدخول -------------------------
   كلها في CSS لأن سفاري الآيفون يُهمل الأنيميشن المُولَّد بجافاسكريبت لحظياً.
   البطاقة ترتفع، أيقونتها تنبثق، ثم يُمسح العنوان والرقم تدريجياً من جهة
   القراءة، ويُملأ شريط التلوين أسفلها. التأخيرات تُحسب من --m-k لكل عنصر. */
@keyframes mRise {
    from { opacity: 0; transform: translate3d(0, 26px, 0) scale(.972); }
    to   { opacity: 1; transform: none; }
}
@keyframes mFade { from { opacity: .55; } to { opacity: 1; } }
@keyframes mPop {
    0%   { opacity: 0; transform: translate3d(0,-10px,0) scale(.72); }
    62%  { opacity: 1; transform: translate3d(0,2px,0) scale(1.06); }
    100% { opacity: 1; transform: none; }
}
@keyframes mWipe {
    from { opacity: .12; clip-path: inset(0 0 0 100%); }
    to   { opacity: 1;   clip-path: inset(0 0 0 0); }
}
@keyframes mGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

html.is-mobile .admin-section.m-enter { animation: mFade .34s linear both; }
html.is-mobile .admin-section .m-anim {
    animation: mRise .66s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms);
}
html.is-mobile .admin-section .m-anim > .stat-icon {
    animation: mPop .62s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms + 130ms);
}
html.is-mobile .admin-section .m-anim .stat-title {
    animation: mWipe .66s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms + 250ms);
}
html.is-mobile .admin-section .m-anim .stat-value {
    animation: mWipe .78s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms + 330ms);
}
html.is-mobile .admin-section .m-anim > tr,
html.is-mobile .admin-section tr.m-anim {
    animation: mRise .58s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 14) * 46ms + 180ms);
}
html.is-mobile .admin-section .m-anim td {
    animation: mWipe .6s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 14) * 46ms + 300ms);
}
html.is-mobile body.m-dragging .admin-section.m-enter,
html.is-mobile body.m-dragging .admin-section .m-anim,
html.is-mobile body.m-dragging .admin-section .m-anim * { animation: none; }

html.is-mobile .admin-section h2 {
    font-size: 19px !important; font-weight: 900; margin: 4px 2px 16px !important;
    text-align: start !important; letter-spacing: .2px;
    color: #dbeaff !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
html.is-mobile .admin-section h2 i { color: var(--m-accent2); margin-inline-end: 6px; }
html.is-mobile .admin-section h3 {
    color: #cfe3ff !important; font-size: 15px !important; font-weight: 900 !important;
    border-bottom: 1px solid var(--m-line) !important;
}

/* ------------------------- وصفة الزجاج المشتركة -------------------------
   أربع طبقات: انعكاس علوي مائل، خطوط محفورة بشعرية خفيفة، جسم زجاجي داكن،
   وحافة عليا مضيئة 1px. الظلّ أسود فقط — لا توهّج ملوّن حول البطاقات. */
html.is-mobile #admin-screen .stat-card,
html.is-mobile #admin-screen .cart-table tr,
html.is-mobile #admin-screen .invoices-table tr,
html.is-mobile .m-today,
html.is-mobile .m-exp-sum,
html.is-mobile .monthly-strip {
    position: relative;
    isolation: isolate;
    background:
        linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 26%),
        var(--m-etch),
        var(--m-glass),
        var(--m-glass-bg) !important;
    border: 1px solid var(--m-edge) !important;
    box-shadow: var(--m-lift) !important;
}
html.is-mobile #admin-screen .stat-card::before,
html.is-mobile .m-today::before,
html.is-mobile .monthly-strip::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    pointer-events: none;
    background: var(--m-sheen);
}
/* اللوحات الكبيرة تُقطع هندسياً: زاوية مشطوفة بدل الاستدارة — قطع زجاجي.
   الظلّ الخارجي يُرقى بـ drop-shadow لأن clip-path يقصّ box-shadow الخارجي. */
html.is-mobile .m-today,
html.is-mobile .monthly-strip {
    clip-path: var(--m-facet);
    border: none !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.17), inset 0 0 0 1px rgba(255,255,255,.07) !important;
    filter: drop-shadow(0 16px 26px rgba(0,0,0,.5));
}
/* شريط التلوين الذي يمتلئ أسفل البطاقة عند الدخول: بلاتين مصقول بدل النيون */
html.is-mobile #admin-screen .stat-card::after {
    content: "";
    position: absolute;
    left: 14px; right: 14px; bottom: 8px;
    height: 2px;
    border-radius: 99px;
    background: linear-gradient(90deg, rgba(232,244,255,.85), rgba(150,180,210,.10));
    box-shadow: none;
    transform-origin: right center;
    opacity: .45;
}
html.is-mobile .admin-section .m-anim.stat-card::after,
html.is-mobile .admin-section .m-anim .stat-card::after {
    animation: mGrow .9s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms + 420ms);
}

/* بطاقات بدل الجداول */
html.is-mobile #admin-screen .cart-table,
html.is-mobile #admin-screen .invoices-table { display: block !important; width: 100% !important; border: none !important; background: transparent !important; }
html.is-mobile #admin-screen .cart-table thead,
html.is-mobile #admin-screen .invoices-table thead { display: none !important; }
html.is-mobile #admin-screen .cart-table tbody,
html.is-mobile #admin-screen .invoices-table tbody { display: block !important; width: 100% !important; }

html.is-mobile #admin-screen .cart-table tr,
html.is-mobile #admin-screen .invoices-table tr {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    grid-template-rows: none !important;
    align-items: center;
    gap: 4px 10px;
    border-radius: var(--m-radius-card) !important;
    margin-bottom: 10px !important;
    padding: 12px 13px !important;
}
html.is-mobile #admin-screen .cart-table tr::after,
html.is-mobile #admin-screen .invoices-table tr::after { content: none !important; }
html.is-mobile #admin-screen .cart-table tr::before,
html.is-mobile #admin-screen .invoices-table tr::before {
    content: "";
    position: absolute;
    inset-inline-start: 0; top: 12px; bottom: 12px; width: 2px;
    border-radius: 0;
    background: linear-gradient(180deg, rgba(236,246,255,.92), rgba(150,180,210,.16));
    opacity: .75;
}

/* مواضع الخلايا مكتوبة بـ !important على tr > td: ورقة أنماط المتجر ترسل الخلية
   قبل الأخيرة إلى العمود الثاني بكود مشدّد، وكتابة الموضع على tr > td تعطي
   الطبقة خصوصية أعلى فتلغي قواعد المتجر مهما كان ترتيبها. */
html.is-mobile #admin-screen .cart-table tr > td,
html.is-mobile #admin-screen .invoices-table tr > td {
    display: block !important;
    grid-column: 1 !important;
    grid-row: auto !important;
    align-self: auto !important;
    border: none !important;
    border-top: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding: 1px 0 !important;
    margin: 0 !important;
    text-align: start !important;
    white-space: normal !important;
    overflow: visible !important;
    min-width: 0 !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: var(--m-text) !important;
    line-height: 1.45 !important;
}
html.is-mobile #admin-screen .cart-table tr > td:first-child,
html.is-mobile #admin-screen .invoices-table tr > td:first-child {
    grid-column: 1 / -1 !important;
    font-size: 12.5px !important;
    font-weight: 800 !important;
    color: var(--m-muted) !important;
    margin-bottom: 3px !important;
    letter-spacing: .2px;
}
html.is-mobile #admin-screen .cart-table tr > td:nth-child(2),
html.is-mobile #admin-screen .invoices-table tr > td:nth-child(2) {
    grid-column: 1 !important;
    font-size: 18px !important;
    font-weight: 900 !important;
    color: #e8f3ff !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
html.is-mobile #admin-screen .cart-table tr > td:nth-child(n+3),
html.is-mobile #admin-screen .invoices-table tr > td:nth-child(n+3) { grid-column: 1 !important; font-size: 13px !important; font-weight: 600 !important; }
html.is-mobile #admin-screen .cart-table tr > td:last-child:not(:first-child),
html.is-mobile #admin-screen .invoices-table tr > td:last-child:not(:first-child) {
    display: flex !important;
    grid-column: 2 !important;
    grid-row: 2 / span 4 !important;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 0 !important;
    margin-top: 0 !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    color: var(--m-accent) !important;
}
html.is-mobile #admin-screen td:last-child .top-bar-btn,
html.is-mobile #admin-screen td:last-child .action-icon {
    min-width: 42px;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px !important;
    padding: 8px 10px !important;
    border-radius: var(--m-radius-pill) !important;
    background: rgba(255,255,255,.06) !important;
    border: 1px solid var(--m-edge) !important;
    color: #cfe6ff !important;
    margin: 0 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
}
html.is-mobile #admin-screen td:last-child .action-icon:active { background: rgba(77,163,255,.22) !important; }

/* ------------------------- شبكة البطاقات ------------------------- */
html.is-mobile .stats-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 12px !important; margin-bottom: 18px !important; }
html.is-mobile .stat-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    border-radius: var(--m-radius-card) !important;
    padding: 20px 12px 22px !important;
    overflow: hidden;
}
html.is-mobile .stat-card:hover { transform: none !important; }
html.is-mobile .stat-card:active { transform: scale(.985) !important; }
/* صحن الأيقونة: مُثمَّن هندسي من الزجاج المصنفر بحلقة داخلية وظلّ أسود تحته.
   لا توهّج حول الرمز: الحافة المضيئة داخل الشكل هي ما يعطي إحساس القطع الزجاجي. */
html.is-mobile .stat-icon {
    position: relative;
    display: flex !important;
    width: 54px !important; height: 54px !important;
    margin: 0 auto 12px !important;
    align-self: center !important;
    flex: none;
    justify-content: center; align-items: center;
    border-radius: 0 !important;
    border: none !important;
    clip-path: var(--m-plate);
    font-size: 21px !important;
    line-height: 1;
    color: #eaf4ff !important;
    background:
        linear-gradient(152deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.05) 44%, rgba(255,255,255,.11) 100%),
        rgba(14,22,34,.72) !important;
    box-shadow: none;
    text-shadow: none;
    filter: drop-shadow(0 8px 14px rgba(0,0,0,.46));
}
html.is-mobile .stat-icon::before {
    content: "";
    position: absolute;
    inset: 0;
    clip-path: var(--m-plate);
    background: var(--m-etch);
    opacity: .55;
    pointer-events: none;
}
/* البرتقالي المكتوب سطرياً في صفحة المزيد يُرجع البطاقة خارج الهوية */
html.is-mobile #admin-screen [style*="#f39c12"] { border-color: var(--m-edge) !important; }
html.is-mobile #admin-screen [style*="#f39c12"] .stat-icon,
html.is-mobile #admin-screen .stat-icon[style*="#f39c12"] { color: #eaf4ff !important; }
html.is-mobile .stat-title { font-size: 12px !important; color: var(--m-muted) !important; margin: 0 0 4px !important; font-weight: 800 !important; letter-spacing: .1px; }
/* الرقم: أبيض ثلجي عالي المقابلة، محفور بظلّ أسود رفيع بدل أي هالة ملوّنة */
html.is-mobile .stat-value {
    font-size: 19px !important; font-weight: 900 !important; color: #f7fbff !important;
    letter-spacing: -.2px; font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 2px rgba(0,0,0,.6);
}
/* أرقام اللوحات لا تنبض: النظام يكتب transform=scale(1.1) سطرياً عند كل رسم.
   القفلة للعرض فقط، القيم نفسها تُحسب وتُكتب كما هي. */
html.is-mobile .stat-value,
html.is-mobile .bento-num,
html.is-mobile [id^="bento-"] {
    transform: none !important;
    transition: none !important;
    -webkit-transform: none !important;
}
html.is-mobile .stat-card[style*="grid-column: span 2"] {
    grid-column: span 2 !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    text-align: start !important;
    gap: 14px;
}
html.is-mobile .stat-card[style*="grid-column: span 2"] .stat-icon { margin: 0 !important; flex: none !important; }

/* البطاقة البطلة في اليومية: لوح مشطوف بحواف داخلية، لا وهج ازرق في الزاوية */
html.is-mobile #admin-daily-report .bento-hero {
    border-radius: 0 !important;
    clip-path: var(--m-facet);
    border: none !important;
    padding: 24px 18px !important;
    background:
        linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,0) 24%),
        var(--m-etch),
        var(--m-glass),
        rgba(8,13,21,.9) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.08) !important;
    filter: drop-shadow(0 18px 30px rgba(0,0,0,.55));
}
html.is-mobile #admin-daily-report .bento-hero .stat-title { color: #cfe3ff !important; font-size: 13px !important; }
html.is-mobile #bento-current-pieces {
    color: #ffffff !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
html.is-mobile .monthly-strip {
    border-radius: 0 !important;
    padding: 12px 10px !important;
    gap: 6px;
    flex-wrap: wrap;
}
html.is-mobile .monthly-strip-item { color: var(--m-muted) !important; font-size: 11.5px !important; }
html.is-mobile .monthly-strip-item strong { color: #eaf4ff !important; text-shadow: 0 1px 2px rgba(0,0,0,.55); }

/* ------------------------- لوحة تفاصيل اليوم ------------------------- */
html.is-mobile .m-today {
    border-radius: 0 !important;
    margin: 4px 0 22px !important;
    padding: 14px 14px 6px !important;
    overflow: hidden;
}
html.is-mobile .m-today-head {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 900; color: #dbeaff;
    padding-bottom: 10px; margin-bottom: 4px;
    border-bottom: 1px solid var(--m-hair);
}
html.is-mobile .m-today-head i { color: var(--m-accent2); text-shadow: 0 1px 2px rgba(0,0,0,.55); }
html.is-mobile .m-today-date {
    margin-inline-start: auto; font-size: 10.5px; font-weight: 700; color: var(--m-muted);
    padding: 3px 9px; border-radius: 99px; border: 1px solid var(--m-hair); background: rgba(255,255,255,.04);
}
html.is-mobile .m-today-rows { display: block; }
html.is-mobile .m-today-row {
    display: grid;
    grid-template-columns: 34px minmax(0,1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 11px 2px;
    border-bottom: 1px solid rgba(255,255,255,.045);
}
html.is-mobile .m-today-row:last-child { border-bottom: none; }
html.is-mobile .m-today-row > i {
    width: 34px; height: 34px;
    clip-path: var(--m-plate);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: #dceaf8;
    background:
        linear-gradient(160deg, rgba(255,255,255,.20), rgba(255,255,255,.03) 55%, rgba(255,255,255,.10)),
        rgba(14,22,34,.72);
    border: none;
    filter: drop-shadow(0 6px 10px rgba(0,0,0,.42));
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
html.is-mobile .m-today-meta { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
html.is-mobile .m-today-meta > span { font-size: 12.5px; font-weight: 800; color: var(--m-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.is-mobile .m-today-bar {
    display: block; height: 4px; border-radius: 0; overflow: hidden;
    background: rgba(255,255,255,.05);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
}
/* التعبئة التدريجي: سكة معدنية تُسحب، لا خيط نيون */
html.is-mobile .m-today-bar i {
    display: block; height: 100%; width: 0;
    background: linear-gradient(90deg, rgba(150,180,210,.30), rgba(236,246,255,.92));
    transition: width 1.1s var(--m-ease-out);
}
html.is-mobile .m-today-val {
    font-size: 15px; font-weight: 900; color: #eef5ff; white-space: nowrap;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
html.is-mobile .m-today-row.down > i { color: #ffd7dc; }
html.is-mobile .m-today-row.down .m-today-bar i { background: linear-gradient(90deg, rgba(158,64,76,.35), rgba(255,142,154,.92)); }
html.is-mobile .m-today-row.down .m-today-val { color: #ffc9d0; text-shadow: 0 1px 2px rgba(0,0,0,.55); }
html.is-mobile .m-today-row.up > i { color: #c6f6de; }
html.is-mobile .m-today-row.up .m-today-bar i { background: linear-gradient(90deg, rgba(52,150,106,.35), rgba(154,240,204,.92)); }
html.is-mobile .m-today-row.up .m-today-val { color: #d6ffe9; text-shadow: 0 1px 2px rgba(0,0,0,.55); }
html.is-mobile .m-today-row.neg .m-today-val { color: #ffc9d0; }
html.is-mobile .m-today-row.sum { background: linear-gradient(90deg, rgba(198,226,250,.10), transparent); }
html.is-mobile .m-today-row.sum .m-today-val { font-size: 17px; color: #ffffff; }
html.is-mobile .admin-section .m-anim.m-today .m-today-row,
html.is-mobile .m-today.m-anim .m-today-row {
    animation: mWipe .7s var(--m-ease-out) both;
    animation-delay: calc(min(var(--m-k, 0), 11) * 66ms + 260ms + var(--m-r, 0) * 90ms);
}

/* ------------------------- صفحة المزيد -------------------------
   البطاقات تملأ ارتفاع اللوحة: لا تصعد الأيقونات تحت الترويسة ولا فراغ أسفلها. */
html.is-mobile #admin-more-menu { padding-top: 8px !important; display: flex; flex-direction: column; }
html.is-mobile #admin-more-menu > h2 { margin-bottom: 14px !important; }
html.is-mobile #admin-more-menu > div[style*="grid-template-columns"] {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0,1fr)) !important;
    grid-auto-rows: minmax(124px, 1fr) !important;
    gap: 12px !important;
    flex: 1 1 auto;
    align-content: stretch;
    padding-bottom: 4px;
}
html.is-mobile #admin-more-menu .stat-card { padding: 16px 10px 20px !important; }
html.is-mobile #admin-more-menu .stat-card .stat-icon { width: 56px !important; height: 56px !important; margin-bottom: 14px !important; }
html.is-mobile #admin-more-menu .stat-card .stat-title { font-size: 12.5px !important; color: #dceaff !important; }

/* ------------------------- اللوحاتControl والفلاتر ------------------------- */
html.is-mobile .admin-control-panel { display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 10px !important; margin-bottom: 14px !important; }
html.is-mobile .admin-control-panel h2 { margin: 0 2px !important; }
html.is-mobile .admin-filters { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; width: 100% !important; }
html.is-mobile .admin-filters > * { flex: 1 1 132px; min-width: 0; }

/* ------------------------- الحقول ------------------------- */
html.is-mobile input, html.is-mobile select, html.is-mobile textarea, html.is-mobile button { font-family: inherit; }
html.is-mobile .note-input,
html.is-mobile .input-group input,
html.is-mobile .input-group select {
    font-size: 16px !important;
    background: rgba(255,255,255,.05) !important;
    border: 1px solid var(--m-edge) !important;
    border-radius: 14px !important;
    color: var(--m-text) !important;
    padding: 11px 12px !important;
    width: 100% !important;
    min-height: 46px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,.4);
}
html.is-mobile .input-group label { color: var(--m-muted) !important; font-size: 12px !important; font-weight: 800 !important; }
html.is-mobile input:focus, html.is-mobile select:focus, html.is-mobile textarea:focus {
    outline: none;
    border-color: rgba(77,163,255,.6) !important;
    box-shadow: 0 0 0 2px rgba(207,227,247,.42), inset 0 1px 2px rgba(0,0,0,.4) !important;
    background: rgba(77,163,255,.07) !important;
}

/* ------------------------- الأزرار والشارات ------------------------- */
html.is-mobile .btn, html.is-mobile .top-bar-btn, html.is-mobile .btn-royal-action,
html.is-mobile .btn-save, html.is-mobile .btn-cancel, html.is-mobile .btn-confirm,
html.is-mobile .admin-nav-btn, html.is-mobile .modal-actions button {
    min-height: 46px;
    border-radius: 15px !important;
    font-weight: 800 !important;
    letter-spacing: .2px;
}
html.is-mobile .btn-cancel,
html.is-mobile .modal-actions .btn-cancel {
    background: rgba(255,255,255,.06) !important;
    border: 1px solid var(--m-edge) !important;
    color: #dfeaf8 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.10);
}
html.is-mobile .btn-confirm,
html.is-mobile .modal-actions .btn-confirm,
html.is-mobile .btn-save {
    background:
        linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,0) 30%),
        linear-gradient(160deg, rgba(168,206,240,.30), rgba(24,40,62,.72)) !important;
    border: 1px solid rgba(214,234,252,.34) !important;
    color: #ffffff !important;
    box-shadow: 0 12px 26px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.32) !important;
    text-shadow: 0 1px 2px rgba(0,0,0,.5);
}
html.is-mobile .btn-royal-action {
    background: rgba(255,255,255,.06) !important;
    border: 1px solid var(--m-edge) !important;
    color: #dfeaf8 !important;
}
html.is-mobile button:active, html.is-mobile a:active, html.is-mobile .stat-card:active {
    opacity: .72;
    transition: none;
}
/* الشارات: رقاقة زجاجية بحافة شعرية وحفر داخلي — بلا هالة */
html.is-mobile .badge, html.is-mobile .stat-badge, html.is-mobile .pill {
    border: 1px solid rgba(214,234,252,.24) !important;
    background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03)), rgba(16,26,40,.7) !important;
    color: #e8f2fb !important;
    border-radius: 99px !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 10px rgba(0,0,0,.35);
    font-variant-numeric: tabular-nums;
}

/* ------------------------- شريط التبويبات: غيمة سائلة -------------------------
   ثابت في body، وموضعه لا يقرأ لوحة المفاتيح ولا ارتفاع الشاشة المتغير، والسحب
   عليه ممنوع (touch-action:none) فلا يحرّك المستند ولا يرتفع ولا يهبط. */
html.is-mobile #mobile-bottom-nav {
    display: none;
    position: fixed;
    width: auto !important;
    left: 10px; right: 10px;
    bottom: calc(4px + env(safe-area-inset-bottom) * 0.34);
    height: var(--m-bar-h);
    z-index: 9500;
    padding: 6px;
    border-radius: var(--m-radius-bar);
    background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02)), rgba(7,11,18,.80);
    -webkit-backdrop-filter: blur(22px) saturate(170%);
    backdrop-filter: blur(22px) saturate(170%);
    border: 1px solid rgba(255,255,255,.12);
    box-shadow: 0 18px 44px rgba(0,0,0,.60), inset 0 1px 0 rgba(255,255,255,.20);
    justify-content: space-around;
    align-items: stretch;
    overflow: hidden;
    pointer-events: auto;
    touch-action: none;
    isolation: isolate;
}
html.is-mobile body.m-admin #mobile-bottom-nav { display: flex; }
html.is-mobile #mobile-bottom-nav::before {
    content: "";
    position: absolute;
    left: 18%; right: 18%; top: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(190,230,255,.75), transparent);
}

html.is-mobile .bottom-nav-btn {
    position: relative;
    z-index: 2;
    flex: 1 1 calc(100% / var(--m-n));
    min-width: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    background: transparent; border: none; color: var(--m-faint);
    padding: 4px 2px;
    transition: color .34s var(--m-ease), transform .34s var(--m-ease);
}
html.is-mobile .bottom-nav-btn i { font-size: 18px; line-height: 1; transition: transform .34s var(--m-ease), filter .34s var(--m-ease); }
html.is-mobile .bottom-nav-btn span {
    font-size: 10.5px; font-weight: 800; max-width: 100%; letter-spacing: .1px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    opacity: .75; transition: opacity .34s var(--m-ease);
}
html.is-mobile .bottom-nav-btn.m-hi { color: #eaf5ff; }
html.is-mobile .bottom-nav-btn.m-hi i { transform: translateY(-2px) scale(1.08); filter: none; }
html.is-mobile .bottom-nav-btn.m-hi span { opacity: 1; }
html.is-mobile .bottom-nav-btn.active { color: #ffffff; }
html.is-mobile .bottom-nav-btn.active i { transform: translateY(-2px) scale(1.08); filter: none; }
html.is-mobile .bottom-nav-btn.active span { opacity: 1; }

/* الكتلة السائلة: تتبع الإصبع بنبضة متأخرة، تنضغط في اتجاه الحركة، تتكتّل ثم تستقر */
html.is-mobile .m-ind {
    position: absolute; z-index: 1;
    top: 6px; bottom: 6px;
    left: 0; width: 0;
    transform-origin: center center;
    border-radius: calc(22px + var(--m-sq, 0) * 16px) calc(30px - var(--m-sq, 0) * 10px)
                   calc(22px + var(--m-sq, 0) * 12px) calc(30px - var(--m-sq, 0) * 8px) / 62% 58% 62% 58%;
    background:
        radial-gradient(78% 120% at 50% 116%, rgba(198,226,250,.30), transparent 70%),
        radial-gradient(120% 150% at 50% -20%, rgba(255,255,255,.36), transparent 62%),
        linear-gradient(180deg, rgba(216,234,252,.30), rgba(92,122,158,.16));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.58), inset 0 0 0 1px rgba(255,255,255,.14);
    opacity: .95;
    will-change: transform;
    transition: border-radius .42s var(--m-ease-out), opacity .3s linear;
}
html.is-mobile .m-ind::after {
    content: "";
    position: absolute;
    left: 24%; right: 24%; bottom: 4px; height: 2px; border-radius: 99px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.92), transparent);
    box-shadow: 0 1px 1px rgba(0,0,0,.35);
}
html.is-mobile .bottom-nav-btn.active + .m-ind, html.is-mobile .m-ind { pointer-events: none; }

/* ------------------------- نوافذ النظام غير المنزلاقة ------------------------- */
/* النافذة فوق الشريط: ورقة المتجر تعطي المنبثقة 2000 والشريط مثبت فوقها، فيظهر
   الشريط على نافذة مليئة الشاشة ويغطي زر الإغلاق في أسفلها. */
html.is-mobile .modal-overlay { z-index: 9550; }
html.is-mobile .modal-overlay:not(.m-sheet):not(.m-lock-screen) {
    align-items: center !important;
    justify-content: center !important;
    padding: calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px) !important;
}
html.is-mobile .modal-overlay:not(.m-sheet) .modal-content {
    width: 100% !important;
    max-width: 720px !important;
    height: auto !important;
    max-height: calc(100% - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px) !important;
    margin: 0 auto !important;
    border-radius: var(--m-radius-sheet) !important;
    border: 1px solid var(--m-edge) !important;
    background: var(--m-glass), rgba(9,14,22,.94) !important;
    box-shadow: 0 26px 70px rgba(0,0,0,.66), inset 0 1px 0 rgba(255,255,255,.16) !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

/* ------------------------- النوافذ السفلية ------------------------- */
html.is-mobile .modal-overlay.m-sheet {
    display: flex;
    position: fixed;
    inset: 0;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 !important;
    background: rgba(2,4,8,.66);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .28s var(--m-ease);
}
html.is-mobile .modal-overlay.m-sheet.m-on { opacity: 1; pointer-events: auto; }
/* الدخول والخروج حركات CSS لا انتقالات: النظام يُخفي النافذة بـ display:none
   والانتقال لا يعمل عبر الإخفاء — فكانت تختفي فجأة أو تهبط ثم تصعد. */
@keyframes mSheetIn { from { transform: translateY(105%); } to { transform: translateY(0); } }
@keyframes mSheetOut { from { transform: translateY(0); } to { transform: translateY(105%); } }
@keyframes mScrimIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes mScrimOut { from { opacity: 1; } to { opacity: 0; } }
html.is-mobile .modal-overlay.m-sheet .modal-content { animation: none; }
html.is-mobile .modal-overlay.m-sheet.m-on { animation: mScrimIn .26s linear both; }
html.is-mobile .modal-overlay.m-sheet.m-in .modal-content { animation: mSheetIn .42s var(--m-ease-out) both; }
html.is-mobile .modal-overlay.m-sheet.m-closing {
    display: flex !important;
    pointer-events: none;
    animation: mScrimOut .32s linear both;
}
html.is-mobile .modal-overlay.m-sheet.m-closing .modal-content { animation: mSheetOut .34s var(--m-ease) both; }
html.is-mobile .modal-overlay.m-sheet .modal-content {
    width: 100% !important;
    max-width: 720px !important;
    height: auto !important;
    max-height: 92% !important;
    margin: 0 !important;
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0 !important;
    border: 1px solid rgba(255,255,255,.14) !important;
    border-bottom: none !important;
    background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.015)), rgba(8,13,21,.97) !important;
    box-shadow: 0 -18px 60px rgba(0,0,0,.66), inset 0 1px 0 rgba(255,255,255,.20) !important;
    padding: 6px 14px calc(14px + env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior: none;
    transform: translateY(105%);
    transition: transform .36s var(--m-ease-out);
}
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal {
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    padding: 0 !important;
}
html.is-mobile .modal-content.mobile-sticky-modal .modal-body-scrollable {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: auto !important;
    overscroll-behavior: contain;
    padding: 0 14px 10px !important;
}
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal .m-grab { margin: 10px 14px 0; }
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal .m-sheet-x { top: 12px; }
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal .modal-actions { margin: 0 14px calc(12px + env(safe-area-inset-bottom)); }
html.is-mobile .modal-overlay.m-sheet.m-on .modal-content { transform: translateY(0); }
html.is-mobile .modal-overlay.m-sheet.m-live .modal-content { animation: none !important; transition: transform .1s linear; }
html.is-mobile .m-grab {
    width: 46px; height: 4px; border-radius: 0;
    background: linear-gradient(90deg, rgba(255,255,255,.18), rgba(232,244,255,.62) 50%, rgba(255,255,255,.18));
    margin: 10px auto 10px;
}
html.is-mobile .modal-overlay.m-sheet .modal-title {
    position: sticky; top: -6px; z-index: 3;
    margin: 0 -14px 10px;
    padding: 14px 14px 12px;
    background: linear-gradient(180deg, rgba(13,20,31,.99), rgba(11,17,27,.96));
    border-bottom: 1px solid var(--m-hair);
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    font-size: 16.5px;
    font-weight: 900;
    color: #e8f2ff;
    padding-inline-end: 62px;
}
html.is-mobile .modal-overlay.m-sheet .modal-actions {
    position: sticky; bottom: 0; padding-top: 10px;
    background: linear-gradient(to top, rgba(8,13,21,.99) 62%, rgba(8,13,21,0));
}
html.is-mobile .m-sheet-x {
    position: absolute; top: 11px; inset-inline-end: 12px; z-index: 4;
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    clip-path: var(--m-plate);
    border: none;
    background:
        linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.03) 50%, rgba(255,255,255,.12)),
        rgba(12,19,30,.9);
    color: #e8f2ff; font-size: 20px; line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.28);
    text-shadow: 0 1px 2px rgba(0,0,0,.6);
    filter: drop-shadow(0 6px 12px rgba(0,0,0,.5));
}
html.is-mobile .m-sheet-x:active { background: linear-gradient(160deg, rgba(214,236,255,.34), rgba(20,34,54,.92)); }

/* ------------------------- نافذة تفاصيل الصرفيات ------------------------- */
html.is-mobile .m-exp-modal .modal-title { position: static; padding-inline-end: 60px; }
html.is-mobile .m-exp-sum {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    clip-path: var(--m-facet-sm);
    border-radius: 0 !important;
    border: none !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.07) !important;
    filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
    padding: 11px 13px;
    margin: 0 0 12px;
    font-size: 12px; font-weight: 800; color: var(--m-muted);
}
html.is-mobile .m-exp-sum b { font-size: 15px; color: #ffd7dc; font-weight: 900; text-shadow: 0 1px 2px rgba(0,0,0,.55); }
html.is-mobile .m-exp-sum b em { font-style: normal; font-size: 10.5px; color: var(--m-muted); }
html.is-mobile .m-exp-sum i { color: var(--m-red); margin-inline-end: 5px; }
html.is-mobile .m-exp-modal table { margin-top: 0 !important; }
html.is-mobile .m-exp-modal tr {
    grid-template-columns: minmax(0,1fr) auto !important;
    padding: 10px 12px !important;
    margin-bottom: 8px !important;
    border-radius: 16px !important;
    gap: 2px 10px;
}
html.is-mobile .m-exp-modal tr > td:first-child {
    grid-column: 1 !important;
    grid-row: 1 !important;
    font-size: 11px !important;
    margin-bottom: 2px !important;
    color: var(--m-faint) !important;
    font-variant-numeric: tabular-nums;
}
/* يوم الأسبوع يسبق التاريخ في سطر واحد بدل أن يشغل خلية كاملة */
html.is-mobile .m-exp-modal tr > td:nth-child(2) {
    grid-column: 1 !important;
    grid-row: 1 !important;
    justify-self: start;
    margin-inline-start: 6px;
    font-size: 11px !important;
    font-weight: 700 !important;
    color: var(--m-faint) !important;
}
html.is-mobile .m-exp-modal tr > td:nth-child(2) { display: inline-block !important; }
html.is-mobile .m-exp-modal tr > td:nth-child(2)::before { content: "·"; margin-inline-end: 5px; opacity: .5; }
html.is-mobile .m-exp-modal tr > td:nth-child(3) {
    grid-column: 1 !important;
    grid-row: 2 !important;
    font-size: 14.5px !important;
    font-weight: 800 !important;
    color: #eaf3ff !important;
    white-space: normal !important;
    word-break: break-word;
}
html.is-mobile .m-exp-modal tr > td:last-child {
    grid-column: 2 !important;
    grid-row: 1 / span 2 !important;
    display: flex !important;
    align-items: center !important;
    font-size: 15px !important;
    font-weight: 900 !important;
    color: #ffc9d0 !important;
    white-space: nowrap;
}
html.is-mobile .m-exp-empty {
    display: none;
    flex-direction: column; align-items: center; gap: 10px;
    padding: 34px 0 30px;
    color: var(--m-faint); font-size: 13px; font-weight: 800;
}
html.is-mobile .m-exp-empty i { font-size: 30px; opacity: .5; }

/* ------------------------- شاشة الدخول والقفل ------------------------- */
/* رموز نظام شاشة الدخول: موضوعة على html.is-mobile بدل :root لأن هذا الملف لا
   يُحمَّل على الكاشير أصلاً، فبقاء المضيف نفسه يمنع أي تسرّب للكمبيوتر.
   تُستدعى هذه القيم لاحقاً في بقية الطبقة، فلا تُعرَّف مرة ثانية في مكان آخر. */
html.is-mobile {
    --m-blue-1: #1e90ff;
    --m-blue-2: #38bdf8;
    --m-cyan: #22d3ee;
    --m-green-1: #22c55e;
    --m-green-2: #4ade80;
    --m-red-1: #f43f5e;
    --m-lk-cut: 34px;
    --m-lk-cut-in: 33px;
    --m-lk-facet: polygon(var(--m-lk-cut) 0, 100% 0, 100% calc(100% - var(--m-lk-cut)), calc(100% - var(--m-lk-cut)) 100%, 0 100%, 0 var(--m-lk-cut));
    --m-lk-facet-in: polygon(var(--m-lk-cut-in) 0, 100% 0, 100% calc(100% - var(--m-lk-cut-in)), calc(100% - var(--m-lk-cut-in)) 100%, 0 100%, 0 var(--m-lk-cut-in));
    --m-lk-glass: linear-gradient(145deg, rgba(255,255,255,.10), rgba(255,255,255,.03) 45%, rgba(20,60,110,.18));
    --m-lk-rim-inset: inset 0 1px 0 rgba(255,255,255,.35);
    --m-lk-num: "Outfit", "Cairo", -apple-system, "Segoe UI", system-ui, sans-serif;
    /* الحفر هنا أخف وأعرض من --m-etch العام: فوقه مشهد مخطط بالأساس، فتراكب
       الخطوتين يصنع تمويجاً بصرياً (moiré) يفسد نظافة اللوح. */
    --m-lk-etch: repeating-linear-gradient(122deg, rgba(255,255,255,.026) 0 1px, transparent 1px 17px);
    --m-lk-key: linear-gradient(96deg, var(--m-blue-2), var(--m-blue-1));
    --m-lk-key-ok: linear-gradient(96deg, var(--m-green-1), var(--m-green-2));
}
html.is-mobile #modal-admin-login.m-lock-screen {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9800;
    align-items: center;
    justify-content: center;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    touch-action: manipulation;
    background:
        radial-gradient(120% 70% at 50% 118%, rgba(30,144,255,.16), rgba(4,6,10,0) 62%),
        linear-gradient(168deg, #070c15 0%, #04060a 54%, #0a1320 100%);
    /* السطح الزجاجي الوحيد المسموح به على الشاشة: لا backdrop-filter ثانٍ فوقه */
    -webkit-backdrop-filter: blur(22px) saturate(160%);
    backdrop-filter: blur(22px) saturate(160%);
}
html.is-mobile #modal-admin-login.m-lock-screen .modal-content {
    position: relative;
    width: 100% !important;
    max-width: none !important;
    min-height: 100dvh;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    overflow: visible !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    animation: none !important;
}
/* أثناء تسلسل الإكمال تُخفى البطاقة الحقيقية بالـ visibility وحده: لا تغيير تخطيط
   ولا إعادة تركيب، والمسرح يقف في موضعها بالحروف، ثم تعود عند الفشل بلا قفزة. */
html.is-mobile body.m-lk-busy #modal-admin-login .m-lk-shell { visibility: hidden; }

/* ---- المشهد: خيوط كربون مائلة + شرطات ضوء + شبكة محفورة + حبيبات تمنع التدرّج ---- */
html.is-mobile .m-lk-scene { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
html.is-mobile .m-lk-scene i {
    position: absolute;
    display: block;
    border-radius: 0;
    /* لا will-change هنا: الطبقات تتحرك طوال الوقت فتُرقّى تلقائياً، والإبقاء
       على التلميح يطيل عمر الطبقة المركّبة ويظهر خطاً أفقياً عند حدّ البكسلة */
}
html.is-mobile .m-lk-scene i:nth-child(1) {
    left: -34%; bottom: -26%; width: 128%; height: 74%;
    transform: rotate(-24deg);
    background:
        linear-gradient(92deg, rgba(255,255,255,0) 6%, rgba(255,255,255,.055) 26%, rgba(10,18,30,.9) 44%, rgba(255,255,255,.03) 58%, rgba(4,6,10,0) 82%),
        linear-gradient(92deg, rgba(30,144,255,.10), rgba(4,6,10,0) 70%);
    animation: mLkRibbon1 21s var(--m-ease) infinite alternate;
}
html.is-mobile .m-lk-scene i:nth-child(2) {
    left: -22%; bottom: -6%; width: 132%; height: 46%;
    transform: rotate(-19deg);
    background: linear-gradient(94deg, rgba(4,6,10,0) 12%, rgba(18,30,46,.92) 40%, rgba(255,255,255,.07) 55%, rgba(255,255,255,.02) 68%, rgba(4,6,10,0) 90%);
    animation: mLkRibbon2 24s var(--m-ease) infinite alternate;
}
/* شرطات الضوء: خطوط بسمك 1 و2 بكسل لا هالة حولها، فالمنع قائم على التوهّج لا على اللمعة */
html.is-mobile .m-lk-scene i:nth-child(3) {
    inset: -4%;
    background:
        repeating-linear-gradient(66deg, rgba(56,189,248,.20) 0 1px, rgba(34,211,238,0) 1px 96px),
        repeating-linear-gradient(66deg, rgba(238,244,255,.10) 0 2px, rgba(238,244,255,0) 2px 210px),
        repeating-linear-gradient(122deg, rgba(198,224,250,.045) 0 1px, transparent 1px 74px),
        repeating-linear-gradient(58deg, rgba(198,224,250,.03) 0 1px, transparent 1px 74px);
    animation: mLkGridDrift 26s var(--m-ease) infinite alternate;
}
html.is-mobile .m-lk-scene i:nth-child(4) {
    inset: 0;
    /* إشعاع دائري بلا حافة: المستطيل المحدود كان يُظهر خطاً أفقياً فوق اللوح */
    background: radial-gradient(56% 30% at 50% 52%, rgba(214,236,255,.10), rgba(30,144,255,.05) 44%, rgba(4,6,10,0) 74%);
    animation: mLkBreathe 9s var(--m-ease) infinite alternate;
}
/* حبيبات 2.8% تمنع ظهور درجات اللون: صورة SVG واحدة ثابتة لا تُحرَّك */
html.is-mobile .m-lk-scene::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: .028;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
@keyframes mLkRibbon1 { to { transform: rotate(-24deg) translate3d(14px, -14px, 0); } }
@keyframes mLkRibbon2 { to { transform: rotate(-19deg) translate3d(-12px, 10px, 0); } }
@keyframes mLkGridDrift { to { transform: translate3d(10px, -12px, 0); } }
@keyframes mLkBreathe { from { opacity: .75; } to { opacity: 1; } }

/* ---- البطاقة: إطار يرسم الحدّ المتدرّجي، ثم طبقة لمعة، ثم اللوح داخلهما بميل بكسل ---- */
html.is-mobile .m-lk-shell {
    position: relative;
    z-index: 2;
    width: min(88vw, 360px);
    margin: 0 auto;
    /* القطع يقصّ الظل الخارجي، فالعمق يُركَّب بـ drop-shadow على حاوية غير مشطوفة */
    filter: drop-shadow(0 26px 44px rgba(0,0,0,.62));
}
html.is-mobile .m-lk-frame,
html.is-mobile .m-lk-rim {
    position: absolute;
    inset: 0;
    clip-path: var(--m-lk-facet);
    pointer-events: none;
}
html.is-mobile .m-lk-frame {
    background: linear-gradient(214deg, rgba(226,244,255,.62) 0%, rgba(255,255,255,.14) 30%, rgba(77,163,255,.30) 58%, rgba(255,255,255,.08) 100%);
}
/* اللمعة فوق الحدّ تُبدَّل بـ opacity وحدها: تشتعل أثناء الكتابة بلا أي ظل متحرّك */
html.is-mobile .m-lk-rim {
    background: linear-gradient(214deg, rgba(240,250,255,.95) 0%, rgba(134,220,255,.55) 26%, rgba(255,255,255,.12) 52%, rgba(255,255,255,.05) 100%);
    opacity: .34;
    transition: opacity .34s var(--m-ease);
}
html.is-mobile .m-lk-shell.lit .m-lk-rim { opacity: 1; }
/* اللوح عنصرجري في التدفق بهامش بكسل واحد: هو الذي يعطي الحاوية ارتفاعها */
html.is-mobile .m-lk-card {
    position: relative;
    margin: 1px;
    clip-path: var(--m-lk-facet-in);
    padding: 26px 22px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background:
        radial-gradient(120% 58% at 6% 34%, rgba(77,163,255,.20), rgba(77,163,255,0) 60%),
        linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,0) 24%),
        var(--m-lk-etch),
        var(--m-lk-glass),
        rgba(7,12,21,.92);
    box-shadow: var(--m-lk-rim-inset), inset 0 0 0 1px rgba(255,255,255,.07);
}
html.is-mobile .m-lk-card::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: var(--m-sheen);
}
/* طيّتا الزجاج فوق القطعين: أخوة للإطار لا أبناء له، لأن clip-path للأب يقصّ كل بارز.
   العرض = طول القطر (34×1.42≈48) والمركز على منتصف القطعة نفسها، والدوران -45°
   يوازي اتجاه القطع في الركنين معاً، فتظهر الحافة الفاتحة إلى الخارج كطيّة مطوية. */
html.is-mobile .m-lk-flap {
    --flap-w: calc(var(--m-lk-cut) * 1.42);
    position: absolute;
    width: var(--flap-w);
    height: 12px;
    z-index: 3;
    clip-path: polygon(5% 0, 95% 0, 100% 100%, 0 100%);
    background: linear-gradient(180deg, rgba(238,247,255,.52), rgba(120,170,220,.13) 55%, rgba(10,18,30,.62));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55);
    transform: rotate(-45deg);
    pointer-events: none;
}
html.is-mobile .m-lk-flap.tl {
    left: calc(var(--m-lk-cut) * .5 - var(--flap-w) * .5);
    top: calc(var(--m-lk-cut) * .5 - 6px);
}
html.is-mobile .m-lk-flap.br {
    left: calc(100% - var(--m-lk-cut) * .5 - var(--flap-w) * .5);
    top: calc(100% - var(--m-lk-cut) * .5 - 6px);
}
@media (max-height: 520px) {
    html.is-mobile .m-lk-shell { width: min(76vw, 340px); }
    html.is-mobile .m-lk-card { padding: 14px 18px 12px; }
    html.is-mobile .m-lk-card .modal-title { font-size: 18px !important; }
    html.is-mobile .m-lk-chip { width: 36px; height: 36px; margin-bottom: 8px; }
    html.is-mobile .m-lk-sub { margin-bottom: 10px !important; }
}

/* ---- المحتوى: رقاقة، عنوان بكلمة متدرّجة، وصف سطران، خانات، تذييل ---- */
html.is-mobile .m-lk-chip {
    position: relative;
    width: 44px;
    height: 44px;
    margin-bottom: 14px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    background: linear-gradient(160deg, rgba(255,255,255,.26), rgba(255,255,255,.04) 46%, rgba(255,255,255,.14)), rgba(12,20,32,.86);
    box-shadow: var(--m-lk-rim-inset), inset 0 0 0 1px rgba(255,255,255,.10);
}
html.is-mobile .m-lk-chip svg { width: 20px; height: 20px; display: block; overflow: visible; }
html.is-mobile .m-lk-chip svg path,
html.is-mobile .m-lk-chip svg circle { fill: none; stroke: #eef6ff; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
html.is-mobile .m-lk-chip .m-lock { transition: opacity .28s var(--m-ease); }
html.is-mobile .m-lk-chip .m-shield { position: absolute; opacity: 0; transition: opacity .28s var(--m-ease); }
html.is-mobile .m-lk-chip .m-shield path { stroke: var(--m-green-2); }
html.is-mobile .m-lk-chip.ok .m-lock { opacity: 0; }
html.is-mobile .m-lk-chip.ok .m-shield { opacity: 1; }
html.is-mobile .m-lk-card .modal-title {
    display: block;
    margin: 0 0 6px !important;
    padding: 0 !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    line-height: 1.3;
    color: var(--m-text);
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
    transition: opacity .3s var(--m-ease);
}
html.is-mobile .m-lk-card .modal-title i { display: none; }
/* تدرّج الحروف يشترط text-shadow: none: أي ظل يشفّ عبر الحروف الشفّافة ويظهر كهالة */
html.is-mobile .m-lk-key {
    background-image: var(--m-lk-key);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    text-shadow: none !important;
}
/* background-image لا background: لأن الاختصار يُعيد ضبط background-clip
   إلى border-box فتتحوّل الكلمة إلى مستطيل مصمت بدل الحروف المتدرّجة */
html.is-mobile .m-lk-key.ok { background-image: var(--m-lk-key-ok); }
html.is-mobile .m-lk-dim { opacity: .55; }
html.is-mobile .m-lk-sub {
    margin: 0 0 22px !important;
    font-size: 13px;
    line-height: 1.7;
    font-weight: 400;
    color: var(--m-muted);
}
html.is-mobile .m-lk-live { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); }
html.is-mobile .m-lk-err {
    min-height: 18px;
    margin: -6px 0 8px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--m-red-1);
    opacity: 0;
    transition: opacity .26s var(--m-ease);
}
html.is-mobile .m-lk-err.on { opacity: 1; }
html.is-mobile .m-lk-err.ok { color: var(--m-green-2); }
html.is-mobile .m-lk-fade { transition: opacity .3s var(--m-ease); }

/* ---- الخانات: صف + صفيحة ضوئية واحدة تنزلق + حقل النظام الشفاف فوق الكل ---- */
html.is-mobile .m-lk-card .input-group { width: 100%; margin: 0 !important; position: relative; }
html.is-mobile .m-lk-card .input-group label { display: none; }
html.is-mobile .m-otp {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 56px));
    width: fit-content;
    margin-inline: auto;
    gap: 12px;
    z-index: 1;
}
html.is-mobile .m-otp b {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 58px;
    aspect-ratio: 1 / 1.04;
    clip-path: var(--m-facet-sm);
    font-family: var(--m-lk-num);
    font-size: 26px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #ffffff;
    background:
        linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,0) 26%),
        rgba(255,255,255,.05);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.08);
    /* لا will-change على الخانات الحقيقية: هي لا تتحرك إلا داخل المسرح */
    /* لا انتقال على الحدّ: الحالة تُبدَّل فورياً، والضوء وحده هو الذي ينزلق */
    animation: mLkCellIn .7s var(--m-ease-out) backwards;
    animation-delay: calc(var(--m-ci, 0) * 60ms + 260ms);
}
html.is-mobile .m-lk-fx .m-otp b { will-change: transform, opacity; }
@keyframes mLkCellIn { from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.9); } to { opacity: 1; transform: none; } }
html.is-mobile .m-otp b:nth-child(1) { --m-ci: 0; }
html.is-mobile .m-otp b:nth-child(2) { --m-ci: 1; }
html.is-mobile .m-otp b:nth-child(3) { --m-ci: 2; }
html.is-mobile .m-otp b:nth-child(4) { --m-ci: 3; }
/* الرقم داخل وسم مستقل: يُنبض وحده، فلا يتضارب مع إزاحة الخانة في تسلسل FLIP.
   لا will-change: النبضة تُرقية طبقة بنفسها لحظة تشغيلها، والإبقاء عليها يربط
   أربع طبقات دائمة على شاشة لا تتحرك أرقامها إلا عند الكتابة. */
html.is-mobile .m-otp b u { display: block; text-decoration: none; }
html.is-mobile .m-otp b.filled {
    background:
        linear-gradient(180deg, rgba(255,255,255,.30), rgba(255,255,255,.02) 30%),
        linear-gradient(165deg, rgba(196,222,248,.26), rgba(24,42,66,.72));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.46), inset 0 0 0 1px rgba(226,244,255,.22);
}
html.is-mobile .m-otp b.bad {
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 0 0 1px rgba(244,63,94,.62);
}
/* الصفيحة المشتركة: تمثل «الخانة النشطة» كلها، تتحرك بـ translateX ولا تُخفت خانة بخانتها */
html.is-mobile .m-otp-glide {
    position: absolute;
    left: 0;
    top: 0;
    width: calc((100% - 36px) / 4);
    height: 100%;
    z-index: 2;
    pointer-events: none;
    clip-path: var(--m-facet-sm);
    background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(56,189,248,.06) 40%, rgba(4,6,10,0));
    box-shadow: inset 0 0 0 1.5px rgba(56,189,248,.85), inset 0 1px 0 rgba(255,255,255,.4);
    will-change: transform, opacity;
    transition: opacity .3s var(--m-ease);
}
html.is-mobile .m-otp-glide.off { opacity: 0; }
html.is-mobile .m-otp-glide.hide-caret .m-otp-caret { opacity: 0; }
html.is-mobile .m-otp-caret {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1.5px;
    height: 24px;
    margin: -12px 0 0 -.75px;
    background: linear-gradient(180deg, rgba(255,255,255,.35), #eaf4ff 40%, rgba(255,255,255,.35));
    animation: mCaret 1s ease-in-out infinite;
}
@keyframes mCaret { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
/* الحقل الحقيقي يبقى مصدر القيمة الوحيد: شفاف وفوق الصف ليستقبل اللمس واللوحة ومدير كلمات المرور
   (.input-group .m-otp-input تعادل (0,3,1) وتتغلب على نظام .input-group input عند (0,2,2) ) */
html.is-mobile .input-group .m-otp-input {
    position: absolute !important;
    left: 0 !important; right: 0 !important; top: 0 !important; bottom: 0 !important;
    width: 100% !important; height: 100% !important;
    min-height: 0 !important;
    padding: 0 !important; margin: 0 !important;
    border: none !important;
    border-radius: 16px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    caret-color: transparent !important;
    font-size: 16px !important; /* دون 16 بكسل تُقرّب سفاري الصفحة عند التركيز */
    z-index: 4;
}

/* ---- لوحة الأرقام الزجاجية: بديل كامل للوحة مفاتيح النظام ---- */
html.is-mobile .m-pad {
    position: relative;
    z-index: 1;
    direction: ltr;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    max-width: 272px;
    margin: 8px auto 0;
}
html.is-mobile .m-pad button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: clamp(44px, 6.4vh, 56px);
    margin: 0;
    padding: 0;
    border: 0;
    clip-path: var(--m-facet-sm);
    font-family: var(--m-lk-num);
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #ffffff;
    background:
        linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,0) 30%),
        linear-gradient(165deg, rgba(196,222,248,.10), rgba(24,42,66,.46));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 0 0 1px rgba(255,255,255,.10);
    -webkit-tap-highlight-color: transparent;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
    cursor: pointer;
    animation: mLkCellIn .7s var(--m-ease-out) backwards;
    animation-delay: calc(var(--k, 0) * 38ms + 420ms);
    transition: color .45s var(--m-ease), box-shadow .45s var(--m-ease);
}
html.is-mobile .m-pad button > span {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
/* طبقة الأخضر: تظهر فوراً عند اللمس وتخبو ببطء بعد رفع الإصبع */
html.is-mobile .m-pad button::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    background: radial-gradient(95% 95% at 50% 24%, rgba(110,240,160,.62), rgba(34,197,94,.26) 58%, rgba(6,40,22,.55));
    transition: opacity .6s var(--m-ease);
}
html.is-mobile .m-pad button.on {
    z-index: 3;
    color: #f0fff5;
    text-shadow: 0 0 14px rgba(74,222,128,.95);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1.5px rgba(34,197,94,.95);
    transition: none;
}
html.is-mobile .m-pad button.on::before { opacity: 1; transition: opacity .05s linear; }
/* مفتاحا المسح والحذف: نفس الحركة بلون أزرق ليتميّزا عن الأرقام */
html.is-mobile .m-pad button.fn { font-size: 14px; color: var(--m-muted); }
html.is-mobile .m-pad button.fn svg { width: 24px; height: 24px; display: block; }
html.is-mobile .m-pad button.fn::before {
    background: radial-gradient(95% 95% at 50% 24%, rgba(150,210,255,.55), rgba(56,150,255,.24) 58%, rgba(8,22,44,.55));
}
html.is-mobile .m-pad button.fn.on {
    color: #f2f9ff;
    text-shadow: 0 0 12px rgba(120,200,255,.9);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 0 0 1.5px rgba(77,163,255,.95);
}
html.is-mobile .m-pad .m-rp {
    position: absolute;
    z-index: 0;
    width: 150%;
    aspect-ratio: 1;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, rgba(255,255,255,.6), rgba(255,255,255,0) 62%);
}
html.is-mobile .m-lk-card .m-pad ~ .modal-actions { margin-top: 16px; }
@media (max-height: 700px) {
    html.is-mobile .m-pad { gap: 8px; margin-top: 4px; }
    html.is-mobile .m-pad button { height: 42px; font-size: 21px; }
    html.is-mobile .m-lk-card .m-lk-sub { display: none; }
}
@media (prefers-reduced-motion: reduce) {
    html.is-mobile .m-pad button { animation: none; transition: none; }
}

/* ---- التذييل: إجراءا النظام محفوظان كما هما + سطر إعادة الضبط ---- */
html.is-mobile .m-lk-card .modal-actions {
    display: flex; gap: 10px; width: 100%; margin-top: 22px; padding: 0 !important;
    position: static !important; background: none !important;
}
html.is-mobile .m-lk-card .modal-actions button {
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    color: var(--m-text);
    clip-path: var(--m-facet-sm);
    background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.02) 32%), rgba(12,20,32,.7);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 0 0 1px rgba(255,255,255,.09);
    transition: opacity .2s var(--m-ease);
}
html.is-mobile .m-lk-card .modal-actions button:active { opacity: .72; }
html.is-mobile .m-lk-card .modal-actions button:disabled { opacity: .45; }
html.is-mobile .m-lk-card .modal-actions .btn-cancel { color: var(--m-muted); }
html.is-mobile .m-lk-foot { margin-top: 14px; font-size: 12px; color: var(--m-muted); }
html.is-mobile .m-lk-foot button {
    color: var(--m-blue-2);
    font-weight: 700;
    background: none;
    border: 0;
    font-family: inherit;
    font-size: 12px;
    padding: 6px 4px;
    cursor: pointer;
}
html.is-mobile .m-lk-hint {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    margin-top: 12px;
    font-size: 11px; font-weight: 800; letter-spacing: .3px;
    color: var(--m-faint);
}
html.is-mobile .m-lk-hint i { font-size: 11px; display: inline-block; color: var(--m-accent2); }

/* ---- مسرح الإكمال: بطاقة مطابقة في الموضع، لا تمسها النافذة ولا closeModals ---- */
html.is-mobile .m-lk-fx {
    position: fixed;
    inset: 0;
    z-index: 9850;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    pointer-events: none;
    background: radial-gradient(120% 70% at 50% 118%, rgba(30,144,255,.14), rgba(4,6,10,0) 62%);
    opacity: 1;
    transition: opacity .5s var(--m-ease);
}
html.is-mobile .m-lk-fx.gone { opacity: 0; }
html.is-mobile .m-lk-fx canvas { position: absolute; pointer-events: none; z-index: 5; }
/* شبكة الوصل: أخ للبطاقة لا ابن لها، لأن clip-path للأب كان يقصّ العقد عند القطعين */
html.is-mobile .m-lk-net { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: visible; }
html.is-mobile .m-lk-net path { fill: none; stroke: rgba(120,200,255,.65); stroke-width: 1; stroke-linecap: round; }
html.is-mobile .m-lk-net circle { fill: #dff2ff; opacity: 0; }
html.is-mobile .m-lk-core {
    position: absolute;
    left: 50%; top: 50%;
    width: 48px; height: 48px;
    margin: -24px 0 0 -24px;
    z-index: 6;
    display: flex; align-items: center; justify-content: center;
    clip-path: var(--m-facet-sm);
    background: linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.03) 48%, rgba(255,255,255,.10)), rgba(8,14,22,.94);
    box-shadow: var(--m-lk-rim-inset), inset 0 0 0 1px rgba(255,255,255,.12);
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity;
}
html.is-mobile .m-lk-core.ok {
    background: linear-gradient(160deg, rgba(255,255,255,.20), rgba(34,197,94,.10) 50%, rgba(8,18,14,.94));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.34), inset 0 0 0 1.5px rgba(34,197,94,.85);
}
html.is-mobile .m-lk-core.bad {
    background: linear-gradient(160deg, rgba(255,255,255,.18), rgba(244,63,94,.10) 50%, rgba(22,8,12,.94));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.3), inset 0 0 0 1.5px rgba(244,63,94,.8);
}
html.is-mobile .m-lk-core svg { width: 26px; height: 26px; overflow: visible; }
html.is-mobile .m-lk-core .m-spin { fill: none; stroke: rgba(180,215,245,.85); stroke-width: 2; stroke-linecap: round; }
html.is-mobile .m-lk-core .m-tick { fill: none; stroke: #ffffff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
html.is-mobile .m-lk-ring {
    position: absolute;
    left: 50%; top: 50%;
    width: 48px; height: 48px;
    margin: -24px 0 0 -24px;
    z-index: 5;
    border-radius: 50%;
    border: 1px solid rgba(74,222,128,.8);
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity;
}
html.is-mobile .m-lk-pill {
    position: absolute;
    left: 50%; bottom: 26px;
    z-index: 6;
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px;
    border-radius: 99px;
    font-size: 12px; font-weight: 700;
    color: var(--m-green-2);
    background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 40%), rgba(8,20,16,.8);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.26), inset 0 0 0 1px rgba(34,197,94,.34);
    opacity: 0;
    pointer-events: none;
    will-change: transform, opacity;
    transform: translate3d(-50%, 10px, 0);
}
html.is-mobile .m-lk-pill svg { width: 13px; height: 13px; }
html.is-mobile .m-lk-pill svg path { fill: none; stroke: var(--m-green-2); stroke-width: 2; stroke-linecap: round; }

/* ---- تقليل الحركة: تبقى النتيجة، وتُختصر المدة ولا تُلغى بالكلية ---- */
@media (prefers-reduced-motion: reduce) {
    html.is-mobile .m-lk-scene i { animation: none !important; }
    html.is-mobile .m-otp b { animation-duration: .16s !important; animation-delay: 0s !important; }
    html.is-mobile .m-otp-caret { animation-duration: .16s !important; }
}

/* ------------------------- التنبيهات والعناصر الصغيرة ------------------------- */
html.is-mobile #toast-container {
    top: auto !important; left: 12px !important; right: 12px !important;
    bottom: calc(var(--m-bar-h) + 26px + env(safe-area-inset-bottom) + var(--m-kb)) !important;
    z-index: 9600 !important;
    display: flex; flex-direction: column; gap: 8px; align-items: stretch;
}
html.is-mobile .toast-msg {
    border-radius: 16px !important;
    border: 1px solid rgba(255,255,255,.14) !important;
    background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02)), rgba(9,14,22,.95) !important;
    box-shadow: 0 16px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.18) !important;
    max-width: none !important;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
}

html.is-mobile .m-offline {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #ffd7dc;
    background: rgba(255,93,108,.10);
    border: 1px solid rgba(255,93,108,.28);
    border-radius: 14px; padding: 9px 11px; margin-bottom: 12px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}

html.is-mobile .m-splash {
    position: fixed;
    inset: 0;
    z-index: 9700;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(60% 46% at 50% 40%, rgba(46,124,224,.22), transparent 68%), #04060a;
    opacity: 1;
    transition: opacity .6s var(--m-ease);
}
html.is-mobile .m-splash.m-off2 { opacity: 0; }
html.is-mobile .m-splash i { font-size: 34px; color: var(--m-accent2); animation: mSpin 1s linear infinite; filter: none; }
@keyframes mSpin { to { transform: rotate(360deg); } }

html.is-mobile .m-viewbtn {
    width: 100%; margin-top: 16px;
    min-height: 48px;
    border-radius: 16px;
    border: 1px solid var(--m-edge);
    background: linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
    color: #dceaff;
    font-size: 15px; font-weight: 800;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
}

/* الخلفية تتجمّد باللمس لا بتغيير overflow: تغييرها في سفاري يصفّر موضع التمرير  */
html.is-mobile body.m-lock .admin-section { pointer-events: none; }

/* اللوحة التي لا تحتاج تمريراً لا تُمرَّر أصلاً: لا مطّ ولا قفز */
html.is-mobile .admin-section.m-noflow { overflow-y: hidden; }

/* --------------------- مواجهة !important الورشة: لا هالات ولا ذهب ---------------------
   ورقة المتجر تكتب التوهّج والذهبي بـ !important، فلا يُلغيها إلا !important
   بخصوصية أعلى. وهذه تحديداً الهالات التي يرفضها المستخدم بعينه. */

/* رقم القطع في البطاقة البطلة: style.css:1323 يكتب حوله هالة ذهبية !important */
html.is-mobile #bento-current-pieces {
    color: #ffffff !important;
    letter-spacing: -.5px;
    text-shadow: 0 1px 2px rgba(0,0,0,.62) !important;
}
/* صحن الأيقونة: المتجر يضيف ظلاً ذهبياً !important حول كل أيقونة */
html.is-mobile #admin-screen .stat-icon { box-shadow: none !important; text-shadow: none !important; }
html.is-mobile .stat-card[onclick*="costs"] .stat-icon,
html.is-mobile .stat-card[onclick*="logs"] .stat-icon {
    background:
        linear-gradient(152deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.05) 44%, rgba(255,255,255,.11) 100%),
        rgba(14,22,34,.72) !important;
    border-color: transparent !important;
}

/* بطاقات الأيام: جدولها يحمل صنف cart-table، فقواعد الخلايا العامة في هذه الطبقة
   أعلى خصوصية من قواعد الورشة. الختم بمعرفَين (#admin-screen + التوبودي) هو الوحيد
   الذي يسبق كليهما، وهو ما يلغي الإطار الذهبي وهالة الدخل الصافي. */
html.is-mobile #admin-screen #admin-daily-reports-body tr {
    background:
        linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,0) 24%),
        var(--m-etch),
        var(--m-glass),
        rgba(8,13,21,.92) !important;
    border: none !important;
    border-radius: 0 !important;
    clip-path: var(--m-facet);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.07) !important;
    filter: drop-shadow(0 14px 24px rgba(0,0,0,.5));
    padding: 15px 14px !important;
    margin-bottom: 12px !important;
}
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(3),
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(4) {
    border-radius: 0 !important;
    padding: 8px 9px !important;
    clip-path: var(--m-facet-sm);
    font-size: 13.5px !important;
    font-weight: 800 !important;
    font-variant-numeric: tabular-nums;
}
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(3) {
    background: linear-gradient(165deg, rgba(154,240,204,.14), rgba(255,255,255,.02)) !important;
    color: #d6ffe9 !important;
}
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(4) {
    background: linear-gradient(165deg, rgba(255,142,154,.14), rgba(255,255,255,.02)) !important;
    color: #ffc9d0 !important;
}
/* الدخل الصافي: رقم محفور أبيض، لا ذهب ولا هالة */
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(6) {
    color: #f7fbff !important;
    font-size: 21px !important;
    text-shadow: 0 1px 3px rgba(0,0,0,.66) !important;
    font-variant-numeric: tabular-nums;
}
html.is-mobile #admin-screen #admin-daily-reports-body tr > td:nth-child(6)::before {
    color: rgba(226,240,255,.58) !important;
    font-weight: 800 !important;
    letter-spacing: .2px;
}

/* اللمس في آيفون يُبقي :hover عالقاً بعد الرفع: المتجر يكتب على السطر المُحوَّم
   خلفية ذهبية و scale(1.02) بـ !important — وهذا بالضبط «تكبّر وتصغّر الأرقام»
   الذي شكا منه المستخدم، فتلغى وتُستبدل بلمعة بلاتينية بلا حركة. */
html.is-mobile .interactive-row:hover,
html.is-mobile .interactive-table tr:hover {
    transform: none !important;
    -webkit-transform: none !important;
    background:
        linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.02) 30%),
        var(--m-glass),
        rgba(11,17,27,.86) !important;
    border-color: var(--m-edge-hi) !important;
    box-shadow: var(--m-lift) !important;
}

/* رفعُ الوقوف عند المتجر (translateY/scale) لا يزول على اللمس: البطاقات تبقى
   مرفوعة بعد كل نقرة. الإلغاء يشمل البطاقات والصفوف وخلايا المخطط. */
html.is-mobile .stat-card:hover,
html.is-mobile .item-cell:hover,
html.is-mobile .tx-deposit-card:hover,
html.is-mobile .tx-withdraw-card:hover,
html.is-mobile #admin-screen .cart-table tbody tr:hover,
html.is-mobile #admin-screen .invoices-table tbody tr:hover {
    transform: none !important;
    -webkit-transform: none !important;
}
html.is-mobile .stat-card:hover {
    border-color: var(--m-edge-hi) !important;
    box-shadow: var(--m-lift) !important;
}
html.is-mobile #admin-screen .cart-table tbody tr:hover,
html.is-mobile #admin-screen .invoices-table tbody tr:hover {
    background:
        linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.02) 30%),
        var(--m-etch),
        var(--m-glass),
        rgba(10,16,26,.9) !important;
}
/* أزرار التنقل القديمة إن بقي منها شيء في الجوال: توهّج ذهبي لصيق */
html.is-mobile .admin-nav-btn:hover,
html.is-mobile .admin-nav-btn.active {
    background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.02)) !important;
    color: #eaf4ff !important;
    border-right-color: rgba(226,240,255,.5) !important;
}

/* رؤوس وأذيال النوافذ الثابتة: بلاتين بدل الذهبي، وسطح زجاجي بدل الرمادي المسطّح */
html.is-mobile .modal-header-sticky {
    background: linear-gradient(180deg, rgba(23,34,50,.97), rgba(11,17,27,.96)) !important;
    border-bottom: 1px solid var(--m-hair) !important;
}
html.is-mobile .modal-footer-sticky {
    background: linear-gradient(0deg, rgba(23,34,50,.97), rgba(11,17,27,.96)) !important;
    border-top: 1px solid var(--m-hair) !important;
}

@media (prefers-reduced-motion: reduce) {
    html.is-mobile *, html.is-mobile *::before, html.is-mobile *::after {
        transition-duration: .001ms !important;
        animation-duration: .001ms !important;
        animation-iteration-count: 1 !important;
    }
    html.is-mobile body::after,
    html.is-mobile .m-lk-scene i { animation: none !important; }
    /* حركة الطبقة تُخفَّف ولا تُلغى: إلغاؤها الكامل هو ما جعل المستخدم يقول
       «الموشن لم يعمل» حين تكون خاصية تقليل الحركة مفعّلة في الجهاز */
    html.is-mobile .admin-section.m-enter,
    html.is-mobile .admin-section .m-anim,
    html.is-mobile .admin-section .m-anim *,
    html.is-mobile .modal-overlay.m-sheet,
    html.is-mobile .modal-overlay.m-sheet .modal-content {
        transition-duration: .16s !important;
        animation-duration: .16s !important;
        animation-delay: 0s !important;
    }
}
`;

    /* ============================ أدوات ============================ */
    const qsa = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    const esc = (v) => (window.escapeHTML ? window.escapeHTML(String(v == null ? '' : v)) : String(v == null ? '' : v));
    const store = {
        get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
    };

    /* موضع المحور: التبويب التالي يظهر من اليسار في RTL */
    const dirSign = () => (root.getAttribute('dir') || document.dir || 'rtl').toLowerCase() === 'rtl' ? -1 : 1;

    const state = {
        keys: [],
        pages: [],
        barKeys: [],
        barBtns: [],
        barW: 0,
        cell: 0,
        n: 1,
        index: 0,
        width: 1,
        busy: false,
        pendingRepaint: false,
        started: false,
        kb: 0,
        jumping: null,
        swipeHi: 0,
        todayTimer: 0
    };

    /* ================== حدود السحب والموضع الوهمية ==================
       لوحات الشريط الخمس هي مدى السحب. اللوحات التي تُفتح من «المزيد» لا تُعرض
       في المسار: تُوضع في خانة وهمية واحدة بعد المزيد، فيسحب المستخدم من أيٍّ
       منها إلى المزيد رجوعاً فقط، ولا يفتح تبويباً مخفياً بالسحب. */
    function vpos(i) { return i <= state.swipeHi ? i : state.swipeHi + 1; }

    function bounds() {
        const sub = state.index > state.swipeHi;
        return sub ? [state.swipeHi, state.swipeHi + 1] : [0, state.swipeHi];
    }

    /* موضع وهمي إلى رقم لوحة: الخانة التي بعد المزيد تعني اللوحة الجارية نفسها */
    function pageForPos(v) {
        const r = clamp(Math.round(v), 0, state.n - 1);
        if (r <= state.swipeHi) return r;
        return state.index > state.swipeHi ? state.index : state.swipeHi;
    }

    /* ================== ترتيب التبويبات ديناميكياً ==================
       نفس مصدر الترتيب الحالي: أزرار شريط الجوال أولاً ثم بقية اللوحات. */
    function readTabsOrder() {
        const order = [];
        const add = (k) => { if (k && order.indexOf(k) === -1) order.push(k); };
        qsa(BAR_SELECTOR + ' .bottom-nav-btn').forEach((btn) => {
            const m = /switchAdminTab\(\s*['"]([^'"]+)['"]/.exec(btn.getAttribute('onclick') || '');
            if (m) add(m[1]);
        });
        qsa('.admin-section').forEach((sec) => add(sec.id.replace(/^admin-/, '')));
        return order;
    }

    /* ==================== حقن الأنماط والهيكل ==================== */
    function injectChrome() {
        const style = document.createElement('style');
        style.id = 'royal-mobile-style';
        style.textContent = CSS;
        document.head.appendChild(style);

        const admin = document.getElementById(ADMIN_ID);
        if (!admin) return;

        const head = document.createElement('header');
        head.className = 'm-head';
        head.innerHTML =
            '<span class="m-brand">' + esc(brandName()) + '</span>' +
            '<span class="m-conn"><i class="m-dot"></i><span class="m-conn-text">متصل</span></span>' +
            '<span class="m-time">--:--</span>';
        admin.insertBefore(head, admin.firstChild);
        headRef = head;

        const indicator = document.createElement('div');
        indicator.className = 'm-ind';
        const bar = document.querySelector(BAR_SELECTOR);
        if (bar) bar.appendChild(indicator);
    }
    let headRef = null;

    function brandName() {
        const t = (document.title || '').split('-')[0].trim();
        return t || 'إدارة رويال';
    }

    /* ================== حالة الاتصال وآخر مزامنة ================== */
    function mirrorConnection() {
        if (!headRef) return;
        const dot = headRef.querySelector('.m-dot');
        const txt = headRef.querySelector('.m-conn-text');
        const online = navigator.onLine !== false;
        dot.classList.toggle('off', !online);
        txt.textContent = online ? 'متصل' : 'أوفلاين';
    }

    function markSyncTime() {
        if (!headRef) return;
        const el = headRef.querySelector('.m-time');
        const d = new Date();
        const p = (v) => (v < 10 ? '0' + v : '' + v);
        el.textContent = p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /* ==================== مواضع التمرير والحركات ==================== */
    /* العرض يقاس من الحاوية: الصفحة المخفية clientWidth لها صفر، والتبويب المستعاد قد لا يكون مفعّلاً بعد */
    function cacheWidth() {
        const host = document.querySelector('#' + ADMIN_ID + ' .admin-content') || document.getElementById(ADMIN_ID);
        const page = state.pages[state.index];
        const w = (page && page.clientWidth) || (host && host.clientWidth) || window.innerWidth;
        state.width = Math.max(1, w);
        root.style.setProperty('--m-w', state.width + 'px');
    }

    /* كل لوحة تحمل رقمها --m-i داخل ورقة أنماط مستقلة، فلا يمسحها style.cssText = '' */
    function paintPageIndexes() {
        let el = document.getElementById('royal-mobile-geo');
        if (!el) {
            el = document.createElement('style');
            el.id = 'royal-mobile-geo';
            document.head.appendChild(el);
        }
        let css = '';
        for (let i = 0; i < state.pages.length; i++) {
            const p = state.pages[i];
            if (p && p.id) css += '#' + ADMIN_ID + ' #' + p.id + '{--m-i:' + vpos(i) + '}';
        }
        css += 'html.is-mobile{--m-dir:' + dirSign() + '}';
        if (el.textContent !== css) el.textContent = css;
    }

    /* المصدر الوحيد للظهور والحالة الجارية */
    let calcOk = true;

    /* يدقّ بعد حقن الأنماط: يتأكد أن translate3d(calc(var)) يُحسب فعلاً في هذا المتصفح */
    function probeCalc() {
        const host = document.getElementById(ADMIN_ID) || document.body;
        const probe = document.createElement('div');
        probe.className = 'm-calc-probe';
        host.appendChild(probe);
        let shift = 0;
        try {
            const t = getComputedStyle(probe).transform;
            shift = t && t !== 'none' ? new DOMMatrix(t).e : 0;
        } catch (e) { shift = 0; }
        probe.remove();
        calcOk = shift === 20;
    }

    function paintTransforms() {
        root.style.setProperty('--m-p', phys.P.toFixed(4));
        const P = phys.P;
        for (let i = 0; i < state.pages.length; i++) {
            const el = state.pages[i];
            if (!el) continue;
            /* اللوحات التي تشترك الخانة الوهمية نفسها لا تُعرض معاً: الجارية وحدها */
            const v = vpos(i);
            const seen = Math.abs(v - P) <= 1.5 && (v <= state.swipeHi || i === state.index);
            if (seen !== el.classList.contains('m-seen')) el.classList.toggle('m-seen', seen);
            const cur = i === state.index;
            if (cur !== el.classList.contains('m-cur')) el.classList.toggle('m-cur', cur);
            if (seen && state.keys[i] === 'invoice-designer') ensureStudioFonts();
            if (!calcOk) {
                const d = v - P;
                el.style.transform = seen
                    ? 'translate3d(' + (dirSign() * d * state.width).toFixed(2) + 'px,0,0)'
                    : '';
                el.style.opacity = seen ? String(1 - Math.min(1, Math.abs(d)) * 0.2) : '';
            }
        }
        paintIndicator();
    }

    /* إزاحة لوحة واحدة سطرياً فوق حساب الشريط: الحساب يبقى في ورقة الأنماط لبقية اللوحات */
    function setOffset(el, d) {
        if (!el) return;
        el.style.setProperty('--m-d', d.toFixed(4));
        if (!calcOk) {
            el.style.transform = 'translate3d(' + (dirSign() * d * state.width).toFixed(2) + 'px,0,0)';
            el.style.opacity = String(1 - Math.min(1, Math.abs(d)) * 0.2);
        }
    }

    function clearOffsets() {
        for (let i = 0; i < state.pages.length; i++) {
            const el = state.pages[i];
            if (!el) continue;
            el.style.removeProperty('--m-d');
            if (!calcOk) { el.style.transform = ''; el.style.opacity = ''; }
        }
    }

    /* خطوط الاستوديو تُنزَّل أول مرة تدخل لوحة الاستوديو المدى — لا قبل فتح الإدارة */
    function ensureStudioFonts() {
        if (window.__mStudioFonts || !window.ROYAL_STUDIO_FONTS) return;
        window.__mStudioFonts = true;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = window.ROYAL_STUDIO_FONTS;
        document.head.appendChild(link);
    }

    /* المؤشر يتحرك من نفس الموضع العشري للصفحات.
       قياس الشريط محفوظ: قراءة clientWidth داخل كل إطار تُجبر المتصفح على تخطيط كامل
       وهو ما كان يُظهر التأخير في بداية السحب. */
    /* المؤشر كتلة سائل: تتأخر عن الإصبع بنبضة، تنضغط في اتجاه الحركة، ثم تتكتل
       وتستقر حول لوغو التبويب المفتوح. تُقرأ هندسة الشريط مرة واحدة وتُحفظ. */
    const ind = { pos: 0, vel: 0, raf: 0, init: false };

    function paintIndicator() {
        const el = document.querySelector('.m-ind');
        const bar = document.querySelector(BAR_SELECTOR);
        if (!el || !bar) return;
        const M = Math.max(1, state.barBtns.length);
        const pad = 5;
        if (!state.cell) {
            const w = bar.clientWidth;
            if (!w) return;
            state.barW = w;
            state.cell = (w - pad * 2) / M;
        }
        const target = clamp(barPosFor(phys.P), 0, M - 1);
        if (!ind.init) { ind.init = true; ind.pos = target; ind.vel = 0; }
        const cell = state.cell;
        const left = dirSign() < 0 ? (state.barW - pad - (ind.pos + 1) * cell) : (pad + ind.pos * cell);
        const sq = Math.min(0.3, Math.abs(ind.vel) * 0.85);
        el.style.width = cell + 'px';
        el.style.transform = 'translate3d(' + left.toFixed(2) + 'px,0,0) scale(' +
            (1 + sq).toFixed(3) + ',' + (1 - sq * 0.5).toFixed(3) + ')';
        el.style.setProperty('--m-sq', sq.toFixed(3));
        const bi = barIndexOfPage(pageForPos(phys.P));
        state.barBtns.forEach((b, i) => b.classList.toggle('m-hi', i === bi));
        /* نابض: قريبة = تسارع، وكبح = استقرار. يُلغى الإطار حين لا فرق باقٍ */
        const d = target - ind.pos;
        ind.vel += d * 0.3 - ind.vel * 0.42;
        ind.pos += ind.vel;
        if (Math.abs(target - ind.pos) > 0.0015 || Math.abs(ind.vel) > 0.0015) {
            if (!ind.raf) ind.raf = requestAnimationFrame(() => { ind.raf = 0; paintIndicator(); });
        } else {
            ind.pos = target; ind.vel = 0;
            if (ind.raf) { cancelAnimationFrame(ind.raf); ind.raf = 0; }
        }
    }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function barIndexOfPage(pageIdx) {
        const key = state.keys[pageIdx];
        let i = state.barKeys.indexOf(key);
        if (i === -1) i = state.barKeys.indexOf('more-menu');
        if (i === -1) i = 0;
        return i;
    }

    function barPosFor(P) {
        const lo = clamp(Math.floor(P), 0, state.n - 1);
        const hi = clamp(lo + 1, 0, state.n - 1);
        const frac = clamp(P - lo, 0, 1);
        return barIndexOfPage(lo) + (barIndexOfPage(hi) - barIndexOfPage(lo)) * frac;
    }

    /* ====================== محرك السحب الفيزيائي ====================== */
    const phys = {
        touching: false,
        axis: 'none',
        startX: 0, startY: 0,
        P0: 0, P: 0,
        samples: [],
        raf: 0
    };

    const OMEGA = 15;

    function rubber(v) {
        const x = Math.abs(v);
        return (1 - 1 / (x * 0.55 + 1)) * Math.sign(v);
    }

    function onPointerStart(e) {
        if (!state.started || document.body.classList.contains('m-sheet-open')) return;
        const touches = e.touches;
        if (touches && touches.length > 1) {
            /* pinch أو إصبعان: نوقف السحب ونثبت أقرب موضع بدون قفزة */
            if (phys.touching || phys.raf) {
                phys.touching = false;
                phys.axis = 'none';
                document.body.classList.remove('m-dragging');
                springTo(Math.round(phys.P), velocity());
            }
            return;
        }
        const admin = document.getElementById(ADMIN_ID);
        if (!admin || !admin.classList.contains('active-screen')) return;
        if (e.target.closest('.m-ind, .modal-overlay, #workspace-container, [data-m-no-drag]')) return;

        cacheWidth();
        stopSpring();
        phys.touching = true;
        phys.axis = 'none';
        phys.startX = touches ? touches[0].clientX : e.clientX;
        phys.startY = touches ? touches[0].clientY : e.clientY;
        phys.P0 = phys.P;
        phys.samples = [{ t: now(), x: phys.P }];
        setBusy(true);
    }

    function onPointerMove(e) {
        if (!phys.touching) return;
        if (e.touches && e.touches.length > 1) return;
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = x - phys.startX;
        const dy = y - phys.startY;

        if (phys.axis === 'none') {
            if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
            if (Math.abs(dy) > Math.abs(dx)) { abortGesture(); return; }
            if (blocksHorizontalScroll(e.target, dx)) { abortGesture(); return; }
                  phys.axis = 'x';
            document.body.classList.add('m-dragging');
            setBusy(true);
        }

        /* 1:1 مع الإصبع + مرونة عند الحدود — والحد هنا هو مدى الشريط لا كل اللوحات */
        const lim = bounds();
        const step = dx / state.width;
        let raw = dirSign() < 0 ? phys.P0 + step : phys.P0 - step;
        let over = 0;
        if (raw < lim[0]) { over = raw - lim[0]; raw = lim[0]; }
        if (raw > lim[1]) { over = raw - lim[1]; raw = lim[1]; }
        phys.P = clamp(raw + rubber(over), lim[0] - 0.5, lim[1] + 0.5);
        phys.samples.push({ t: now(), x: phys.P });
        while (phys.samples.length > 2 && now() - phys.samples[0].t > 100) phys.samples.shift();
        paintTransforms();
    }

    /* لا نبدأ سحب التبويبات إذا بدأت اللمسة داخل منطقة تمرير أفقي ولم تصل لحافتها */
    function blocksHorizontalScroll(target, dx) {
        const scroller = target && target.closest ? target.closest('table, .cart-table, .invoices-table, [style*="overflow"], .admin-filters, .icon-picker-grid, #workspace-container') : null;
        if (!scroller) return false;
        if (scroller.scrollWidth <= scroller.clientWidth + 1) return false;
        const atStart = scroller.scrollLeft <= 0;
        const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
        const goingForward = dx < 0;
        if (dirSign() < 0) return goingForward ? !atStart : !atEnd;
        return goingForward ? !atEnd : !atStart;
    }

    function onPointerEnd(e) {
        /* إصبع ما زال على الشاشة: لا نهتم بتحرير الحركة */
        if (e && e.touches && e.touches.length > 0) return;
       if (!phys.touching) {
            if (state.busy) { setBusy(false); setTimeout(flushRepaint, 600); }
            return;
        }
        phys.touching = false;
        document.body.classList.remove('m-dragging');
        if (phys.axis !== 'x') { finishGesture(); return; }

        const v = velocity();
        const lim = bounds();
        let target = Math.round(phys.P + v * 0.2);
        target = clamp(target, phys.P0 - 1, phys.P0 + 1);
        target = clamp(target, lim[0], lim[1]);
        springTo(target, v);
    }

    function velocity() {
        const t = now();
        const last = phys.samples[phys.samples.length - 1];
        if (!last || t - last.t > 90) return 0;
        let i = phys.samples.length - 1;
        while (i > 0 && t - phys.samples[i].t < 100) i--;
        const a = phys.samples[i];
        const dt = (last.t - a.t) / 1000;
        if (dt <= 0.008) return 0;
        return (last.x - a.x) / dt;
    }

    /* نابض مثبّت حرجاً: x(s) = t + (A + B·s)·e^(−ω·s) */
    function springTo(t, v0) {
        stopSpring();
        const A = phys.P - t;
        const B = v0 + OMEGA * A;
        const s0 = now();
        let done = false;
        const step = () => {
            const s = (now() - s0) / 1000;
            const e = Math.exp(-OMEGA * s);
            const x = t + (A + B * s) * e;
            const v = e * (B - OMEGA * (A + B * s));
            phys.P = x;
            paintTransforms();
            if (Math.abs(x - t) < 0.0005 && Math.abs(v) < 0.01 || s > 1.5) {
                phys.P = t;
                paintTransforms();
                done = true;
                commit(t);
                return;
            }
            phys.raf = requestAnimationFrame(step);
        };
        phys.raf = requestAnimationFrame(step);
    }

    function stopSpring() { if (phys.raf) { cancelAnimationFrame(phys.raf); phys.raf = 0; } }

      function abortGesture() {
        const moved = Math.abs(phys.P - Math.round(phys.P)) > 0.001;
        phys.touching = false;
        phys.axis = 'none';
        document.body.classList.remove('m-dragging');
        /* سحب عمودي عادي: لا نابض ولا commit ولا حركة دخول */
        if (moved) { springTo(Math.round(phys.P), 0); return; }
        phys.P = Math.round(phys.P);
    }

    function finishGesture() { setBusy(false); setTimeout(flushRepaint, 260); }

    function commit(vPos) {
        const i = pageForPos(vPos);
        phys.P = vpos(i);
        state.index = i;
        paintTransforms();
        document.body.classList.remove('m-dragging');
        const key = state.keys[i];
        if (key && key !== currentTabKey()) routeOriginal(key);
        syncA11y();
        onArrive(key);
        setBusy(false);
        if (changed) enterAnimate(state.pages[i]);
        setTimeout(() => { flushRepaint(); syncFlow(); }, 520);
    }

    /* نستدعي دالة التوجيه الأصلية مباشرة: التفاف الطبقة يفعّل الحركة، والسحب هنا يفعّلها بنفسه */
    function routeOriginal(key) {
        const fn = window.switchAdminTab;
        if (typeof fn !== 'function') return;
        (fn.__mOriginal || fn).call(window, key, 'none');
    }

    function currentTabKey() {
        const el = document.querySelector('.admin-section.active');
        return (el ? el.id.replace(/^admin-/, '') : null) || store.get('admin_tab') || state.keys[0];
    }

    function setBusy(v) {
        state.busy = v;
        document.body.classList.toggle('m-dragging', v && phys.axis === 'x');
        const lo = clamp(Math.floor(phys.P) - 1, 0, state.n - 1);
        const hi = clamp(Math.ceil(phys.P) + 1, 0, state.n - 1);
        for (let i = lo; i <= hi; i++) {
                        if (state.pages[i]) state.pages[i].style.willChange = (v && phys.axis === 'x') ? 'transform' : 'auto';
        }
    }

    const now = () => (window.performance && performance.now ? performance.now() : Date.now());

    function bindGestures() {
        const admin = document.getElementById(ADMIN_ID);
        if (!admin) return;
        admin.addEventListener('touchstart', onPointerStart, { passive: true });
        admin.addEventListener('touchmove', onPointerMove, { passive: true });
        admin.addEventListener('touchend', onPointerEnd, { passive: true });
        admin.addEventListener('touchcancel', onPointerEnd, { passive: true });
        /* دعم القلم/الماوس على التابلت دون المساس بلمسة الهاتف */
        admin.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') onPointerStart(e); }, { passive: true });
        admin.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && phys.touching) onPointerMove(e); }, { passive: true });
        admin.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') onPointerEnd(); }, { passive: true });
        admin.addEventListener('pointercancel', () => { if (phys.touching) onPointerEnd(); }, { passive: true });
    }

    /* ================== منع المطّ داخل اللوحات ==================
       آيفون يمدّ المحتوى عند طرف التمرير ثم يردّه ارتجاجاً، فتقفز الصفحة مع كل
       نزول وصعود. المنع يكون بلمسة واحدة غير سلبية عند الحدّ فقط: حركة رأسية
       أسوأ من أن تُنتج تمريراً فعلياً. ولا تُمسّ حركة السحب الأفقي بين التبويبات. */
    function bindBounceGuard() {
        let sy = 0, sx = 0, sc = null, armed = false;
        document.addEventListener('touchstart', (e) => {
            armed = false;
            if (!e.touches || e.touches.length !== 1) return;
            const t = e.target;
            const box = t && t.closest ? t.closest('.admin-section, .modal-content') : null;
            if (!box) return;
            sy = e.touches[0].clientY; sx = e.touches[0].clientX;
            sc = box; armed = true;
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!armed || !sc || !e.touches || e.touches.length !== 1) return;
            const dy = e.touches[0].clientY - sy;
            const dx = e.touches[0].clientX - sx;
            if (Math.abs(dy) <= Math.abs(dx)) return;
            const max = sc.scrollHeight - sc.clientHeight;
            if (max <= 1) { e.preventDefault(); return; }
            const atTop = sc.scrollTop <= 0;
            const atEnd = sc.scrollTop >= max - 1;
            if ((dy > 0 && atTop) || (dy < 0 && atEnd)) e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchend', () => { armed = false; }, { passive: true });
        document.addEventListener('touchcancel', () => { armed = false; }, { passive: true });
    }

    /* ================= إعادة الرسم المنظمة (debounce + إرجاء) ================= */
    const RENDERERS = ['updateAdminDashboard', 'renderLogs', 'renderAdminSubs'];
    const originals = {};
    let repaintTimer = 0;
    function setPending() { state.pendingRepaint = true; }

    function scheduleRepaint() {
        if (!state.started) return;
        if (state.busy) { setPending(); return; }
        if (repaintTimer) return;
        repaintTimer = setTimeout(() => {
            repaintTimer = 0;
            runRepaint();
        }, 150);
    }

    /* استدعاء الدوال الأصلية مباشرة: الطبقة لا تُعيد نفسها في حلقة رسم */
    function callOriginal(name) {
        const fn = originals[name] || window[name];
        if (typeof fn === 'function') fn.call(window);
    }

    /* اللوحة الظاهرة التي لا تمرّ تُقفل عنها حركة التمرير: آيفون حينئذٍ لا يبني
       لها طبقة تمرير يمدّها ويرتجّ عندها، فيسقط سبب الارتجاج من أصله.
       القياس للظاهرة وحدها: المخفية عرضها صفر، فقياسها يقفل التمرير بالغلط. */
    function syncFlow() {
        const cur = state.pages[state.index];
        state.pages.forEach((p) => { if (p && p !== cur) p.classList.remove('m-noflow'); });
        if (!cur || !cur.classList.contains('m-seen')) return;
        cur.classList.toggle('m-noflow', cur.scrollHeight - cur.clientHeight <= 1);
    }

    function runRepaint() {
        const page = state.pages[state.index];
        const top = page ? page.scrollTop : 0;
        const openSheets = qsa('.modal-overlay.m-sheet.m-on .modal-content');
        const sheetTops = openSheets.map((c) => c.scrollTop);
        try {
            callOriginal('updateAdminDashboard');
            const k = state.keys[state.index];
            if (k === 'logs') callOriginal('renderLogs');
            if (k === 'subscriptions') callOriginal('renderAdminSubs');
        } catch (err) { console.warn('mobile repaint:', err); }
        markSyncTime();
        paintToday();
        if (page && Math.abs(page.scrollTop - top) > 2) page.scrollTop = top;
        openSheets.forEach((c, i) => { if (Math.abs(c.scrollTop - sheetTops[i]) > 2) c.scrollTop = sheetTops[i]; });
        syncFlow();
    }

    function flushRepaint() {
        if (!state.pendingRepaint) return;
        state.pendingRepaint = false;
        runRepaint();
    }

    function wrapRepainters() {
        RENDERERS.forEach((name) => {
            const original = window[name];
            if (typeof original !== 'function' || original.__mWrapped) return;
            originals[name] = original;
            const wrapped = function () {
                if (!originals[name]) return original.apply(window, arguments);
                scheduleRepaint();
                setPending();
            };
            wrapped.__mWrapped = true;
            wrapped.__mOriginal = original;
            window[name] = wrapped;
        });
    }

    function unwrapRepainters() {
        RENDERERS.forEach((name) => {
            const fn = window[name];
            if (fn && fn.__mOriginal) window[name] = fn.__mOriginal;
            delete originals[name];
        });
    }

    /* عند الوصول لتبويب: رسم فوري من نفس دوال النظام */
    function onArrive(key) {
        if (!key) return;
        setPending();
        if (state.busy) return;
        flushRepaint();
    }

    function pageOf(key) { return document.getElementById('admin-' + key); }

    /* ================== النوافذ السفلية فوق المنبثقات ================== */
    const sheetStack = [];
    let pushing = false;

    function sheetExempt(el) {
        return el.id === 'modal-admin-login' || el.id === 'modal-ota-update' || el.id === 'update-modal' || el.id === 'modal-shift-report';
    }

    function observeSheets() {
        qsa('.modal-overlay').forEach((el) => {
            if (el.dataset.mSheetObs === '1') return;
            el.dataset.mSheetObs = '1';
            new MutationObserver(() => syncSheet(el)).observe(el, { attributes: true, attributeFilter: ['style'] });
            el.addEventListener('touchstart', (e) => {
                if (e.target === el && !sheetExempt(el)) requestSheetClose(el);
            }, { passive: true });
            syncSheet(el);
        });
        window.addEventListener('popstate', onPop);
    }

    function syncSheet(el) {
        if (sheetExempt(el)) return;
        const open = /(^|;)\s*display:\s*flex/.test(el.getAttribute('style') || '');
        const known = el.classList.contains('m-sheet');
        if (open && !known) openSheet(el);
        else if (!open && known) closeSheet(el);
    }

    function openSheet(el) {
        el.classList.remove('m-closing');
        el.classList.add('m-sheet');
        document.body.classList.add('m-sheet-open');
        const content = el.querySelector('.modal-content');
        if (content) {
            el.style.removeProperty('padding-bottom');
            content.style.removeProperty('height');
            content.style.removeProperty('max-height');
            content.style.removeProperty('transform');
        }
        if (content && !content.querySelector('.m-grab')) {
            const grab = document.createElement('div');
            grab.className = 'm-grab';
            content.insertBefore(grab, content.firstChild);
        }
        addCloseButton(el, content);
        decorateSheet(el, content);
        lockBackground();
        bindSheetDrag(el, content);
        if (content) meterSheets(content);
        sheetStack.push(el);
        if (!pushing) {
            pushing = true;
            try { history.pushState({ royalSheet: el.id }, ''); } catch (e) {}
            pushing = false;
        }
        /* قراءة تخطيط واحدة لتثبيت الوضع الأول ثم التحريك، بلا انتظار إطار رسم */
        void el.offsetHeight;
        el.classList.add('m-on', 'm-in');
        setTimeout(() => el.classList.remove('m-in'), 330);
    }

    function addCloseButton(el, content) {
        if (!content || el.querySelector('.m-sheet-x')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm-sheet-x';
        btn.setAttribute('aria-label', 'إغلاق');
        btn.textContent = '×';
        btn.addEventListener('click', () => requestSheetClose(el));
        content.insertBefore(btn, content.firstChild);
    }

    /* ================== تفصيل نافذة بعينها بعد فتحها ==================
       النوافذ كلها تُبنى من ملف النظام، والطبقة تُعيد ترتيب ما يُزعج في الجوال
       منها فقط: رأس ثابت، ملخّص، وأزرار ظاهرة — دون المساس بمحتوى الجدول نفسه. */
    function decorateSheet(el, content) {
        if (!content) return;
        if (el.id === 'modal-admin-expenses') decorateExpenses(el, content);
    }

    function decorateExpenses(el, content) {
        content.classList.add('mobile-sticky-modal', 'm-exp-modal');
        const table = content.querySelector('table');
        if (!table) return;
        let body = content.querySelector('.modal-body-scrollable');
        if (!body) {
            body = document.createElement('div');
            body.className = 'modal-body-scrollable';
            content.insertBefore(body, table);
        }
        if (table.parentNode !== body) body.appendChild(table);
        const empty = document.createElement('p');
        empty.className = 'm-exp-empty';
        empty.innerHTML = '<i class="fa-solid fa-inbox"></i><span>لا صرفيات في هذه الفترة</span>';
        body.appendChild(empty);
        const tbody = document.getElementById('admin-expenses-detail-body');
        const rows = tbody ? qsa('tr', tbody) : [];
        let sum = 0;
        rows.forEach((tr) => { const td = qsa('td', tr); if (td.length > 3) sum += num(td[3].textContent); });
        let chip = content.querySelector('.m-exp-sum');
        if (!chip) {
            chip = document.createElement('div');
            chip.className = 'm-exp-sum';
            const title = content.querySelector('.modal-title');
            if (title) title.insertAdjacentElement('afterend', chip);
            else content.insertBefore(chip, content.firstChild);
        }
        chip.innerHTML = '<span><i class="fa-solid fa-receipt"></i> ' + rows.length + ' حركة</span>' +
            '<b>' + money(sum) + ' <em>د.ع</em></b>';
        empty.style.display = rows.length ? 'none' : 'flex';
    }

    function requestSheetClose(el) {
        /* نمرّر عبر زر الإلغاء الرسمي للنافذة نفسها إن وُجد، ولا نغلق بقية النوافذ */
        const cancel = el.querySelector('.btn-cancel[onclick*="close"], .modal-actions [onclick*="close"]');
        if (cancel) { cancel.click(); return; }
        el.style.display = 'none';
        syncSheet(el);
    }

    /* لحظة الإغلاق: تُثبَّت أبعاد النافذة على آخر ما قيست وهي ظاهرة. النظام يُخفي
       النافذة قبل أن تصلنا المراقبة، فلا يُمكن قياسها في تلك اللحظة، وبقاء ارتفاع
       لوحة المفاتيح مثبّتاً هو ما يمنع النافذة من الهبوط ثم الصعود ثم الاختفاء. */
    let sheetMeter = null;
    function meterSheets(content) {
        if (!window.ResizeObserver) return;
        if (!sheetMeter) {
            sheetMeter = new ResizeObserver((entries) => {
                for (let i = 0; i < entries.length; i++) {
                    const e = entries[i];
                    const bb = e.borderBoxSize;
                    const h = bb && bb[0] ? Math.round(bb[0].blockSize) : Math.round(e.contentRect.height);
                    if (!h) continue;
                    const ov = e.target.closest('.modal-overlay');
                    if (!ov || ov.classList.contains('m-closing')) continue;
                    ov.__mH = h;
                }
            });
        }
        sheetMeter.observe(content);
    }

    function freezeSheet(el) {
        const content = el.querySelector('.modal-content');
        if (!content) return;
        const live = content.offsetHeight;
        const h = live || el.__mH || 0;
        if (!h) return;
        /* السطر المكتوب على النافذة نفسها يُقرأ حتى وهي مخفية، فلا حاجة لقياسها */
        const pad = Math.round(parseFloat(el.style.paddingBottom) || 0);
        el.style.setProperty('padding-bottom', pad + 'px', 'important');
        content.style.setProperty('height', h + 'px', 'important');
        content.style.setProperty('max-height', 'none', 'important');
        setTimeout(() => {
            el.style.removeProperty('padding-bottom');
            content.style.removeProperty('height');
            content.style.removeProperty('max-height');
        }, 380);
    }

    function closeSheet(el, skipHistory, instant) {
        if (el.classList.contains('m-closing')) return;
        if (instant) {
            /* التنقل لا ينتظر الانزلاق: اللوحة الجديدة تصعد خلف هذه النافذة،
               فأي حركة خروج تبقى فوقها تُرى كنافذة معلّقة. */
            el.classList.remove('m-on', 'm-sheet', 'm-in');
        } else {
            freezeSheet(el);
            el.classList.remove('m-on');
            el.classList.add('m-closing');
            setTimeout(() => {
                if (el.classList.contains('m-on')) return;
                /* نبقي m-sheet علامةً على النافذة المفتوحة، فإزالتها هنا تجعل إعادة الفتح تعمل */
                el.classList.remove('m-closing', 'm-sheet', 'm-in');
            }, 340);
        }
        const i = sheetStack.lastIndexOf(el);
        if (i > -1) sheetStack.splice(i, 1);
        if (!sheetStack.length) {
            document.body.classList.remove('m-sheet-open');
            unlockBackground();
        }
        if (!pushing && !skipHistory && !sheetStack.length && history.state && history.state.royalSheet) {
            pushing = true;
            try { history.back(); } catch (e) {}
            setTimeout(() => { pushing = false; }, 250);
        }
    }

    /* التنقل إلى تبويب آخر يُغلق كل نافذة مفتوحة في نفس اللحظة، بمسار إغلاق النظام
       نفسه، وبلا انزلاق خروج. لا يبقى شيء معلّق فوق اللوحة الجديدة. */
    function closeOpenSheets() {
        if (!sheetStack.length) return;
        const list = sheetStack.slice();
        sheetStack.length = 0;
        document.body.classList.remove('m-sheet-open');
        unlockBackground();
        pushing = true;
        for (let i = 0; i < list.length; i++) {
            const el = list[i];
            const cancel = el.querySelector('.btn-cancel[onclick*="close"], .modal-actions [onclick*="close"]');
            if (cancel) cancel.click();
            else el.style.display = 'none';
            closeSheet(el, true, true);
        }
        setTimeout(() => { pushing = false; }, 260);
        if (history.state && history.state.royalSheet) {
            try { history.back(); } catch (e) {}
        }
    }

    function onPop() {
        if (pushing) return;
        const el = sheetStack[sheetStack.length - 1];
        if (el) { requestSheetClose(el); return; }
        if (typeof window.exitToMain === 'function' && document.getElementById(ADMIN_ID).classList.contains('active-screen')) return;
    }

    /* تجميد الخلفية باللمس فقط، لا بتغيير overflow: تغييرها في سفاري يصفّر موضع
       التمرير إلى الصفر ثم نستعيده، فتقفل النافذة بصفحة تهبط وتصعد. */
    function lockBackground() {
        document.body.classList.add('m-lock');
    }
    function unlockBackground() {
        document.body.classList.remove('m-lock');
    }

    /* سحب النافذة للأسفل للإغلاق */
    function bindSheetDrag(el, content) {
        if (!content || content.dataset.mDragBound === '1') return;
        content.dataset.mDragBound = '1';
        let sy = 0, dy = 0, active = false, t0 = 0;
        content.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            const scrollerIsTop = content.scrollTop <= 0;
            const onHeader = !!e.target.closest('.modal-title, .m-grab, .m-sheet-x');
            if (!scrollerIsTop && !onHeader) return;
            active = true; sy = e.touches[0].clientY; dy = 0; t0 = now();
            content.classList.add('m-live');
        }, { passive: true });
        content.addEventListener('touchmove', (e) => {
            if (!active) return;
            dy = e.touches[0].clientY - sy;
            if (dy < 0) dy *= 0.25;
            content.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
        }, { passive: true });
        const end = () => {
            if (!active) return;
            active = false;
            content.classList.remove('m-live');
            const v = dy / Math.max(16, now() - t0);
            content.style.transform = '';
            if (dy > 120 || v > 0.9) requestSheetClose(el);
        };
        content.addEventListener('touchend', end, { passive: true });
        content.addEventListener('touchcancel', end, { passive: true });
    }

    /* لوحة المفاتيح: لا تغطي النافذة الحقل النشط.
       الآيفون يغيّر visualViewport كلما صعد شريط العنوان أو انزلقت الصفحة، فلو حسبنا
       كل فرقٍ لوحة مفاتيح لتحرك شريط التبويبات مع التمرير. لذلك لا يُعتد بالفرق إلا
       مع حقل كتابة مُركّز عليه، وبمقدار يشبه لوحة مفاتيح فعلية. */
    function isEditing() {
        const a = document.activeElement;
        if (!a || !a.tagName) return false;
        if (!/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
        const t = (a.type || '').toLowerCase();
        return t !== 'checkbox' && t !== 'radio' && t !== 'range' && t !== 'file' && t !== 'button';
    }

    /* رفع النافذة فوق لوحة المفاتيح: القيم تُكتب على النافذة نفسها لا على متغيّر
       عام، فلا تتغير أبعاد نافذة إلا حين يتغيّر وضعها هي. */
    function raiseSheet(el, kb) {
        const content = el.querySelector('.modal-content');
        if (!content) return;
        if (kb > 0) {
            el.style.setProperty('padding-bottom', kb + 'px', 'important');
            content.style.setProperty('max-height', Math.max(160, Math.round(window.innerHeight * .92) - kb) + 'px', 'important');
        } else {
            el.style.removeProperty('padding-bottom');
            content.style.removeProperty('max-height');
        }
    }

    /* المستند مُثبّت، فالآيفون لم يعد يمرّر تلقائياً لإظهار الحقل خلف لوحة المفاتيح.
       الرفع يشمل كل منبثقة فيها حقل نشط لا النوافذ المنزلاقة وحدها: شاشة كلمة
       المرور مثلاً وسَطية ومُستثناة من الانزلاق، فبدون هذا تبقى تحت اللوحة. */
    /* حقل داخل لوحة بلا منبثقة: المستند مثبّت، فالنظام لم يعد يمرّر تلقائياً لإظهار
       الحقل خلف لوحة المفاتيح. نُوسّع أسفل اللوحة ثم نزيحها بقدر يُظهر الحقل فوقها. */
    let kbPadEl = null;
    function revealInPage(field, kb) {
        const sec = kb > 0 && field && field.closest ? field.closest('.admin-section') : null;
        if (kbPadEl && kbPadEl !== sec) {
            kbPadEl.style.removeProperty('padding-bottom');
            kbPadEl = null;
        }
        if (!sec) return;
        const limit = window.innerHeight - kb - 18;
        const bottom = field.getBoundingClientRect().bottom;
        if (bottom <= limit) return;
        /* التوسيع مرة واحدة للوحة نفسها: تكراره مع كل حقل يزيد أسفل الصفحة بلا داعٍ */
        if (kbPadEl !== sec) {
            sec.style.setProperty('padding-bottom',
                Math.round(parseFloat(getComputedStyle(sec).paddingBottom) + kb) + 'px', 'important');
            kbPadEl = sec;
        }
        sec.scrollTop += Math.round(bottom - limit);
    }

    function bindKeyboard() {
        if (!window.visualViewport) return;
        const apply = () => {
            let kb = 0;
            let host = null;
            if (isEditing()) {
                const a = document.activeElement;
                host = a && a.closest ? a.closest('.modal-overlay') : null;
                const gap = Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop);
                if (gap >= 90) kb = gap;
            }
            if (state.kb !== kb) {
                state.kb = kb;
                root.style.setProperty('--m-kb', kb + 'px');
            }
            /* لا يرتفع إلا الوعاء الذي فيه الحقل، والنوافذ المنزلاقة تُترك كما هي:
               تغيير أبعادها أثناء الخروج هو ما يجعلها تهبط ثم تصعد ثم تختفي */
            qsa('.modal-overlay').forEach((s) => {
                if (s.classList.contains('m-closing')) return;
                if (host !== s && !/display:\s*flex/.test(s.getAttribute('style') || '')) return;
                raiseSheet(s, kb > 0 && s === host ? kb : 0);
            });
            /* حقل داخل لوحة بلا منبثقة: المستند مثبّت، فالنظام لم يعد يمرّر إليه من
               تلقاء نفسه. نُوسّع أسفل اللوحة ثم نزيحها بقدر يُظهر الحقل فوق اللوحة،
               ونعيد ما وسّعناه حين تنزل. */
            revealInPage(kb > 0 && !host ? document.activeElement : null, kb > 0 && !host ? kb : 0);
        };
        visualViewport.addEventListener('resize', apply, { passive: true });
        visualViewport.addEventListener('scroll', apply, { passive: true });
        document.addEventListener('focusin', apply, { passive: true });
        document.addEventListener('focusout', apply, { passive: true });
        apply();
    }

    /* ================== لوحة «تفاصيل اليوم» ==================
       عرض فقط: الأرقام تُقرأ من سطر اليوم في جدول التقارير اليومية الذي يبنيه
       النظام نفسه، فلا يُحسب مبلغ ولا تُلمس قاعدة بيانات. الرابع (قيمة الطلبات
       المسجلة) يأتي من دالة قراءة إضافية في النظام تُرجع المجموع من نفس المصدر. */
    const TODAY_LINES = [
        ['sales', 'fa-money-bill-trend-up', 'المبيعات اليومية', 'up'],
        ['orders', 'fa-receipt', 'مبلغ الطلبات المسجلة', 'info'],
        ['expenses', 'fa-money-bill-transfer', 'الصرفيات', 'down'],
        ['net', 'fa-scale-balanced', 'الدخل الصافي', 'sum']
    ];
    let todayEl = null;

    function num(txt) {
        let s = String(txt == null ? '' : txt);
        s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
             .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
        const m = /-?\d[\d,.]*/.exec(s.replace(/[^\d.,-]/g, ''));
        if (!m) return 0;
        const n = parseFloat(m[0].replace(/[,.]/g, ''));
        return isFinite(n) ? Math.round(n) : 0;
    }

    function money(n) {
        const el = document.createElement('span');
        el.textContent = (n || 0).toLocaleString();
        return el.textContent;
    }

    function buildTodayPanel() {
        const page = pageOf('daily-report');
        if (!page || page.querySelector('.m-today')) return;
        const wrap = document.createElement('section');
        wrap.className = 'm-today';
        wrap.innerHTML =
            '<div class="m-today-head"><i class="fa-solid fa-sun"></i><span>تفاصيل اليوم</span>' +
            '<b class="m-today-date"></b></div><div class="m-today-rows">' +
            TODAY_LINES.map((l, k) =>
                '<div class="m-today-row ' + l[3] + '" data-k="' + l[0] + '" style="--m-r:' + k + '">' +
                '<i class="fa-solid ' + l[1] + '"></i>' +
                '<div class="m-today-meta"><span>' + l[2] + '</span><em class="m-today-bar"><i></i></em></div>' +
                '<b class="m-today-val">0</b></div>'
            ).join('') + '</div>';
        page.appendChild(wrap);
        todayEl = wrap;
    }

    function todayRow() {
        const body = document.getElementById('admin-daily-reports-body');
        if (!body) return null;
        let key = '';
        try { key = typeof window.royalTodayKey === 'function' ? String(window.royalTodayKey()) : ''; } catch (e) { key = ''; }
        if (!key) return null;
        const rows = qsa('tr', body);
        for (let i = 0; i < rows.length; i++) {
            const td = qsa('td', rows[i]);
            if (td.length >= 6 && (td[0].textContent || '').trim() === key) return td;
        }
        return null;
    }

    function paintToday() {
        if (!todayEl) buildTodayPanel();
        if (!todayEl) return;
        const td = todayRow();
        const sales = td ? num(td[2].textContent) : 0;
        const expenses = td ? num(td[3].textContent) : 0;
        let orders = 0;
        try { orders = num(typeof window.royalTodayOrdersValue === 'function' ? window.royalTodayOrdersValue() : 0); } catch (e) { orders = 0; }
        const net = td && td.length > 5 ? num(td[5].textContent) : sales - expenses;
        const vals = { sales: sales, orders: orders, expenses: expenses, net: net };
        const peak = Math.max(sales, orders, expenses, 1);
        TODAY_LINES.forEach((l) => {
            const row = todayEl.querySelector('[data-k="' + l[0] + '"]');
            if (!row) return;
            const v = vals[l[0]];
            const cell = row.querySelector('.m-today-val');
            const text = money(v) + ' د.ع';
            if (cell.textContent !== text) cell.textContent = text;
            row.classList.toggle('neg', v < 0);
            const fill = row.querySelector('.m-today-bar i');
            const pct = Math.max(4, Math.min(100, Math.round(Math.abs(v) / peak * 100)));
            const w = pct + '%';
            if (fill.style.width !== w) fill.style.width = w;
        });
        const d = todayEl.querySelector('.m-today-date');
        let key = '';
        try { key = typeof window.royalTodayKey === 'function' ? String(window.royalTodayKey()) : ''; } catch (e) {}
        const label = key ? new Intl.DateTimeFormat('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })
            .format(new Date(key + 'T12:00:00')) : '';
        if (label && d.textContent !== label) d.textContent = label;
    }

    function bindTodayPanel() {
        buildTodayPanel();
        paintToday();
        if (state.todayTimer) return;
        /* يتحدث وحده كل دقيقة طالما الإدارة مفتوحة: يوم جديد يدخل بلا إعادة تحميل */
        state.todayTimer = setInterval(() => {
            if (!document.getElementById(ADMIN_ID).classList.contains('active-screen')) return;
            if (document.hidden) return;
            paintToday();
        }, 60000);
    }

    /* ================== شاشة الدخول والقفل ==================
       المشهد كله عرض: الرمز يُكتب في حقل النظام نفسه (admin-password) ثم تُستدعى
       checkAdminPassword كما هي، فالتحقق يبقى سحابياً بالكامل. الطبقة لا تعرف صحة
       الرمز ولا تُخمّنه: تنتظر حكم النظام من أثرين حقيقيين — صنف active-screen عند
       النجاح، وتوست التحذير عند الخطأ — وكلاهما قد يسبق نهاية الحركة، لذلك النتيجة
       تُنتظر في نهاية الجوقَة D لا قبلها. */
    const LOGIN_ID = 'modal-admin-login';
    const OTP_LEN = 4;
    const OTP_GAP = 12;
    const MASK_DIGITS = false;   // true = يستبدل الرقم نقطة بعد 400ms من كتابته
    const MASK_AFTER = 400;
    const VERDICT_MS = 6500;     // بعدها تُعدّ المحاولة انقطاع اتصال لا رمزاً خاطئاً
    const FX_SLOTS = [[0, 0], [1, 0], [0, 1], [1, 1]];

    const LK_SVG = {
        lock: '<svg class="m-lock" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.4 9.2V6.8a4.6 4.6 0 0 1 9.2 0v2.4"/><path d="M3.6 9.2h12.8a1.4 1.4 0 0 1 1.4 1.4v6a1.6 1.6 0 0 1-1.6 1.6H3.8a1.6 1.6 0 0 1-1.6-1.6v-6a1.4 1.4 0 0 1 1.4-1.4z"/><circle cx="10" cy="13.6" r="1.2"/></svg>',
        shield: '<svg class="m-shield" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.4 16.8 5v5.1c0 3.9-2.8 6.8-6.8 8.4-4-1.6-6.8-4.5-6.8-8.4V5z"/><path d="M6.7 10.1 9.2 12.6 13.5 7.5"/></svg>',
        core: '<svg viewBox="0 0 26 26" aria-hidden="true"><circle class="m-spin" cx="13" cy="13" r="9" stroke-dasharray="34 100"/><path class="m-tick" d="M6.4 13.6 11 18.2 19.8 8.2" opacity="0"/></svg>',
        pill: '<svg viewBox="0 0 13 14" aria-hidden="true"><path d="M3.4 6.2V4.4a3.1 3.1 0 0 1 6.2 0v1.8"/><path d="M2.2 6.2h8.6a1.2 1.2 0 0 1 1.2 1.2v4.4a1.2 1.2 0 0 1-1.2 1.2H2.2A1.2 1.2 0 0 1 1 11.8V7.4a1.2 1.2 0 0 1 1.2-1.2z"/></svg>'
    };

    /* ---- ساعة التسلسل: rAF واحد بدلتا-زمن، يتجمّد في الخلفية ويستأنف بلا قفزات ---- */
    function makeClock() {
        let t = 0, prev = 0, raf = 0, on = false;
        const jobs = [];
        function step(now) {
            if (!on) return;
            if (!prev) prev = now;
            const dt = Math.min(50, now - prev);
            prev = now;
            if (!document.hidden) {
                t += dt;
                for (let i = jobs.length - 1; i >= 0; i--) {
                    if (jobs[i].at <= t) {
                        const fn = jobs[i].fn;
                        jobs.splice(i, 1);
                        fn();
                    }
                }
            }
            raf = requestAnimationFrame(step);
        }
        return {
            after(ms, fn) { jobs.push({ at: t + ms, fn }); },
            start() { if (!on) { on = true; prev = 0; raf = requestAnimationFrame(step); } },
            stop() { on = false; if (raf) cancelAnimationFrame(raf); }
        };
    }

    /* ---- النابض المعاد استخدامه: عيّنة تذبذب مُخمَّد تحوَّل إلى إطارات WAAPI ----
       كل حركة في الشاشة تخرج من هنا، فليس فيها linear ولا ease جاهزة. عند تقليل
       الحركة تُختصر المدة إلى .16s ولا تُلغى، لأن سفاري يهمل الحركة المولَّدة لحظياً. */
    function springTrack(o) {
        o = o || {};
        if (REDUCED) return { steps: [0, 1], ms: 160 };
        const k = o.stiffness || 210, c = o.damping || 22, m = o.mass || 1;
        const rest = o.rest || 0.0012, dt = 1 / 64;
        let x = 0, v = 0, t = 0;
        const steps = [0];
        const cap = o.maxMs || 1500;
        while (t * 1000 < cap) {
            v += ((-k * (x - 1) - c * v) / m) * dt;
            x += v * dt;
            t += dt;
            steps.push(x);
            if (Math.abs(1 - x) < rest && Math.abs(v) < rest) break;
        }
        steps[steps.length - 1] = 1;
        return { steps: steps, ms: Math.max(130, Math.round(t * 1000)) };
    }

    /* commit: تُكتب الحالة النهائية سطرياً قبل التشغيل مع fill:none، فتنتهي الحركة على
       قيمة صحيحة ثابتة ولا تُترك حركة معلّقة تُظلّم على ما بعدها. */
    function spring(el, build, o, keep, commit) {
        if (!el) return null;
        if (!el.animate) { const f = build(1); Object.keys(f).forEach((k) => { el.style[k] = f[k]; }); return null; }
        const tr = springTrack(o);
        const frames = tr.steps.map((p) => build(p));
        const last = build(1);
        frames.push(last);
        if (commit) Object.keys(last).forEach((k) => { el.style[k] = last[k]; });
        const a = el.animate(frames, { duration: tr.ms, easing: 'linear', fill: commit ? 'none' : 'forwards' });
        if (keep) keep.push(a);
        return a;
    }

    const xf = (x, y, s) => ({ transform: 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')' });

    /* ---- قياس مخزَّن: لا قراءة تخطيط داخل تسلسل الفتح أو الإغلاق (فخّ سفاري) ---- */
    let lkRowW = 0;
    function slotX(i) {
        if (!lkRowW) {
            const row = document.querySelector('#' + LOGIN_ID + ' .m-otp');
            lkRowW = row ? row.clientWidth : 0;
        }
        const w = (lkRowW - OTP_GAP * (OTP_LEN - 1)) / OTP_LEN;
        const slot = dirSign() < 0 ? (OTP_LEN - 1 - i) : i;
        return { w: w, x: slot * (w + OTP_GAP) };
    }

    function cellsIn(ctx) { return qsa('.m-otp b', ctx || document); }

    function glideIn(ctx) { return (ctx || document).querySelector('.m-otp-glide'); }

    function lockCard() { return document.querySelector('#' + LOGIN_ID + ' .m-lk-card'); }

    /* الصفيحة المنزلقة: عنصر واحد ينتقل من خانة إلى خانة، ولا تُخفَّت خانة وتُظهر أخرى */
    function paintGlide(input, shell) {
        const g = glideIn(shell);
        if (!g) return;
        const len = input ? (input.value || '').length : 0;
        const s = slotX(Math.min(len, OTP_LEN - 1));
        const shown = !!len && document.activeElement === input && len < OTP_LEN;
        if (g.style.width !== s.w + 'px') g.style.width = s.w + 'px';
        g.classList.toggle('off', !shown);
        g.classList.toggle('hide-caret', !shown);
        const was = g.dataset.x || '';
        const now = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
        if (was !== now) {
            g.dataset.x = now;
            if (was) spring(g, (p) => ({ transform: 'translate3d(' + s.x.toFixed(2) + 'px,0,0)' }),
                { stiffness: 320, damping: 26 }, null, true);
            else g.style.transform = now;
        }
    }

    /* ---- الطلاء: حروف النظام تُرسم داخل وسام مستقل ليُنْبَض وحده بلا تضارب إزاحة ---- */
    const maskTimers = [];
    function paintOtp(input, shell) {
        const host = shell || document.getElementById(LOGIN_ID);
        if (!host) return;
        const v = input.value || '';
        maskTimers.length = 0;
        cellsIn(host).forEach((c, i) => {
            const raw = v[i] || '';
            const u = c.firstElementChild || c;
            if (u.textContent !== raw) u.textContent = raw;
            c.classList.toggle('filled', !!raw);
            c.classList.toggle('cur', i === Math.min(v.length, OTP_LEN - 1));
            if (MASK_DIGITS && raw) {
                maskTimers.push(setTimeout(() => {
                    if ((input.value || '')[i] === raw) u.textContent = '•';
                }, MASK_AFTER + i * 40));
            }
        });
        paintGlide(input, host);
        const shellEl = host.querySelector('.m-lk-shell') || host;
        shellEl.classList.toggle('lit', document.activeElement === input || !!v.length);
    }

    /* ---- الدخول: البطاقة والخانات تدخل بنابض واحد متدرّج 60ms لكل عقدة ---- */
    function playEntrance(shell) {
        if (shell.dataset.entered === '1') return;
        shell.dataset.entered = '1';
        const nodes = [shell].concat(qsa('.m-lk-chip, .modal-title, .m-lk-sub, .m-lk-foot, .m-lk-hint', shell));
        nodes.forEach((n, i) => {
            if (!n) return;
            const first = i === 0;
            setTimeout(() => {
                spring(n, (p) => ({
                    opacity: Math.min(1, p * 1.15).toFixed(3),
                    transform: 'translate3d(0,' + (18 * (1 - p)).toFixed(2) + 'px,0) scale(' + (0.98 + 0.02 * p).toFixed(4) + ')'
                }), first ? { stiffness: 170, damping: 19, maxMs: 650 } : { stiffness: 220, damping: 22 });
            }, first ? 0 : 60 * i);
        });
    }

    /* ---- حسم النتيجة: صنف النظام للتوست، وتوست النظام للخطأ ---- */
    let fxPending = null;

    function watchUnlock() {
        const admin = document.getElementById(ADMIN_ID);
        const toasts = document.getElementById('toast-container');
        if (!window.MutationObserver) return;
        if (admin) {
            new MutationObserver(() => {
                /* النجاح انتقال لا حالة: لو كانت اللوحة مفتوحة أصلاً، أو أُضيف أي صنف
                   آخر لها أثناء المحاولة، فلا يجوز أن يُقرأ ذلك دخولاً صحيحاً */
                if (!fxPending || fxPending.done) return;
                if (admin.classList.contains('active-screen') && !fxPending.admin0) fxPending.verdict('ok');
            }).observe(admin, { attributes: true, attributeFilter: ['class'] });
        }
        if (toasts) {
            new MutationObserver(() => {
                if (!fxPending || fxPending.done) return;
                const t = toasts.lastElementChild;
                /* توست جديد مختلف عن الذي كان وقت الإرسال، ومن نوع الخطأ وحده:
                   وإلا حُسب أي تنبيه عابر (شبكة، حفظ، تنبيه آخر) رفضاً للرمز */
                if (t && t !== fxPending.toast0 && t.classList.contains('toast-error')) fxPending.verdict('bad');
            }).observe(toasts, { childList: true });
        }
    }

    /* ---- المسرح: نسخة طبق الأصل من البطاقة، محصّن ضد closeModals وإخفاء النظام ---- */
    function makeStage(digits) {
        const real = document.querySelector('#' + LOGIN_ID + ' .m-lk-shell');
        if (!real) return null;
        const stage = document.createElement('div');
        stage.className = 'm-lk-fx';
        stage.setAttribute('aria-hidden', 'true');
        const shell = real.cloneNode(true);
        shell.classList.remove('lit');
        shell.removeAttribute('data-entered');
        /* حقل النظام لا يُستنسخ: معرّف مكرّر يضلّل getElementId، وهو طبقة مطلقة لا تؤثر في الارتفاع */
        const dup = shell.querySelector('.m-otp-input');
        if (dup) dup.remove();
        qsa('.modal-actions button', shell).forEach((b) => { b.disabled = true; b.removeAttribute('onclick'); });
        cellsIn(shell).forEach((c, i) => {
            c.style.animation = 'none';
            c.classList.toggle('filled', !!digits[i]);
            const u = c.firstElementChild || c;
            u.textContent = digits[i] || '';
        });
        const g = glideIn(shell);
        if (g) { g.classList.add('off'); g.style.transform = ''; }
        const err = shell.querySelector('.m-lk-err');
        if (err) err.classList.remove('on');
        stage.appendChild(shell);
        document.body.appendChild(stage);
        document.body.classList.add('m-lk-busy');
        return { stage: stage, shell: shell, cells: cellsIn(shell), row: shell.querySelector('.m-otp') };
    }

    /* ---- شبكة الوصل: أخٌ للبطاقة لا ابنٌ داخل اللوح، لأن القطع كان يقصّ العقد ---- */
    function netOverlay(shell, w, h) {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'm-lk-net');
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        const path = document.createElementNS(NS, 'path');
        svg.appendChild(path);
        const dots = [];
        for (let i = 0; i < OTP_LEN; i++) {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('r', '2.6');
            svg.appendChild(c);
            dots.push(c);
        }
        shell.appendChild(svg);
        return { svg: svg, path: path, dots: dots };
    }

    /* ---- الرشّات: لوحة واحدة، دقّة مقصوصة على 2، والحلقة تموت بموت آخر جزيء ---- */
    function burst(host, cx, cy) {
        if (REDUCED || !host || !host.getContext) return null;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = host.clientWidth, h = host.clientHeight;
        host.width = Math.round(w * dpr);
        host.height = Math.round(h * dpr);
        const ctx = host.getContext('2d');
        ctx.scale(dpr, dpr);
        const cols = ['#22c55e', '#4ade80', '#38bdf8', '#ffffff'];
        const parts = [];
        for (let i = 0; i < 54; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 170 + Math.random() * 350;
            parts.push({
                x: cx, y: cy,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
                r: 3 + Math.random() * 6,
                sq: Math.random() < 0.42,
                rot: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 9,
                life: 0.9 + Math.random() * 0.6,
                age: 0,
                c: cols[i % cols.length]
            });
        }
        let prev = 0, raf = 0, dead = false;
        function frame(now) {
            if (dead) return;
            const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0.016;
            prev = now;
            ctx.clearRect(0, 0, w, h);
            let alive = 0;
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                if (p.age > p.life) continue;
                alive++;
                p.age += dt;
                p.vy += 900 * dt;
                const drag = Math.max(0, 1 - 2.1 * dt);
                p.vx *= drag;
                p.vy *= drag;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.spin * dt;
                const k = Math.max(0, 1 - p.age / p.life);
                ctx.globalAlpha = k * k;
                ctx.fillStyle = p.c;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                if (p.sq) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
                else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            if (alive) raf = requestAnimationFrame(frame);
            else ctx.clearRect(0, 0, w, h);
        }
        raf = requestAnimationFrame(frame);
        return () => { dead = true; if (raf) cancelAnimationFrame(raf); };
    }

    function haptic(pattern) {
        if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
    }

    /* الإعلان لقارئ الشاشة يُكتب دائماً في البطاقة الحقيقية: المسرح aria-hidden
       فأي نص حيّ داخله لا يُقرأ، ولو بقيت المنطقة على «جارٍ التحقق» كذبت على المستخدم. */
    function announce(msg) {
        const live = document.querySelector('#' + LOGIN_ID + ' .m-lk-live');
        if (live) live.textContent = msg;
    }

    /* ================= التسلسل الموقّع A→G =================
       يعمل بالتوازي مع تحقق النظام: تُطلق دالة النظام في اللحظة نفسها، ويُنتظر
       حكمها في نهاية الجوقَة D. لا قياس داخل أي جوقَة بعد القياس الأول لها. */
    function runUnlockFx(input, digits) {
        const st = makeStage(digits);
        if (!st) return false;
        const clock = makeClock();
        const keep = [];
        let net = null, stopPix = null, verdict = null, timer = 0, torn = false, spinAnim = null;
        let shellRect = st.shell.getBoundingClientRect();

        const fx = {
            done: false,
            verdict(kind) {
                if (verdict || torn) return;
                verdict = kind;
            },
            dispose() {
                if (torn) return;
                torn = true;
                clock.stop();
                if (timer) clearTimeout(timer);
                if (stopPix) stopPix();
                keep.forEach((a) => { try { a.cancel(); } catch (e) {} });
                window.removeEventListener('resize', onShape);
                document.body.classList.remove('m-lk-busy');
                st.stage.remove();
                if (fxPending === fx) fxPending = null;
            }
        };
        fx.toast0 = (document.getElementById('toast-container') || {}).lastElementChild || null;
        fx.admin0 = document.getElementById(ADMIN_ID).classList.contains('active-screen');
        fxPending = fx;
        timer = setTimeout(() => fx.verdict(verdict === null && !fx.admin0 && document.getElementById(ADMIN_ID).classList.contains('active-screen') ? 'ok' : 'net'), VERDICT_MS);

        /* التدوير أو تغيّر الحجم أثناء العرض: تفكيك نظيف بدل رسم نصف منقول */
        function onShape() {
            if (fx.done || torn) return;
            fx.dispose();
            paintOtp(input);
        }
        window.addEventListener('resize', onShape, { passive: true });

        st.shell.classList.add('lit');
        clock.start();

        /* A: الوصف والتذييل والصفيحة تتلاشى بالشفافية وحدها.
           commit=true: تُكتب القيمة النهائية سطرياً بدل fill:forwards، حتى تستطيع
           رسالة الخطأ أن تعود لاحقاً — الحركة المعلّقة كانت تُظلّم على .m-lk-err.on */
       const fadeA = qsa('.m-lk-sub, .m-lk-foot, .m-lk-hint, .modal-actions, .m-lk-err, .m-pad', st.shell)
        fadeA.forEach((n) => { if (n) spring(n, (p) => ({ opacity: (1 - p).toFixed(3) }), { stiffness: 190, damping: 26 }, keep, true); });

        /* B: FLIP — قياس واحد هنا، ثم إزاحة ومقياس فقط لبقية الجوقات */
        clock.after(350, () => {
            if (!st.row || !st.cells.length) return;
            shellRect = st.shell.getBoundingClientRect();
            const r0 = st.cells[0].getBoundingClientRect();
            const s = 0.8;
            const cw = r0.width * s, ch = r0.height * s;
            const ox = shellRect.width / 2 - cw - OTP_GAP / 2;
            const oy = shellRect.height / 2 - ch - OTP_GAP / 2;
            st.cells.forEach((c, i) => {
                const r = c.getBoundingClientRect();
                /* في القراءة من اليمين يبدأ المربّع من الركن الأيمن العلوي كما في الصف */
                const col = dirSign() < 0 ? 1 - FX_SLOTS[i][0] : FX_SLOTS[i][0];
                const tx = ox + col * (cw + OTP_GAP) + cw / 2 - (r.left - shellRect.left + r.width / 2);
                const ty = oy + FX_SLOTS[i][1] * (ch + OTP_GAP) + ch / 2 - (r.top - shellRect.top + r.height / 2);
                clock.after(i * 40, () => spring(c, (p) => xf(tx * p, ty * p, 1 + (s - 1) * p), { stiffness: 200, damping: 20 }, keep));
            });
        });

        /* C: الوصلات تُرسم بـ dashoffset (صباغة خالصة بلا تخطيط)، وعندها تُقاس مواضعها النهائية */
        clock.after(900, () => {
            if (!st.cells.length) return;
            net = netOverlay(st.shell, shellRect.width, shellRect.height);
            const pts = st.cells.map((c) => {
                const r = c.getBoundingClientRect();
                return [r.left - shellRect.left + r.width / 2, r.top - shellRect.top + r.height / 2];
            });
            let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
            for (let i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
            net.path.setAttribute('d', d + 'Z');
            const len = net.path.getTotalLength ? net.path.getTotalLength() : 400;
            net.path.style.strokeDasharray = len + ' ' + len;
            if (net.path.animate) {
                keep.push(net.path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
                    { duration: REDUCED ? 160 : 520, easing: 'cubic-bezier(.22,.9,.24,1)', fill: 'forwards' }));
            }
            pts.forEach((p, i) => {
                net.dots[i].setAttribute('cx', p[0].toFixed(1));
                net.dots[i].setAttribute('cy', p[1].toFixed(1));
                clock.after(360 + i * 50, () => spring(net.dots[i],
                    (q) => ({ opacity: q.toFixed(3), transform: 'scale(' + (0.4 + 0.6 * q).toFixed(3) + ')' }),
                    { stiffness: 300, damping: 16 }, keep));
            });
            /* نبضة واحدة عند اكتمال الشبكة، ثم تُطفأ الشبكة في الجوقَة التالية */
            clock.after(560, () => {
                st.cells.forEach((c) => spring(c,
                    (p) => ({ transform: 'translate3d(0,0,0) scale(' + (1 + 0.06 * Math.sin(p * Math.PI)).toFixed(4) + ')' }),
                    { stiffness: 260, damping: 14 }, keep));
            });
        });

        /* D: انكماش إلى النواة بدوّار واحد — وهنا يُنتظر حكم النظام */
        const core = document.createElement('div');
        core.className = 'm-lk-core';
        core.innerHTML = LK_SVG.core;
        const ring = document.createElement('div');
        ring.className = 'm-lk-ring';
        clock.after(1700, () => {
            st.shell.appendChild(core);
            st.shell.appendChild(ring);
            const spin = core.firstElementChild;
            if (spin && spin.animate) {
                spinAnim = spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                    { duration: 900, easing: 'linear', iterations: Infinity });
                keep.push(spinAnim);
            }
            st.cells.forEach((c) => {
                const r = c.getBoundingClientRect();
                const dx = shellRect.width / 2 - (r.left - shellRect.left + r.width / 2);
                const dy = shellRect.height / 2 - (r.top - shellRect.top + r.height / 2);
                /* التلاشي إلى صفر لا إلى 0.12: أي بقايا مربّع خلف النواة تُقرأ كخطأ رسم */
                spring(c, (p) => ({
                    transform: 'translate3d(' + (dx * p).toFixed(2) + 'px,' + (dy * p).toFixed(2) + 'px,0) scale(' + (1 - 0.5 * p).toFixed(3) + ')',
                    opacity: (1 - p).toFixed(3)
                }), { stiffness: 220, damping: 22 }, keep, true);
            });
            if (net) spring(net.svg, (p) => ({ opacity: (1 - p).toFixed(3) }), { stiffness: 240, damping: 30 }, keep);
            const t = st.shell.querySelector('.modal-title');
            if (t) t.classList.add('m-lk-dim');
            spring(core, (p) => ({ opacity: p.toFixed(3), transform: 'scale(' + (0.6 + 0.4 * p).toFixed(3) + ')' }),
                { stiffness: 240, damping: 20 }, keep);
        });

        clock.after(2200, () => {
            const poll = () => {
                if (torn) return;
                if (!verdict) { clock.after(90, poll); return; }   // السحاب متأخر: الدوّار يبقى
                fx.done = true;
                if (verdict === 'ok') verified();
                else rejected(verdict === 'net' ? 'تعذّر التحقق: لا يوجد اتصال بالخدمة' : 'رمز الدخول خاطئ');
            };
            poll();
        });

        /* E→G: انفجار، تحوّل الحدّ إلى أخضر، شرطة تُرسم بنفسها، شارة، ثم راحة وتلاشٍ */
        function verified() {
            const title = st.shell.querySelector('.modal-title');
            const sub = st.shell.querySelector('.m-lk-sub');
            const chip = st.shell.querySelector('.m-lk-chip');
            announce('تم التحقق');
            if (title) {
                title.classList.remove('m-lk-dim');
                title.innerHTML = 'تمّ التحقق <span class="m-lk-key ok">بنجاح</span>';
            }
            if (sub) sub.textContent = 'تم التحقق من حسابك. أنت جاهز للمتابعة.';
            if (chip) chip.classList.add('ok');
            core.classList.add('ok');
            [core, ring].forEach((n) => { n.style.willChange = 'transform, opacity'; });

            const cv = document.createElement('canvas');
            cv.style.width = (shellRect.width + 240) + 'px';
            cv.style.height = (shellRect.height + 240) + 'px';
            cv.style.left = (shellRect.left - 120) + 'px';
            cv.style.top = (shellRect.top - 120) + 'px';
            st.stage.appendChild(cv);
            stopPix = burst(cv, (shellRect.width + 240) / 2, (shellRect.height + 240) / 2);
            haptic([12, 30, 12]);

            /* أول عنصر ابن هو الـ svg نفسه: تدويره للأبد وإخفاؤه كانا يلفّان العلامة معه.
               هنا يُوقف الدوران ويُخفى قرص التحميل وحده، فتُرسم العلامة قائمة وثابتة. */
            if (spinAnim) { try { spinAnim.cancel(); } catch (e) {} spinAnim = null; }
            const disc = core.querySelector('.m-spin');
            const tick = core.querySelector('.m-tick');
            if (disc) disc.style.opacity = '0';
            if (tick && tick.animate) {
                const len = tick.getTotalLength ? tick.getTotalLength() : 30;
                tick.style.opacity = '1';
                tick.style.strokeDasharray = len + ' ' + len;
                keep.push(tick.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
                    { duration: REDUCED ? 160 : 340, easing: 'cubic-bezier(.22,.9,.24,1)', fill: 'forwards', delay: REDUCED ? 0 : 100 }));
            }
            if (ring.animate) {
                keep.push(ring.animate([{ transform: 'scale(.7)', opacity: .9 }, { transform: 'scale(2.6)', opacity: 0 }],
                    { duration: REDUCED ? 160 : 620, easing: 'cubic-bezier(.16,1,.3,1)' }));
            }
            const pill = document.createElement('div');
            pill.className = 'm-lk-pill';
            pill.innerHTML = LK_SVG.pill + '<span>موثّق وآمن</span>';
            pill.style.willChange = 'transform, opacity';
            st.shell.appendChild(pill);
            clock.after(620, () => spring(pill,
                (p) => ({ opacity: p.toFixed(3), transform: 'translate3d(-50%,' + (10 * (1 - p)).toFixed(2) + 'px,0)' }),
                { stiffness: 220, damping: 22 }, keep, true));
            /* G: لا تُنادى دالة فتح النظام — الشاشة بدّلها checkAdminPassword بنفسها،
               فيتلاشى المسرح فقط ليكشفها. وتُترك دقيقة واحدة لكل راكب قبل الرحيل. */
            clock.after(1650, () => {
                st.stage.classList.add('gone');
                clock.after(520, () => fx.dispose());
            });
        }

        /* الخطأ بلغة المشهد نفسه: نبض مُخمَّد ±10 بكسل، حدود حمراء، رسالة، تفريغ، عودة */
        function rejected(msg) {
            const err = st.shell.querySelector('.m-lk-err');
            const title = st.shell.querySelector('.modal-title');
            announce(msg);
            if (title) title.classList.remove('m-lk-dim');
            core.classList.add('bad');
            st.cells.forEach((c) => c.classList.add('bad'));
            const frames = [];
            for (let i = 0; i <= 26; i++) {
                const p = i / 26;
                frames.push({ transform: 'translate3d(' + (Math.exp(-4.2 * p) * Math.sin(p * Math.PI * 5.2) * 10).toFixed(2) + 'px,0,0)' });
            }
            frames.push({ transform: 'translate3d(0,0,0)' });
            if (st.shell.animate) st.shell.animate(frames, { duration: REDUCED ? 160 : 450, easing: 'linear' });
            haptic([30, 40, 30]);
            if (err) { err.style.opacity = ''; err.textContent = msg; err.classList.add('on'); }
            /* الخانات تُجمع إلى مركزها ثم تُفرَّغ؛ المسرح يُزال فتعود البطاقة الحقيقية فارغة */
            clock.after(520, () => {
                if (net) spring(net.svg, (p) => ({ opacity: (1 - p).toFixed(3) }), {}, keep, true);
                st.cells.forEach((c) => spring(c,
                    (p) => ({ transform: 'translate3d(0,0,0) scale(1)', opacity: p.toFixed(3) }),
                    { stiffness: 200, damping: 24 }, keep));
                spring(core, (p) => ({ opacity: (1 - p).toFixed(3) }), { stiffness: 260, damping: 28 }, keep);
            });
            clock.after(2400, () => {
                fx.dispose();
                input.value = '';
                cellsIn(document.getElementById(LOGIN_ID)).forEach((c) => {
                    c.classList.remove('bad');
                    const u = c.firstElementChild || c;
                    u.textContent = '';
                });
                paintOtp(input);
                try { input.focus(); } catch (e) {}
            });
        }
        return true;
    }

    /* ---- الإرسال: حارس واحد ضد التكرار، ودالة النظام هي الحكم الوحيد ---- */
    function lockSubmit(input) {
        if (fxPending) return;
        const v = input.value || '';
        if (v.length < OTP_LEN) return;
        input.blur();
        haptic(8);
        announce('جارٍ التحقق…');
        const digits = v.slice(0, OTP_LEN).split('');
        runUnlockFx(input, digits);
        if (typeof window.checkAdminPassword === 'function') window.checkAdminPassword();
    }

    /* ---- الباني: يعيد تركيب نافذة النظام نفسها دون حذف أي إجراء أو معلومة ---- */
    function buildLockScreen() {
        const modal = document.getElementById(LOGIN_ID);
        if (!modal || modal.dataset.mLock === '1') return;
        const input = document.getElementById('admin-password');
        const content = modal.querySelector('.modal-content');
        const oldTitle = content.querySelector('.modal-title');
        const group = content.querySelector('.input-group');
        const actions = content.querySelector('.modal-actions');
        if (!input || !content || !group) return;
        modal.dataset.mLock = '1';
        modal.classList.add('m-lock-screen');

        const scene = document.createElement('div');
        scene.className = 'm-lk-scene';
        scene.innerHTML = '<i></i><i></i><i></i><i></i>';
        content.insertBefore(scene, content.firstChild);

        const shell = document.createElement('div');
        shell.className = 'm-lk-shell';
        shell.innerHTML = '<div class="m-lk-frame"></div><div class="m-lk-rim"></div>';
        const card = document.createElement('div');
        card.className = 'm-lk-card';
        card.innerHTML =
            '<div class="m-lk-chip">' + LK_SVG.lock + LK_SVG.shield + '</div>' +
            '<p class="m-lk-err" role="alert"></p>' +
            '<p class="m-lk-foot">نسيت الرمز؟ <button type="button">إعادة الضبط</button></p>' +
            '<p class="m-lk-hint"></p>' +
            '<p class="m-lk-live" aria-live="polite" role="status"></p>';
        shell.appendChild(card);
        shell.insertAdjacentHTML('beforeend', '<span class="m-lk-flap tl"></span><span class="m-lk-flap br"></span>');
        content.appendChild(shell);

        /* الترتيب النهائي داخل اللوح: رقاقة، عنوان، وصف، خانات، رسالة، إجراءان، تذييل، هوية */
        const anchor = card.querySelector('.m-lk-err');
        if (oldTitle) {
            const crown = oldTitle.querySelector('i');
            const raw = (oldTitle.textContent || '').trim();
            const words = raw.split(/\s+/);
            const key = words.length > 2 ? words.splice(-2).join(' ') : words.pop() || raw;
            const lead = words.join(' ');
            oldTitle.innerHTML = (lead ? esc(lead) + ' ' : '') + '<span class="m-lk-key">' + esc(key) + '</span>';
            card.insertBefore(oldTitle, anchor);
            /* التاج ليس زائداً: يُنقل إلى سطر الهوية أسفل البطاقة بدل أن يُحذف */
            const hint = card.querySelector('.m-lk-hint');
            if (crown && hint) hint.appendChild(crown);
            if (hint) hint.insertAdjacentHTML('beforeend', '<span>مكوى رويال — دخول الإدارة</span>');
        }
        const sub = document.createElement('p');
        sub.className = 'm-lk-sub';
        sub.textContent = 'أدخل الرمز المكوّن من أربعة أرقام للمتابعة.\nيتحقّق تلقائياً بمجرد اكتماله.';
        sub.style.whiteSpace = 'pre-line';
        card.insertBefore(sub, anchor);
        card.insertBefore(group, anchor);

        /* الخانات: وسام لكل رقم ليُنْبَض وحده + صفيحة نشيطة واحدة + كيرسر داخلها */
        const boxes = document.createElement('div');
        boxes.className = 'm-otp';
        let cells = '';
        for (let i = 0; i < OTP_LEN; i++) cells += '<b><u></u></b>';
        boxes.innerHTML = cells + '<span class="m-otp-glide"><i class="m-otp-caret"></i></span>';
        group.insertBefore(boxes, input);
        input.classList.add('m-otp-input');
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'current-password');
        input.setAttribute('maxlength', String(OTP_LEN));
        input.setAttribute('aria-label', 'رمز دخول الإدارة');
        input.removeAttribute('placeholder');
        boxes.setAttribute('aria-hidden', 'true');

        if (actions) card.insertBefore(actions, card.querySelector('.m-lk-foot'));
        const enter = actions && actions.querySelector('.btn-confirm');
        const cancel = actions && actions.querySelector('.btn-cancel');
        const footBtn = card.querySelector('.m-lk-foot button');
        if (footBtn) {
            footBtn.type = 'button';
            footBtn.addEventListener('click', () => {
                /* لا إجراء إعادة ضبط في النظام: تُترك خطافاً، والرسالة تصف الواقع */
                if (typeof window.royalPasswordReset === 'function') { try { window.royalPasswordReset(); } catch (e) {} return; }
                const live = card.querySelector('.m-lk-live');
                if (live) live.textContent = 'إعادة ضبط الرمز متاحة من جهاز الكمبيوتر';
                paintGlide(input);
            });
        }

        let lastLen = 0;
        const onType = () => {
            const d = (input.value || '').replace(/\D/g, '').slice(0, OTP_LEN);
            if (d !== input.value) input.value = d;
            if (d.length < lastLen) haptic(6);
            lastLen = d.length;
            paintOtp(input);
            if (d.length === OTP_LEN) lockSubmit(input);
        };
        input.addEventListener('input', onType);
        input.addEventListener('paste', () => setTimeout(onType, 0));
        input.addEventListener('keyup', (e) => { if (e.key === 'Enter') lockSubmit(input); });
        input.addEventListener('focus', () => { paintOtp(input); playEntrance(shell); });
        input.addEventListener('blur', () => paintOtp(input));
                boxes.addEventListener('pointerdown', (e) => { e.preventDefault(); try { input.focus(); } catch (err) {} });

        /* ---- لوحة الأرقام الزجاجية: الحقل يبقى مصدر القيمة، واللوحة تكتب فيه وتُطلق onType ---- */
        const pad = document.createElement('div');
        pad.className = 'm-pad';
        pad.setAttribute('role', 'group');
        pad.setAttribute('aria-label', 'لوحة أرقام الرمز');
        const DEL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="m12.5 9.5 5 5m0-5-5 5"/></svg>';
        pad.innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'].map((k, i) => {
            const isFn = k === 'clr' || k === 'del';
            const label = k === 'clr' ? 'مسح' : (k === 'del' ? DEL_SVG : k);
            const aria = k === 'clr' ? 'مسح الكل' : (k === 'del' ? 'حذف رقم' : 'الرقم ' + k);
            return '<button type="button" data-k="' + k + '" class="' + (isFn ? 'fn' : '') + '" aria-label="' + aria + '" style="--k:' + i + '"><span>' + label + '</span></button>';
        }).join('');
        card.insertBefore(pad, card.querySelector('.modal-actions') || card.querySelector('.m-lk-foot'));

        /* لا لوحة مفاتيح للنظام: الحقل للقراءة فقط، واللوحة الزجاجية هي الإدخال */
        input.readOnly = true;
        input.setAttribute('inputmode', 'none');
        input.setAttribute('autocomplete', 'off');

        function padFlash(btn, x, y) {
            btn.classList.add('on');
            clearTimeout(btn._offT);
            btn._offT = setTimeout(() => btn.classList.remove('on'), 380);
            if (REDUCED || !btn.animate) return;
            /* تكبير + اهتزاز مُخمَّد */
            btn.animate([
                { transform: 'scale(1) rotate(0deg)' },
                { transform: 'scale(1.3) rotate(-6deg)', offset: .20 },
                { transform: 'scale(1.24) rotate(6deg)', offset: .38 },
                { transform: 'scale(1.20) rotate(-4deg)', offset: .54 },
                { transform: 'scale(1.12) rotate(2.5deg)', offset: .72 },
                { transform: 'scale(1.04) rotate(-1deg)', offset: .88 },
                { transform: 'scale(1) rotate(0deg)' }
            ], { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)' });
            /* موجة ضوء زجاجية من نقطة اللمس */
            const r = btn.getBoundingClientRect();
            const px = (typeof x === 'number' ? x - r.left : r.width / 2);
            const py = (typeof y === 'number' ? y - r.top : r.height / 2);
            const rp = document.createElement('i');
            rp.className = 'm-rp';
            rp.style.left = px + 'px';
            rp.style.top = py + 'px';
            btn.insertBefore(rp, btn.firstChild);
            const a = rp.animate([
                { transform: 'translate(-50%,-50%) scale(.1)', opacity: .9 },
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }
            ], { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' });
            a.onfinish = () => rp.remove();
            a.oncancel = () => rp.remove();
        }

        function padHit(btn, x, y) {
            if (fxPending) return;
            const k = btn.dataset.k;
            padFlash(btn, x, y);
            const cur = input.value || '';
            let next = cur;
            if (k === 'del') next = cur.slice(0, -1);
            else if (k === 'clr') next = '';
            else if (cur.length < OTP_LEN) next = cur + k;
            else return;
            if (next === cur) return;
            if (/^\d$/.test(k)) haptic(10);
            input.value = next;
            onType();
        }

        pad.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest && e.target.closest('button[data-k]');
            if (!btn) return;
            e.preventDefault();
            btn._pd = Date.now();
            padHit(btn, e.clientX, e.clientY);
        });
        /* click بعد لمس حديث مكرّر فيُتجاهل؛ click وحده يعني تفعيلاً بلوحة المفاتيح/قارئ الشاشة */
        pad.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('button[data-k]');
            if (!btn || Date.now() - (btn._pd || 0) < 800) return;
            padHit(btn);
        });

        /* لوحة مفاتيح فيزيائية (حاسوب/بلوتوث): تحرّك نفس المفاتيح الزجاجية */
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            let k = null;
            if (/^[0-9]$/.test(e.key)) k = e.key;
            else if (/^[\u0660-\u0669]$/.test(e.key)) k = String(e.key.charCodeAt(0) - 0x660);
            else if (e.key === 'Backspace') k = 'del';
            if (!k) return;
            e.preventDefault();
            const btn = pad.querySelector('[data-k="' + k + '"]');
            if (btn) padHit(btn);
        });

        /* عند كل فتح: التركيز على الحقل ليظهر المؤشّر، ولا تظهر لوحة النظام لأن الحقل للقراءة فقط */
        if (window.MutationObserver) {
            new MutationObserver(() => {
                if (/display:\s*(flex|block)/.test(modal.getAttribute('style') || '')) {
                    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (err) {} }, 80);
                }
            }).observe(modal, { attributes: true, attributeFilter: ['style'] });
        }

        if (enter) enter.addEventListener('click', (e) => { e.preventDefault(); lockSubmit(input); });
        if (cancel) cancel.addEventListener('click', () => {
            /* الإلغاء إجراء النظام: المسرح يُفكّ إن كان قائماً قبل أن يُغلقها closeModals */
            if (fxPending) fxPending.dispose();
            lastLen = 0;
        });

        /* كل فتح جديد: التفريغ البصري فقط، وقيمة المستخدم في حقل النظام تبقى كما هي */
        if (window.MutationObserver) {
            let wasOpen = false;
            new MutationObserver(() => {
                const open = /display:\s*(flex|block)/.test(modal.getAttribute('style') || '');
                if (open && !wasOpen) {
                    lkRowW = 0;
                    paintOtp(input);
                    requestAnimationFrame(() => playEntrance(shell));
                }
                if (!open && wasOpen && fxPending) fxPending.dispose();
                wasOpen = open;
            }).observe(modal, { attributes: true, attributeFilter: ['style'] });
        }
        window.addEventListener('resize', () => { lkRowW = 0; }, { passive: true });
        paintOtp(input);
    }

    /* ================== التبديل اليدوي بين النسختين ================== */
    function openDesktopView() {
        store.set('royal_view_override', SETTINGS_BACKUP_VIEW);
        const url = new URL(window.location.href);
        url.searchParams.set('view', SETTINGS_BACKUP_VIEW);
        window.location.replace(url.toString());
    }

    function addViewToggle() {
        const page = pageOf('settings');
        if (!page || page.querySelector('.m-viewbtn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'm-viewbtn';
        btn.textContent = 'عرض نسخة الكمبيوتر';
        btn.addEventListener('click', () => {
            const msg = 'سيتم فتح نسخة الكمبيوتر على هذا الهاتف. للرجوع لنسخة الجوال أضف آخر الرابط ?view=auto';
            if (typeof window.showConfirm === 'function') {
                window.showConfirm(msg, openDesktopView, 'نسخة الكمبيوتر', 'نعم، افتحها');
            } else {
                openDesktopView();
            }
        });
        page.appendChild(btn);
    }

    /* ================== إعادة تقييم البيئة عند التدوير ==================
       لا نلمس الاختيار اليدوي، ولا نبدّل أثناء سحب أو نافذة مفتوحة أو إدخال. */
    function detectMobile() {
        const mm = (q) => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
        const appShell = (typeof require !== 'undefined') || window.location.protocol === 'file:';
        const touchCapable = mm('(pointer: coarse)') || mm('(hover: none)') || (navigator.maxTouchPoints || 0) > 0;
        const smallScreen = Math.min(window.innerWidth, window.screen ? window.screen.width : window.innerWidth) <= 820;
        const uaPhone = /iPhone|Android|iPad|webOS/i.test(navigator.userAgent);
        return !appShell && touchCapable && (smallScreen || uaPhone);
    }

    function reevaluateLater() {
        setTimeout(() => {
            if (store.get('royal_view_override')) return;
            if (state.busy || phys.touching || document.body.classList.contains('m-sheet-open')) return;
            const a = document.activeElement;
            if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
            if (detectMobile()) return;
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'auto');
            window.location.replace(url.toString());
        }, 800);
    }

    /* ================== الدخول المتتالي للبطاقات ==================
       الحركة كلها في CSS (@keyframes mRise) لأن سفاري الآيفون يُهمل الأنيميشن
       المُولَّد بكل نقرة. تُجمَّع عناصر اللوحة بالترتيب — عناصر الشبكات نفسها لا
       الحاويات — ويُرقَّم كل عنصر بـ --m-k ليأخر انطلاقه خطوة. */
    function enterNodes(page) {
        const out = [];
        qsa(':scope > *', page).forEach((c) => {
            const kids = qsa(':scope > *', c);
            const allCards = kids.length > 1 && kids.every((k) => k.classList.contains('stat-card'));
            const grid = c.classList.contains('bento-box-container') || c.classList.contains('stats-grid') || allCards;
            if (grid && kids.length) { kids.forEach((k) => out.push(k)); }
            else { out.push(c); }
        });
        return out;
    }

    /* صفوف الجداول تُرقَّم بنفسها، من صفر لكل جدول: البطاقة تدخل أولاً ثم تُملأ
       خلاياها سطراً سطراً. هذا هو «التدرّج في بيانات الزبائن» ولا علاقة له
       بإعادة الرسم: الصفوف الجديدة المُولَّدة بعد الحركة تبقى ساكنة. */
    function enterRows(page) {
        const out = [];
        qsa('tbody tr', page).forEach((r) => { if (out.length < 40) out.push(r); });
        return out;
    }

    function enterAnimate(page) {
        if (!page) return;
        const nodes = enterNodes(page);
        const rows = enterRows(page);
        page.classList.remove('m-enter');
        nodes.forEach((n, i) => {
            n.classList.remove('m-anim');
            n.style.setProperty('--m-k', String(i));
        });
        rows.forEach((r, i) => {
            r.classList.remove('m-anim');
            r.style.setProperty('--m-k', String(i));
        });
        void page.offsetWidth;
        page.classList.add('m-enter');
        nodes.forEach((n) => n.classList.add('m-anim'));
        rows.forEach((r) => r.classList.add('m-anim'));
        setTimeout(() => {
            page.classList.remove('m-enter');
            nodes.forEach((n) => n.classList.remove('m-anim'));
            rows.forEach((r) => r.classList.remove('m-anim'));
        }, 1240);
    }

    /* ================== تجاوز switchAdminTab (عرض فقط) ================== */
    function wrapRouter() {
        const original = window.switchAdminTab;
        if (typeof original !== 'function' || original.__mWrapped) return;
        const wrapped = function (tab, animationType) {
            closeOpenSheets();
            /* المنع من أول السطر: دوال الرسم الأصلية تُستدعى داخل switchAdminTab،
               ولو مرّت وهي غير ممنوعة تُجدول رسماً بعد 150م.س. يقع في منتصف
               الانزلاق فتظهر اللوحة وتختفي لحظة — وهو الغلتش الذي وصفه المستخدم. */
            setBusy(true);
            original.call(window, tab, 'none');
            if (state.started) { goTo(tab); } else { setBusy(false); }
        };
        wrapped.__mWrapped = true;
        wrapped.__mOriginal = original;
        window.switchAdminTab = wrapped;
    }

    function goTo(tab) {
        const i = state.keys.indexOf(tab);
        if (i === -1) return;
        showAdminChrome();
        const from = clamp(state.index, 0, state.n - 1);
        if (i === from) {
            const page = state.pages[i];
            if (page) page.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
            return;
        }
        stopSpring();
        clearOffsets();
        const src = state.pages[from];
        const dst = state.pages[i];
        const vfrom = vpos(from), vto = vpos(i);
        state.index = i;
        phys.P = vto;
        setBusy(true);
        /* لوحتان في الخانة الوهمية نفسها (من تبويب مخفي إلى آخر): لا مسافة بينهما
           فلا انزلاق — الهدف يحلّ مكانها بحركة دخوله الخاصة. */
        if (vfrom === vto) {
            if (src) src.style.willChange = 'auto';
            paintTransforms();
            syncA11y();
            setBusy(false);
            enterAnimate(dst);
            setTimeout(() => { flushRepaint(); syncFlow(); }, 520);
            return;
        }
        const s = vto > vfrom ? 1 : -1;
        /* الرسم الثقيل قبل الحركة والهدف ما زال خارج الشاشة: تحديث اللوحات يعيد
           بناء الجداول بأكملها، ولو جرى والانزلاق جارٍ انقطعت الحركة واختفت
           اللوحة ربع ثانية ثم رجعت. */
        flushRepaint();
        paintTransforms();
        if (src) { src.classList.add('m-seen'); src.style.willChange = 'transform'; }
        if (dst) { dst.style.willChange = 'transform'; }
        setOffset(src, 0);
        setOffset(dst, s);
        const s0 = now();
        const dur = 280;
        const step = () => {
            const k = clamp((now() - s0) / dur, 0, 1);
            const e = 1 - Math.pow(1 - k, 3);
            setOffset(src, -s * e);
            setOffset(dst, s * (1 - e));
            phys.P = vfrom + (vto - vfrom) * e;
            paintIndicator();
            if (k < 1) { phys.raf = requestAnimationFrame(step); return; }
            phys.P = vto;
            state.index = i;
            if (src) src.style.willChange = 'auto';
            if (dst) dst.style.willChange = 'auto';
            clearOffsets();
            paintTransforms();
            syncA11y();
            setBusy(false);
            enterAnimate(dst);
            /* ما استجد أثناء الحركة يُرسم بعد اكتمال الدخول، لا فوقه */
            setTimeout(() => { flushRepaint(); syncFlow(); }, 520);
        };
        phys.raf = requestAnimationFrame(step);
    }

    function showAdminChrome() {
        const wasAdmin = document.body.classList.contains('m-admin');
        document.body.classList.add('m-admin');
        /* الشريط يصبح ظاهراً الآن: خانته تُقاس من جديد، والمؤشر يثبت في مكانه */
        if (!wasAdmin) { state.cell = 0; ind.init = false; }
        /* الشريط كان مخفياً عند التركيب: نعيد قياس الخانة والمؤشر بعد إظهاره */
        if (state.started) paintTransforms();
    }

    /* ================== إمكانية الوصول ================== */
    function decorateBar() {
        const bar = document.querySelector(BAR_SELECTOR);
        if (!bar) return;
        bar.setAttribute('role', 'tablist');
        bar.setAttribute('aria-label', 'أقسام الإدارة');
        state.barBtns.forEach((b) => {
            b.setAttribute('role', 'tab');
            const label = b.querySelector('span');
            if (label) b.setAttribute('aria-label', label.textContent.trim());
        });
        state.pages.forEach((p) => { if (p) p.setAttribute('role', 'tabpanel'); });
        if (bar.dataset.mKeysBound !== '1') {
            bar.dataset.mKeysBound = '1';
            bar.addEventListener('keydown', onBarKeys);
        }
        syncA11y();
    }

    function onBarKeys(e) {
        const s = dirSign();
        let forward = null;
        if (e.key === 'ArrowLeft') forward = s < 0;
        else if (e.key === 'ArrowRight') forward = s > 0;
        else return;
        const i = clamp(pageForPos(vpos(state.index) + (forward ? 1 : -1)), 0, state.n - 1);
        if (i === state.index) return;
        e.preventDefault();
        window.switchAdminTab(state.keys[i], 'none');
        const btn = state.barBtns[barIndexOfPage(i)];
        if (btn) btn.focus();
    }

    function syncA11y() {
        const activeBar = barIndexOfPage(state.index);
        state.barBtns.forEach((b, i) => b.setAttribute('aria-selected', String(i === activeBar)));
    }

    /* مراقبة فتح شاشة الأدمن (بعد التحقق من كلمة المرور) لإطلاق الطبقة */
    function watchAdminOpen() {
        const admin = document.getElementById(ADMIN_ID);
        if (!admin) return;
        const sync = () => {
            if (admin.classList.contains('active-screen')) {
                if (!state.started) mount();
                showAdminChrome();
                addViewToggle();
            } else {
                document.body.classList.remove('m-admin');
            }
        };
        new MutationObserver(sync).observe(admin, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    /* ================== التركيب ================== */
    function mount() {
        splash();
        /* الشريط إلى body مباشرة: لا حاوية متحوّلة أو مقصوصة تبقى فوقه،
           فلا تتحرك خانته ولا شبر واحد مهما تمرّر المحتوى أو فُتحت نافذة. */
        const nav = document.querySelector(BAR_SELECTOR);
        if (nav && nav.parentNode !== document.body) document.body.appendChild(nav);
        /* التلفيف هنا لا في boot: هذا الملف قد يُنفَّذ قبل app.js،
           وعند فتح الأدمن تكون دوال النظام معرّفة بالكامل. */
        wrapRepainters();
        wrapRouter();
        const order = readTabsOrder();
        if (!order.length) return;
        state.keys = order;
        state.n = order.length;
        root.style.setProperty('--m-n', String(state.n));
        /* نفس ترتيب المفاتيح حرفياً: خانة فارغة إن نقص لوح، فلا يزيح بقية التبويبات */
        state.pages = order.map(pageOf);
        if (!state.pages.some(Boolean)) return;

        const bar = document.querySelector(BAR_SELECTOR);
        state.barBtns = bar ? qsa('.bottom-nav-btn', bar) : [];
        state.barKeys = state.barBtns.map((b) => {
            const m = /switchAdminTab\(\s*['"]([^'"]+)['"]/.exec(b.getAttribute('onclick') || '');
            return m ? m[1] : '';
        });
        /* أزرار الشريط تأتي أولاً في الترتيب، فآخرها هو سقف السحب */
        state.swipeHi = clamp((state.barKeys.filter(Boolean).length || state.n) - 1, 0, state.n - 1);

        state.index = clamp(order.indexOf(currentTabKey()), 0, state.n - 1);
        phys.P = vpos(state.index);
        decorateBar();
        paintPageIndexes();
        probeCalc();
        cacheWidth();
        paintTransforms();
        bindGestures();
        bindBounceGuard();
        observeSheets();
        bindKeyboard();
        bindTodayPanel();
        mirrorConnection();
        state.started = true;
        flushRepaint();
        enterAnimate(state.pages[state.index]);
    }

    /* شاشة تحميل تختفي بتلاشٍ .6s عند جهوزية الهيكل */
    function splash() {
        if (REDUCED || document.querySelector('.m-splash')) return;
        const el = document.createElement('div');
        el.className = 'm-splash';
        el.innerHTML = '<i class="fa-solid fa-circle-notch"></i>';
        document.body.appendChild(el);
        /* أصفار الحركة تُبقي الشاشة الافتتاحية فوق التطبيق إلى الأبد إذا لم تَطلب
           الصفحة إطاراً (تáb مخفي أو تدوير بطيء)، فالتوقيت هو ضمان الرفع. */
        let lifted = false;
        const lift = () => {
            if (lifted) return;
            lifted = true;
            el.classList.add('m-off2');
            setTimeout(() => el.remove(), 650);
        };
        requestAnimationFrame(lift);
        setTimeout(lift, 1400);
    }

    function onResize() {
        if (!state.started) return;
        state.cell = 0;
        cacheWidth();
        paintTransforms();
        setTimeout(syncFlow, 220);
        reevaluateLater();
    }

    function boot() {
        injectChrome();
        buildLockScreen();
        watchUnlock();
        watchAdminOpen();
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('orientationchange', () => setTimeout(onResize, 260), { passive: true });
        window.addEventListener('online', mirrorConnection, { passive: true });
        window.addEventListener('offline', () => {
            mirrorConnection();
            const page = state.pages[state.index];
            if (page && !page.querySelector('.m-offline')) {
                const warn = document.createElement('div');
                warn.className = 'm-offline';
                warn.innerHTML = '<i class="fa-solid fa-wifi"></i><span>لا يوجد اتصال — تُحفظ الحركات محلياً وتُرسل تلقائياً</span>' +
                    '<button class="top-bar-btn" style="margin-inline-start:auto" type="button">إعادة المحاولة</button>';
                warn.querySelector('button').addEventListener('click', () => window.location.reload());
                page.insertBefore(warn, page.firstChild);
            }
        }, { passive: true });
        const syncText = document.getElementById('sync-text');
        if (syncText && window.MutationObserver) {
            new MutationObserver(mirrorConnection).observe(syncText, { childList: true, characterData: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.RoyalMobileShell = {
        state: state,
        tabs: () => state.keys.slice(),
        goTo: (k) => window.switchAdminTab(k, 'none'),
        dispose() {
            state.started = false;
            unwrapRepainters();
            const o = window.switchAdminTab;
            if (o && o.__mOriginal) window.switchAdminTab = o.__mOriginal;
            const st = document.getElementById('royal-mobile-style');
            if (st) st.remove();
            document.body.classList.remove('m-admin', 'm-sheet-open', 'm-lock', 'm-dragging');
        }
    };
})();
