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

    /* ------------------------- متغيرات الهوية (داكن فقط) ------------------------- */
    const CSS = `
html.is-mobile {
    --m-bg: #0a0a0a;
    --m-card: #151517;
    --m-card2: #1d1d20;
    --m-text: #f7f7f8;
    --m-muted: #9a9aa2;
    --m-line: rgba(212,175,55,.16);
    --m-hair: rgba(255,255,255,.07);
    --m-gold: #D4AF37;
    --m-gold-soft: rgba(212,175,55,.13);
    --m-green: #2ed573;
    --m-red: #ff4757;
    --m-blue: #4a90e2;
    --m-radius-card: 18px;
    --m-radius-sheet: 24px;
    --m-radius-bar: 24px;
    --m-radius-pill: 19px;
    --m-radius-grain: 99px;
    --m-ease: cubic-bezier(.2,.8,.2,1);
    --m-bar-h: 62px;
    --m-kb: 0px;
    color-scheme: dark;
    --m-n: 1;
}

html.is-mobile { height: 100%; overflow: hidden; }

/* المستند مثبّت لا يُتمرَّر: في safari هذا هو السبب الوحيد الذي يحرّك العناصر
   المثبتة — المستند يرتد بالمط عند نهاية السحب (rubber-band) وشريط العنوان ينكمش
   فيعيد حساب الأسفل. بتثبيت body يبقى الشريط في مكانه، وكل تمرير يحدث داخل
   اللوحات والنوافذ وحدها. */
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

/* خلفية خفيفة بعيدة عن التمرير */
html.is-mobile body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
        radial-gradient(48% 32% at 92% 0%, rgba(74,144,226,.10), transparent 70%),
        radial-gradient(42% 30% at 8% 22%, rgba(212,175,55,.09), transparent 72%),
        radial-gradient(52% 34% at 50% 104%, rgba(46,213,115,.07), transparent 70%);
}

html.is-mobile .screen { height: 100dvh; }
/* الشاشات غير الإدارية تفتح تحت منطقة الحالة مباشرة في وضع ويب اب */
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
    height: 100dvh;
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

/* ترويسة الثل الجوال */
html.is-mobile .m-head {
    position: relative;
    z-index: 5;
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px 8px;
    border-bottom: 1px solid var(--m-hair);
    /* الخلفية مصمتة: أي blur فوق لوحة متحركة يُعيد رسم الشاشة كاملة كل إطار */
    background: rgba(10,10,10,.96);
}
html.is-mobile .m-head:empty { display: none; }
.m-brand { font-size: 22px; font-weight: 800; color: var(--m-gold); letter-spacing: .2px; }
.m-conn { margin-inline-start: auto; display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--m-muted); }
.m-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--m-green); box-shadow: 0 0 8px rgba(46,213,115,.7); }
.m-dot.off { background: var(--m-red); box-shadow: 0 0 8px rgba(255,71,87,.6); }
.m-time { font-size: 12px; color: var(--m-muted); font-variant-numeric: tabular-nums; min-width: 46px; text-align: end; }

/* الصفحات
   الموضع مشتق بالكامل من متغيرات على وسم html: --m-p للصفحة العشرية، --m-w لعرضها،
   --m-dir لاتجاه RTL، و --m-i لرقم الصفحة (تُكتب في ورقة أنماط مستقلة بالـ id).
   السبب: دالة switchAdminTab الأصلية تنفّذ style.cssText = '' على كل لوحة، فتمسح أي
   transform سطري وتنشر اللوحة الهدف فوق الحالية. الأنماط في ورقة الأنماط لا تُمسح. */
html.is-mobile .admin-section {
    --m-d: calc(var(--m-i, 0) - var(--m-p, 0));
    --m-ad: max(var(--m-d), calc(var(--m-d) * -1));
    display: none;
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    contain: layout style paint;
    padding: 14px 12px calc(var(--m-bar-h) + 74px + env(safe-area-inset-bottom));
    scrollbar-width: none;
    transform: translate3d(calc(var(--m-d) * var(--m-dir, 1) * var(--m-w, 100vw)), 0, 0);
    opacity: calc(1 - min(1, var(--m-ad)) * 0.2);
}
html.is-mobile .admin-section::-webkit-scrollbar { display: none; }
html.is-mobile .admin-section.m-seen { display: block; }
/* مقياس الحساب: إن لم يدعمه المتصفح تُكتب المواضع سطرياً من الجافاسكريبت */
html.is-mobile .m-calc-probe {
    position: absolute; visibility: hidden; pointer-events: none;
    transform: translate3d(calc((2 - var(--m-q, 0)) * 10px), 0, 0);
}
/* اللوحة غير الجارية لا تستقبل اللمس، وأثناء السحب كل اللوحات لا تستقبله */
html.is-mobile .admin-section.m-seen:not(.m-cur):not(.active),
html.is-mobile body.m-dragging .admin-section { pointer-events: none; }
/* لا شيء داخل مسار السحب يتحرك بانتقال: يضاعف إعادة الحساب لكل إطار */
html.is-mobile body.m-dragging #admin-screen,
html.is-mobile body.m-dragging #admin-screen * { transition: none !important; }
/* الآيفون يُعيد تمويه الخلفية لكل إطار حركة: هذا هو سبب التقطيع */
html.is-mobile #admin-screen,
html.is-mobile #admin-screen * {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
}

/* --------- دخول تدريجي لمكونات التبويب ---------
   الحركة مكتوبة في ورقة الأنماط لا بـ element.animate: safari الآيفون يُهمل
   أنيميشن جافاسكريبت المُولّد لحظياً (كان هذا سبب أن الموشن «ما يعمله» على
   الجهاز)، وحركة CSS تعمل على محرّك التركيب نفسه بـ 60 إطار.
   تُحرَّك عناصر الشبكة نفسها لا الحاوية، فتتكوَّن البطاقات واحدة بعد الأخرى. */
@keyframes mRise {
    from { opacity: .22; transform: translate3d(0, 18px, 0) scale(.985); }
    to   { opacity: 1;   transform: none; }
}
@keyframes mFade { from { opacity: .9; } to { opacity: 1; } }
html.is-mobile .admin-section.m-enter { animation: mFade .26s linear both; }
html.is-mobile .admin-section .m-anim {
    animation: mRise .44s var(--m-ease) both;
    animation-delay: calc(min(var(--m-k, 0), 9) * 42ms);
}
/* أثناء السحب اليدوي اللوحة تتبع الإصبع: لا مكان لحركة دخول متزامنة معها */
html.is-mobile body.m-dragging .admin-section.m-enter,
html.is-mobile body.m-dragging .admin-section .m-anim { animation: none; }
html.is-mobile .admin-section h2 { font-size: 20px !important; font-weight: 800; margin: 6px 0 14px !important; text-align: start !important; color: var(--m-gold) !important; }

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
    background: linear-gradient(160deg, var(--m-card2), var(--m-card)) !important;
    border: 1px solid var(--m-line) !important;
    border-radius: var(--m-radius-card) !important;
    margin-bottom: 10px !important;
    padding: 12px 13px !important;
    box-shadow: 0 6px 18px rgba(0,0,0,.35) !important;
    position: relative !important;
}
html.is-mobile #admin-screen .cart-table tr::after,
html.is-mobile #admin-screen .invoices-table tr::after { content: none !important; }

/* مواضع الخلايا مكتوبة بـ !important على tr > td
   ورقة أنماط المتجر ترسل الخلية قبل الأخيرة (nth-last-child(2)) إلى العمود الثاني
   والخيرة إلى صف كامل، بكود مشدّد. تلتقي هذه مع إبراز الطبقة للأزرار فتنكمش
   مسافة العمود الأول إلى صفر وتختفي تفاصيل سجل المحفظة والتكاليف. كتابة الموضع
   على tr > td تعطي الطبقة خصوصية أعلى فتلغي قواعد المتجر مهما كان ترتيبها. */
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
/* الخلية الأولى = العنوان، الثانية = الأبرز، الباقي تفاصيل، والأخيرة إجراءات ظاهرة */
html.is-mobile #admin-screen .cart-table tr > td:first-child,
html.is-mobile #admin-screen .invoices-table tr > td:first-child {
    grid-column: 1 / -1 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    color: var(--m-muted) !important;
    margin-bottom: 2px !important;
}
html.is-mobile #admin-screen .cart-table tr > td:nth-child(2),
html.is-mobile #admin-screen .invoices-table tr > td:nth-child(2) {
    grid-column: 1 !important;
    font-size: 19px !important;
    font-weight: 800 !important;
    color: var(--m-gold) !important;
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
    color: var(--m-gold) !important;
}
html.is-mobile #admin-screen td:last-child .top-bar-btn,
html.is-mobile #admin-screen td:last-child .action-icon {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px !important;
    padding: 8px 10px !important;
    border-radius: var(--m-radius-pill) !important;
    background: var(--m-gold-soft) !important;
    border: 1px solid var(--m-line) !important;
    color: var(--m-gold) !important;
    margin: 0 !important;
}

/* شبكة البطاقات والإحصائيات
   البطاقة في نسخة الهاتف أصلها دائرة أيقونة في الوسط تحتها عنوان ثم رقم، والطبقة
   تحافظ على هذا الوضع حرفياً وتضبط المقاسات والحواف فقط. أي override على
   .stat-icon هنا يرسل الأيقونة إلى الركن بدلاً من وسطها. */
html.is-mobile .stats-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 12px !important; margin-bottom: 18px !important; }
html.is-mobile .stat-card {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    background: linear-gradient(160deg, var(--m-card2), var(--m-card)) !important;
    border: 1px solid var(--m-line) !important;
    border-radius: var(--m-radius-card) !important;
    padding: 18px 12px !important;
    box-shadow: 0 6px 18px rgba(0,0,0,.32) !important;
}
html.is-mobile .stat-card:hover { transform: none !important; box-shadow: 0 6px 18px rgba(0,0,0,.32) !important; }
html.is-mobile .stat-icon {
    display: flex !important;
    width: 54px !important; height: 54px !important;
    margin: 0 auto 12px !important;
    align-self: center !important;
    flex: none;
    justify-content: center; align-items: center;
    border-radius: 50% !important;
    font-size: 23px !important;
    line-height: 1;
}
html.is-mobile .stat-title { font-size: 12px !important; color: var(--m-muted) !important; margin: 0 !important; font-weight: 800 !important; }
html.is-mobile .stat-value { font-size: 18px !important; font-weight: 900 !important; color: var(--m-text) !important; }
/* أرقام اللوحات لا تنبض: النظام يكتب transform=scale(1.1) سطرياً عند كل رسم،
   وعلى الجوال يتكرر الرسم مع كل حركة تمرير فتكبر الأرقام وتصغر. القفلة هنا للعرض
   فقط، القيم نفسها تُحسب وتُكتب كما هي. */
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

/* اللوحاتControl والفلاتر */
html.is-mobile .admin-control-panel { display: flex !important; flex-direction: column !important; align-items: stretch !important; gap: 10px !important; margin-bottom: 12px !important; }
html.is-mobile .admin-filters { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; width: 100% !important; }
html.is-mobile .admin-filters > * { flex: 1 1 132px; min-width: 0; }

/* حقول الإدخال */
html.is-mobile input, html.is-mobile select, html.is-mobile textarea, html.is-mobile button { font-family: inherit; }
html.is-mobile .note-input,
html.is-mobile .input-group input,
html.is-mobile .input-group select {
    font-size: 16px !important;
    background: rgba(255,255,255,.055) !important;
    border: 1px solid var(--m-hair) !important;
    border-radius: 11px !important;
    color: var(--m-text) !important;
    padding: 11px 12px !important;
    width: 100% !important;
    min-height: 44px;
}
html.is-mobile input:focus, html.is-mobile select:focus, html.is-mobile textarea:focus {
    outline: none;
    border-color: rgba(212,175,55,.55) !important;
    box-shadow: 0 0 0 3px rgba(212,175,55,.14) !important;
}

/* الأزرار: لمس 44px وحالة ضغط فورية */
html.is-mobile .btn, html.is-mobile .top-bar-btn, html.is-mobile .btn-royal-action,
html.is-mobile .btn-save, html.is-mobile .btn-cancel, html.is-mobile .btn-confirm,
html.is-mobile .admin-nav-btn, html.is-mobile .modal-actions button {
    min-height: 44px;
    border-radius: 14px !important;
}
html.is-mobile button:active, html.is-mobile a:active, html.is-mobile .stat-card:active {
    opacity: .55;
    transform: scale(.98);
    transition: none;
}

/* --------- شريط التبويبات العائم (يعيد استخدام الأزرار الموجودة) ---------
   الثبات المطلق: الشريط في body وليس داخل الشاشة الإدارية، وموضعه لا يقرأ
   لوحة المفاتيح ولا ارتفاع الشاشة المتغير — لا يتحرك مهما تمُرّر المحتوى. */
html.is-mobile #mobile-bottom-nav {
    display: none;
    position: fixed;
    width: auto !important;
    left: 12px; right: 12px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    height: var(--m-bar-h);
    z-index: 9500;
    padding: 5px;
    border-radius: var(--m-radius-bar);
    /* مصمت بدل الزجاج: الشريط ثابت فوق محتوى يتمرر، والتمويه يعيد رسمه كل إطار */
    background: rgba(21,21,23,.97);
    border: 0.5px solid var(--m-line);
    box-shadow: 0 12px 34px rgba(0,0,0,.5);
    justify-content: space-around;
    align-items: stretch;
    overflow: hidden;
    pointer-events: auto;
}
html.is-mobile body.m-admin #mobile-bottom-nav { display: flex; }

html.is-mobile .bottom-nav-btn {
    position: relative;
    z-index: 2;
    /* عدد الخانات يقرا من --m-n الذي يضبطه الجافاسكريبت، لا عدد مكتوب يدوياً */
    flex: 1 1 calc(100% / var(--m-n));
    min-width: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    background: transparent; border: none; color: var(--m-muted);
    padding: 4px 2px;
    transition: color .22s var(--m-ease);
}
html.is-mobile .bottom-nav-btn i { font-size: 18px; line-height: 1; transition: transform .22s var(--m-ease); }
html.is-mobile .bottom-nav-btn span {
    font-size: 11.5px; font-weight: 700; max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
html.is-mobile .bottom-nav-btn.active, html.is-mobile .bottom-nav-btn.m-hi { color: var(--m-gold); }
html.is-mobile .bottom-nav-btn.active i { transform: translateY(-1px); }

html.is-mobile .m-ind {
    position: absolute; z-index: 1;
    top: 5px; bottom: 5px;
    left: 0; width: 0;
    border-radius: var(--m-radius-pill);
    background: var(--m-gold);
    box-shadow: 0 6px 18px rgba(212,175,55,.4);
    opacity: .16;
    will-change: transform;
}
html.is-mobile .bottom-nav-btn.active + .m-ind, html.is-mobile .m-ind { pointer-events: none; }

/* --------- نوافذ النظام التي لا تتحول إلى سفلية (الدخول/التحديث/الوردية) ---------
   في وضع "ويب اب" يمتد المحتوى تحت شريط الحالة، ونسخة الهاتف تُنزل النافذة إلى
   حافة الشاشة العليا من أول بكسل — فيُقص أول سطر منها. تُصفَّر الحواف وتُوسَّط. */
html.is-mobile .modal-overlay:not(.m-sheet) {
    align-items: center !important;
    justify-content: center !important;
    padding: calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px) !important;
}
html.is-mobile .modal-overlay:not(.m-sheet) .modal-content {
    width: 100% !important;
    max-width: 720px !important;
    height: auto !important;
    max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 20px) !important;
    margin: 0 auto !important;
    border-radius: 26px !important;
    border: 1px solid var(--m-line) !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

/* --------- النوافذ السفلية ---------
   نسخة الهاتف原有 تجعل كل نافذة ملء الشاشة من الحافة العليا بـ !important،
   فلا بد من !important هنا وإلا بقيت النافذة فوق ومقطوعة من تحت. */
html.is-mobile .modal-overlay.m-sheet {
    display: flex;
    position: fixed;
    inset: 0;
    align-items: flex-end !important;
    justify-content: center !important;
    /* الحافة السفلية صفر: النافذة التي تحتاج ارتفاعاً فوق لوحة المفاتيح يُكتب
       لها ذلك سطرياً وحدها، فلا تقفز بقية النوافذ عند صعود اللوحة أو نزولها */
    padding: 0 !important;
    background: rgba(0,0,0,.62);
    /* بدون تمويه: تمويه خلفية تتحرك فوقها النافذة يعيد رسم الشاشة كل إطار */
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s var(--m-ease);
}
html.is-mobile .modal-overlay.m-sheet.m-on { opacity: 1; pointer-events: auto; }
/* الدخول والخروج حركات CSS لا انتقالات: النظام يُخفي النافذة بـ display:none،
   والانتقال لا يعمل عبر الإخفاء — فكانت النافذة تختفي فجأة أو تهبط ثم تصعد.
   الحركة تُبطل أيضاً slideUp الخاصة بالنظام التي كانت تركب فوق حركة الطبقة. */
@keyframes mSheetIn { from { transform: translateY(105%); } to { transform: translateY(0); } }
@keyframes mSheetOut { from { transform: translateY(0); } to { transform: translateY(105%); } }
@keyframes mScrimIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes mScrimOut { from { opacity: 1; } to { opacity: 0; } }
html.is-mobile .modal-overlay.m-sheet .modal-content { animation: none; }
html.is-mobile .modal-overlay.m-sheet.m-on { animation: mScrimIn .24s linear both; }
/* m-in تُنزع بعد اكتمال الحركة: لولا ذلك أبقت الحركة تعبئتها وسجّلت قيمة
   transform، فجاء سحب الإصبع فوقها بلا استجابة */
html.is-mobile .modal-overlay.m-sheet.m-in .modal-content { animation: mSheetIn .3s var(--m-ease) both; }
/* يُبقي النافذة مرئية لحظة الانزلاق للأسفل رغم display:none التي يضعها النظام */
html.is-mobile .modal-overlay.m-sheet.m-closing {
    display: flex !important;
    pointer-events: none;
    animation: mScrimOut .3s linear both;
}
html.is-mobile .modal-overlay.m-sheet.m-closing .modal-content { animation: mSheetOut .3s var(--m-ease) both; }
html.is-mobile .modal-overlay.m-sheet .modal-content {
    width: 100% !important;
    max-width: 720px !important;
    height: auto !important;
    max-height: 92dvh !important;
    margin: 0 !important;
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0 !important;
    border: 1px solid var(--m-line) !important;
    border-bottom: none !important;
    background: var(--m-card) !important;
    box-shadow: 0 -18px 60px rgba(0,0,0,.6) !important;
    padding: 6px 14px calc(14px + env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    transform: translateY(105%);
    transition: transform .32s var(--m-ease);
}
/* النوافذ الطويلة برأس وتذييل مثبتين: التمرير داخل الوسط فقط، فلا يُقص زر الإغلاق */
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
    /* جداول الغوص أعمدة كثيرة: سحب أفقي بدل قصّ الأعمدة */
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal .m-grab { margin: 8px 14px 0; }
html.is-mobile .modal-overlay .modal-content.mobile-sticky-modal .m-sheet-x { top: 14px; }
html.is-mobile .modal-overlay.m-sheet.m-on .modal-content { transform: translateY(0); }
html.is-mobile .modal-overlay.m-sheet.m-live .modal-content { animation: none !important; transition: transform .1s linear; }
/* الارتفاع فوق لوحة المفاتيح يُكتب سطرياً على النافذة نفسها (جافاسكريبت الطبقة):
   صنف عام على الجذر كان يجعل كل نافذة تقفز لمّا تُغلق لوحة المفاتيح */
html.is-mobile .m-grab {
    width: 42px; height: 5px; border-radius: 99px;
    background: rgba(255,255,255,.22);
    margin: 6px auto 8px;
}
html.is-mobile .modal-overlay.m-sheet .modal-title {
    position: sticky; top: -6px; z-index: 3;
    margin: 0 -14px 10px;
    padding: 12px 14px 10px;
    background: rgba(21,21,23,.98);
    border-bottom: 1px solid var(--m-hair);
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    font-size: 17px;
}
html.is-mobile .modal-overlay.m-sheet .modal-actions { position: sticky; bottom: 0; padding-top: 8px; background: linear-gradient(to top, var(--m-card) 65%, transparent); }
html.is-mobile .m-sheet-x {
    position: absolute; top: 10px; inset-inline-end: 12px; z-index: 4;
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--m-hair);
    background: rgba(255,255,255,.06);
    color: var(--m-text); font-size: 16px;
}

/* التنبيهات: فوق الشريط العائم لا خلفه */
html.is-mobile #toast-container {
    top: auto !important; left: 12px !important; right: 12px !important;
    bottom: calc(var(--m-bar-h) + 22px + env(safe-area-inset-bottom) + var(--m-kb)) !important;
    z-index: 9600 !important;
    display: flex; flex-direction: column; gap: 8px; align-items: stretch;
}
html.is-mobile .toast-msg { border-radius: var(--m-radius-card) !important; box-shadow: 0 12px 30px rgba(0,0,0,.5) !important; max-width: none !important; }

html.is-mobile .m-offline {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--m-red);
    background: rgba(255,71,87,.1);
    border: 1px solid rgba(255,71,87,.28);
    border-radius: 12px; padding: 8px 10px; margin-bottom: 10px;
}

html.is-mobile .m-splash {
    position: fixed;
    inset: 0;
    z-index: 9700;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--m-bg);
    opacity: 1;
    transition: opacity .6s var(--m-ease);
}
html.is-mobile .m-splash.m-off2 { opacity: 0; }
html.is-mobile .m-splash i { font-size: 34px; color: var(--m-gold); animation: mSpin 1s linear infinite; }
@keyframes mSpin { to { transform: rotate(360deg); } }

/* زر التبديل ويافطة إعادة المحاولة */
html.is-mobile .m-viewbtn {
    width: 100%; margin-top: 14px;
    min-height: 46px;
    border-radius: 14px;
    border: 1px solid var(--m-line);
    background: var(--m-gold-soft);
    color: var(--m-gold);
    font-size: 15px; font-weight: 700;
}

/* الخلفية تتجمّد باللمس لا بتغيير overflow: سفاري يصفّر موضع التمرير عند تغيير
   overflow، فتقفل النافذة بصفحة تهبط إلى أعلى ثم ترجع — قفزة بلا أي فائدة. */
html.is-mobile body.m-lock .admin-section { pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
    html.is-mobile *, html.is-mobile *::before, html.is-mobile *::after {
        transition-duration: .001ms !important;
        animation-duration: .001ms !important;
        animation-iteration-count: 1 !important;
    }
    /* حركة الطبقة تُخفَّف ولا تُلغى: تُلغيها الكاملة هي ما جعل المستخدم يقول
       «الموشن لم يعمل» حين تكون خاصية تقليل الحركة مفعّلة في الجهاز */
    html.is-mobile .admin-section.m-enter,
    html.is-mobile .admin-section .m-anim,
    html.is-mobile .modal-overlay.m-sheet,
    html.is-mobile .modal-overlay.m-sheet .modal-content {
        transition-duration: .16s !important;
        animation-duration: .16s !important;
    }
    html.is-mobile .admin-section .m-anim { animation-delay: 0s !important; }
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
        jumping: null
    };

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
            if (p && p.id) css += '#' + ADMIN_ID + ' #' + p.id + '{--m-i:' + i + '}';
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
            const seen = Math.abs(i - P) <= 1.5;
            if (seen !== el.classList.contains('m-seen')) el.classList.toggle('m-seen', seen);
            const cur = i === state.index;
            if (cur !== el.classList.contains('m-cur')) el.classList.toggle('m-cur', cur);
            if (seen && state.keys[i] === 'invoice-designer') ensureStudioFonts();
            if (!calcOk) {
                const d = i - P;
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
    function paintIndicator() {
        const ind = document.querySelector('.m-ind');
        const bar = document.querySelector(BAR_SELECTOR);
        if (!ind || !bar) return;
        const M = Math.max(1, state.barBtns.length);
        const pad = 5;
        if (!state.cell) {
            const w = bar.clientWidth;
            if (!w) return;
            state.barW = w;
            state.cell = (w - pad * 2) / M;
        }
        const f = clamp(barPosFor(phys.P), 0, M - 1);
        const left = dirSign() < 0 ? (state.barW - pad - (f + 1) * state.cell) : (pad + f * state.cell);
        ind.style.width = state.cell + 'px';
        ind.style.transform = 'translate3d(' + left.toFixed(2) + 'px,0px,0px)';
        const bi = barIndexOfPage(clamp(Math.round(phys.P), 0, state.n - 1));
        state.barBtns.forEach((b, i) => b.classList.toggle('m-hi', i === bi));
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
        }

        /* 1:1 مع الإصبع + مرونة عند الحدود */
        const step = dx / state.width;
        let raw = dirSign() < 0 ? phys.P0 + step : phys.P0 - step;
        let over = 0;
        if (raw < 0) { over = raw; raw = 0; }
        if (raw > state.n - 1) { over = raw - (state.n - 1); raw = state.n - 1; }
        phys.P = clamp(raw + rubber(over), -0.5, state.n - 0.5);
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
            if (state.busy) { setBusy(false); flushRepaint(); }
            return;
        }
        phys.touching = false;
        document.body.classList.remove('m-dragging');
        if (phys.axis !== 'x') { finishGesture(); return; }

        const v = velocity();
        let target = Math.round(phys.P + v * 0.2);
        target = clamp(target, phys.P0 - 1, phys.P0 + 1);
        target = clamp(target, 0, state.n - 1);
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
        phys.touching = false;
        phys.axis = 'none';
        document.body.classList.remove('m-dragging');
        springTo(Math.round(phys.P), 0);
    }

    function finishGesture() { setBusy(false); setTimeout(flushRepaint, 260); }

    function commit(pageIdx) {
        const i = clamp(Math.round(pageIdx), 0, state.n - 1);
        phys.P = i;
        state.index = i;
        paintTransforms();
        document.body.classList.remove('m-dragging');
        const key = state.keys[i];
        if (key && key !== currentTabKey()) routeOriginal(key);
        syncA11y();
        onArrive(key);
        setBusy(false);
        enterAnimate(state.pages[i]);
        setTimeout(flushRepaint, 520);
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
            if (state.pages[i]) state.pages[i].style.willChange = v ? 'transform' : 'auto';
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
        if (page && Math.abs(page.scrollTop - top) > 2) page.scrollTop = top;
        openSheets.forEach((c, i) => { if (Math.abs(c.scrollTop - sheetTops[i]) > 2) c.scrollTop = sheetTops[i]; });
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

    function enterAnimate(page) {
        if (!page) return;
        const nodes = enterNodes(page);
        page.classList.remove('m-enter');
        nodes.forEach((n, i) => {
            n.classList.remove('m-anim');
            n.style.setProperty('--m-k', String(i));
        });
        void page.offsetWidth;
        page.classList.add('m-enter');
        nodes.forEach((n) => n.classList.add('m-anim'));
        setTimeout(() => {
            page.classList.remove('m-enter');
            nodes.forEach((n) => n.classList.remove('m-anim'));
        }, 940);
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
        const s = i > from ? 1 : -1;
        /* النقر ينتقل مباشرة بين المصدر والهدف: لا قلب على الصفحات الوسيطة ولا
           لحظة اختفاء — المصدر يخرج والهدف يدخل في مسار واحد بطول لوحة واحدة. */
        state.index = i;
        phys.P = i;
        setBusy(true);
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
            phys.P = from + (i - from) * e;
            paintIndicator();
            if (k < 1) { phys.raf = requestAnimationFrame(step); return; }
            phys.P = i;
            state.index = i;
            if (src) src.style.willChange = 'auto';
            if (dst) dst.style.willChange = 'auto';
            clearOffsets();
            paintTransforms();
            syncA11y();
            setBusy(false);
            enterAnimate(dst);
            /* ما استجد أثناء الحركة يُرسم بعد اكتمال الدخول، لا فوقه */
            setTimeout(flushRepaint, 520);
        };
        phys.raf = requestAnimationFrame(step);
    }

    function showAdminChrome() {
        const wasAdmin = document.body.classList.contains('m-admin');
        document.body.classList.add('m-admin');
        /* الشريط يصبح ظاهراً الآن: خانته تُقاس من جديد */
        if (!wasAdmin) state.cell = 0;
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
        const i = clamp(state.index + (forward ? 1 : -1), 0, state.n - 1);
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

        state.index = clamp(order.indexOf(currentTabKey()), 0, state.n - 1);
        phys.P = state.index;
        decorateBar();
        paintPageIndexes();
        probeCalc();
        cacheWidth();
        paintTransforms();
        bindGestures();
        observeSheets();
        bindKeyboard();
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
        requestAnimationFrame(() => {
            el.classList.add('m-off2');
            setTimeout(() => el.remove(), 650);
        });
    }

    function onResize() {
        if (!state.started) return;
        state.cell = 0;
        cacheWidth();
        paintTransforms();
        reevaluateLater();
    }

    function boot() {
        injectChrome();
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
