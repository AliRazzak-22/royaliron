// استيراد مكتبات فايربيس مع تغليف دوال الرفع (rename) لبرمجة الصندوق الأسود
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref as fbRef, set as fbSet, get, child, onValue, update as fbUpdate, remove as fbRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtuPp8juKTJFSZv6Cdmtrli2NfFDKUnkw",
    authDomain: "roylairon.firebaseapp.com",
    databaseURL: "https://roylairon-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "roylairon",
    storageBucket: "roylairon.firebasestorage.app",
    messagingSenderId: "1065374551442",
    appId: "1:1065374551442:web:2b9bbdfb1144d289cb854b",
    measurementId: "G-KXKMGMZSNX"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const auth = getAuth(app);

// =========================================================
// --- 📴 الصندوق الأسود: محرك الأوفلاين والمزامنة الذكية ---
// =========================================================
const pathMap = new WeakMap();

// 1. اعتراض مسارات فايربيس
const ref = (db, pathStr) => {
    const r = fbRef(db, pathStr);
    pathMap.set(r, pathStr || '/');
    return r;
};

// 2. التخزين في الصندوق الأسود عند انقطاع الإنترنت
const addToBlackBox = (method, pathStr, payload) => {
    let queue = JSON.parse(localStorage.getItem('royal_offline_queue')) || [];
    queue.push({ method, pathStr, payload, id: Date.now() + Math.random() });
    localStorage.setItem('royal_offline_queue', JSON.stringify(queue));
    
    if (queue.length === 1) window.showAlert('انقطع الإنترنت! 📴 سيتم حفظ عملك محلياً ورفعه تلقائياً لاحقاً.', 'warning');
    updateSyncStatus();
};

// 3. محرك تفريغ الصندوق ورفع البيانات عند عودة الإنترنت
window.processBlackBox = async () => {
    if (!navigator.onLine) return;
    let queue = JSON.parse(localStorage.getItem('royal_offline_queue')) || [];
    if (queue.length === 0) return;

    window.showAlert(`عودة الاتصال! جاري مزامنة ${queue.length} حركات من الصندوق الأسود... ⏳`, 'warning');
    
    let newQueue = [...queue];
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
        let task = queue[i];
        try {
            let r = fbRef(database, task.pathStr === '/' ? undefined : task.pathStr);
            if (task.method === 'set') await fbSet(r, task.payload);
            if (task.method === 'update') await fbUpdate(r, task.payload);
            if (task.method === 'remove') await fbRemove(r);
            
            newQueue = newQueue.filter(t => t.id !== task.id);
            localStorage.setItem('royal_offline_queue', JSON.stringify(newQueue));
            successCount++;
        } catch (err) {
            console.error('خطأ مزامنة (سيتم المحاولة لاحقاً):', err);
            break; // التوقف لعدم تخريب تسلسل الحركات
        }
    }
    
    if (successCount > 0 && newQueue.length === 0) {
        window.showAlert('✅ تمت المزامنة! جميع بيانات الأوفلاين الآن في السحابة.', 'success');
        updateSyncStatus();
    }
};

window.addEventListener('online', () => {
    updateSyncStatus();
    window.processBlackBox();
});

// 4. الجدار الذكي: تغليف دوال الرفع لتمر عبر الصندوق الأسود أولاً
const set = (r, data) => {
    const pathStr = pathMap.get(r);
    if (!navigator.onLine) { addToBlackBox('set', pathStr, data); return Promise.resolve(); }
    return fbSet(r, data).catch(() => { addToBlackBox('set', pathStr, data); });
};
const update = (r, data) => {
    const pathStr = pathMap.get(r);
    if (!navigator.onLine) { addToBlackBox('update', pathStr, data); return Promise.resolve(); }
    return fbUpdate(r, data).catch(() => { addToBlackBox('update', pathStr, data); });
};
const remove = (r) => {
    const pathStr = pathMap.get(r);
    if (!navigator.onLine) { addToBlackBox('remove', pathStr, null); return Promise.resolve(); }
    return fbRemove(r).catch(() => { addToBlackBox('remove', pathStr, null); });
};
// =========================================================

// المتغيرات العامة
let localData = {
    catalog: [], invoices: [], expenses: [], operatingCosts: [], debts: [], logs: [], payments: [], // تمت إضافة payments
    dailySalesCash: 0, dailySalesElectronic: 0, lastDate: new Date().toDateString()
};
let currentCart = [];
let editingInvoiceId = null; 
let pendingItem = null;
// --- جدار الحماية: توكن الجلسة لمنع التجاوز برمجياً ---
let secureAdminToken = null;

// --- التدخل الجراحي الأمني: محرك الوقت العالمي (بغداد/النجف) لمنع تلاعب الكاشير ---
// يقوم بجلب الوقت من خادم عالمي مع حساب فرق الوقت بين الاستجابة والتنفيذ
let globalTimeOffset = 0;
let isTimeSynced = false;

async function syncGlobalTime() {
    try {
        const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Baghdad');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        const serverTime = new Date(data.datetime).getTime();
        const localTime = Date.now();
        globalTimeOffset = serverTime - localTime; 
        isTimeSynced = true;
        console.log("تمت مزامنة الوقت بنجاح. فرق الوقت:", globalTimeOffset, "ملي ثانية");
    } catch (error) {
        console.warn("فشل الاتصال بخادم الوقت العالمي، سيتم الاعتماد على توقيت فايربيس أو الجهاز مؤقتاً.", error);
        isTimeSynced = false;
    }
}

// تشغيل المزامنة عند الإقلاع
syncGlobalTime();
// إعادة المزامنة كل ساعة لضمان الدقة
setInterval(syncGlobalTime, 60 * 60 * 1000);

// دالة سحرية تُرجع الوقت الحقيقي والمحمي دائماً
function getRealTime() {
    const timeNow = Date.now() + globalTimeOffset;
    const realDate = new Date(timeNow);
    
    // إجبار التنسيق على توقيت العراق (بغداد/النجف)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false // تنسيق 24 ساعة لسهولة المعالجة لاحقاً
    });

    const parts = formatter.formatToParts(realDate);
    const dateObj = {};
    parts.forEach(p => dateObj[p.type] = p.value);

    // بناء سلاسل التاريخ والوقت بدقة (YYYY-MM-DD)
    const dateString = `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
    // تحويل الوقت لصيغة إنجليزية (AM/PM) بدون ثوانٍ
    const realTimeFormat = realDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Baghdad', hour: 'numeric', minute: '2-digit', hour12: true });

    return {
        timestamp: timeNow,
        date: dateString,
        time: realTimeFormat,
        obj: realDate
    };
}

// --- بذور نظام المزامنة اللحظية الأوفلاين ---
window.addEventListener('online', updateSyncStatus);
window.addEventListener('offline', updateSyncStatus);

function updateSyncStatus() {
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    if (!icon || !text) return;
    
    if(navigator.onLine) {
        icon.className = 'fa-solid fa-cloud';
        text.innerText = 'متصل';
        text.parentElement.style.color = 'var(--green-success)';
    } else {
        icon.className = 'fa-solid fa-cloud-arrow-up';
        text.innerText = 'أوفلاين';
        text.parentElement.style.color = 'var(--red-danger)';
    }
}

// --- جدار الحماية (XSS): دالة تعقيم المدخلات لتدمير الأكواد الخبيثة ---
window.escapeHTML = (str) => {
    if(typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
};
// -----------------------------------------------------------------
// --- التدخل الجراحي: الدالة المساعدة الآمنة لتوحيد التاريخ دون تشويه أساسيات اللغة ---
window.formatRoyalDate = (dateObj) => {
    // إذا لم يتم تمرير تاريخ، نستخدم الوقت العالمي المحمي الذي برمجناه في الخطوة السابقة
    if(!dateObj) return getRealTime().date; 
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// -----------------------------------------------------------------------
const availableIcons = [
    'fa-shirt', 'fa-user-tie', 'fa-person-dress', 'fa-user-nurse', 'fa-person-military-rifle',
    'fa-user-secret', 'fa-user-doctor', 'fa-person', 'fa-socks', 'fa-mitten', 
    'fa-hat-cowboy', 'fa-graduation-cap', 'fa-baby-carriage', 'fa-bed', 'fa-rug',
    'fa-mattress-pillow', 'fa-towel', 'fa-bag-shopping', 'fa-shoe-prints',
    'fa-vest', 'fa-child-dress', 'fa-briefcase', 'fa-scissors', 'fa-crown', 'fa-car',
    'fa-motorcycle', 'fa-campground', 'fa-layer-group', 'fa-couch', 'fa-chair',
    'fa-puzzle-piece', 'fa-umbrella', 'fa-glasses', 'fa-ring', 'fa-vest-patches'
];

// دالة جلب البيانات من السحابة عند تشغيل النظام
async function initializeDB() {
    try {
        await signInAnonymously(auth);

       // التدخل الجراحي المطور: تشغيل محرك المزامنة الحية اللحظية (Realtime Engine)
        let isFirstLoad = true;
        onValue(ref(database, 'royal_data'), (snapshot) => {
            if (snapshot.exists()) {
                let incomingData = snapshot.val();
                
                // فلتر أمان جراحي: يمسح أي بيانات مكررة أو أشباح قادمة من فايربيس بناءً على الـ ID
                const cleanData = (data) => {
                    let arr = Object.values(data || {});
                    let unique = {};
                    arr.forEach(item => { if (item && item.id) unique[item.id] = item; });
                    return Object.values(unique);
                };

                // مزامنة فورية ونقية للذاكرة المحلية
                localData.invoices = cleanData(incomingData.invoices);
                localData.catalog = cleanData(incomingData.catalog);
                localData.expenses = cleanData(incomingData.expenses);
                localData.operatingCosts = Object.values(incomingData.operatingCosts || {}); // ليس لها ID
                localData.debts = cleanData(incomingData.debts);
                localData.logs = cleanData(incomingData.logs);
                localData.partnerTx = cleanData(incomingData.partnerTx);
                localData.subscriptions = cleanData(incomingData.subscriptions);
                localData.payments = cleanData(incomingData.payments);
                
                let fetchedSettings = incomingData.settings || { name: "مكوى رويال ", phone: "07800000000", address: "الكوفة، النجف الأشرف" };
                if(fetchedSettings.password) delete fetchedSettings.password;
                localData.settings = fetchedSettings;
                localData.lastDate = incomingData.lastDate || new Date().toDateString();

                // فحص بداية يوم جديد
                if(localData.lastDate !== new Date().toDateString()) {
                    localData.dailySalesCash = 0;
                    localData.dailySalesElectronic = 0;
                    localData.lastDate = new Date().toDateString();
                    saveDataToCloud(); 
                } else {
                    window.recalculateDailySales();
                }
            } else {
                localData.catalog = [
                    { id: 'suit', name: 'بدلة رجالية', icon: 'fa-user-tie', prices: { wash_iron: 8000, iron_only: 5000 } },
                    { id: 'abaya', name: 'عباءة نسائية', icon: 'fa-person-dress', prices: { wash_iron: 6000, iron_only: 4000 } },
                    { id: 'arabic', name: 'الزي العربي', icon: 'fa-user-nurse', prices: { wash_iron: 4000, iron_only: 3000 } },
                    { id: 'military', name: 'بدلة عسكرية', icon: 'fa-person-military-rifle', prices: { wash_iron: 6000, iron_only: 5000 } },
                    { id: 'coat', name: 'كوت', icon: 'fa-user-secret', prices: { wash_iron: 6000, iron_only: 4000 } },
                    { id: 'shirt', name: 'قميص', icon: 'fa-shirt', prices: { wash_iron: 3000, iron_only: 2000 } }
                ];
                localData.invoices = []; localData.expenses = []; localData.operatingCosts = []; localData.debts = []; localData.logs = []; localData.payments = [];
                localData.settings = { name: "مكوى رويال VIP", phone: "07800000000", address: "الكوفة، النجف الأشرف", password: "ahmed2003" };
                saveDataToCloud();
            }
            
            updateSyncStatus();
            
            // في أول تشغيل للنظام فقط
            if (isFirstLoad) {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) loadingScreen.style.display = 'none';
                isFirstLoad = false;
            }

            // تحديث واجهات النظام فور وصول أي بايت من السحابة
            renderItems();
            if(window.renderPackages) window.renderPackages();
            updateUI();

            // المزامنة الحية للواجهات المفتوحة تلقائياً دون رفرش
            if (document.getElementById('modal-active-orders') && document.getElementById('modal-active-orders').style.display === 'flex') {
                window.renderActiveOrders();
            }
            if (document.getElementById('modal-invoices') && document.getElementById('modal-invoices').style.display === 'flex') {
                window.openPreviousInvoices();
            }
            if (document.getElementById('modal-cashier-subs') && document.getElementById('modal-cashier-subs').style.display === 'flex') {
                window.renderCashierSubs();
            }
            if (document.getElementById('admin-screen') && document.getElementById('admin-screen').classList.contains('active-screen')) {
                window.updateAdminDashboard();
                if (sessionStorage.getItem('admin_tab') === 'logs') window.renderLogs();
                if (sessionStorage.getItem('admin_tab') === 'subscriptions' && window.renderAdminSubs) window.renderAdminSubs();
            }
        }, (error) => {
            console.error("فشل جلب البيانات من السحابة:", error);
            window.showAlert("تنبيه: انقطع الاتصال بقاعدة البيانات السحابية.", "error");
        });
        if(localStorage.getItem('cart_draft')) {
            currentCart = JSON.parse(localStorage.getItem('cart_draft'));
            renderCart();
        }
        
        // --- استرجاع حالة الشاشة والتبويب بعد التحديث (الرفرش) ---
        const savedScreen = sessionStorage.getItem('active_screen');
        const isMobileDevice = (window.innerWidth <= 768 || /iPhone|Android|iPad|webOS/i.test(navigator.userAgent));

        if (savedScreen === 'pos') {
            window.showPOS();
        } else if (savedScreen === 'admin') {
            // التدخل الجراحي: منع الدخول التلقائي للآدمن لحماية البيانات
            sessionStorage.removeItem('active_screen'); 
            
            if (isMobileDevice) {
                document.getElementById('main-screen').style.display = 'none';
                window.openAdminLogin();
            } else {
                document.getElementById('main-screen').style.display = 'flex';
            }
            window.showAlert('تم إنهاء جلسة الآدمن لدواعي أمنية. يرجى تسجيل الدخول مجدداً.', 'warning');
        } else {
            // التوجيه الذكي الفوري: إذا فتح الرابط من الجوال لأول مرة
            if (isMobileDevice) {
                document.getElementById('main-screen').style.display = 'none';
                window.openAdminLogin();
            }
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        alert("حدث خطأ في الاتصال بقاعدة البيانات. يرجى التحقق من الإنترنت.");
    }
}

// --- التدخل الجراحي المطور: إعادة حساب المبيعات اليومية بدقة رياضية صارمة ---
window.recalculateDailySales = () => {
    // الحصول على تاريخ اليوم الآمن من السيرفر العالمي
    const todayStr = getRealTime().date;
    
    let realCash = 0; 
    let realElectronic = 0;
    
    // 1. حساب الفواتير المباشرة والعربون (المرتبطة بتاريخ إنشاء الفاتورة لليوم الحالي)
    (localData.invoices || []).forEach(inv => {
        // فحص الفواتير التي تم إنشاؤها "اليوم" فقط
        if (inv.date === todayStr) {
            
            // طلب قيد العمل: نحسب العربون المدفوع الآن (كاش)
            if (inv.type === 'active' && inv.customer && inv.customer.paid > 0) {
                realCash += inv.customer.paid;
            }
            // البيع المباشر السريع (كاش أو إلكتروني)
            else if (inv.type === 'cash') {
                realCash += inv.total;
            } else if (inv.type === 'electronic') {
                realElectronic += inv.total;
            }
            // طلب تم استلامه وتسليمه في نفس اليوم! (عربون + متبقي)
            else if (inv.type === 'archived' && inv.customer) {
                // نضيف العربون
                realCash += (inv.customer.paid || 0); 
                // المتبقي تتم معالجته كدفعة منفصلة في مسار payments لتجنب التكرار
                // لذلك لا نجمعه من هنا!
            }
        }
    });
    
    // 2. خصم المصروفات لليوم الحالي
    (localData.expenses || []).forEach(exp => {
        if (exp.date === todayStr) { 
            realCash -= exp.amount; 
        }
    });
    
    // 3. حساب الحركات المالية المستقلة والمتبقي من الطلبات القديمة (من مسار payments)
    (localData.payments || []).forEach(pay => {
        if (pay.date === todayStr) { 
            
            // المبالغ الموجبة (كاش داخل للصندوق)
            if (
                pay.type === 'تسديد دين' || 
                pay.type === 'اشتراك VIP' || 
                pay.type === 'تجديد VIP' || 
                pay.type === 'ترقية VIP' ||
                pay.type === 'دفع مختلط (VIP + كاش)' ||
                pay.type === 'دفع كاش (متبقي طلب)' ||
                pay.type === 'دفع إلكتروني (متبقي طلب)'
            ) {
                // التدخل الجراحي: نضمن عدم الجمع المزدوج للدفع المختلط
                if(pay.type !== 'دفع مختلط (VIP + كاش)') {
                    if(pay.type !== 'دفع إلكتروني (متبقي طلب)') {
                        realCash += pay.amount;
                    } else {
                        realElectronic += pay.amount; // الدفع الإلكتروني
                    }
                }
            }
            // المبالغ السالبة (كاش خارج من الصندوق)
            else if (pay.type === 'إلغاء اشتراك VIP') {
                realCash -= pay.amount;
            }
        }
    });
    
    // تحديث الأرقام النهائية المعصومة من الخطأ
    localData.dailySalesCash = realCash;
    localData.dailySalesElectronic = realElectronic;
};

function saveDataToCloud() {
    window.recalculateDailySales(); // فلتر الأمان: إعادة حساب الصندوق قبل الحفظ
    
    // التدخل الجراحي: رفع المسارات الفرعية فقط لمنع التدمير اللحظي (Race Condition) للفواتير والصرفيات
    // التدخل الجراحي: تحويل المصفوفات إلى كائنات مفهرسة بالـ ID لمنع ظاهرة التكرار في فايربيس
    const toObj = (arr) => arr.reduce((acc, item) => { 
        if(item && item.id) acc[item.id] = item; 
        return acc; 
    }, {});

    const updates = {};
    if(localData.catalog) updates['royal_data/catalog'] = toObj(localData.catalog);
    if(localData.operatingCosts) updates['royal_data/operatingCosts'] = localData.operatingCosts;
    if(localData.debts) updates['royal_data/debts'] = toObj(localData.debts);
    if(localData.partnerTx) updates['royal_data/partnerTx'] = toObj(localData.partnerTx);
    if(localData.subscriptions) updates['royal_data/subscriptions'] = toObj(localData.subscriptions);
    if(localData.payments) updates['royal_data/payments'] = toObj(localData.payments);
    if(localData.settings) {
        updates['royal_data/settings/name'] = localData.settings.name;
        updates['royal_data/settings/phone'] = localData.settings.phone;
        updates['royal_data/settings/address'] = localData.settings.address;
        if(localData.settings.invoiceTemplate) updates['royal_data/settings/invoiceTemplate'] = localData.settings.invoiceTemplate;
        if(localData.settings.shiftTemplate) updates['royal_data/settings/shiftTemplate'] = localData.settings.shiftTemplate;
    }

    update(ref(database), updates).then(() => {
        updateUI();
    }).catch((error) => {
        window.showAlert("فشل في حفظ البيانات: " + error.message, 'error');
    });
}
// -------------------------------------------------------------------

// دالة المراقبة (سجل الحركات) - تسجل كل حركة تلقائياً
window.logAction = (actionType, details, amount = 0, snapshot = null) => {
    if(!localData.logs) localData.logs = [];
    const realT = getRealTime();
    const newLog = {
        id: 'LOG-' + realT.timestamp + '-' + Math.floor(Math.random() * 1000),
        date: realT.date,
        time: realT.time,
        timestamp: realT.timestamp,
        type: actionType,
        details: details,
        amount: amount,
        snapshot: snapshot
    };
    localData.logs.push(newLog);
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref }) => {
        set(ref(window.db || database, 'royal_data/logs/' + newLog.id), newLog);
    });
};
// ==========================================
// --- برمجة قائمة الهامبرغر الجانبية ---
// ==========================================
window.toggleHamburgerMenu = () => {
    document.getElementById('hamburger-menu').classList.toggle('show');
};

// إغلاق القائمة تلقائياً إذا ضغط الكاشير في أي مكان فارغ بالشاشة
document.addEventListener('click', (e) => {
    const menu = document.getElementById('hamburger-menu');
    if (menu && menu.classList.contains('show') && !e.target.closest('.dropdown-wrapper')) {
        menu.classList.remove('show');
    }
});

// أمر تصغير الشاشة لسطح المكتب
window.minimizeApp = () => {
    document.getElementById('hamburger-menu').classList.remove('show');
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('minimize-app');
    }
};

// أمر البحث اليدوي عن تحديثات
window.manualCheckForUpdates = () => {
    document.getElementById('hamburger-menu').classList.remove('show');
    window.showAlert('جاري البحث عن تحديثات في السحابة... ⏳', 'warning');
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('manual-check-update');
    }
};
// ---------------- الأزرار العامة ----------------
window.showPOS = () => { 
    sessionStorage.setItem('active_screen', 'pos'); // حفظ مسار الكاشير
    document.getElementById('main-screen').style.display = 'none'; 
    document.getElementById('pos-screen').classList.add('active-screen'); 
    
    // --- تفعيل ملء الشاشة والتدوير الأفقي التلقائي للجوال ---
    if(window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)){
        let elem = document.documentElement;
        if(elem.requestFullscreen) {
            elem.requestFullscreen().then(() => {
                if(screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(e => console.log("الدوران مقفول من النظام"));
                }
            }).catch(e => console.log(e));
        }
    }
};

window.exitToMain = () => { 
    sessionStorage.removeItem('active_screen'); // تفريغ الذاكرة
    sessionStorage.removeItem('admin_tab');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen')); 
    
    // التوجيه الذكي: عند الخروج من الجوال لا ترجع لشاشة البداية أبداً!
    if (window.innerWidth <= 768 || /iPhone|Android|webOS/i.test(navigator.userAgent)) {
        document.getElementById('main-screen').style.display = 'none';
        window.openAdminLogin();
    } else {
        document.getElementById('main-screen').style.display = 'flex'; 
    }
    
    // --- إلغاء ملء الشاشة وتحرير الشاشة عند الخروج للرئيسية ---
    if(document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.log(e));
    }
    if(screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
};

// --- دالة إغلاق النظام بأمان للكاشير ---
window.confirmCloseApp = () => {
    window.showConfirm('هل أنت متأكد أنك تريد إغلاق النظام بالكامل؟ (سيتم حفظ كل شيء)', () => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('close-app');
        }
    }, '<i class="fa-solid fa-power-off"></i> تأكيد الإغلاق', 'نعم، أغلق النظام');
};
// ----------------------------------------
window.openAdminLogin = () => { document.getElementById('modal-admin-login').style.display = 'flex'; };
window.closeModals = () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
// ---------------- نظام رسائل التأكيد المخصصة ----------------
let pendingConfirmAction = null;
window.showConfirm = (msg, actionCallback, title = 'تأكيد الحذف', btnText = 'نعم، احذف نهائياً') => {
    document.getElementById('custom-confirm-title').innerHTML = title;
    document.getElementById('custom-confirm-btn').innerHTML = btnText;
    document.getElementById('custom-confirm-msg').innerText = msg;
    pendingConfirmAction = actionCallback;
    document.getElementById('modal-custom-confirm').style.display = 'flex';
};
window.closeConfirmModal = () => {
    document.getElementById('modal-custom-confirm').style.display = 'none';
    pendingConfirmAction = null;
};
window.executeConfirm = () => {
    if(pendingConfirmAction) pendingConfirmAction();
    window.closeConfirmModal();
};
window.checkAdminPassword = () => {
    const inputPass = document.getElementById('admin-password').value;
    // التدخل الجراحي: جلب الرمز من السحابة مباشرة لحظة التحقق فقط
    get(ref(database, 'royal_data/settings/password')).then((snapshot) => {
        const realPassword = snapshot.val() || "ahmed2003";
        if(inputPass === realPassword) {
            secureAdminToken = "AUTH_ROYAL_" + Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('active_screen', 'admin'); 
            window.closeModals();
            document.getElementById('main-screen').style.display = 'none';
            document.getElementById('admin-screen').classList.add('active-screen');
            document.getElementById('admin-password').value = '';
            window.updateAdminDashboard();
        } else { 
            window.showAlert('رمز الدخول خاطئ!', 'error'); 
        }
    });
};
// ---------------- نظام الإشعارات المنزلقة (Toast Notifications) ----------------
window.showAlert = (msg, type = 'warning') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;

    let icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';

    toast.innerHTML = `
        ${icon}
        <span>${msg}</span>
        <div class="toast-progress"></div>
    `;

    // إضافة الإشعار للحاوية
    container.appendChild(toast);

    // إزالة الإشعار بعد 3 ثواني مع حركة خروج ناعمة
    setTimeout(() => {
        toast.style.animation = 'slideOutLeft 0.4s forwards';
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 400); // الانتظار حتى تنتهي حركة الخروج
    }, 3000);
};

// 🔴 توجيه الـ alert الافتراضي ليعمل كـ Toast
window.alert = (msg) => {
    window.showAlert(msg, 'error'); 
};

// ---------------- بناء الواجهة (الخلايا) ----------------
let sortableInstance = null; 

window.renderItems = () => {
    const grid = document.getElementById('items-grid');
    if(!grid) return;
    
    if (sortableInstance) sortableInstance.destroy();
    
    grid.innerHTML = '';
    if(localData.catalog) {
        localData.catalog.forEach((item, index) => {
            const cell = document.createElement('div');
            cell.className = 'item-cell';
            cell.setAttribute('data-id', item.id); 
            cell.style.setProperty('--i', index % 4); 
            
            cell.onclick = (e) => {
                // منع النقر إذا كان العنصر يُسحب حالياً
                if(grid.classList.contains('grid-dragging')) return;
                window.openServiceModal(item);
            };
            
            cell.innerHTML = `
                <i class="fa-solid ${item.icon} item-icon"></i>
                <div class="item-name">${item.name}</div>
            `;
            grid.appendChild(cell);
        });
    }

    if (typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(grid, {
            animation: 350,
            delay: 250, 
            delayOnTouchOnly: true, // مهم: تأخير فقط على شاشات اللمس. الماوس يعمل فوراً ويسحب أسهل.
            touchStartThreshold: 3, // سماحية صغيرة للحركة قبل تفعيل السحب (يمنع السحب الخاطئ عند التمرير)
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            forceFallback: true, // إجبار المكتبة على استخدام محركها الخاص للحركة بدلاً من محرك المتصفح الافتراضي (وهذا سر النعومة)
            fallbackClass: 'sortable-drag', 
            fallbackTolerance: 3, // يجب تحريك الماوس 3 بكسلات لتبدأ الحركة، لتجنب النقر المزدوج
            
            onStart: function (evt) {
                grid.classList.add('grid-dragging'); 
                if(navigator.vibrate) navigator.vibrate(50);
            },
            onEnd: function (evt) {
                // تأخير بسيط جداً لإزالة كلاس grid-dragging للسماح بانتهاء النقر دون فتح النافذة المزعج
                setTimeout(() => {
                    grid.classList.remove('grid-dragging');
                }, 100);
                
                if(navigator.vibrate) navigator.vibrate([30, 50, 30]); 
                
                const newOrderIds = Array.from(grid.children).map(el => el.getAttribute('data-id'));
                const newCatalog = [];
                
                newOrderIds.forEach(id => {
                    const found = localData.catalog.find(i => i.id === id);
                    if(found) newCatalog.push(found);
                });
                
                localData.catalog = newCatalog;
                saveDataToCloud(); 
            }
        });
    }
};

// جسر توافق للدوال القديمة التي تستدعي renderItems بدون window
function renderItems() { window.renderItems(); }

// ---------------- إضافة/تعديل/حذف خدمة (الكتالوج) ----------------
window.openAddServiceModal = () => {
    document.getElementById('new-srv-name').value = '';
    document.getElementById('new-srv-price-wash').value = '';
    document.getElementById('new-srv-price-iron').value = '';
    document.getElementById('new-srv-price-wash-only').value = '';

    const iconGrid = document.getElementById('icon-picker');
    iconGrid.innerHTML = '';
    availableIcons.forEach(icon => {
        const iDiv = document.createElement('div');
        iDiv.className = 'icon-option';
        iDiv.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        iDiv.onclick = function() {
            document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('new-srv-icon').value = icon;
        };
        iconGrid.appendChild(iDiv);
    });
    iconGrid.firstChild.classList.add('selected');
    document.getElementById('new-srv-icon').value = availableIcons[0];
    
    document.getElementById('modal-add-service').style.display = 'flex';
};

window.saveNewService = () => {
    const name = document.getElementById('new-srv-name').value;
    const icon = document.getElementById('new-srv-icon').value;
    
    // سحب القيم وإعطاء 0 كقيمة افتراضية
    const priceWash = parseFloat(document.getElementById('new-srv-price-wash').value) || 0;
    const priceIron = parseFloat(document.getElementById('new-srv-price-iron').value) || 0;
    const priceWashOnly = parseFloat(document.getElementById('new-srv-price-wash-only').value) || 0;

    // التأكد من كتابة الاسم على الأقل
    if(!name) return alert('الرجاء إدخال اسم القطعة');
    if(priceWash === 0 && priceIron === 0 && priceWashOnly === 0) return alert('يجب تسعير خدمة واحدة على الأقل!');

    const newItem = {
        id: 'item_' + Date.now(),
        name: name, 
        icon: icon,
        // هنا تم وضع الأسعار في مكانها الصحيح داخل الكائن
        prices: { wash_iron: priceWash, iron_only: priceIron, wash_only: priceWashOnly }
    };

    localData.catalog.push(newItem);
    saveDataToCloud();
    renderItems();
    window.closeModals();
};

window.openEditServiceModal = () => {
    if(!localData.catalog || localData.catalog.length === 0) return alert('لا توجد خدمات لتعديلها');
    const select = document.getElementById('edit-srv-select');
    select.innerHTML = '<option value="" disabled selected>-- اختر الخدمة --</option>';
    localData.catalog.forEach(item => { select.innerHTML += `<option value="${item.id}">${item.name}</option>`; });
    
    document.getElementById('edit-srv-name').value = '';
    document.getElementById('edit-srv-price-wash').value = '';
    document.getElementById('edit-srv-price-iron').value = '';
    document.getElementById('edit-srv-price-wash-only').value = '';
    
    // تفريغ شبكة الأيقونات بانتظار اختيار خدمة ليتم تحديد الأيقونة المناسبة
    document.getElementById('edit-icon-picker').innerHTML = '';
    document.getElementById('edit-srv-icon').value = '';

    document.getElementById('modal-edit-service').style.display = 'flex';
};

window.loadServiceToEdit = () => {
    const id = document.getElementById('edit-srv-select').value;
    const item = localData.catalog.find(i => i.id === id);
    if(item) {
        document.getElementById('edit-srv-name').value = item.name;
        document.getElementById('edit-srv-price-wash').value = item.prices.wash_iron || 0;
        document.getElementById('edit-srv-price-iron').value = item.prices.iron_only || 0;
        document.getElementById('edit-srv-price-wash-only').value = item.prices.wash_only || 0;
        
        // جلب الأيقونة الحالية للخدمة (وإذا لم تكن موجودة نعطيها افتراضي)
        const currentIcon = item.icon || 'fa-shirt';
        document.getElementById('edit-srv-icon').value = currentIcon;
        
        // رسم شبكة الأيقونات وتحديد الأيقونة الحالية
        const iconGrid = document.getElementById('edit-icon-picker');
        iconGrid.innerHTML = '';
        availableIcons.forEach(icon => {
            const iDiv = document.createElement('div');
            iDiv.className = 'icon-option';
            if (icon === currentIcon) iDiv.classList.add('selected'); // تحديد الأيقونة الحالية
            
            iDiv.innerHTML = `<i class="fa-solid ${icon}"></i>`;
            iDiv.onclick = function() {
                // إزالة التحديد عن الكل
                document.querySelectorAll('#edit-icon-picker .icon-option').forEach(el => el.classList.remove('selected'));
                // تحديد العنصر المختار
                this.classList.add('selected');
                // حفظ اسم الأيقونة في الحقل المخفي
                document.getElementById('edit-srv-icon').value = icon;
            };
            iconGrid.appendChild(iDiv);
        });
    }
};

window.saveEditedService = () => {
    const id = document.getElementById('edit-srv-select').value;
    const name = document.getElementById('edit-srv-name').value;
    const newIcon = document.getElementById('edit-srv-icon').value; // جلب الأيقونة المحددة
    
    // سحب القيم وإعطاء 0 كقيمة افتراضية إذا كان الحقل فارغاً
    const priceWash = parseFloat(document.getElementById('edit-srv-price-wash').value) || 0;
    const priceIron = parseFloat(document.getElementById('edit-srv-price-iron').value) || 0;
    const priceWashOnly = parseFloat(document.getElementById('edit-srv-price-wash-only').value) || 0;

    if(!id || !name) return alert('الرجاء اختيار الخدمة وتحديد الاسم');
    if(priceWash === 0 && priceIron === 0 && priceWashOnly === 0) return alert('يجب تسعير خدمة واحدة على الأقل!');

    const index = localData.catalog.findIndex(i => i.id === id);
    if(index > -1) {
        localData.catalog[index].name = name;
        localData.catalog[index].icon = newIcon; // حفظ الأيقونة الجديدة
        localData.catalog[index].prices.wash_iron = priceWash;
        localData.catalog[index].prices.iron_only = priceIron;
        localData.catalog[index].prices.wash_only = priceWashOnly;
        
        saveDataToCloud();
        renderItems();
        window.closeModals();
    }
};

window.openDeleteServiceModal = () => {
    if(!localData.catalog || localData.catalog.length === 0) return alert('لا توجد خدمات لحذفها');
    const select = document.getElementById('delete-srv-select');
    select.innerHTML = '<option value="" disabled selected>-- اختر الخدمة لحذفها --</option>';
    localData.catalog.forEach(item => { select.innerHTML += `<option value="${item.id}">${item.name}</option>`; });
    document.getElementById('modal-delete-service').style.display = 'flex';
};

window.confirmDeleteService = () => {
    const id = document.getElementById('delete-srv-select').value;
    if(!id) return alert('الرجاء اختيار خدمة أولاً');
    
    const index = localData.catalog.findIndex(i => i.id === id);
    if(index > -1) {
        localData.catalog.splice(index, 1);
        saveDataToCloud();
        renderItems();
        window.closeModals();
    }
};

// ---------------- نظام السلة (الـ Cart) ----------------
window.openServiceModal = (item) => {
    pendingItem = item;
    
    // سحب الأسعار وتحويل الفراغ إلى صفر
    let pWashIron = item.prices.wash_iron || 0;
    let pIronOnly = item.prices.iron_only || 0;
    let pWashOnly = item.prices.wash_only || 0;

    let available = [];
    if(pWashIron > 0) available.push('wash_iron');
    if(pIronOnly > 0) available.push('iron_only');
    if(pWashOnly > 0) available.push('wash_only');

    // السحر هنا: إذا توفرت خدمة واحدة فقط، نضيفها فوراً ونتخطى النافذة المزعجة!
    if(available.length === 1) {
        window.addToCartSelected(available[0]);
        return;
    } else if(available.length === 0) {
        return window.showAlert('عذراً، هذه القطعة لا تحتوي على خدمات مسعرة!', 'error');
    }

    document.getElementById('service-item-name').innerText = item.name;

    const btnWashIron = document.getElementById('btn-sel-wash-iron');
    const btnIron = document.getElementById('btn-sel-iron');
    const btnWash = document.getElementById('btn-sel-wash-only');

    // إظهار فقط الأزرار التي تمتلك سعراً أكبر من صفر
    if(pWashIron > 0) { btnWashIron.style.display = 'flex'; document.getElementById('price-wash').innerText = pWashIron.toLocaleString() + ' د.ع'; } else btnWashIron.style.display = 'none';
    if(pIronOnly > 0) { btnIron.style.display = 'flex'; document.getElementById('price-iron').innerText = pIronOnly.toLocaleString() + ' د.ع'; } else btnIron.style.display = 'none';
    if(pWashOnly > 0) { btnWash.style.display = 'flex'; document.getElementById('price-wash-only-val').innerText = pWashOnly.toLocaleString() + ' د.ع'; } else btnWash.style.display = 'none';

    document.getElementById('modal-service').style.display = 'flex';
};

window.addToCartSelected = (serviceType) => {
    const price = pendingItem.prices[serviceType];
    let serviceName = '';
    if (serviceType === 'wash_iron') serviceName = 'غسيل وكوي';
    else if (serviceType === 'iron_only') serviceName = 'كوي فقط';
    else if (serviceType === 'wash_only') serviceName = 'غسيل فقط';
    
    const existing = currentCart.find(i => i.id === pendingItem.id && i.service === serviceType);
    if(existing) existing.qty += 1;
    else currentCart.push({ id: pendingItem.id, name: pendingItem.name, service: serviceType, serviceName: serviceName, price: price, qty: 1 });
    
    window.closeModals();
    renderCart();
};

window.removeCartItem = (index) => { currentCart.splice(index, 1); renderCart(); };
window.increaseQty = (index) => { currentCart[index].qty++; renderCart(); };
window.decreaseQty = (index) => { 
    if(currentCart[index].qty > 1) { currentCart[index].qty--; renderCart(); }
    else { window.removeCartItem(index); }
};

// دالة التحكم بأسهم الخصم (بمضاعفات 250) مع تأثير العداد المزدوج
window.adjustDiscount = (amount) => {
    const discountInput = document.getElementById('cart-discount');
    if (!discountInput) return;
    
    const subTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // الحماية 1: منع الاستخدام والسلة فارغة
    if (subTotal === 0) {
        discountInput.value = ''; 
        return window.showAlert('أضف قطعاً للسلة أولاً قبل وضع الخصم!', 'warning');
    }

    let startVal = parseFloat(discountInput.value) || 0;
    let endVal = startVal + amount;
    
    if (endVal < 0) endVal = 0;
    
    // الحماية 2: إيقاف الخصم عند وصوله لمبلغ القائمة
    if (endVal > subTotal) {
        endVal = subTotal;
        window.showAlert('وصلت للحد الأقصى! لا يمكن تجاوز مبلغ القائمة.', 'warning');
    }
    
    if (startVal === endVal) return; // لا حاجة للحركة إذا لم يتغير شيء

    // حساب المجموع القديم والجديد لعمل تأثير حركي متزامن للطرفين
    const startTotal = Math.max(0, subTotal - startVal);
    const endTotal = Math.max(0, subTotal - endVal);
    const totalNumEl = document.getElementById('cart-total-num');
    const totalWrapperEl = document.getElementById('cart-total-wrapper');

    // نبضة بصرية للمربع الأحمر لتأكيد النقر
    discountInput.style.transform = 'scale(1.08)';
    
    // نبضة للمجموع
    if (totalWrapperEl) {
        totalWrapperEl.classList.remove('bump', 'drop'); 
        void totalWrapperEl.offsetWidth; 
        totalWrapperEl.classList.add(endTotal > startTotal ? 'bump' : 'drop');
    }

    // إيقاف أي أنيميشن سابق في الحقل
    if (discountInput.animFrame) cancelAnimationFrame(discountInput.animFrame);
    
    let startTimestamp = null;
    const duration = 250; // ربع ثانية ليكون سريعاً ومريحاً للعين
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        let currDiscount = Math.floor(progress * (endVal - startVal) + startVal);
        let currTotal = Math.floor(progress * (endTotal - startTotal) + startTotal);
        
        // تحديث الحقلين لحظياً (تأثير العداد السريع)
        discountInput.value = currDiscount;
        if (totalNumEl) totalNumEl.innerText = currTotal.toLocaleString();
        
        if (progress < 1) {
            discountInput.animFrame = window.requestAnimationFrame(step);
        } else {
            // الوصول للنهاية بدقة
            discountInput.value = endVal;
            if (totalNumEl) totalNumEl.innerText = endTotal.toLocaleString();
            
            // إعادة الحقل لشكله الطبيعي
            discountInput.style.transform = 'scale(1)';
            if (totalWrapperEl) setTimeout(() => totalWrapperEl.classList.remove('bump', 'drop'), 50);
            
            // حفظ البيانات الرسمية لكي لا تضيع إذا انطفأت الحاسبة فجأة
            window.lastCartTotal = endTotal;
            localStorage.setItem('cart_draft', JSON.stringify(currentCart));
            delete discountInput.animFrame;
        }
    };
    discountInput.animFrame = window.requestAnimationFrame(step);
};

window.renderCart = () => {
    const tbody = document.getElementById('cart-items');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let subTotal = 0;
    
    // 1. حساب المنتجات والمجموع الفرعي
    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subTotal += itemTotal;
        let serviceClass = 'srv-iron';
        if(item.service === 'wash_iron') serviceClass = 'srv-wash-iron';
        else if(item.service === 'wash_only') serviceClass = 'srv-wash-only';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name} <br><span class="service-type ${serviceClass}">${item.serviceName}</span></td>
                <td>${item.price.toLocaleString()}</td>
                <td>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="window.increaseQty(${index})">+</button>
                        ${item.qty}
                        <button class="qty-btn" onclick="window.decreaseQty(${index})">-</button>
                    </div>
                </td>
                <td>
                    <button class="delete-btn" onclick="window.removeCartItem(${index})"><i class="fa-solid fa-trash"></i></button>
                    ${itemTotal.toLocaleString()}
                </td>
            </tr>
        `;
    });
    
    // 2. حساب الخصم وقفل الحماية الذكي
    const discountInput = document.getElementById('cart-discount');
    let discountVal = 0;
    if (discountInput && discountInput.value) {
        discountVal = parseFloat(discountInput.value) || 0;
    }
    
    // فلتر 1: منع إضافة أي خصم إذا كانت السلة فارغة
    if (subTotal === 0 && discountVal > 0) {
        discountVal = 0;
        if (discountInput) discountInput.value = '';
        window.showAlert('السلة فارغة! أضف قطعاً أولاً.', 'error');
    }
    // فلتر 2: منع الخصم من تجاوز إجمالي مبلغ القائمة
    else if (discountVal > subTotal && subTotal > 0) {
        discountVal = subTotal;
        if (discountInput) discountInput.value = subTotal;
        window.showAlert('لا يمكن أن يتجاوز الخصم مبلغ القائمة الكلي!', 'error');
    }
    
    // فلتر الحماية: منع الخصم من تجاوز قيمة السلة عند الكتابة اليدوية
    if (discountVal > subTotal && subTotal > 0) {
        discountVal = subTotal;
        if (discountInput) discountInput.value = subTotal;
        window.showAlert('لا يمكن أن يتجاوز الخصم مبلغ القائمة الكلي!', 'error');
    }

    // 3. المبلغ الكلي النهائي
    let total = Math.max(0, subTotal - discountVal);

    // 4. تحديث واجهة الكاشير (تأثير العداد السريع للأرقام)
    if(document.getElementById('cart-subtotal-val')) {
        document.getElementById('cart-subtotal-val').innerText = subTotal.toLocaleString() + ' د.ع';
    }
    
    const totalNumEl = document.getElementById('cart-total-num');
    const totalWrapperEl = document.getElementById('cart-total-wrapper');
    
    if (totalNumEl) {
        let prevTotal = window.lastCartTotal || 0;
        
        if (total !== prevTotal) {
            // تفعيل محرك (تتصاعد وتتنازل الأرقام كعداد)
            if (typeof animateValue === 'function') {
                animateValue(totalNumEl, prevTotal, total, 350); // 350 جزء من الثانية لدوران الأرقام
            } else {
                totalNumEl.innerText = total.toLocaleString();
            }
            
            // التأثير النبضي المتوهج للصندوق بالتزامن مع العداد
            if (totalWrapperEl) {
                totalWrapperEl.classList.remove('bump', 'drop'); 
                void totalWrapperEl.offsetWidth; 
                totalWrapperEl.classList.add(total > prevTotal ? 'bump' : 'drop');
                setTimeout(() => totalWrapperEl.classList.remove('bump', 'drop'), 350);
            }
            window.lastCartTotal = total;
        } else if (prevTotal === 0 && total === 0) {
            totalNumEl.innerText = "0";
        }
    }
    
    // حفظ السلة مؤقتاً في حالة انقطاع الكهرباء
    localStorage.setItem('cart_draft', JSON.stringify(currentCart));
};

// ولكي لا تتعطل باقي الدوال التي كانت تستدعي الاسم القديم بدون window، نضيف هذا السطر كجسر:
function renderCart() { window.renderCart(); }

function generateInvoiceID() {
    return 'ROYAL-' + Math.random().toString(36).substr(2, 4).toUpperCase() + Date.now().toString().slice(-4);
}

// ---------------- نظام البيع (تسجيل الطلبات) ----------------
window.openCheckoutModal = () => {
    if(currentCart.length === 0) return window.showAlert('السلة فارغة!', 'warning');
    
    // إذا كنا في وضع "تعديل طلب سابق"
    if (editingInvoiceId) {
        const inv = localData.invoices.find(i => i.id === editingInvoiceId);
        if (inv && inv.customer) {
            document.getElementById('checkout-name').value = inv.customer.name || '';
            document.getElementById('checkout-phone').value = inv.customer.phone || '';
            document.getElementById('checkout-pickup-date').value = inv.customer.pickupDate || '';
            document.getElementById('checkout-pickup-time').value = inv.customer.pickupTime || '';
            document.getElementById('checkout-deposit').value = inv.customer.paid || 0;
        }
    } else {
        // وضع "طلب جديد": تصفير الحقول
        document.getElementById('checkout-name').value = '';
        document.getElementById('checkout-phone').value = '';
        document.getElementById('checkout-pickup-date').value = '';
        document.getElementById('checkout-pickup-time').value = '';
        document.getElementById('checkout-deposit').value = '0';
    }
    
    document.getElementById('modal-checkout').style.display = 'flex';
};
// اختصار الكيبورد لفتح شاشة الطلب (Ctrl + S)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if(document.getElementById('pos-screen').classList.contains('active-screen') && !editingInvoiceId) {
            window.openCheckoutModal();
        }
    }
});

// دالة حساب الرقم التسلسلي (تصفير تلقائي كل 15 أيام)
function getNextDailyNumber() {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const epoch = new Date('2024-01-01T00:00:00').getTime();
    const now = Date.now();
    
    // حساب دورة الـ 15 أيام الحالية
    const currentDays = Math.floor((now - epoch) / MS_PER_DAY);
    const currentCycle = Math.floor(currentDays / 15);
    
    let maxNumber = 0;
    
    // التدخل الجراحي: جدار زمني لفلترة الفواتير (نبحث في آخر 30 يوماً فقط)
    // هذا سيمنع المعالج من فحص آلاف الفواتير القديمة!
    const timeBarrier = now - (30 * MS_PER_DAY);
    
    (localData.invoices || []).forEach(inv => {
        // فلتر الأمان: إذا كانت الفاتورة أقدم من 30 يوماً، نتجاوزها فوراً بدون عمليات رياضية
        if (inv.dailyNumber && inv.timestamp && inv.timestamp >= timeBarrier) {
            const invDays = Math.floor((inv.timestamp - epoch) / MS_PER_DAY);
            const invCycle = Math.floor(invDays / 15);
            
            // إذا كانت الفاتورة السابقة ضمن نفس دورة الـ 15 يوماً، ننافس على أعلى رقم
            if (invCycle === currentCycle && inv.dailyNumber > maxNumber) {
                maxNumber = inv.dailyNumber;
            }
        }
    });
    return maxNumber + 1; // إعطاء الرقم التالي
}

window.confirmOrder = () => {
    const name = window.escapeHTML(document.getElementById('checkout-name').value);
    const phone = window.escapeHTML(document.getElementById('checkout-phone').value);
    const pickupDate = document.getElementById('checkout-pickup-date').value;
    const pickupTime = document.getElementById('checkout-pickup-time').value;
    const newDeposit = parseFloat(document.getElementById('checkout-deposit').value) || 0;
    
    if(!name) return window.showAlert('يرجى إدخال اسم الزبون.', 'warning');
    
    // حساب المجموع الفرعي والخصم والمبلغ الكلي
    const subTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountVal = parseFloat(document.getElementById('cart-discount').value) || 0;
    const total = Math.max(0, subTotal - discountVal);
    
    if(newDeposit > total) return window.showAlert('العربون أكبر من المبلغ الكلي!', 'error');

    // === حالة (تعديل طلب موجود) ===
    if (editingInvoiceId) {
        const index = localData.invoices.findIndex(i => i.id === editingInvoiceId);
        const oldInv = localData.invoices[index];
        const oldDeposit = oldInv.customer ? oldInv.customer.paid : 0;
        
        // القاعدة المالية: إذا تغير العربون، نعدل الصندوق لليوم الحالي حصراً
        const depositDifference = newDeposit - oldDeposit;
        if (depositDifference !== 0 && getRealTime().date === oldInv.date) {
            localData.dailySalesCash += depositDifference;
        }

        localData.invoices[index].items = [...currentCart];
        localData.invoices[index].total = total;
        localData.invoices[index].subTotal = subTotal;
        localData.invoices[index].discount = discountVal;
        localData.invoices[index].notes = document.getElementById('cart-notes').value;
        localData.invoices[index].customer = { name, phone, pickupDate, pickupTime, paid: newDeposit, remaining: total - newDeposit };

        window.logAction('تعديل طلب', `تعديل طلب رقم: ${oldInv.dailyNumber || oldInv.id}`, total, { oldInvoice: oldInv, newCart: currentCart });
        
        // تحديث السحابة
        update(ref(database, 'royal_data/invoices/' + editingInvoiceId), {
            items: localData.invoices[index].items,
            total: localData.invoices[index].total,
            subTotal: localData.invoices[index].subTotal,
            discount: localData.invoices[index].discount,
            notes: localData.invoices[index].notes,
            customer: localData.invoices[index].customer
        });
        
        window.showAlert('تم حفظ التعديلات بنجاح!', 'success');
        
        // إعادة واجهة الكاشير لطبيعتها
        document.getElementById('btn-save-edit').style.display = 'none';
        document.getElementById('btn-main-checkout').style.display = 'flex';
        editingInvoiceId = null;

    } 
    // === حالة (تسجيل طلب جديد كلياً) ===
    else {
        const dailyNum = getNextDailyNumber();
        const realT = getRealTime();
        const invoice = {
            id: generateInvoiceID(), 
            dailyNumber: dailyNum,
            date: realT.date, 
            time: realT.time, 
            timestamp: realT.timestamp, 
            type: 'active',
            items: [...currentCart], 
            total: total,
            subTotal: subTotal,
            discount: discountVal,
            notes: document.getElementById('cart-notes').value, 
            customer: { name, phone, pickupDate, pickupTime, paid: newDeposit, remaining: total - newDeposit }
        };

        localData.invoices.push(invoice);
        if(newDeposit > 0) localData.dailySalesCash += newDeposit;

        window.logAction('تسجيل طلب جديد', `رقم تسلسلي: ${dailyNum} | للزبون: ${name}`, newDeposit, invoice);
        set(ref(database, 'royal_data/invoices/' + invoice.id), invoice);
        window.showAlert(`تم تسجيل الطلب بنجاح (رقم ${dailyNum})`, 'success');
        if(document.getElementById('auto-print').checked) window.printInvoice(invoice);
    }

    // تنظيف السلة وتحديث النظام في الحالتين
    window.recalculateDailySales(); 
    updateUI(); 
    currentCart = []; 
    document.getElementById('cart-notes').value = '';
    if (document.getElementById('cart-discount')) document.getElementById('cart-discount').value = '0';
    localStorage.removeItem('cart_draft'); 
    renderCart();
    window.closeModals();
};

// ---------------- الفواتير السابقة (عرض، تعديل، حذف) ----------------
window.openPreviousInvoices = () => {
    const tbody = document.getElementById('invoices-list-body');
    tbody.innerHTML = '';

    let filterText = document.getElementById('inv-search-text')?.value.toLowerCase() || '';
    let dateFilter = document.getElementById('inv-date-filter')?.value;

    // الافتراضي: عرض فواتير اليوم فقط لحماية الذاكرة وتسريع الفتح
    if (!dateFilter) {
        dateFilter = getRealTime().date;
        if (document.getElementById('inv-date-filter')) document.getElementById('inv-date-filter').value = dateFilter;
    }

    const startTimestamp = new Date(dateFilter + 'T00:00:00').getTime();
    const endTimestamp = new Date(dateFilter + 'T23:59:59').getTime();

    const sorted = (localData.invoices || []).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    sorted.forEach(inv => {
        // حماية الذاكرة: استثناء فواتير الأيام الأخرى
        if (inv.timestamp < startTimestamp || inv.timestamp > endTimestamp) return;
        
        // إخفاء الطلبات قيد الانتظار (Active) من هذه القائمة لتبقى في المستودع فقط
        if (inv.type === 'active') return;
        
        let customerName = inv.customer ? inv.customer.name.toLowerCase() : '';
        if (filterText && !inv.id.toLowerCase().includes(filterText) && !customerName.includes(filterText)) return;

        let typeStr = inv.type === 'cash' ? 'نقدي (كاش)' : (inv.type === 'electronic' ? 'إلكتروني' : 'آجل');
        tbody.innerHTML += `
            <tr>
                <td>${inv.date}</td>
                <td>${inv.id}</td>
                <td>${typeStr}</td>
                <td>${inv.total.toLocaleString()}</td>
                <td>
                    <i class="fa-solid fa-eye action-icon" onclick='window.viewInvoice("${inv.id}")' title="عرض"></i>
                    <i class="fa-solid fa-pen action-icon" style="color: #4a90e2;" onclick='window.editInvoice("${inv.id}")' title="تعديل"></i>
                    <i class="fa-solid fa-trash action-icon" style="color: var(--red-danger);" onclick='window.deleteInvoice("${inv.id}")' title="حذف"></i>
                </td>
            </tr>
        `;
    });
    document.getElementById('modal-invoices').style.display = 'flex';
};

window.filterInvoices = () => window.openPreviousInvoices();

window.editInvoice = (id) => {
    const invoice = localData.invoices.find(i => i.id === id);
    if(invoice) {
        if(invoice.type === 'credit') return window.showAlert('عذراً، لا يمكن تعديل فواتير البيع الآجل.', 'error');
        
        currentCart = JSON.parse(JSON.stringify(invoice.items));
        document.getElementById('cart-notes').value = invoice.notes || '';
        
        // جلب الخصم القديم للفاتورة وعرضه
        const discountInput = document.getElementById('cart-discount');
        if (discountInput) discountInput.value = invoice.discount || 0;
        
        editingInvoiceId = invoice.id;
        renderCart();
        window.closeModals();
        
        // التدخل الجراحي: إخفاء زر (بيع) وإظهار زر (حفظ التعديلات)
        document.getElementById('btn-main-checkout').style.display = 'none';
        document.getElementById('btn-save-edit').style.display = 'flex';
    }
};

window.saveEditedInvoice = () => {
    const newSubTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountInput = document.getElementById('cart-discount');
    const newDiscount = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const newTotal = Math.max(0, newSubTotal - newDiscount);

    const oldIndex = localData.invoices.findIndex(i => i.id === editingInvoiceId);
    const oldInvoice = localData.invoices[oldIndex];
    
    // 1. معالجة الفواتير المدفوعة جزئياً أو كلياً عبر اشتراك VIP
    if (oldInvoice.paymentType === 'subscription' || oldInvoice.paymentType === 'mixed' || (oldInvoice.notes && oldInvoice.notes.includes('VIP'))) {
        const subIndex = (localData.subscriptions || []).findIndex(s => s.customerName === (oldInvoice.customer?.name || ''));
        if (subIndex > -1) {
            const sub = localData.subscriptions[subIndex];
            // البحث عن تفاصيل الخصم القديم داخل الباقة
            const invIndexInSub = (sub.invoices || []).findIndex(i => i.id === oldInvoice.id);
            
            if (invIndexInSub > -1) {
                const oldDeducted = sub.invoices[invIndexInSub].deducted;
                const oldCash = sub.invoices[invIndexInSub].cash;
                
                // إعادة الرصيد القديم للباقة
                sub.consumedAmount -= oldDeducted;
                
                let subBalance = sub.totalValue - sub.consumedAmount;
                let newDeducted = Math.min(newTotal, subBalance);
                let newCashAmount = newTotal - newDeducted;
                
                // تطبيق الرصيد الجديد
                sub.consumedAmount += newDeducted;
                sub.invoices[invIndexInSub].deducted = newDeducted;
                sub.invoices[invIndexInSub].cash = newCashAmount;
                
                // تحديث الفاتورة
                oldInvoice.customer.remainingPaid = newCashAmount;
                oldInvoice.customer.subDeducted = newDeducted;
                
                let remainingBalText = (sub.totalValue - sub.consumedAmount).toLocaleString();
                // استخراج الملاحظات القديمة بدون جزء الـ VIP لتحديثها
                let baseNotes = (oldInvoice.notes || '').split('| 💳')[0].trim();
                oldInvoice.notes = (baseNotes ? baseNotes + ' | ' : '') + `💳 دُفعت عبر فئة VIP (خُصم ${newDeducted.toLocaleString()} د.ع). المتبقي من الباقة: ${remainingBalText} د.ع.` + (newCashAmount > 0 ? ` (المتبقي دُفع كاش: ${newCashAmount.toLocaleString()} د.ع)` : '');
                
                oldInvoice.paymentType = newCashAmount > 0 ? 'mixed' : 'subscription';
                
                // تحديث السحابة باشتراك الـ VIP
                update(ref(database, 'royal_data/subscriptions/' + sub.id), sub);
                
                // تحديث الدفعات المستقلة (Payments) إذا كان هناك كاش جديد
                // للتبسيط، نعتبر تعديل الفاتورة المختلطة يتطلب فقط تحديث الصندوق اليومي إذا كانت بنفس اليوم
            }
        }
    }

    // 2. تحديث الكاصة اليومية للفواتير العادية والمختلطة
    if (oldInvoice.date === getRealTime().date) {
        if(oldInvoice.type === 'cash' || oldInvoice.paymentType === 'mixed' || oldInvoice.paymentType === 'cash') localData.dailySalesCash -= oldInvoice.total;
        if(oldInvoice.type === 'electronic' || oldInvoice.paymentType === 'electronic') localData.dailySalesElectronic -= oldInvoice.total;
        
        if(oldInvoice.type === 'cash' || oldInvoice.paymentType === 'mixed' || oldInvoice.paymentType === 'cash') localData.dailySalesCash += newTotal;
        if(oldInvoice.type === 'electronic' || oldInvoice.paymentType === 'electronic') localData.dailySalesElectronic += newTotal;
    }

    localData.invoices[oldIndex].items = [...currentCart];
    localData.invoices[oldIndex].total = newTotal;
    localData.invoices[oldIndex].subTotal = newSubTotal;
    localData.invoices[oldIndex].discount = newDiscount;
    // تحديث الملاحظات العادية إذا لم تكن فاتورة VIP
    if (!(oldInvoice.paymentType === 'subscription' || oldInvoice.paymentType === 'mixed' || (oldInvoice.notes && oldInvoice.notes.includes('VIP')))) {
         localData.invoices[oldIndex].notes = document.getElementById('cart-notes').value;
    }

    window.logAction('تعديل فاتورة', 'تعديل فاتورة رقم: ' + editingInvoiceId, newTotal, { oldInvoice: oldInvoice, newCart: currentCart });
    
    // تحديث الفاتورة في السحابة
    const invoiceRef = ref(database, 'royal_data/invoices/' + editingInvoiceId);
    update(invoiceRef, {
        items: localData.invoices[oldIndex].items,
        total: localData.invoices[oldIndex].total,
        subTotal: localData.invoices[oldIndex].subTotal,
        discount: localData.invoices[oldIndex].discount,
        notes: localData.invoices[oldIndex].notes,
        paymentType: localData.invoices[oldIndex].paymentType,
        customer: localData.invoices[oldIndex].customer
    });
    
    window.recalculateDailySales(); // إعادة الحساب لتأكيد الدقة
    updateUI();

    editingInvoiceId = null; currentCart = []; document.getElementById('cart-notes').value = '';
    localStorage.removeItem('cart_draft'); renderCart();

    document.getElementById('btn-save-edit').style.display = 'none';
    document.getElementById('btn-main-checkout').style.display = 'flex';
    window.showAlert('تم حفظ تعديلات الفاتورة بنجاح!', 'success');
};

window.deleteInvoice = (id) => {
    window.showConfirm('تحذير: هل أنت متأكد من حذف هذه الفاتورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', () => {
        const index = localData.invoices.findIndex(i => i.id === id);
        if(index === -1) return;
        const inv = localData.invoices[index];

        // 1. حذف الديون المرتبطة بها
        const debtIndex = (localData.debts || []).findIndex(d => d.invoiceId === inv.id);
        if (debtIndex > -1) {
            const debtId = localData.debts[debtIndex].id;
            localData.debts.splice(debtIndex, 1);
            if (debtId) remove(ref(database, 'royal_data/debts/' + debtId));
        }

        // 2. حذف أي دفعات مستقلة (Payments) مرتبطة برقم هذه الفاتورة (لضمان رجوع المبيعات)
        let dailyNumStr = String(inv.dailyNumber || inv.id);
        let paymentsToDelete = (localData.payments || []).filter(p => p.details && (p.details.includes(inv.id) || p.details.includes(dailyNumStr)));
        
        paymentsToDelete.forEach(pDel => {
            const pIdx = localData.payments.findIndex(p => p.id === pDel.id);
            if(pIdx > -1) {
                localData.payments.splice(pIdx, 1);
                remove(ref(database, 'royal_data/payments/' + pDel.id));
            }
        });

        // 3. إرجاع رصيد الـ VIP إذا كانت مدفوعة باشتراك
        if (inv.paymentType === 'subscription' || inv.paymentType === 'mixed' || (inv.notes && inv.notes.includes('VIP'))) {
            const subIndex = (localData.subscriptions || []).findIndex(s => s.customerName === (inv.customer?.name || ''));
            if (subIndex > -1) {
                let sub = localData.subscriptions[subIndex];
                let invInSubIndex = (sub.invoices || []).findIndex(subI => subI.id === inv.id);
                if (invInSubIndex > -1) {
                    sub.consumedAmount -= sub.invoices[invInSubIndex].deducted;
                    sub.invoices.splice(invInSubIndex, 1);
                    update(ref(database, 'royal_data/subscriptions/' + sub.id), sub);
                }
            }
        }

        window.logAction('حذف فاتورة', 'تم حذف فاتورة رقم: ' + (inv.dailyNumber || inv.id), inv.total, inv);
        
        // 4. الحذف النهائي
        localData.invoices.splice(index, 1);
        remove(ref(database, 'royal_data/invoices/' + id));
        
        // 5. إعادة حساب مبيعات اليوم بدقة من الصفر بناءً على البيانات النظيفة
        window.recalculateDailySales();
        updateUI();
        
        if (document.getElementById('modal-active-orders').style.display === 'flex') {
            window.renderActiveOrders();
        } else if (document.getElementById('modal-invoices').style.display === 'flex') {
            window.openPreviousInvoices();
        } 
    });
};

window.viewInvoice = (id) => {
    const invoice = localData.invoices.find(i => i.id === id);
    if(!invoice) return;
    
    document.getElementById('view-inv-id').innerText = invoice.id;
    document.getElementById('view-inv-date').innerText = invoice.date + ' ' + invoice.time;
    let typeDisplay = '';
    if (invoice.type === 'active') typeDisplay = 'طلب قيد العمل';
    else if (invoice.paymentType === 'cash' || invoice.type === 'cash') typeDisplay = 'نقدي (كاش)';
    else if (invoice.paymentType === 'electronic' || invoice.type === 'electronic') typeDisplay = 'إلكتروني';
    else if (invoice.paymentType === 'credit' || invoice.type === 'credit') typeDisplay = 'آجل (ذمة)';
    else typeDisplay = 'مستلم';
    
    document.getElementById('view-inv-type').innerText = typeDisplay;
    
    if(invoice.type === 'credit' && invoice.customer) {
        document.getElementById('view-inv-customer-row').style.display = 'block'; document.getElementById('view-inv-customer').innerText = invoice.customer.name;
    } else { document.getElementById('view-inv-customer-row').style.display = 'none'; }

    const tbody = document.getElementById('view-inv-items');
    tbody.innerHTML = '';
    invoice.items.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.serviceName}</td><td>${item.qty}</td><td>${(item.price * item.qty).toLocaleString()}</td></tr>`;
    });
    document.getElementById('view-inv-total').innerText = invoice.total.toLocaleString();
    document.getElementById('btn-print-from-view').onclick = () => window.printInvoice(invoice);

    document.getElementById('modal-invoices').style.display = 'none';
    document.getElementById('modal-view-invoice').style.display = 'flex';
};

// ==========================================
// --- نظام مستودع الاستلام الجديد (Active Orders) ---
// ==========================================

window.openActiveOrders = () => {
    window.renderActiveOrders();
    document.getElementById('modal-active-orders').style.display = 'flex';
};

window.renderActiveOrders = () => {
    const tbody = document.getElementById('active-orders-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    let filterText = document.getElementById('active-search-text')?.value.toLowerCase().trim() || '';

    let activeOrders = (localData.invoices || []).filter(inv => inv.type === 'active');
    
    // الترتيب الذكي: إذا كان هناك بحث، نرفع التطابق الدقيق للأعلى
    activeOrders.sort((a,b) => {
        if(filterText) {
            let aName = (a.customer && a.customer.name) ? a.customer.name.toLowerCase() : '';
            let bName = (b.customer && b.customer.name) ? b.customer.name.toLowerCase() : '';
            // إذا كان الاسم يبدأ بنص البحث نمنحه أولوية عالية جداً
            let aScore = aName.startsWith(filterText) ? 2 : (aName.includes(filterText) ? 1 : 0);
            let bScore = bName.startsWith(filterText) ? 2 : (bName.includes(filterText) ? 1 : 0);
            if(aScore !== bScore) return bScore - aScore; // الأكبر فوق
        }
        return b.timestamp - a.timestamp; // الافتراضي: الأحدث فوق
    });

    // دالة مساعدة لتمييز النص باللون الذهبي
    const highlight = (text) => {
        if(!filterText || typeof text !== 'string') return text;
        const regex = new RegExp(`(${filterText})`, "gi");
        return text.replace(regex, `<span style="background-color: rgba(212, 175, 55, 0.4); color: var(--gold); border-radius: 3px; padding: 0 2px;">$1</span>`);
    };

    activeOrders.forEach(inv => {
        let custName = inv.customer ? inv.customer.name : 'بدون اسم';
        let custPhone = inv.customer ? (inv.customer.phone || '-') : '-';
        let dailyStr = inv.dailyNumber ? inv.dailyNumber.toString() : '';

        // إذا كان هناك فلتر ولم يطابق أي حقل، نتجاوزه
        if (filterText && !custName.toLowerCase().includes(filterText) && !custPhone.includes(filterText) && !dailyStr.includes(filterText)) return;

        let pickupInfo = (inv.customer && inv.customer.pickupDate) ? `${inv.customer.pickupDate} ${inv.customer.pickupTime||''}` : 'غير محدد';
        let remaining = (inv.customer) ? inv.customer.remaining : inv.total;
        let deposit = (inv.customer) ? inv.customer.paid : 0;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 900; font-size: 18px; color: var(--gold);">${highlight(dailyStr) || '-'}</td>
                <td style="font-weight: bold;">${highlight(custName)}</td>
                <td>${highlight(custPhone)}</td>
                <td>${pickupInfo}</td>
                <td style="font-weight:bold;">${inv.total.toLocaleString()}</td>
                <td style="color:var(--green-success);">${deposit.toLocaleString()}</td>
                <td style="color:var(--red-danger); font-weight:900;">${remaining.toLocaleString()}</td>
                <td>
                    <button class="btn-royal-action" style="background:var(--gold-gradient); color:#000; border:none; padding: 5px 12px;" onclick="window.confirmPickup('${inv.id}')"><i class="fa-solid fa-handshake"></i> تسليم</button>
                    <i class="fa-solid fa-eye action-icon" style="color: var(--gold); font-size: 16px; margin: 0 5px;" onclick='window.viewInvoice("${inv.id}")' title="عرض التفاصيل بسرعة"></i>
                    <i class="fa-solid fa-pen action-icon" style="color: #4a90e2; font-size: 16px; margin: 0 5px;" onclick='window.editInvoice("${inv.id}")' title="تعديل القطع"></i>
                    <i class="fa-solid fa-trash action-icon" style="color: var(--red-danger); font-size: 16px; margin: 0 5px;" onclick='window.deleteInvoice("${inv.id}")' title="حذف وإلغاء الطلب"></i>
                </td>
            </tr>
        `;
    });
};

// متغير عالمي لحفظ ID الطلب قيد الاستلام
let pendingPickupId = null;

window.confirmPickup = (id) => {
    const inv = localData.invoices.find(i => i.id === id);
    if(!inv) return;
    
    pendingPickupId = id;
    const remaining = inv.customer ? inv.customer.remaining : inv.total;
    
    document.getElementById('pickup-amount-display').innerText = remaining.toLocaleString();
    window.closeModals(); // نغلق المستودع مؤقتاً
    document.getElementById('modal-pickup-payment').style.display = 'flex';
};

// توجيه الدفع
window.finalizePickup = (paymentType) => {
    if (paymentType === 'credit') {
        window.openPickupCreditModal();
    } else {
        window.executeNormalPickup(paymentType);
    }
};

// تشغيل نافذة الآجل
window.openPickupCreditModal = () => {
    const select = document.getElementById('credit-existing-customer');
    select.innerHTML = '<option value="">-- اختر زبون من القائمة --</option>';
    
    // جلب أسماء الزبائن الفريدة من الديون السابقة
    let uniqueCustomers = [];
    (localData.debts || []).forEach(d => {
        if(!uniqueCustomers.find(c => c.name === d.name)) uniqueCustomers.push({name: d.name, phone: d.phone});
    });
    
    uniqueCustomers.forEach(c => {
        select.innerHTML += `<option value="${c.name}" data-phone="${c.phone || ''}">${c.name}</option>`;
    });

    // جلب بيانات الطلب الحالي لملء الحقول تلقائياً
    const inv = localData.invoices.find(i => i.id === pendingPickupId);
    if(inv && inv.customer) {
        document.getElementById('credit-new-name').value = inv.customer.name || '';
        document.getElementById('credit-new-phone').value = inv.customer.phone || '';
    }
    document.getElementById('credit-paid-now').value = '0';
    document.getElementById('modal-pickup-credit').style.display = 'flex';
};

// التعبئة التلقائية عند اختيار زبون
window.selectExistingCustomer = () => {
    const select = document.getElementById('credit-existing-customer');
    if(select.value) {
        document.getElementById('credit-new-name').value = select.value;
        document.getElementById('credit-new-phone').value = select.options[select.selectedIndex].getAttribute('data-phone');
    }
};

// تنفيذ البيع الآجل
window.confirmPickupCredit = () => {
    const name = window.escapeHTML(document.getElementById('credit-new-name').value.trim());
    const phone = window.escapeHTML(document.getElementById('credit-new-phone').value.trim());
    const paidNow = parseFloat(document.getElementById('credit-paid-now').value) || 0;
    
    if(!name) return window.showAlert('يرجى إدخال اسم الزبون لتسجيل الذمة', 'warning');

    const inv = localData.invoices.find(i => i.id === pendingPickupId);
    if(!inv) return;
    
    let originalRemaining = inv.customer ? inv.customer.remaining : inv.total;
    if(paidNow > originalRemaining) return window.showAlert('المبلغ المسدد أكبر من المتبقي للطلب!', 'error');

    const finalRemaining = originalRemaining - paidNow; 

    // تسجيل دين جديد
    const realT = getRealTime();
    const debtId = 'DEBT-' + realT.timestamp;
    const newDebt = {
        id: debtId, date: realT.date, 
        name: name, phone: phone, invoiceId: inv.id, 
        total: inv.total, paid: (inv.customer ? inv.customer.paid : 0) + paidNow, 
        remaining: finalRemaining
    };
    if(!localData.debts) localData.debts = [];
    localData.debts.push(newDebt);
    set(ref(database, 'royal_data/debts/' + debtId), newDebt);

    // تحديث الفاتورة للأرشفة
    inv.type = 'archived'; inv.paymentType = 'credit'; 
    if(!inv.customer) inv.customer = {};
    inv.customer.name = name; inv.customer.phone = phone;
    inv.customer.remainingPaid = paidNow; 
    inv.customer.remaining = finalRemaining; 

    update(ref(database, 'royal_data/invoices/' + inv.id), {
        type: 'archived', paymentType: 'credit', customer: inv.customer
    });

    if(paidNow > 0) localData.dailySalesCash += paidNow; 
    window.logAction('تسليم طلب (ذمة)', `للزبون ${name} - سدد: ${paidNow} ومتبقي: ${finalRemaining}`, paidNow, inv);
    
    window.recalculateDailySales(); updateUI();
    document.getElementById('modal-pickup-credit').style.display = 'none';
    document.getElementById('modal-pickup-payment').style.display = 'none';
    window.openActiveOrders(); 
    window.showAlert('تم تسجيل الذمة وتسليم الطلب بنجاح!', 'success');
};

// التدخل الجراحي: التنفيذ الطبيعي للكاش والإلكتروني مع تسجيل الدفعة المستقلة
window.executeNormalPickup = (paymentType) => {
    const inv = localData.invoices.find(i => i.id === pendingPickupId);
    if(!inv) return;
    const remainingToPay = inv.customer ? inv.customer.remaining : inv.total;
    
    inv.type = 'archived'; inv.paymentType = paymentType; 
    if(inv.customer) {
        inv.customer.remainingPaid = remainingToPay;
        inv.customer.remaining = 0;
    }
    
    // إنشاء الدفعة المالية للمبلغ المتبقي لتسجيلها في اليوم الحالي (منع السفر عبر الزمن)
    const realT = getRealTime();
    if(remainingToPay > 0) {
        const paymentTypeStr = paymentType === 'cash' ? 'دفع كاش (متبقي طلب)' : 'دفع إلكتروني (متبقي طلب)';
        const paymentId = 'PAY-' + realT.timestamp;
        const newPayment = {
            id: paymentId, timestamp: realT.timestamp, date: realT.date,
            type: paymentTypeStr, amount: remainingToPay, details: `استلام متبقي طلب ${inv.dailyNumber || inv.id}`
        };
        if(!localData.payments) localData.payments = [];
        localData.payments.push(newPayment);
        set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
    }

    update(ref(database, 'royal_data/invoices/' + inv.id), { type: 'archived', paymentType: paymentType, customer: inv.customer });
    
    window.logAction('تسليم طلب', `الدفع: ${paymentType==='cash'?'كاش':'إلكتروني'}`, remainingToPay, inv);
    saveDataToCloud(); // إعادة الحساب ورفع التحديثات
    document.getElementById('modal-pickup-payment').style.display = 'none';
    window.openActiveOrders(); 
    window.showAlert('تم تسليم الطلب بنجاح!', 'success');
};

// ---------------- الصرفيات ----------------
window.openExpensesModal = () => { document.getElementById('modal-expenses').style.display = 'flex'; };

window.saveExpense = () => {
    const detail = document.getElementById('expense-detail').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    if(!detail || isNaN(amount)) return alert('يرجى ملء الحقول');

    if(!localData.expenses) localData.expenses = [];
    const realT = getRealTime();
    const newExpense = { 
        id: 'EXP-' + realT.timestamp,
        timestamp: realT.timestamp,
        date: realT.date, 
        detail: detail, 
        amount: amount 
    };
    localData.expenses.push(newExpense);
    
    localData.dailySalesCash -= amount;
    window.logAction('إضافة مصروف', detail, amount);
    
    // التدخل الجراحي: حقن مباشر في السحابة
    set(ref(database, 'royal_data/expenses/' + newExpense.id), newExpense);
    window.recalculateDailySales();
    updateUI();

    window.closeModals();
    document.getElementById('expense-detail').value = ''; 
    document.getElementById('expense-amount').value = '';
    window.showAlert('تم خصم المصروف من الصندوق بنجاح!', 'success');
};

// دالة عرض الصرفيات السابقة (مرتبة من الأحدث للأقدم)
window.openPreviousExpenses = () => {
    const tbody = document.getElementById('expenses-list-body');
    tbody.innerHTML = '';
    
    // سحب الصرفيات مع الاحتفاظ برقم الفهرس الأصلي (لتسهيل التعديل والحذف) وترتيبها
    const sorted = (localData.expenses || []).map((e, index) => ({...e, originalIndex: index}))
        .sort((a, b) => (b.timestamp || b.originalIndex) - (a.timestamp || a.originalIndex));
    
    sorted.forEach(exp => {
        // التدخل الجراحي: تعقيم التفاصيل قبل طباعتها
        const safeDetail = window.escapeHTML(exp.detail);
        tbody.innerHTML += `
            <tr>
                <td>${exp.date}</td>
                <td>${safeDetail}</td>
                <td style="color:var(--red-danger); font-weight:bold;">${exp.amount.toLocaleString()}</td>
                <td>
                    <i class="fa-solid fa-pen action-icon" style="color: #4a90e2;" onclick='window.openEditExpense(${exp.originalIndex})' title="تعديل"></i>
                    <i class="fa-solid fa-trash action-icon" style="color: var(--red-danger);" onclick='window.deleteExpense(${exp.originalIndex})' title="حذف"></i>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('modal-expenses').style.display = 'none';
    document.getElementById('modal-edit-expense').style.display = 'none';
    document.getElementById('modal-previous-expenses').style.display = 'flex';
};

// متغير للاحتفاظ برقم المصروف قيد التعديل
let editingExpenseIndex = null;

window.openEditExpense = (index) => {
    const exp = localData.expenses[index];
    if(!exp) return;
    editingExpenseIndex = index;
    document.getElementById('edit-expense-detail').value = exp.detail;
    document.getElementById('edit-expense-amount').value = exp.amount;
    
    document.getElementById('modal-previous-expenses').style.display = 'none';
    document.getElementById('modal-edit-expense').style.display = 'flex';
};

window.saveEditedExpense = () => {
    const newDetail = document.getElementById('edit-expense-detail').value;
    const newAmount = parseFloat(document.getElementById('edit-expense-amount').value);
    if(!newDetail || isNaN(newAmount)) return alert('يرجى ملء الحقول بشكل صحيح');

    const oldExp = localData.expenses[editingExpenseIndex];
    
    if(oldExp.date === getRealTime().date) {
        localData.dailySalesCash += oldExp.amount; 
        localData.dailySalesCash -= newAmount;     
    }

    localData.expenses[editingExpenseIndex].detail = newDetail;
    localData.expenses[editingExpenseIndex].amount = newAmount;
    window.logAction('تعديل مصروف', 'تعديل من: ' + oldExp.detail, newAmount, { oldExpense: oldExp, newExpense: {detail: newDetail, amount: newAmount} });

    // التدخل الجراحي: تحديث المصروف فقط
    if (oldExp.id) {
        update(ref(database, 'royal_data/expenses/' + oldExp.id), {
            detail: newDetail,
            amount: newAmount
        });
    }
    
    window.recalculateDailySales();
    updateUI();
    window.openPreviousExpenses(); 
};

window.deleteExpense = (index) => {
    window.showConfirm('هل أنت متأكد من حذف هذا المصروف نهائياً؟ سيتم إرجاع مبلغه لصندوق اليوم.', () => {
        const exp = localData.expenses[index];
        
        if(exp && exp.date === getRealTime().date) {
            localData.dailySalesCash += exp.amount;
        }

        window.logAction('حذف مصروف', exp.detail, exp.amount, exp);
        localData.expenses.splice(index, 1);
        
        // التدخل الجراحي: حذف المصروف المباشر باستخدام مساره (إن وُجد المعرف)
        if (exp.id) {
            remove(ref(database, 'royal_data/expenses/' + exp.id));
        }
        
        window.recalculateDailySales();
        updateUI();
        window.openPreviousExpenses(); 
        window.showAlert('تم حذف المصروف بنجاح!', 'success'); 
    });
};

// ==========================================
// --- دوال المحفظة وحركة الشركاء (الكاشير) ---
// ==========================================
window.openPartnerTxModal = () => {
    document.getElementById('partner-tx-amount').value = '';
    document.getElementById('partner-tx-reason').value = '';
    document.getElementById('partner-tx-account').selectedIndex = 0;
    
    // تصفير الأزرار
    document.getElementById('lbl-tx-deposit').style.borderColor = 'transparent';
    document.getElementById('lbl-tx-withdraw').style.borderColor = 'transparent';
    let radios = document.getElementsByName('partner_tx_type');
    radios.forEach(r => r.checked = false);

    document.getElementById('modal-partner-tx').style.display = 'flex';
};

window.savePartnerTx = () => {
    let typeRadio = document.querySelector('input[name="partner_tx_type"]:checked');
    let account = document.getElementById('partner-tx-account').value;
    let amount = parseFloat(document.getElementById('partner-tx-amount').value);
    let reason = document.getElementById('partner-tx-reason').value || 'بدون تفاصيل';

    if (!typeRadio) return window.showAlert('يرجى اختيار نوع العملية (سحب أو إيداع)', 'warning');
    if (!account) return window.showAlert('يرجى اختيار حساب الشريك', 'warning');
    if (isNaN(amount) || amount <= 0) return window.showAlert('يرجى إدخال مبلغ صحيح', 'warning');

    let type = typeRadio.value;
    let txId = 'PTX-' + Date.now();
    
    let newTx = {
        id: txId,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        type: type,
        account: account,
        amount: amount,
        reason: reason
    };

    if (!localData.partnerTx) localData.partnerTx = [];
    localData.partnerTx.push(newTx);

    // حفظ في السحابة فوراً (أو في الصندوق الأسود)
    set(ref(database, 'royal_data/partnerTx/' + txId), newTx);

    window.logAction('حركة شركاء', `${type} بقيمة ${amount} لحساب (${account})`, amount, newTx);
    
    if(document.getElementById('admin-screen').classList.contains('active-screen')) window.updateAdminDashboard();
    window.closeModals();
    window.showAlert(`تم تسجيل ${type} بنجاح لحساب ${account}`, 'success');
};

// ---------------- تحديث الـ UI (مبيعات اليوم) ----------------
let lastSalesTotal = 0;
function updateUI() {
    let dailyTotal = (localData.dailySalesCash || 0) + (localData.dailySalesElectronic || 0);
    const display = document.getElementById('daily-sales-val');
    const wrapper = document.getElementById('daily-sales-display');
    
    if(dailyTotal > lastSalesTotal) { wrapper.classList.add('increase'); setTimeout(()=>wrapper.classList.remove('increase'), 500); } 
    else if (dailyTotal < lastSalesTotal) { wrapper.classList.add('decrease'); setTimeout(()=>wrapper.classList.remove('decrease'), 500); }
    
    animateValue(display, lastSalesTotal, dailyTotal, 500);
    lastSalesTotal = dailyTotal;
    
    if(document.getElementById('admin-screen').classList.contains('active-screen')) window.updateAdminDashboard();
}

function animateValue(obj, start, end, duration) {
    // إلغاء أي حركة سابقة لمنع التذبذب عند النقر السريع والمتكرر
    if (obj.animFrame) cancelAnimationFrame(obj.animFrame);
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let currentVal = Math.floor(progress * (end - start) + start);
        
        // ذكاء التمييز: إذا كان العنصر "حقل إدخال" نغير الـ value، وإلا نغير الـ innerHTML
        if (obj.tagName === 'INPUT') obj.value = currentVal;
        else obj.innerHTML = currentVal.toLocaleString();
        
        if (progress < 1) { 
            obj.animFrame = window.requestAnimationFrame(step); 
        } else {
            // الوصول للرقم النهائي بدقة
            if (obj.tagName === 'INPUT') obj.value = end;
            else obj.innerHTML = end.toLocaleString();
            delete obj.animFrame;
        }
    };
    obj.animFrame = window.requestAnimationFrame(step);
}

// ---------------- وظائف الآدمن ----------------
window.switchAdminTab = (tab, animationType = 'fade-in') => {
    if (!secureAdminToken) { window.exitToMain(); return window.showAlert('محاولة وصول غير مصرح بها!', 'error'); }
    sessionStorage.setItem('admin_tab', tab); 
    
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active', 'slide-from-left', 'slide-from-right', 'fade-in');
    });
    document.querySelectorAll('.admin-nav-btn, .bottom-nav-btn').forEach(b => b.classList.remove('active')); 
    
    const targetSection = document.getElementById(`admin-${tab}`);
    if (targetSection) {
        targetSection.classList.add('active');
        if (animationType !== 'none') targetSection.classList.add(animationType);
    }
    
    document.querySelectorAll(`.admin-nav-btn[onclick*="'${tab}'"], .bottom-nav-btn[onclick*="'${tab}'"]`).forEach(btn => {
        btn.classList.add('active');
    });

    // تشغيل وإيقاظ محرك الاستوديو فوراً عند دخول الآدمن لتبويب التصميم
    if (tab === 'invoice-designer') {
        if (window.initFabricStudio) window.initFabricStudio();
    }
};

// --- التدخل الجراحي الشامل: محرك تقارير الآدمن والمحفظة المعصوم من الخطأ ---
window.updateAdminDashboard = () => {
    if (!secureAdminToken) { window.exitToMain(); return window.showAlert('تم إحباط محاولة اختراق للوحة البيانات!', 'error'); }
    
    // جلب فلتر الشهر باستخدام الوقت العالمي المحمي
    let monthInput = document.getElementById('admin-month-filter');
    if (!monthInput.value) {
        let now = getRealTime().obj;
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const selectedMonth = monthInput.value;
    const isAllTime = selectedMonth === 'all';

    let totalSalesCash = 0; let totalSalesElectronic = 0;
    let totalExpenses = 0; let totalCosts = 0;
    let dailyReports = {}; 

    // 1. حساب الفواتير المباشرة والعربون
    (localData.invoices || []).forEach(inv => {
        let invDate = new Date(inv.timestamp);
        let monthStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
        let dayStr = inv.date;

        if (isAllTime || monthStr === selectedMonth) {
            let amountCash = 0;
            let amountElectronic = 0;
            
            if (inv.type === 'active' && inv.customer) amountCash = inv.customer.paid; // العربون المدفوع لحظة الطلب
            else if (inv.type === 'cash') amountCash = inv.total;
            else if (inv.type === 'electronic') amountElectronic = inv.total;
            else if (inv.type === 'archived' && inv.customer) amountCash = inv.customer.paid; // العربون فقط (المتبقي في Payments)

            totalSalesCash += amountCash;
            totalSalesElectronic += amountElectronic;

            if (amountCash > 0 || amountElectronic > 0) {
                if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: invDate.getTime() };
                dailyReports[dayStr].sales += (amountCash + amountElectronic);
            }
        }
    });

    // 2. حساب المصروفات
    (localData.expenses || []).forEach(exp => {
        let expDate = new Date(exp.timestamp);
        let monthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        let dayStr = exp.date;

        if (isAllTime || monthStr === selectedMonth) {
            totalExpenses += exp.amount;
            if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: expDate.getTime() };
            dailyReports[dayStr].expenses += exp.amount;
            dailyReports[dayStr].details.push(window.escapeHTML(exp.detail));
        }
    });

    // 3. حساب الدفعات المستقلة (مسار payments) - المنقذ للرصيد
    (localData.payments || []).forEach(pay => {
        let payDate = new Date(pay.timestamp);
        let monthStr = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
        let dayStr = pay.date;

        if (isAllTime || monthStr === selectedMonth) {
            if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: payDate.getTime() };
            
            // الدفعات الإلكترونية
            if (pay.type === 'دفع إلكتروني (متبقي طلب)') {
                totalSalesElectronic += pay.amount;
                dailyReports[dayStr].sales += pay.amount;
            }
            // خصم الأموال المسترجعة
            else if (pay.type === 'إلغاء اشتراك VIP') {
                totalSalesCash -= pay.amount; 
                dailyReports[dayStr].sales -= pay.amount; 
                dailyReports[dayStr].details.push(`استرجاع: -${pay.amount}`);
            } 
            // الكاش الداخل (تسديد ذمم، اشتراكات VIP، ومتبقي الطلبات)
            else {
                totalSalesCash += pay.amount; 
                dailyReports[dayStr].sales += pay.amount; 
                if (pay.type.includes('VIP')) dailyReports[dayStr].details.push(`VIP: +${pay.amount}`);
            }
        }
    });

    // 4. التكاليف التشغيلية
    (localData.operatingCosts || []).forEach(c => { totalCosts += c.amount; });
    let netProfit = (totalSalesCash + totalSalesElectronic) - totalExpenses - totalCosts;

    // تحديث الأرقام العلوية للآدمن
    document.getElementById('admin-month-sales-cash').innerText = totalSalesCash.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-sales-electronic').innerText = totalSalesElectronic.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-expenses').innerText = totalExpenses.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-costs').innerText = totalCosts.toLocaleString() + ' د.ع';
    document.getElementById('admin-net-profit').innerText = netProfit.toLocaleString() + ' د.ع';

    // توليد جدول التقارير اليومية
    const dailyTbody = document.getElementById('admin-daily-reports-body');
    dailyTbody.innerHTML = '';
    const sortedDays = Object.keys(dailyReports).sort((a, b) => dailyReports[b].timestamp - dailyReports[a].timestamp);

    sortedDays.forEach(day => {
        let data = dailyReports[day];
        let dayName = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long' }).format(new Date(data.timestamp));
        let net = data.sales - data.expenses;
        
        dailyTbody.innerHTML += `
            <tr>
                <td>${day}</td>
                <td style="color:var(--gold);">${dayName}</td>
                <td style="color:var(--green-success); font-weight:bold;">${data.sales.toLocaleString()}</td>
                <td style="color:var(--red-danger); font-weight:bold;">${data.expenses.toLocaleString()}</td>
                <td style="font-size:12px;">${data.details.join('، ') || '-'}</td>
                <td style="font-weight:bold; color:${net >= 0 ? 'var(--green-success)' : 'var(--red-danger)'};">${net.toLocaleString()}</td>
            </tr>
        `;
    });

    // قسم الديون
    const debtsTbody = document.getElementById('debts-table-body');
    debtsTbody.innerHTML = '';
    let groupedDebts = {};
    (localData.debts || []).forEach(d => {
        if(d.remaining > 0) {
            if(!groupedDebts[d.name]) groupedDebts[d.name] = { phone: d.phone, totalRemaining: 0, invoices: [] };
            groupedDebts[d.name].totalRemaining += d.remaining;
            groupedDebts[d.name].invoices.push(d.invoiceId);
        }
    });

    for (let customerName in groupedDebts) {
        let data = groupedDebts[customerName];
        let invList = data.invoices.join(' ، '); 
        debtsTbody.innerHTML += `<tr>
            <td style="font-weight:bold; font-size:16px;">${customerName}</td>
            <td>${data.phone || '-'}</td>
            <td style="font-size:12px; color:var(--text-gray);">${invList}</td>
            <td style="color:var(--red-danger); font-weight:bold; font-size:18px;">${data.totalRemaining.toLocaleString()}</td>
            <td><button class="top-bar-btn" style="background:#4a90e2; color:white; border-color:#4a90e2;" onclick="window.payDebtByName('${customerName}')">تسديد دفعة</button></td>
        </tr>`;
    }

    // ==========================================
    // --- الحسابات التراكمية للمحفظة (الشركاء) ---
    // ==========================================
    let lifetimeSales = 0, lifetimeExpenses = 0, lifetimeCosts = 0;

    // 1. حساب المبيعات من الفواتير
    (localData.invoices || []).forEach(inv => {
        if (inv.type === 'active' || inv.type === 'archived') lifetimeSales += (inv.customer ? inv.customer.paid : 0);
        else if (inv.type === 'cash' || inv.type === 'electronic') lifetimeSales += inv.total;
    });

    // 2. حساب المبيعات من مسار الدفعات المستقلة (هذا كان الثقب الأسود)
    (localData.payments || []).forEach(pay => {
        if (pay.type === 'إلغاء اشتراك VIP') lifetimeSales -= pay.amount;
        else lifetimeSales += pay.amount;
    });
    
    // 3. المصروفات والتكاليف
    (localData.expenses || []).forEach(e => lifetimeExpenses += e.amount);
    (localData.operatingCosts || []).forEach(c => lifetimeCosts += c.amount);

    let lifetimeNetProfit = lifetimeSales - lifetimeExpenses - lifetimeCosts;
    let baseShare = lifetimeNetProfit / 2;
    let razaqBal = baseShare, shabaBal = baseShare;

    (localData.partnerTx || []).forEach(tx => {
        if(tx.account === 'أحمد رزاق العامري') {
            if(tx.type === 'إيداع') razaqBal += tx.amount; else razaqBal -= tx.amount;
        } else if(tx.account === 'أحمد شاكر شبع') {
            if(tx.type === 'إيداع') shabaBal += tx.amount; else shabaBal -= tx.amount;
        }
    });

    if(document.getElementById('wallet-ahmed-razaq')) {
        document.getElementById('wallet-ahmed-razaq').innerText = razaqBal.toLocaleString() + ' د.ع';
        document.getElementById('wallet-ahmed-razaq').style.color = razaqBal >= 0 ? '#4a90e2' : 'var(--red-danger)';
        document.getElementById('wallet-ahmed-shaba').innerText = shabaBal.toLocaleString() + ' د.ع';
        document.getElementById('wallet-ahmed-shaba').style.color = shabaBal >= 0 ? 'var(--green-success)' : 'var(--red-danger)';
    }

    const walletTbody = document.getElementById('wallet-transactions-body');
    if(walletTbody) {
        walletTbody.innerHTML = '';
        const sortedTx = [...(localData.partnerTx || [])].sort((a,b) => b.timestamp - a.timestamp);
        
        const getHistoricalBal = (acc, ts) => {
            let tS = 0, tE = 0, tC = 0;
            (localData.invoices || []).forEach(i => {
                if(i.timestamp <= ts) {
                    if (i.type === 'active' || i.type === 'archived') tS += (i.customer ? i.customer.paid : 0);
                    else if (i.type === 'cash' || i.type === 'electronic') tS += i.total;
                }
            });
            (localData.payments || []).forEach(p => { 
                if(p.timestamp <= ts) {
                    if (p.type === 'إلغاء اشتراك VIP') tS -= p.amount;
                    else tS += p.amount;
                }
            });
            (localData.expenses || []).forEach(e => { if(e.timestamp <= ts) tE += e.amount; });
            (localData.operatingCosts || []).forEach(c => { 
                if(new Date(c.date).getTime() <= ts) tC += c.amount; 
            });
            
            let histBal = (tS - tE - tC) / 2;
            (localData.partnerTx || []).forEach(t => {
                if(t.account === acc && t.timestamp <= ts) {
                    if(t.type === 'إيداع') histBal += t.amount; else histBal -= t.amount;
                }
            });
            return histBal;
        };

        sortedTx.forEach(tx => {
            let typeColor = tx.type === 'إيداع' ? 'var(--green-success)' : 'var(--red-danger)';
            let icon = tx.type === 'إيداع' ? 'fa-arrow-down' : 'fa-arrow-up';
            let histBal = getHistoricalBal(tx.account, tx.timestamp);
            
            walletTbody.innerHTML += `<tr>
                <td style="font-size:13px; color:var(--text-gray);">${tx.date} <br> ${tx.time}</td>
                <td style="font-weight:bold;">${tx.account}</td>
                <td><span style="color:${typeColor}; font-weight:bold; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:5px;"><i class="fa-solid ${icon}"></i> ${tx.type}</span></td>
                <td style="color:var(--gold); font-weight:bold; font-size:16px;">${tx.amount.toLocaleString()}</td>
                <td>${tx.reason || '-'}</td>
                <td style="font-weight:900; color:${histBal >= 0 ? 'var(--green-success)' : 'var(--red-danger)'};" dir="ltr">${histBal.toLocaleString()}</td>
            </tr>`;
        });
    }
};

// دوال التخصيصات الجديدة
window.loadAllTimeStats = () => {
    document.getElementById('admin-month-filter').value = 'all';
    window.updateAdminDashboard();
};

// --- إصلاح: إضافة دالة تصدير تقارير الآدمن إلى Excel ---
window.exportToExcel = () => {
    let csv = '\uFEFFالتاريخ,اليوم,المبيعات,المصروفات,تفاصيل الصرف,الصافي\n'; // \uFEFF ليدعم الإكسل اللغة العربية
    let rows = document.querySelectorAll('#admin-daily-reports-body tr');
    if(rows.length === 0) return window.showAlert('لا توجد بيانات لتصديرها', 'warning');
    
    rows.forEach(row => {
        let cols = row.querySelectorAll('td');
        let rowData = Array.from(cols).map(c => `"${c.innerText}"`).join(',');
        csv += rowData + '\n';
    });
    
    let a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'تقرير_مبيعات_رويال.csv';
    a.click();
};
// ----------------------------------------------------

window.saveSettings = () => {
    localData.settings.name = document.getElementById('set-name').value;
    localData.settings.phone = document.getElementById('set-phone').value;
    localData.settings.address = document.getElementById('set-address').value;
    saveDataToCloud();
    window.showAlert('تم تحديث بيانات الطباعة بنجاح', 'success');
};

window.changePassword = () => {
    const oldP = document.getElementById('set-old-pass').value;
    const newP = document.getElementById('set-new-pass').value;
    const confP = document.getElementById('set-confirm-pass').value;

    get(ref(database, 'royal_data/settings/password')).then((snapshot) => {
        const realPassword = snapshot.val() || "ahmed2003";
        if (oldP !== realPassword) return window.showAlert('كلمة المرور القديمة غير صحيحة!', 'error');
        if (newP.length < 4) return window.showAlert('كلمة المرور الجديدة قصيرة جداً', 'error');
        if (newP !== confP) return window.showAlert('كلمات المرور الجديدة غير متطابقة!', 'error');

        set(ref(database, 'royal_data/settings/password'), newP).then(() => {
            window.showAlert('تم تغيير كلمة المرور بنجاح!', 'success');
            document.getElementById('set-old-pass').value = ''; document.getElementById('set-new-pass').value = ''; document.getElementById('set-confirm-pass').value = '';
        });
    });
};

window.addOperatingCost = () => {
    const name = document.getElementById('cost-name').value;
    const amount = parseFloat(document.getElementById('cost-amount').value);
    if(!name || isNaN(amount)) return alert('الرجاء الإدخال بشكل صحيح');
    localData.operatingCosts.push({ date: new Date().toLocaleDateString(), name, amount });
    saveDataToCloud();
    document.getElementById('cost-name').value = ''; document.getElementById('cost-amount').value = '';
};

let currentDebtCustomerName = null;
window.payDebtByName = (name) => {
    currentDebtCustomerName = name;
    let totalDebt = 0;
    (localData.debts || []).forEach(d => { if(d.name === name) totalDebt += d.remaining; });
    
    document.getElementById('debt-pay-msg').innerText = `إجمالي المتبقي بذمة (${name}) هو ${totalDebt.toLocaleString()} د.ع`;
    document.getElementById('debt-pay-amount').value = '';
    document.getElementById('modal-pay-debt').style.display = 'flex';
};

window.confirmPayDebt = () => {
    let payAmount = parseFloat(document.getElementById('debt-pay-amount').value);
    if (!payAmount || payAmount <= 0) return window.showAlert('الرجاء إدخال مبلغ صحيح', 'error');

    // استخراج ديون هذا الزبون النشطة
    let customerDebts = (localData.debts || []).filter(d => d.name === currentDebtCustomerName && d.remaining > 0);
    let totalDebt = customerDebts.reduce((sum, d) => sum + d.remaining, 0);

    if (payAmount > totalDebt) return window.showAlert('المبلغ المسدد أكبر من إجمالي الدين!', 'error');

    let amountLeftToDistribute = payAmount;

    // توزيع الدفعة على الفواتير القديمة فالأحدث
    customerDebts.forEach(debt => {
        if (amountLeftToDistribute <= 0) return;
        
        let dbRefIndex = localData.debts.findIndex(d => d.id === debt.id);
        if(dbRefIndex === -1) return;

        // خصم المبلغ من هذه الفاتورة
        let amountToDeduct = Math.min(debt.remaining, amountLeftToDistribute);
        localData.debts[dbRefIndex].remaining -= amountToDeduct;
        localData.debts[dbRefIndex].paid += amountToDeduct;
        
        update(ref(database, 'royal_data/debts/' + debt.id), {
            remaining: localData.debts[dbRefIndex].remaining,
            paid: localData.debts[dbRefIndex].paid
        });

        amountLeftToDistribute -= amountToDeduct;
    });

    // تسجيل العملية في المسار المالي المستقل
    const realT = getRealTime();
    const paymentId = 'PAY-' + realT.timestamp;
    const newPayment = {
        id: paymentId,
        timestamp: realT.timestamp,
        date: realT.date,
        type: 'تسديد دين',
        amount: payAmount,
        details: `تسديد دفعة من حساب: ${currentDebtCustomerName}`
    };
    
    if(!localData.payments) localData.payments = [];
    localData.payments.push(newPayment);
    // التدخل الجراحي: حقن الدفعة مباشرة عبر الصندوق الأسود
    set(ref(database, 'royal_data/payments/' + paymentId), newPayment);

    localData.dailySalesCash += payAmount; 
    window.logAction('تسديد دين', `تسديد دفعة من حساب: ${currentDebtCustomerName}`, payAmount, { debtName: currentDebtCustomerName, amountPaid: payAmount });

    saveDataToCloud(); window.updateAdminDashboard(); window.closeModals();
    window.showAlert('تم تسديد الدفعة وتوزيعها بنجاح', 'success');
};

// دالة الفلترة (احتياطياً في حال لم تكن موجودة لضمان عمل شريط البحث)
window.filterLogs = (val) => { if(window.renderLogs) window.renderLogs(val); };

// دالة المشاهدة العميقة والمحلل الذكي (Deep View) - نسخة واجهة المستخدم الأنيقة
window.viewLogDetails = (id) => {
    const log = localData.logs.find(l => l.id === id);
    if(!log || !log.snapshot) return;

    let contentHTML = `<div style="margin-bottom: 15px; border-bottom: 1px dashed var(--gold); padding-bottom: 10px;">
                            <span style="color:var(--text-gray);">نوع الإجراء:</span> 
                            <strong style="color:var(--gold); font-size:18px;">${log.type}</strong>
                       </div>`;

    const snap = log.snapshot;

    // دالة مساعدة لإنشاء جدول صغير يعرض قطع الفاتورة
    const renderItemsTable = (items) => {
        if(!items || items.length === 0) return '<p style="color:var(--red-danger);">لا توجد عناصر</p>';
        let rows = items.map(i => `<tr><td style="border:1px solid #444; padding:5px;">${i.name} (${i.serviceName})</td><td style="border:1px solid #444; padding:5px;">${i.qty}</td><td style="border:1px solid #444; padding:5px;">${(i.price * i.qty).toLocaleString()}</td></tr>`).join('');
        return `<table style="width:100%; text-align:right; border-collapse:collapse; margin-top:10px; font-size:14px; background:#000;">
                    <thead><tr style="background:#222;"><th style="border:1px solid #444; padding:5px;">القطعة</th><th style="border:1px solid #444; padding:5px;">العدد</th><th style="border:1px solid #444; padding:5px;">المجموع</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
    };

    if (log.type.includes('فاتورة') || log.type.includes('بيع')) {
        if (log.type === 'تعديل فاتورة') {
            // مقارنة قبل وبعد التعديل
            contentHTML += `<div style="display:flex; gap:10px;">
                                <div style="flex:1; background:rgba(255, 71, 87, 0.1); padding:10px; border-radius:8px; border:1px solid var(--red-danger);">
                                    <h4 style="color:var(--red-danger); margin-bottom:10px;">البيانات القديمة:</h4>
                                    <p>المبلغ: <strong>${snap.oldInvoice.total.toLocaleString()} د.ع</strong></p>
                                    ${renderItemsTable(snap.oldInvoice.items)}
                                </div>
                                <div style="flex:1; background:rgba(46, 213, 115, 0.1); padding:10px; border-radius:8px; border:1px solid var(--green-success);">
                                    <h4 style="color:var(--green-success); margin-bottom:10px;">البيانات الجديدة:</h4>
                                    <p>المبلغ: <strong>${log.amount.toLocaleString()} د.ع</strong></p>
                                    ${renderItemsTable(snap.newCart)}
                                </div>
                            </div>`;
        } else {
            // فاتورة محذوفة، أو مبيوعة، أو تسجيل طلب جديد، أو تسليم
            let depositText = snap.customer ? `<p><strong>العربون المدفوع:</strong> <span style="color:var(--green-success);">${snap.customer.paid.toLocaleString()} د.ع</span></p>` : '';
            let remainText = snap.customer ? `<p><strong>المتبقي (الذمة):</strong> <span style="color:var(--red-danger);">${snap.customer.remaining.toLocaleString()} د.ع</span></p>` : '';
            
            contentHTML += `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #444;">
                                <p><strong>رقم الطلب/الفاتورة:</strong> <span style="color:var(--text-gray);">${snap.dailyNumber || snap.id || '-'}</span></p>
                                <p><strong>المبلغ الكلي:</strong> <span style="color:var(--gold);">${snap.total ? snap.total.toLocaleString() : (log.amount||0).toLocaleString()} د.ع</span></p>
                                ${depositText}
                                ${remainText}
                                <p style="margin-top:10px;"><strong>تفاصيل القطع:</strong></p>
                                ${renderItemsTable(snap.items)}
                            </div>`;
        }
    } else if (log.type.includes('مصروف')) {
        if (log.type === 'تعديل مصروف') {
            contentHTML += `<div style="display:flex; gap:10px;">
                                <div style="flex:1; background:rgba(255, 71, 87, 0.1); padding:10px; border-radius:8px; border:1px solid var(--red-danger);">
                                    <h4 style="color:var(--red-danger); margin-bottom:10px;">المصروف القديم:</h4>
                                    <p style="font-size:14px;">السبب: ${snap.oldExpense.detail}</p>
                                    <p style="font-size:14px;">المبلغ: <strong>${snap.oldExpense.amount.toLocaleString()} د.ع</strong></p>
                                </div>
                                <div style="flex:1; background:rgba(46, 213, 115, 0.1); padding:10px; border-radius:8px; border:1px solid var(--green-success);">
                                    <h4 style="color:var(--green-success); margin-bottom:10px;">بعد التعديل:</h4>
                                    <p style="font-size:14px;">السبب: ${snap.newExpense.detail}</p>
                                    <p style="font-size:14px;">المبلغ: <strong>${snap.newExpense.amount.toLocaleString()} د.ع</strong></p>
                                </div>
                            </div>`;
        } else {
            contentHTML += `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #444;">
                                <p><strong>تفاصيل المصروف:</strong> <span style="color:var(--text-gray);">${snap.detail || log.details}</span></p>
                                <p><strong>المبلغ:</strong> <span style="color:var(--red-danger);">${(snap.amount || log.amount).toLocaleString()} د.ع</span></p>
                            </div>`;
        }
    } else if (log.type === 'تسديد دين') {
        // ... الكود القديم لتسديد الدين (لا تغيره) ...
        contentHTML += `<div style="background:rgba(74, 144, 226, 0.1); padding:15px; border-radius:8px; border:1px solid #4a90e2;">
                            <p><strong>اسم الزبون:</strong> <span style="color:var(--text-white);">${snap.debtName || '-'}</span></p>
                            <p><strong>المبلغ المسدد الآن:</strong> <span style="color:var(--green-success); font-weight:bold;">${(snap.amountPaid || log.amount).toLocaleString()} د.ع</span></p>
                        </div>`;
    } else if (log.type.includes('VIP')) {
        // --- التدخل الجراحي: عرض أنيق لحركات الاشتراكات ---
        let badgeColor = log.type.includes('إلغاء') ? 'var(--red-danger)' : 'var(--gold)';
        contentHTML += `<div style="background:rgba(212, 175, 55, 0.05); padding:15px; border-radius:8px; border:1px solid ${badgeColor};">
                            <p><strong>اسم المشترك:</strong> <span style="color:var(--text-white);">${snap.customerName || (snap.customer ? snap.customer.name : '-')}</span></p>
                            <p><strong>الفئة / الباقة:</strong> <span style="color:var(--gold); font-weight:bold;">${snap.pkgName || snap.packageName || '-'}</span></p>
                            <p><strong>المبلغ المرتبط بالعملية:</strong> <span style="color:${badgeColor}; font-weight:bold;">${log.amount.toLocaleString()} د.ع</span></p>
                            <hr style="border:1px dashed #333; margin:10px 0;">
                            <p><strong>التفاصيل:</strong> <span style="color:var(--text-gray); font-size:13px;">${log.details}</span></p>
                        </div>`;
    } else {
        // حالة افتراضية للعمليات الأخرى (مثل المحفظة)
        contentHTML += `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #444;">
                            <p><strong>التفاصيل:</strong> <span style="color:var(--text-gray);">${log.details}</span></p>
                            <p><strong>القيمة المرتبطة:</strong> <span style="color:var(--gold);">${log.amount.toLocaleString()} د.ع</span></p>
                        </div>`;
    }

    document.getElementById('log-deep-view-content').innerHTML = contentHTML;
    document.getElementById('modal-log-details').style.display = 'flex';
};
        
// ==========================================
// --- دوال المحرر المرئي للفاتورة (A5) ---
// ==========================================
window.insertTag = (tag) => {
    const editor = document.getElementById('invoice-editor-area');
    editor.focus();
    
    // إدراج المتغير بدقة في مكان وقوف مؤشر الماوس
    if (window.getSelection && window.getSelection().getRangeAt && window.getSelection().rangeCount > 0) {
        let range = window.getSelection().getRangeAt(0);
        let node = document.createTextNode(tag);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    } else {
        editor.innerHTML += tag;
    }
};

window.saveInvoiceDesign = () => {
    const htmlContent = document.getElementById('invoice-editor-area').innerHTML;
    localStorage.setItem('royal_invoice_template', htmlContent);
    window.showAlert('تم حفظ تصميم الفاتورة A5 بنجاح! سيتم اعتماده للطباعة فوراً.', 'success');
};

// =========================================================
// --- محرك استوديو التصميم المتعدد (الفاتورة + الشفت) ---
// =========================================================
let canvasEditor;
let currentZoom = 1;
let currentDesignerMode = 'invoice'; // 'invoice' or 'shift'
let designCache = { invoice: null, shift: null };

window.initFabricStudio = () => {
    if (!canvasEditor) {
        canvasEditor = new fabric.Canvas('fabric-canvas', { backgroundColor: 'transparent', preserveObjectStacking: true });
        
        // ميزة التكبير والتصغير لـ "الورقة"
        const workspace = document.getElementById('workspace-container');
        const paper = document.getElementById('paper-wrapper');
        workspace.addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) currentZoom += 0.1; 
                else currentZoom -= 0.1; 
                currentZoom = Math.max(0.4, Math.min(currentZoom, 2.5));
                paper.style.transform = `scale(${currentZoom})`;
            }
        }, { passive: false }); // إجبار المتصفح على احترام المنع وعدم التكبير العشوائي
        canvasEditor.on('selection:created', updatePropsPanel);
        canvasEditor.on('selection:updated', updatePropsPanel);
        canvasEditor.on('selection:cleared', () => {
            const panel = document.getElementById('fabric-props-panel');
            if(panel) { panel.style.opacity = '0.3'; panel.style.pointerEvents = 'none'; }
        });
    }
    // تشغيل وضع الفاتورة كافتراضي
    window.switchDesignerTab('invoice');
};

window.switchDesignerTab = (mode) => {
    // 1. حماية قصوى: لا تحفظ التصميم في الكاش إذا كانت الشاشة بيضاء!
    if (canvasEditor && canvasEditor.getObjects().length > 0) {
        designCache[currentDesignerMode] = JSON.stringify(canvasEditor.toJSON());
    }
    
    currentDesignerMode = mode;
    
    document.getElementById('tab-design-invoice').style.background = mode === 'invoice' ? 'var(--gold)' : 'transparent';
        document.getElementById('tab-design-invoice').style.color = mode === 'invoice' ? '#000' : 'var(--text-white)';
        document.getElementById('tab-design-shift').style.background = mode === 'shift' ? 'var(--gold)' : 'transparent';
        document.getElementById('tab-design-shift').style.color = mode === 'shift' ? '#000' : 'var(--text-white)';

        // حماية جراحية: التأكد من وجود حاويات المتغيرات قبل إخفائها لمنع انهيار الجافاسكريبت
        let varsInvoice = document.getElementById('vars-invoice');
        let varsShift = document.getElementById('vars-shift');
        if(varsInvoice) varsInvoice.style.display = mode === 'invoice' ? 'flex' : 'none';
        if(varsShift) varsShift.style.display = mode === 'shift' ? 'flex' : 'none';

        // تنظيف الورقة لضمان عدم تداخل تصميم الفاتورة مع تقرير الشفت
        canvasEditor.clear();
    
    // 2. محاولة استرجاع تصميمك المفقود بأولوية قسوى من الذاكرة
    let loadedDesign = designCache[mode];
    if(!loadedDesign) {
        if (mode === 'invoice') {
            loadedDesign = localData.settings?.invoiceTemplate || localStorage.getItem('royal_fabric_template');
        } else {
            loadedDesign = localData.settings?.shiftTemplate || localStorage.getItem('royal_shift_template');
        }
    }

    // 3. فلتر الأمان: التأكد أن التصميم المحفوظ ليس صفحة فارغة
    let isEmptyDesign = false;
    try {
        let parsed = JSON.parse(loadedDesign);
        if (!parsed || !parsed.objects || parsed.objects.length === 0) isEmptyDesign = true;
    } catch(e) { isEmptyDesign = true; }

    if (loadedDesign && !isEmptyDesign) {
        // استرجاع تصميمك فوراً وعرضه!
        canvasEditor.loadFromJSON(loadedDesign, () => {
            canvasEditor.renderAll();
        });
    } else {
        // بناء القوالب الافتراضية فقط إذا كان النظام جديداً تماماً
        if (mode === 'invoice') {
            window.fabricAddText('فاتورة طلب', 30, '#000000');
            window.fabricAddText('[بداية_الجدول]', 16, '#2ed573');
            window.fabricAddText('[نهاية_الجدول]', 16, '#ff4757');
        } else {
            window.fabricAddText('تقرير تسليم شفت', 36, '#000000');
            window.fabricAddText('الكاشير: [اسم_الكاشير]', 20, '#111');
            window.fabricAddText('من: [بداية_الشفت]  |  إلى: [نهاية_الشفت]', 16, '#444');
            window.fabricAddText('إجمالي المقبوضات (كاش): [كاش_المبيعات]', 22, '#2ed573');
            window.fabricAddText('المصروفات المسحوبة: [المصروفات]', 22, '#ff4757');
            window.fabricAddText('الصافي المطلوب تسليمه: [صافي_الصندوق]', 28, '#000');
        }
    }
};

window.saveFabricDesign = () => {
    if(!canvasEditor) return;
    const jsonDesign = JSON.stringify(canvasEditor.toJSON());
    designCache[currentDesignerMode] = jsonDesign; // حفظه في الكاش أيضاً
    
    if (!localData.settings) localData.settings = {};
    
    if (currentDesignerMode === 'invoice') {
        localStorage.setItem('royal_fabric_template', jsonDesign);
        localData.settings.invoiceTemplate = jsonDesign;
        window.showAlert('تم حفظ تصميم الفاتورة بنجاح!', 'success');
    } else {
        localStorage.setItem('royal_shift_template', jsonDesign);
        localData.settings.shiftTemplate = jsonDesign;
        window.showAlert('تم حفظ تصميم تقرير الشفت بنجاح!', 'success');
    }
    saveDataToCloud();
};

// --- أمر المزامنة الفورية للكاشير ---
window.forceSyncCloud = () => {
    document.getElementById('hamburger-menu').classList.remove('show');
    if (!navigator.onLine) return window.showAlert('أنت حالياً أوفلاين. لا يمكن مزامنة البيانات السحابية.', 'error');
    
    window.showAlert('جاري رفع ومزامنة البيانات في السحابة... ⏳', 'warning');
    saveDataToCloud(); // يجبر الصندوق على رفع المتغيرات
    if(window.processBlackBox) window.processBlackBox(); // يفرغ الصندوق الأسود
    setTimeout(() => { window.showAlert('تمت المزامنة بنجاح وحفظ عملك.', 'success'); }, 1500);
};

// 2. ميزة حذف العناصر بزر Backspace
window.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
        if (canvasEditor && canvasEditor.getActiveObject() && canvasEditor.getActiveObject().isEditing) return;

        if (canvasEditor && canvasEditor.getActiveObjects().length > 0) {
            e.preventDefault(); 
            canvasEditor.getActiveObjects().forEach(obj => canvasEditor.remove(obj));
            canvasEditor.discardActiveObject();
            canvasEditor.renderAll();
        }
    }
});

function updatePropsPanel(e) {
    const panel = document.getElementById('fabric-props-panel');
    panel.style.opacity = '1';
    panel.style.pointerEvents = 'auto';
    
    const obj = e.selected[0];
    if(!obj) return;

    document.getElementById('fab-fill').value = obj.fill || '#000000';
    document.getElementById('fab-stroke').value = obj.stroke || '#000000';
    document.getElementById('fab-strokeWidth').value = obj.strokeWidth || 0;

    const textProps = document.getElementById('fab-text-props');
    if (obj.type === 'i-text' || obj.type === 'text') {
        textProps.style.opacity = '1'; textProps.style.pointerEvents = 'auto';
        document.getElementById('fab-font').value = obj.fontFamily || 'Cairo';
    } else {
        textProps.style.opacity = '0.3'; textProps.style.pointerEvents = 'none';
    }
}

// 3. تحديث خصائص العنصر (مع محرك ذكي لتحميل الخطوط)
window.fabUpdateProp = (prop, val) => {
    const obj = canvasEditor.getActiveObject();
    if (obj) {
        if (prop === 'fontFamily') {
            // إجبار المتصفح على تحميل الخط قبل تطبيقه لمنع مشكلة الخطوط العالقة
            document.fonts.load(`16px "${val}"`).then(() => {
                obj.set(prop, val);
                canvasEditor.renderAll();
            }).catch((err) => {
                // في حالة عدم توفر الإنترنت لتنزيل الخط، سيطبق المتصفح أقرب خط مشابه
                obj.set(prop, val);
                canvasEditor.renderAll();
            });
        } else {
            obj.set(prop, val);
            if (prop === 'stroke' && (!obj.strokeWidth || obj.strokeWidth === 0)) {
                obj.set('strokeWidth', 2);
                document.getElementById('fab-strokeWidth').value = 2;
            }
            canvasEditor.renderAll();
        }
    }
};

window.fabToggleStyle = (prop, onVal, offVal) => {
    const obj = canvasEditor.getActiveObject();
    if(obj && obj.set) {
        let current = obj[prop];
        obj.set(prop, current === onVal ? offVal : onVal);
        canvasEditor.renderAll();
    }
};

window.fabBringForward = () => { const obj = canvasEditor.getActiveObject(); if(obj) { canvasEditor.bringForward(obj); canvasEditor.renderAll(); }};
window.fabSendBackward = () => { const obj = canvasEditor.getActiveObject(); if(obj) { canvasEditor.sendBackwards(obj); canvasEditor.renderAll(); }};
window.fabDeleteSelected = () => { const objects = canvasEditor.getActiveObjects(); objects.forEach(obj => canvasEditor.remove(obj)); canvasEditor.discardActiveObject(); canvasEditor.renderAll(); };

// 4. الإدراج المباشر في منتصف الورقة (حل مشكلة عدم الرسبنة)
window.fabricAddText = (textStr = 'نص جديد', size = 20, color = '#111111') => {
    const text = new fabric.IText(textStr, {
        left: 559 / 2, top: 793 / 2, // منتصف الورقة تماماً
        originX: 'center', originY: 'center',
        fontFamily: 'Cairo', fill: color, fontSize: size, direction: 'rtl', textAlign: 'right'
    });
    canvasEditor.add(text); canvasEditor.setActiveObject(text);
    canvasEditor.renderAll(); // إجبار التحديث
};

// ==========================================
// محرك الأشكال الهندسية الشامل المتطور (30+ شكل)
// ==========================================
window.fabricAddShape = (type) => {
    let shape;
    // نقطة المنتصف المحسوبة لورقة الـ A5
    let centerX = 559 / 2;
    let centerY = 793 / 2;
    let commonOpts = { left: centerX, top: centerY, originX: 'center', originY: 'center', fill: '#e6e6e6', stroke: '#111111', strokeWidth: 0 };
    
    // المضلعات الشائعة المبرمجة بالنقاط (Points)
    const createPolygon = (points, scale = 1) => {
        let scaledPoints = points.map(p => ({ x: p.x * scale, y: p.y * scale }));
        return new fabric.Polygon(scaledPoints, commonOpts);
    };

    switch(type) {
        // --- الأساسيات ---
        case 'rect': shape = new fabric.Rect({ ...commonOpts, width: 150, height: 80 }); break;
        case 'square': shape = new fabric.Rect({ ...commonOpts, width: 100, height: 100 }); break;
        case 'rounded-rect': shape = new fabric.Rect({ ...commonOpts, width: 150, height: 80, rx: 15, ry: 15 }); break;
        case 'circle': shape = new fabric.Circle({ ...commonOpts, radius: 50 }); break;
        case 'ellipse': shape = new fabric.Ellipse({ ...commonOpts, rx: 75, ry: 40 }); break;
        case 'line': shape = new fabric.Line([-150, 0, 150, 0], { ...commonOpts, strokeWidth: 3, fill: null }); break;
        case 'dashed-line': shape = new fabric.Line([-150, 0, 150, 0], { ...commonOpts, strokeWidth: 3, fill: null, strokeDashArray: [10, 10] }); break;
        
        // --- المضلعات ---
        case 'triangle': shape = new fabric.Triangle({ ...commonOpts, width: 100, height: 100 }); break;
        case 'right-triangle': shape = createPolygon([{x:0, y:0}, {x:0, y:100}, {x:100, y:100}]); break;
        case 'diamond': shape = createPolygon([{x:50, y:0}, {x:100, y:50}, {x:50, y:100}, {x:0, y:50}]); break;
        case 'pentagon': shape = createPolygon([{x:50, y:0}, {x:100, y:38}, {x:81, y:100}, {x:19, y:100}, {x:0, y:38}]); break;
        case 'hexagon': shape = createPolygon([{x:50, y:0}, {x:100, y:25}, {x:100, y:75}, {x:50, y:100}, {x:0, y:75}, {x:0, y:25}]); break;
        case 'octagon': shape = createPolygon([{x:30, y:0}, {x:70, y:0}, {x:100, y:30}, {x:100, y:70}, {x:70, y:100}, {x:30, y:100}, {x:0, y:70}, {x:0, y:30}]); break;
        case 'parallelogram': shape = createPolygon([{x:25, y:0}, {x:125, y:0}, {x:100, y:75}, {x:0, y:75}]); break;
        case 'trapezoid': shape = createPolygon([{x:25, y:0}, {x:75, y:0}, {x:100, y:75}, {x:0, y:75}]); break;

        // --- النجوم والرموز (Vector Paths) ---
        case 'star': 
            shape = createPolygon([{x:50,y:0},{x:61,y:35},{x:98,y:35},{x:68,y:57},{x:79,y:91},{x:50,y:70},{x:21,y:91},{x:32,y:57},{x:2,y:35},{x:39,y:35}]); 
            break;
        case 'star-6': 
            shape = new fabric.Path('M 50 0 L 65 25 L 93 25 L 79 50 L 93 75 L 65 75 L 50 100 L 35 75 L 7 75 L 21 50 L 7 25 L 35 25 Z', commonOpts);
            shape.scale(1.2);
            break;
        case 'heart':
            shape = new fabric.Path('M 50 30 C 50 30 45 0 20 0 C -5 0 -5 35 -5 35 C -5 60 25 80 50 100 C 75 80 105 60 105 35 C 105 35 105 0 80 0 C 55 0 50 30 50 30 Z', commonOpts);
            break;
        case 'shield':
            shape = new fabric.Path('M 10 0 L 90 0 L 100 40 C 100 70 50 100 50 100 C 50 100 0 70 0 40 Z', commonOpts);
            break;
        case 'tag':
            shape = new fabric.Path('M 100 0 L 40 0 L 0 40 L 60 100 L 100 60 Z M 80 20 A 5 5 0 1 0 80 21 Z', commonOpts);
            break;
        case 'bubble':
            shape = new fabric.Path('M 0 0 L 100 0 L 100 70 L 60 70 L 30 100 L 30 70 L 0 70 Z', commonOpts);
            break;
        case 'plus': shape = createPolygon([{x:35,y:0},{x:65,y:0},{x:65,y:35},{x:100,y:35},{x:100,y:65},{x:65,y:65},{x:65,y:100},{x:35,y:100},{x:35,y:65},{x:0,y:65},{x:0,y:35},{x:35,y:35}]); break;
        case 'minus': shape = new fabric.Rect({ ...commonOpts, width: 100, height: 30 }); break;

        // --- الأسهم ---
        case 'arrow-right': shape = createPolygon([{x:0,y:25},{x:50,y:25},{x:50,y:0},{x:100,y:50},{x:50,y:100},{x:50,y:75},{x:0,y:75}]); break;
        case 'arrow-left': shape = createPolygon([{x:100,y:25},{x:50,y:25},{x:50,y:0},{x:0,y:50},{x:50,y:100},{x:50,y:75},{x:100,y:75}]); break;
        case 'arrow-up': shape = createPolygon([{x:25,y:100},{x:25,y:50},{x:0,y:50},{x:50,y:0},{x:100,y:50},{x:75,y:50},{x:75,y:100}]); break;
        case 'arrow-down': shape = createPolygon([{x:25,y:0},{x:25,y:50},{x:0,y:50},{x:50,y:100},{x:100,y:50},{x:75,y:50},{x:75,y:0}]); break;
    }

    if (shape) { 
        canvasEditor.add(shape); 
        canvasEditor.setActiveObject(shape); 
        canvasEditor.renderAll();
    }
};

// ==========================================
// محرك إدراج الصور والـ Vector SVG المتطور
// ==========================================
window.fabricAddImage = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();

    // السحر هنا: قراءة الـ SVG كـ كود فيكتور (Vector) لضمان عدم التبكسل عند التكبير!
    if (file.type === 'image/svg+xml') {
        reader.onload = function(f) {
            fabric.loadSVGFromString(f.target.result, function(objects, options) {
                // تجميع طبقات الـ SVG ككائن واحد متماسك
                let svgObj = fabric.util.groupSVGElements(objects, options);
                svgObj.set({ left: 559 / 2, top: 793 / 2, originX: 'center', originY: 'center' });
                svgObj.scaleToWidth(150);
                canvasEditor.add(svgObj);
                canvasEditor.setActiveObject(svgObj);
                canvasEditor.renderAll();
            });
        };
        reader.readAsText(file); // نقرأه كنص للـ SVG
    } else {
        // للصور العادية PNG/JPG
        reader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                img.set({ left: 559 / 2, top: 793 / 2, originX: 'center', originY: 'center' });
                img.scaleToWidth(150); 
                canvasEditor.add(img);
                canvasEditor.setActiveObject(img);
                canvasEditor.renderAll();
            });
        };
        reader.readAsDataURL(file);
    }
    
    // تفريغ الحقل لتتمكن من إضافة نفس الصورة مرتين إذا أردت
    e.target.value = ''; 
};
// ==========================================
// --- محرك طباعة وحساب تقرير الشفت (Z-Report) ---
// ==========================================
window.openShiftReportModal = () => {
    document.getElementById('hamburger-menu').classList.remove('show');
    
    // جلب الوقت الحالي كافتراضي لنهاية الشفت
    let now = new Date();
    document.getElementById('shift-end-time').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('shift-start-time').value = "08:00"; // افتراضي بداية الدوام
    
    document.getElementById('modal-shift-report').style.display = 'flex';
};

window.printShiftReport = () => {
    const cashierName = document.getElementById('shift-cashier-name').value || 'كاشير';
    const startTimeStr = document.getElementById('shift-start-time').value;
    const endTimeStr = document.getElementById('shift-end-time').value;

    if(!startTimeStr || !endTimeStr) return window.showAlert('يرجى تحديد وقت استلام وتسليم الشفت', 'warning');

    // جلب تصميم الشفت من السحابة
    let savedDesign = localData.settings?.shiftTemplate || localStorage.getItem('royal_shift_template');
    if (!savedDesign) return window.showAlert('يرجى تصميم تقرير الشفت من الاستوديو في لوحة الآدمن أولاً!', 'error');

    let tCash = 0, tElec = 0, tExp = 0;
    let todayDate = getRealTime().date;
    
    // دالة هندسية لمقارنة الأوقات بنظام 24 ساعة
    const isTimeInRange = (timestamp) => {
        let dateObj = new Date(timestamp);
        let hour = String(dateObj.getHours()).padStart(2, '0');
        let min = String(dateObj.getMinutes()).padStart(2, '0');
        let timeFormatted = `${hour}:${min}`;
        return timeFormatted >= startTimeStr && timeFormatted <= endTimeStr;
    };

    // 1. حساب فواتير الشفت الحالي
    (localData.invoices || []).forEach(inv => {
        if(inv.date === todayDate && isTimeInRange(inv.timestamp)) {
            if (inv.type === 'active' && inv.customer && inv.customer.paid > 0) tCash += inv.customer.paid;
            else if (inv.type === 'cash') tCash += inv.total;
            else if (inv.type === 'electronic') tElec += inv.total;
            else if (inv.type === 'archived' && inv.customer) tCash += (inv.customer.paid || 0); 
        }
    });
    
    // 2. حساب المصروفات
    (localData.expenses || []).forEach(exp => {
        if(exp.date === todayDate && isTimeInRange(exp.timestamp)) {
            tExp += exp.amount;
        }
    });

    // 3. حساب الدفعات المستقلة والاشتراكات
    (localData.payments || []).forEach(pay => {
        if(pay.date === todayDate && isTimeInRange(pay.timestamp)) {
            if (pay.type === 'دفع إلكتروني (متبقي طلب)') tElec += pay.amount;
            else if (pay.type === 'إلغاء اشتراك VIP') tCash -= pay.amount;
            else if (pay.type !== 'دفع مختلط (VIP + كاش)') tCash += pay.amount; 
        }
    });

    let netCash = tCash - tExp; // الصافي الواجب تسليمه للإدارة

    // تجهيز الطباعة الصامتة
    let hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.id = 'hidden-shift-canvas';
    let printCanvas = new fabric.StaticCanvas(hiddenCanvas, { width: 559, height: 793 });

    printCanvas.loadFromJSON(savedDesign, function() {
        // 1. استبدال النصوص والمتغيرات
        printCanvas.getObjects().forEach(obj => {
            obj.set({ objectCaching: false });
            if (obj.type === 'i-text' || obj.type === 'text') {
                let oldText = obj.text;
                let newText = obj.text
                    .replace('[اسم_الكاشير]', cashierName)
                    .replace('[بداية_الشفت]', startTimeStr)
                    .replace('[نهاية_الشفت]', endTimeStr)
                    .replace('[اليوم]', todayDate)
                    .replace('[كاش_المبيعات]', tCash.toLocaleString() + ' د.ع')
                    .replace('[الكتروني]', tElec.toLocaleString() + ' د.ع')
                    .replace('[المصروفات]', tExp.toLocaleString() + ' د.ع')
                    .replace('[صافي_الصندوق]', netCash.toLocaleString() + ' د.ع');

                if (newText.trim() === '') {
                     printCanvas.remove(obj);
                } else if (oldText !== newText) {
                     if (obj.textAlign === 'right' && obj.originX !== 'right') {
                         let rightEdge = obj.left + (obj.width * obj.scaleX / 2);
                         obj.set({ originX: 'right', left: rightEdge });
                     } else if (obj.textAlign === 'left' && obj.originX !== 'left') {
                         let leftEdge = obj.left - (obj.width * obj.scaleX / 2);
                         obj.set({ originX: 'left', left: leftEdge });
                     }
                     obj.set('text', newText);
                }
            }
        });

        // =========================================================
        // 🚀 السحر الحقيقي: إجبار المتصفح على تحميل الخطوط لتقرير الشفت
        // =========================================================
        document.fonts.ready.then(() => {
            
            // إعادة حساب الأبعاد بعد التأكد من تحميل الخطوط
            printCanvas.getObjects().forEach(obj => {
                if (obj.type === 'i-text' || obj.type === 'text') {
                    obj.initDimensions();
                    obj.setCoords();
                }
            });

            printCanvas.renderAll();
            let backgroundImg = printCanvas.toDataURL({ format: 'png', multiplier: 4 });

            const finalHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;900&family=Alexandria:wght@400;700;900&family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=Almarai:wght@400;700;800&family=Changa:wght@400;700&family=El+Messiri:wght@400;700&family=Lalezar&family=Lateef&family=Mada:wght@400;700&family=Markazi+Text:wght@400;600;700&family=Rakkas&family=Reem+Kufi:wght@400;700&family=Lemonada:wght@400;700&family=Kufam:wght@400;700&display=swap');
                    @page { size: A5; margin: 0; }
                    body { margin: 0; padding: 0; width: 148mm; height: 210mm; position: relative; overflow: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .designer-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
                </style>
            </head>
            <body>
                <div class="designer-bg">
                    <img src="${backgroundImg}" style="width: 100%; height: 100%; display: block;">
                </div>
            </body>
            </html>`;

            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('print-silent', finalHTML);
            }
        }); // نهاية الانتظار للخطوط
    });
    
    document.getElementById('modal-shift-report').style.display = 'none';
    window.showAlert('جاري تجهيز وطباعة تقرير الشفت...', 'success');
};

// =========================================================
// --- محرك الطباعة الذكي (يدمج التصميم مع البيانات الحية) ---
// =========================================================
window.printInvoice = (invoice) => {
    
    // 1. جلب التصميم المحفوظ
    let savedDesign = localData.settings?.invoiceTemplate || localStorage.getItem('royal_fabric_template');
    if (!savedDesign) return window.showAlert('يرجى تصميم فاتورة أولاً من لوحة الآدمن!', 'error');

    // تجهيز البيانات
    let custName = invoice.customer ? invoice.customer.name : 'عميل نقدي';
    let custPhone = invoice.customer && invoice.customer.phone ? invoice.customer.phone : '---';
    let deposit = invoice.customer ? invoice.customer.paid.toLocaleString() : '0';
    let remaining = invoice.customer ? invoice.customer.remaining.toLocaleString() : invoice.total.toLocaleString();
    let dailyNum = invoice.dailyNumber ? invoice.dailyNumber.toString().padStart(4, '0') : invoice.id.slice(-4);
    let totalStr = invoice.total.toLocaleString();
    let formattedTime = new Date(invoice.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // 2. إنشاء قماش مخفي (Off-screen Canvas) لمعالجة التصميم
    let hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.id = 'hidden-print-canvas';
    let printCanvas = new fabric.StaticCanvas(hiddenCanvas, { width: 559, height: 793 });

    printCanvas.loadFromJSON(savedDesign, function() {
        
        let tableAnchorY = 300; 
        let tableBottomY = 550; 

        // 1. تجهيز المتغيرات ودمج عملة (د.ع) برمجياً
        let custName = invoice.customer ? invoice.customer.name : 'عميل نقدي';
        let custPhone = invoice.customer && invoice.customer.phone ? invoice.customer.phone : '---';
        let pickupStr = (invoice.customer && invoice.customer.pickupDate) ? `${invoice.customer.pickupDate} ${invoice.customer.pickupTime || ''}` : 'غير محدد';
        let notesStr = invoice.notes ? invoice.notes : '';
        let dailyNum = invoice.dailyNumber ? invoice.dailyNumber.toString().padStart(4, '0') : invoice.id.slice(-4);
        let formattedTime = new Date(invoice.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        let totalStr = invoice.total.toLocaleString() + ' د.ع';
        let deposit = invoice.customer ? invoice.customer.paid.toLocaleString() + ' د.ع' : '0 د.ع';
        let remaining = invoice.customer ? invoice.customer.remaining.toLocaleString() + ' د.ع' : invoice.total.toLocaleString() + ' د.ع';
        
        // الذكاء التجاري لمتغير الخصم
        let discountVal = invoice.discount || 0;
        let discountStr = discountVal > 0 ? `الخصم: ${discountVal.toLocaleString()} د.ع` : '';

        // 2. محرك قراءة الإحداثيات واستبدال المتغيرات 
        printCanvas.getObjects().forEach(obj => {
            obj.set({ objectCaching: false });
            if (obj.type === 'i-text' || obj.type === 'text') {
                if (obj.text.includes('[بداية_الجدول]')) {
                    tableAnchorY = obj.top;
                    printCanvas.remove(obj);
                } else if (obj.text.includes('[نهاية_الجدول]')) {
                    tableBottomY = obj.top;
                    printCanvas.remove(obj);
                } else {
                    let oldText = obj.text;
                    let newText = obj.text
                        .replace('[اسم_الزبون]', custName)
                        .replace('[رقم_الهاتف]', custPhone)
                        .replace('[رقم_الطلب]', dailyNum)
                        .replace('[اليوم]', invoice.date)
                        .replace('[الوقت]', formattedTime)
                        .replace('[موعد_الاستلام]', pickupStr)
                        .replace('[المجموع]', totalStr)
                        .replace('[العربون]', deposit)
                        .replace('[المتبقي]', remaining)
                        .replace('[الملاحظات]', notesStr);

                    if (newText.includes('[الخصم_ان_وجد]')) {
                        if (discountVal > 0) newText = newText.replace('[الخصم_ان_وجد]', discountStr);
                        else newText = newText.replace('[الخصم_ان_وجد]', '');
                    }

                    if (newText.trim() === '') {
                         printCanvas.remove(obj);
                    } else if (oldText !== newText) {
                         if (obj.textAlign === 'right' && obj.originX !== 'right') {
                             let rightEdge = obj.left + (obj.width * obj.scaleX / 2);
                             obj.set({ originX: 'right', left: rightEdge });
                         } else if (obj.textAlign === 'left' && obj.originX !== 'left') {
                             let leftEdge = obj.left - (obj.width * obj.scaleX / 2);
                             obj.set({ originX: 'left', left: leftEdge });
                         }
                         obj.set('text', newText);
                    }
                }
            }
        });

        // =========================================================
        // 🚀 السحر الحقيقي: إجبار المتصفح على تحميل الخطوط قبل التقاط الصورة 🚀
        // =========================================================
        document.fonts.ready.then(() => {
            
            // إعادة ضبط الأبعاد بدقة بعد التأكد من تحميل خط "كايرو"
            printCanvas.getObjects().forEach(obj => {
                if (obj.type === 'i-text' || obj.type === 'text') {
                    obj.initDimensions();
                    obj.setCoords();
                }
            });

            // حساب المساحة المتاحة للجدول
            let availableHeight = tableBottomY - tableAnchorY;
            if(availableHeight < 50) availableHeight = 250; 

            printCanvas.renderAll();
            
            // التقاط الصورة الآن بأمان تام والخطوط محملة 100%
            let backgroundImg = printCanvas.toDataURL({ format: 'png', multiplier: 4 });
        // 3. بناء صفوف الجدول (الجدول المثالي كما هو بدون تغيير)
        let itemsRows = invoice.items.map((item, index) => `
            <tr>
                <td>${String(index + 1).padStart(2, '0')}</td>
                <td style="text-align: right; padding-right: 15px;">${item.name}</td>
                <td>${item.serviceName}</td>
                <td>${item.price.toLocaleString()}</td>
                <td style="font-weight:bold;">${item.qty}</td>
                <td style="font-weight: 700;">${(item.price * item.qty).toLocaleString()}</td>
            </tr>
        `).join('');

        // 4. دمج التصميم (HTML) مع استدعاء شامل لجميع الخطوط
        const finalHTML = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                /* حقن جميع الخطوط لضمان عدم تخريب التصميم عند الطباعة */
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;900&family=Alexandria:wght@400;700;900&family=Aref+Ruqaa:wght@400;700&family=Amiri:wght@400;700&family=Almarai:wght@400;700;800&family=Changa:wght@400;700&family=El+Messiri:wght@400;700&family=Lalezar&family=Lateef&family=Mada:wght@400;700&family=Markazi+Text:wght@400;600;700&family=Rakkas&family=Reem+Kufi:wght@400;700&family=Lemonada:wght@400;700&family=Kufam:wght@400;700&display=swap');
                
                @page { size: A5; margin: 0; }
                body { margin: 0; padding: 0; width: 148mm; height: 210mm; position: relative; overflow: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .designer-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
                
                #smart-table-wrapper { 
                    position: absolute; 
                    left: 10mm; 
                    right: 10mm; 
                    top: ${tableAnchorY}px; 
                    height: ${availableHeight}px; 
                    z-index: 10; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start; /* التعديل الحاسم: الجدول يبدأ دائماً من الأعلى ولا ينزل للأسفل أبداً! */
                }

                #smart-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 3px 6px; 
                    font-family: 'Markazi Text', serif;
                    font-size: 17px;
                    color: #000;
                    transform-origin: top center; /* الانكماش يكون من الأعلى للأسفل */
                }
                #smart-table th, #smart-table td {
                    border: 1px solid #000; 
                    border-radius: 8px; 
                    padding: 5px 4px;
                    text-align: center;
                }
                #smart-table th { background-color: #a0a0a0; font-weight: 700; font-size: 18px; }
                #smart-table td { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <div class="designer-bg">
                <img src="${backgroundImg}" style="width: 100%; height: 100%; display: block;">
            </div>
            
            <div id="smart-table-wrapper">
                <table id="smart-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">ت</th>
                            <th style="width: 30%; text-align: right; padding-right: 15px;">اسم القطعة</th>
                            <th style="width: 22%;">نوع الخدمة</th>
                            <th style="width: 13%;">السعر</th>
                            <th style="width: 10%;">العدد</th>
                            <th style="width: 20%;">المجموع</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
            </div>

            <script>
                // تأخير بسيط لضمان تحميل الخطوط قبل قياس أبعاد الجدول
                setTimeout(function() {
                    var wrapper = document.getElementById('smart-table-wrapper');
                    var table = document.getElementById('smart-table');
                    
                    var availableH = wrapper.clientHeight;
                    var tableH = table.offsetHeight;
                    
                    if (tableH > availableH) {
                        var scaleRatio = availableH / tableH;
                        table.style.transform = 'scale(' + scaleRatio + ')';
                    }
                }, 150);
            </script>
        </body>
        </html>
        `;
        if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('print-silent', finalHTML);
            }
        }); // نهاية انتظار الخطوط

        // 6. الإرسال للطابعة
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('print-silent', finalHTML);
        } else {
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'absolute';
            printFrame.style.top = '-9999px';
            printFrame.style.left = '-9999px';
            document.body.appendChild(printFrame);

            printFrame.contentWindow.document.open();
            printFrame.contentWindow.document.write(finalHTML);
            printFrame.contentWindow.document.close();

            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                setTimeout(() => { document.body.removeChild(printFrame); }, 1000);
            }, 500);
        }

    });
};

// ==========================================
// --- نظام التحديثات الهوائية التلقائية (OTA) ---
// ==========================================
window.startOtaUpdate = () => {
    document.getElementById('ota-update-msg').innerText = "جاري تحميل وتثبيت التحديث... يرجى عدم إغلاق النظام أو إطفاء اللابتوب.";
    const btn = document.querySelector('#modal-ota-update .btn-confirm');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديث...';
    btn.disabled = true;
    
    // محاكاة مؤقتة لعملية التحديث (في مرحلة Electron سنربطها بـ Auto-Updater)
    setTimeout(() => {
        window.location.reload(); 
    }, 4000);
};

// ==========================================
// --- نظام الاشتراكات (VIP Packages) ---
// ==========================================
const VIP_PACKAGES = [
    { id: 'bronze', name: 'البرونزية', pay: 35000, value: 50000, icon: 'fa-medal', css: 'pkg-bronze' },
    { id: 'silver', name: 'الفضية', pay: 50000, value: 70000, icon: 'fa-award', css: 'pkg-silver' },
    { id: 'gold', name: 'الذهبية', pay: 75000, value: 100000, icon: 'fa-trophy', css: 'pkg-gold' },
    { id: 'diamond', name: 'الماسية', pay: 100000, value: 140000, icon: 'fa-gem', css: 'pkg-diamond' }
];

window.renderPackages = () => {
    const container = document.getElementById('packages-container');
    if(!container) return;
    container.innerHTML = '';
    VIP_PACKAGES.forEach(pkg => {
        container.innerHTML += `
            <div class="package-card ${pkg.css}" onclick="window.openBuySubModal('${pkg.id}')">
                <i class="fa-solid ${pkg.icon}"></i>
                <div class="package-title">الفئة ${pkg.name}</div>
                <div class="package-details">ادفع ${pkg.pay.toLocaleString()} د.ع<br>واحصل على رصيد ${pkg.value.toLocaleString()} د.ع</div>
            </div>
        `;
    });
};

window.openBuySubModal = (pkgId) => {
    const pkg = VIP_PACKAGES.find(p => p.id === pkgId);
    document.getElementById('buy-sub-title').innerHTML = `<i class="fa-solid ${pkg.icon}"></i> تفعيل الفئة ${pkg.name} (${pkg.pay.toLocaleString()} د.ع)`;
    document.getElementById('sub-package-id').value = pkg.id;
    document.getElementById('sub-customer-name').value = '';
    document.getElementById('sub-customer-phone').value = '';
    
    let now = new Date();
    document.getElementById('sub-date').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    document.getElementById('sub-autocomplete-list').style.display = 'none';
    document.getElementById('modal-buy-sub').style.display = 'flex';
};

// التدخل الجراحي: فصل زبائن الـ VIP في البحث
window.filterCustomerNames = (val) => {
    const list = document.getElementById('sub-autocomplete-list');
    list.innerHTML = '';
    if(!val) { list.style.display = 'none'; return; }
    
    let uniqueCustomers = [];
    (localData.subscriptions || []).forEach(s => {
        if(!uniqueCustomers.find(c => c.name === s.customerName)) uniqueCustomers.push({name: s.customerName, phone: s.customerPhone});
    });

    let matches = uniqueCustomers.filter(c => c.name.includes(val));
    if(matches.length > 0) {
        matches.forEach(c => {
            let div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerText = c.name;
            div.onclick = () => {
                document.getElementById('sub-customer-name').value = c.name;
                document.getElementById('sub-customer-phone').value = c.phone || '';
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
        list.style.display = 'block';
    } else {
        list.style.display = 'none'; // السماح بإدخال اسم جديد بحرية
    }
};

window.confirmBuySub = () => {
    const pkgId = document.getElementById('sub-package-id').value;
    const name = window.escapeHTML(document.getElementById('sub-customer-name').value.trim());
    const phone = window.escapeHTML(document.getElementById('sub-customer-phone').value.trim());
    const customDate = document.getElementById('sub-date')?.value || getRealTime().date; 

    if(!name) return window.showAlert('يرجى إدخال اسم الزبون', 'warning');

    const pkg = VIP_PACKAGES.find(p => p.id === pkgId);
    const realT = getRealTime();
    const existingSubIndex = (localData.subscriptions || []).findIndex(s => s.customerName === name);
    
    let subId, actionType, payAmount, logMsg, sub;

    if (existingSubIndex > -1) {
        return window.showAlert('الزبون مشترك بالفعل! يرجى استخدام زر التعديل لترقية فئته.', 'warning');
    } else {
        actionType = 'اشتراك VIP';
        payAmount = pkg.pay;
        subId = 'SUB-' + realT.timestamp;
        sub = {
            id: subId, timestamp: realT.timestamp, date: customDate, time: realT.time,
            customerName: name, customerPhone: phone, packageId: pkg.id, packageName: pkg.name,
            paidAmount: pkg.pay, totalValue: pkg.value, consumedAmount: 0, invoices: []
        };
        if(!localData.subscriptions) localData.subscriptions = [];
        localData.subscriptions.push(sub);
        logMsg = `تفعيل الفئة ${pkg.name} للزبون ${name}`;
    }

    const paymentId = 'PAY-' + realT.timestamp;
    const newPayment = {
        id: paymentId, timestamp: realT.timestamp, date: customDate, 
        type: actionType, amount: payAmount, details: logMsg
    };
    if(!localData.payments) localData.payments = [];
    localData.payments.push(newPayment);

    // الرفع الجراحي الفوري (بدون تأخير أو استيراد بطيء)
    set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
    set(ref(database, 'royal_data/subscriptions/' + subId), sub);
    
    window.recalculateDailySales();
    updateUI();
    if(window.renderCashierSubs) window.renderCashierSubs(); 

    window.logAction(actionType, logMsg, payAmount, { customerName: name, pkgName: pkg.name });
    window.closeModals();
    window.showAlert(logMsg, 'success');
};
// إدارة الاشتراكات للكاشير
window.openCashierSubs = () => {
    window.renderCashierSubs();
    document.getElementById('modal-cashier-subs').style.display = 'flex';
};

window.renderCashierSubs = () => {
    const tbody = document.getElementById('cashier-subs-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let filterText = document.getElementById('cashier-sub-search')?.value.toLowerCase() || '';
    // الترتيب: من الأقدم إلى الأحدث (حسب طلبك)
    let sorted = [...(localData.subscriptions || [])].sort((a,b) => a.timestamp - b.timestamp);
    
    sorted.forEach((sub, index) => {
        if(filterText && !sub.customerName.toLowerCase().includes(filterText) && !(sub.customerPhone || '').includes(filterText)) return;
        
        let remaining = sub.totalValue - sub.consumedAmount;
        let actions = '';
        
       // 1. زر التعديل الشامل (الاسم، الرقم، الفئة)
        actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:#f39c12; border-color:#f39c12; margin-left:5px;" onclick="window.openEditSubModal('${sub.id}')">تعديل</button>`;
        // 3. زر التجديد
        actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:var(--green-success); border-color:var(--green-success); margin-left:5px;" onclick="window.renewSub('${sub.id}')">تجديد</button>`;
        // 4. زر الحذف
        actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:var(--red-danger); border-color:var(--red-danger);" onclick="window.confirmDeleteSubWarning('${sub.id}')">حذف</button>`;
        
        tbody.innerHTML += `<tr>
            <td style="font-weight:900;">${index + 1}</td>
            <td style="font-weight:bold;">${sub.customerName}</td>
            <td>${sub.customerPhone || '-'}</td>
            <td><span style="background:var(--dark-gray); padding:3px 6px; border-radius:4px; border:1px solid var(--gold);">${sub.packageName}</span></td>
            <td style="color:var(--green-success); font-weight:bold;">${sub.paidAmount.toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold; font-size:16px;">${remaining.toLocaleString()}</td>
            <td>${actions}</td>
        </tr>`;
    });
};

window.openEditSubModal = (subId) => {
    const sub = localData.subscriptions.find(s => s.id === subId);
    if(!sub) return;

    document.getElementById('edit-sub-id').value = sub.id;
    document.getElementById('edit-sub-name').value = sub.customerName;
    document.getElementById('edit-sub-phone').value = sub.customerPhone || '';

    const select = document.getElementById('edit-sub-package');
    select.innerHTML = '';
    // إضافة الفئات المتاحة (يسمح بالبقاء على نفس الفئة أو الترقية لفئة أعلى)
    VIP_PACKAGES.forEach(pkg => {
        if (pkg.id === sub.packageId || pkg.pay > sub.paidAmount) {
            let isSelected = pkg.id === sub.packageId ? 'selected' : '';
            select.innerHTML += `<option value="${pkg.id}" data-pay="${pkg.pay}" ${isSelected}>${pkg.name} (${pkg.pay.toLocaleString()} د.ع)</option>`;
        }
    });

    // نظام الكشف المحاسبي الحي أثناء تغيير الفئة (يظهر الفرق المالي)
    select.onchange = () => {
        let selectedOption = select.options[select.selectedIndex];
        let newPay = parseFloat(selectedOption.getAttribute('data-pay'));
        let diff = newPay - sub.paidAmount;
        let warningDiv = document.getElementById('edit-sub-upgrade-warning');
        if (diff > 0) {
            document.getElementById('edit-sub-diff').innerText = diff.toLocaleString();
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }
    };
    select.onchange(); 

    window.closeModals();
    document.getElementById('modal-edit-sub').style.display = 'flex';
};

window.saveEditedSub = () => {
    const subId = document.getElementById('edit-sub-id').value;
    const subIndex = localData.subscriptions.findIndex(s => s.id === subId);
    if(subIndex === -1) return;
    
    let sub = localData.subscriptions[subIndex];
    let newName = window.escapeHTML(document.getElementById('edit-sub-name').value.trim());
    let newPhone = window.escapeHTML(document.getElementById('edit-sub-phone').value.trim());
    let newPkgId = document.getElementById('edit-sub-package').value;
    
    if(!newName) return window.showAlert('يرجى إدخال اسم الزبون', 'warning');

    let newPkg = VIP_PACKAGES.find(p => p.id === newPkgId);
    let diff = newPkg.pay - sub.paidAmount;

    let logMsg = `تعديل معلومات المشترك: ${newName}`;
    let actionType = 'تعديل VIP';
    let paymentId = null;
    let newPayment = null;

    if (diff > 0) {
        actionType = 'ترقية VIP';
        logMsg = `ترقية باقة الزبون ${newName} إلى ${newPkg.name} (دفع الفرق كاش: ${diff.toLocaleString()})`;
        
        sub.packageId = newPkg.id;
        sub.packageName = newPkg.name;
        sub.paidAmount = newPkg.pay;
        sub.totalValue = newPkg.value; 
        
        const realT = getRealTime();
        paymentId = 'PAY-' + realT.timestamp;
        newPayment = {
            id: paymentId, timestamp: realT.timestamp, date: realT.date,
            type: actionType, amount: diff, details: logMsg
        };
        if(!localData.payments) localData.payments = [];
        localData.payments.push(newPayment);
        
        localData.dailySalesCash += diff; 
    }

    sub.customerName = newName;
    sub.customerPhone = newPhone;

    // تحديث وتعديل مباشر في السحابة
    update(ref(database, 'royal_data/subscriptions/' + subId), sub);
    if(paymentId && newPayment) {
        set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
    }
    
    if (diff > 0) {
        window.recalculateDailySales();
        updateUI();
    }
    window.renderCashierSubs();
    document.getElementById('modal-edit-sub').style.display = 'none';
    window.showAlert('تم حفظ التعديلات بنجاح!', 'success');
    window.logAction(actionType, logMsg, diff > 0 ? diff : 0, { sub: sub });
};

window.renewSub = (subId) => {
    const sub = localData.subscriptions.find(s => s.id === subId);
    if(!sub) return;
    window.showConfirm(`هل تريد تجديد اشتراك ${sub.customerName} بنفس الفئة (${sub.packageName})؟ سيتم إضافة ${sub.paidAmount.toLocaleString()} د.ع للصندوق.`, () => {
        const realT = getRealTime();
        sub.timestamp = realT.timestamp; sub.date = realT.date; sub.time = realT.time;
        sub.consumedAmount = 0; sub.invoices = [];
        
        const paymentId = 'PAY-' + realT.timestamp;
        const newPayment = { id: paymentId, timestamp: realT.timestamp, date: realT.date, type: 'تجديد VIP', amount: sub.paidAmount, details: `تجديد باقة ${sub.packageName} للزبون ${sub.customerName}` };
        if(!localData.payments) localData.payments = []; localData.payments.push(newPayment);
        
        set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
        update(ref(database, 'royal_data/subscriptions/' + subId), sub);
        
        window.logAction('تجديد VIP', newPayment.details, sub.paidAmount, sub);
        saveDataToCloud(); window.renderCashierSubs(); window.showAlert('تم التجديد!', 'success');
    });
};

// التدخل الجراحي: حساب وإظهار البونص مقابل رأس المال بوضوح للكاشير
window.confirmDeleteSubWarning = (subId) => {
    const sub = localData.subscriptions.find(s => s.id === subId);
    if(!sub) return;
    
    // المعادلة المحاسبية الذهبية: رأس المال - ما تم استهلاكه
    let refundable = sub.paidAmount - sub.consumedAmount;
    if(refundable < 0) refundable = 0; // إذا استهلك أكثر من رأس ماله لا يرجع له شيء
    
    let bonusAmount = sub.totalValue - sub.paidAmount; // البونص المجاني
    
    let details = `<p style="font-size:16px;">الزبون: <strong style="color:var(--text-white);">${sub.customerName}</strong></p>
                   <p>رأس المال المدفوع: <strong style="color:var(--green-success);">${sub.paidAmount.toLocaleString()} د.ع</strong></p>
                   <p>المبلغ المستهلك (المكوي): <strong style="color:var(--gold);">${sub.consumedAmount.toLocaleString()} د.ع</strong></p>
                   <hr style="border:1px dashed #444; margin:10px 0;">`;
    
    if(refundable > 0) {
        details += `<p style="color:var(--red-danger); font-size:18px;">المبلغ الواجب إرجاعه للزبون: <strong>${refundable.toLocaleString()} د.ع</strong></p>
                    <p style="font-size:13px; color:var(--text-gray); text-align:right;">(المعادلة: رأس المال - المستهلك. البونص المجاني وقدره ${bonusAmount.toLocaleString()} د.ع يُلغى ولا يُعوض، وسيتم خصم الـ ${refundable.toLocaleString()} من صندوق المكوى).</p>`;
    } else {
        details += `<p style="color:var(--red-danger); font-size:18px;">المبلغ الواجب إرجاعه: <strong>0 د.ع</strong></p>
                    <p style="font-size:13px; color:var(--text-gray); text-align:right;">(لقد استهلك الزبون ${sub.consumedAmount.toLocaleString()} د.ع، وهذا يتجاوز رأس ماله المدفوع. المتبقي لديه هو من البونص المجاني ولا يُسترد لحماية المكوى).</p>`;
    }
    
    document.getElementById('delete-sub-math-details').innerHTML = details;
    document.getElementById('delete-sub-id').value = sub.id;
    
    document.getElementById('modal-cashier-subs').style.display = 'none';
    document.getElementById('modal-delete-sub-warning').style.display = 'flex';
};

window.executeSubDelete = () => {
    const subId = document.getElementById('delete-sub-id').value;
    const subIndex = localData.subscriptions.findIndex(s => s.id === subId);
    if(subIndex === -1) return;
    const sub = localData.subscriptions[subIndex];
    
    let refundable = sub.paidAmount - sub.consumedAmount;
    if(refundable < 0) refundable = 0;
    
    const realT = getRealTime();
    let paymentId = null, newPayment = null;
    
    if(refundable > 0) {
        paymentId = 'PAY-' + realT.timestamp;
        newPayment = { id: paymentId, timestamp: realT.timestamp, date: realT.date, type: 'إلغاء اشتراك VIP', amount: refundable, details: `إرجاع مبلغ اشتراك ${sub.customerName}` };
        if(!localData.payments) localData.payments = []; 
        localData.payments.push(newPayment);
    }
    
    window.logAction('إلغاء اشتراك VIP', `حذف اشتراك ${sub.customerName} (المبلغ المُرجع: ${refundable})`, refundable, sub);
    localData.subscriptions.splice(subIndex, 1);
    
    // إعدام فوري من قاعدة البيانات بدون تأخير
    remove(ref(database, 'royal_data/subscriptions/' + subId)); 
    
    if (refundable > 0 && paymentId && newPayment) {
        set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
    }
    
    window.recalculateDailySales();
    updateUI();
    if(window.renderCashierSubs) window.renderCashierSubs();
    if(document.getElementById('admin-screen').classList.contains('active-screen')) window.updateAdminDashboard();
    
    document.getElementById('modal-delete-sub-warning').style.display = 'none'; 
    window.openCashierSubs();
    window.showAlert('تم الحذف النهائي بنجاح!', 'success');
};
// الدفع المختلط (اشتراك + كاش)
window.openPickupSubscription = () => {
    const select = document.getElementById('pay-sub-select');
    select.innerHTML = '<option value="" disabled selected>-- اختر المشترك لسحب الرصيد --</option>';
    
    let hasActive = false;
    (localData.subscriptions || []).forEach(sub => {
        let remaining = sub.totalValue - sub.consumedAmount;
        if(remaining > 0) {
            select.innerHTML += `<option value="${sub.id}">${sub.customerName} - المتبقي: ${remaining.toLocaleString()} د.ع</option>`;
            hasActive = true;
        }
    });
    
    if(!hasActive) return window.showAlert('لا يوجد مشتركون لديهم رصيد متاح حالياً.', 'warning');
    
    document.getElementById('pay-sub-details').style.display = 'none';
    document.getElementById('modal-pickup-payment').style.display = 'none';
    document.getElementById('modal-pay-via-sub').style.display = 'flex';
};

window.calculateSubPayment = () => {
    const subId = document.getElementById('pay-sub-select').value;
    const sub = localData.subscriptions.find(s => s.id === subId);
    const inv = localData.invoices.find(i => i.id === pendingPickupId);
    if(!sub || !inv) return;
    
    let invRemainingToPay = inv.customer ? inv.customer.remaining : inv.total;
    let subBalance = sub.totalValue - sub.consumedAmount;
    
    let deductAmount = Math.min(invRemainingToPay, subBalance);
    let cashAmount = invRemainingToPay - deductAmount;
    
    document.getElementById('pay-sub-total').innerText = invRemainingToPay.toLocaleString();
    document.getElementById('pay-sub-balance').innerText = subBalance.toLocaleString();
    document.getElementById('pay-sub-deduct').innerText = deductAmount.toLocaleString();
    document.getElementById('pay-sub-cash').innerText = cashAmount.toLocaleString();
    
    document.getElementById('pay-sub-cash-row').style.display = cashAmount > 0 ? 'block' : 'none';
    document.getElementById('pay-sub-details').style.display = 'block';
};

window.confirmSubPayment = () => {
    const subId = document.getElementById('pay-sub-select').value;
    const sub = localData.subscriptions.find(s => s.id === subId);
    const inv = localData.invoices.find(i => i.id === pendingPickupId);
    if(!sub || !inv) return;
    
    let invRemainingToPay = inv.customer ? inv.customer.remaining : inv.total;
    let subBalance = sub.totalValue - sub.consumedAmount;
    
    let deductAmount = Math.min(invRemainingToPay, subBalance);
    let cashAmount = invRemainingToPay - deductAmount;
    
    // التنبيه الشديد في حالة نفاذ بطاقة الزبون وحاجته لدفع كاش متبقي
    if (cashAmount > 0) {
        window.showConfirm(`تنبيه شديد للكاشير ⚠️\n\nرصيد الباقة لا يكفي لتسديد كامل الفاتورة.\nتم خصم (${deductAmount.toLocaleString()} د.ع) من رصيد الباقة.\n\nيجب عليك استلام مبلغ (${cashAmount.toLocaleString()} د.ع) نقداً من الزبون الآن!\n\nهل استلمت المبلغ الكاش؟`, () => {
            window.executeSubPaymentFinal(subId, sub, inv, deductAmount, cashAmount);
        });
    } else {
        // الرصيد كافٍ ولا يوجد دفع كاش
        window.executeSubPaymentFinal(subId, sub, inv, deductAmount, cashAmount);
    }
};

window.executeSubPaymentFinal = (subId, sub, inv, deductAmount, cashAmount) => {
    sub.consumedAmount += deductAmount;
    if(!sub.invoices) sub.invoices = [];
    sub.invoices.push({ id: inv.id, date: inv.date, deducted: deductAmount, cash: cashAmount });
    
    inv.type = 'archived'; 
    inv.paymentType = cashAmount > 0 ? 'mixed' : 'subscription';
    if(inv.customer) {
        inv.customer.remainingPaid = cashAmount; 
        inv.customer.subDeducted = deductAmount;
        inv.customer.remaining = 0;
        let remainingBalText = (sub.totalValue - sub.consumedAmount).toLocaleString();
        inv.notes = (inv.notes ? inv.notes + ' | ' : '') + `💳 دُفعت عبر فئة VIP (خُصم ${deductAmount.toLocaleString()} د.ع). المتبقي من الباقة: ${remainingBalText} د.ع.` + (cashAmount > 0 ? ` (المتبقي دُفع كاش: ${cashAmount.toLocaleString()} د.ع)` : '');
    }

    const realT = getRealTime();
    let paymentId = null, newPayment = null;
    
    // المبالغ التي ستضاف لمبيعات اليوم هي الـ cashAmount حصراً! الدالة recalculateDailySales ستلتقطه.
    if(cashAmount > 0) {
        paymentId = 'PAY-' + realT.timestamp;
        newPayment = {
            id: paymentId, timestamp: realT.timestamp, date: realT.date,
            type: 'دفع مختلط (VIP + كاش)', amount: cashAmount, details: `متبقي فاتورة ${inv.dailyNumber||inv.id} للزبون ${sub.customerName}`
        };
        if(!localData.payments) localData.payments = [];
        localData.payments.push(newPayment);
    }
    
    update(ref(database, 'royal_data/invoices/' + inv.id), {
        type: inv.type, paymentType: inv.paymentType, customer: inv.customer, notes: inv.notes
    });
    update(ref(database, 'royal_data/subscriptions/' + subId), sub);
    if(paymentId && newPayment) {
        set(ref(database, 'royal_data/payments/' + paymentId), newPayment);
    }
    
    window.recalculateDailySales(); 
    updateUI();
    
    window.logAction('تسليم طلب (VIP)', `خصم ${deductAmount} من باقة ${sub.customerName}` + (cashAmount > 0 ? ` ودفع ${cashAmount} كاش` : ''), cashAmount, inv);
    
    document.getElementById('modal-pay-via-sub').style.display = 'none';
    window.openActiveOrders();
    window.printInvoice(inv); 
    window.showAlert('تم الخصم من الباقة بنجاح!', 'success');
};

// شاشة إدارة الاشتراكات للآدمن
window.renderAdminSubs = () => {
    const tbody = document.getElementById('admin-subs-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let sorted = [...(localData.subscriptions || [])].sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(sub => {
        let remaining = sub.totalValue - sub.consumedAmount;
        tbody.innerHTML += `<tr>
            <td>${sub.date}</td>
            <td style="font-weight:bold;">${sub.customerName}</td>
            <td>${sub.customerPhone || '-'}</td>
            <td><span style="background:var(--dark-gray); padding:3px 6px; border-radius:4px; border:1px solid var(--gold);">${sub.packageName}</span></td>
            <td style="color:var(--green-success); font-weight:bold;">${sub.paidAmount.toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold; font-size:16px;">${remaining.toLocaleString()}</td>
            <td><button class="top-bar-btn" style="padding:4px 8px; font-size:12px; border-color:#4a90e2; color:#4a90e2;" onclick="window.viewAdminSubInvoices('${sub.id}')">عرض الفواتير</button></td>
        </tr>`;
    });
};

window.viewAdminSubInvoices = (subId) => {
    const sub = localData.subscriptions.find(s => s.id === subId);
    if(!sub) return;
    
    const tbody = document.getElementById('admin-sub-invoices-body');
    tbody.innerHTML = '';
    
    if(!sub.invoices || sub.invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد فواتير مسحوبة من هذه الباقة حتى الآن</td></tr>';
    } else {
        sub.invoices.forEach(invData => {
            tbody.innerHTML += `<tr>
                <td>${invData.date}</td>
                <td style="font-weight:bold;">${invData.id}</td>
                <td style="color:var(--gold); font-weight:bold;">${invData.deducted.toLocaleString()}</td>
                <td style="color:var(--green-success); font-weight:bold;">${invData.cash.toLocaleString()}</td>
                <td><button class="top-bar-btn" style="padding:4px 8px; font-size:12px;" onclick="window.viewInvoice('${invData.id}')"><i class="fa-solid fa-eye"></i> الفاتورة</button></td>
            </tr>`;
        });
    }
    document.getElementById('modal-admin-sub-invoices').style.display = 'flex';
};

window.onload = initializeDB;

// دالة فتح الصرفيات للآدمن مع استخراج اسم اليوم
window.openAdminExpensesModal = () => {
    const tbody = document.getElementById('admin-expenses-detail-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // ترتيب من الأحدث للأقدم
    const sorted = (localData.expenses || []).sort((a, b) => b.timestamp - a.timestamp);
    
    sorted.forEach(exp => {
        // استخراج اسم اليوم (جمعة، سبت...)
        const dateObj = new Date(exp.timestamp || Date.now());
        const dayName = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long' }).format(dateObj);
        // التدخل الجراحي: تعقيم المدخلات
        const safeDetail = window.escapeHTML(exp.detail);
        
        tbody.innerHTML += `
            <tr>
                <td>${exp.date}</td>
                <td style="color:var(--gold); font-weight:bold;">${dayName}</td>
                <td>${safeDetail}</td>
                <td style="color:var(--red-danger); font-weight:bold;">${exp.amount.toLocaleString()} د.ع</td>
            </tr>
        `;
    });
    
    document.getElementById('modal-admin-expenses').style.display = 'flex';
};
// دالة عرض وتصفية سجل الحركات (Audit Log)
window.renderLogs = () => {
    const tbody = document.getElementById('logs-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let filterText = document.getElementById('log-search-text')?.value || '';
    let dateFrom = document.getElementById('log-date-from')?.value;
    let dateTo = document.getElementById('log-date-to')?.value;

    // الافتراضي: عرض حركات اليوم فقط لحماية الذاكرة وتسريع المتصفح
    if (!dateFrom && !dateTo) {
        const today = new Date().toLocaleDateString();
        dateFrom = today; dateTo = today;
        if(document.getElementById('log-date-from')) document.getElementById('log-date-from').value = today;
        if(document.getElementById('log-date-to')) document.getElementById('log-date-to').value = today;
    }

    const startTimestamp = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : 0;
    const endTimestamp = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
    
    const sorted = (localData.logs || []).sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(log => {
        // حماية الذاكرة: تجاوز الحركات التي لا تطابق التاريخ
        if (log.timestamp < startTimestamp || log.timestamp > endTimestamp) return;
        // فلتر البحث النصي
        if (filterText && !log.details.includes(filterText) && !log.type.includes(filterText)) return;
        
        let typeClass = 'log-type ';
        if(log.type.includes('حذف')) typeClass += 'log-delete';
        else if(log.type.includes('تعديل')) typeClass += 'log-edit';
        else typeClass += 'log-add';

        let actionBtn = log.snapshot ? `<button class="top-bar-btn" style="padding: 4px 10px; font-size:12px; border-color:#4a90e2; color:#4a90e2;" onclick="window.viewLogDetails('${log.id}')" title="عرض التفاصيل"><i class="fa-solid fa-eye"></i></button>` : '-';
        
        // التدخل الجراحي: تعقيم تفاصيل الحركة بالكامل
        const safeDetails = window.escapeHTML(log.details);

        tbody.innerHTML += `
            <tr>
                <td style="font-size:13px; color:var(--text-gray);">${log.date} <br> ${log.time}</td>
                <td><span class="${typeClass}">${log.type}</span></td>
                <td>${safeDetails}</td>
                <td style="font-weight:bold;">${log.amount.toLocaleString()} د.ع</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
};

// ==========================================================
// ⚠️ الزر النووي: تصفير قاعدة البيانات بالكامل (استخدام لمرة واحدة فقط) ⚠️
// ==========================================================
window.nukeDatabaseAndReset = () => {
    let confirmNuke = prompt("تحذير خطير: هذا الإجراء سيمسح جميع البيانات (الفواتير، الزبائن، المحفظة، السجل، الديون). اكتب 'نعم' للتأكيد:");
    
    if (confirmNuke === 'نعم') {
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref }) => {
            // نكتب بيانات فارغة/أساسية فوق كل مسارات النظام
            const resetData = {
                catalog: [
                    { id: 'suit', name: 'بدلة رجالية', icon: 'fa-user-tie', prices: { wash_iron: 8000, iron_only: 5000 } },
                    { id: 'abaya', name: 'عباءة نسائية', icon: 'fa-person-dress', prices: { wash_iron: 6000, iron_only: 4000 } },
                    { id: 'arabic', name: 'الزي العربي', icon: 'fa-user-nurse', prices: { wash_iron: 4000, iron_only: 3000 } },
                    { id: 'military', name: 'بدلة عسكرية', icon: 'fa-person-military-rifle', prices: { wash_iron: 6000, iron_only: 5000 } },
                    { id: 'coat', name: 'كوت', icon: 'fa-user-secret', prices: { wash_iron: 6000, iron_only: 4000 } },
                    { id: 'shirt', name: 'قميص', icon: 'fa-shirt', prices: { wash_iron: 3000, iron_only: 2000 } }
                ],
                invoices: {},
                expenses: {},
                operatingCosts: {},
                debts: {},
                logs: {},
                partnerTx: {},
                subscriptions: {},
                payments: {},
                settings: { name: "مكوى رويال VIP", phone: "07800000000", address: "الكوفة، النجف الأشرف" },
                lastDate: new Date().toDateString()
            };

            set(ref(window.db || database, 'royal_data'), resetData)
                .then(() => {
                    // تصفير الذاكرة المحلية للكاش
                    localStorage.removeItem('cart_draft');
                    alert("💥 تم تدمير وتصفير قاعدة البيانات بنجاح! سيتم إعادة تحميل النظام الآن.");
                    window.location.reload();
                })
                .catch((error) => {
                    alert("حدث خطأ أثناء التصفير: " + error.message);
                });
        });
    } else {
        alert("تم إلغاء عملية التصفير.");
    }
};
window.filterLogs = () => window.renderLogs();
// ==========================================
// محرك استقبال التحديثات (واجهة الكاشير)
// ==========================================
if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    
    // عند وجود تحديث جديد (استقبال التفاصيل)
    ipcRenderer.on('update-available', (event, info) => {
        const modal = document.getElementById('update-modal');
        if (modal) {
            let versionText = typeof info === 'string' ? info : info.version;
            // سحب التفاصيل من GitHub، وإذا لم تكتب أنت شيئاً سيضع نصاً افتراضياً
            let notesText = typeof info === 'object' && info.releaseNotes ? info.releaseNotes : '<li>تحسينات شاملة على أداء واستقرار النظام.</li><li>تحديثات أمنية وإصلاحات خلفية.</li>';
            
            document.getElementById('update-version-text').innerText = `إصدار جديد (v${versionText}) متاح للتحميل!`;
            document.getElementById('update-release-notes').innerHTML = `<strong style="color:var(--gold);">أبرز ما في هذا التحديث:</strong><div style="margin-top: 5px; line-height: 1.6;">${notesText}</div>`;
            modal.style.display = 'flex';
        }
    });

    // زر التجاهل
    document.getElementById('btn-ignore-update')?.addEventListener('click', () => {
        document.getElementById('update-modal').style.display = 'none';
        // ستنبثق النافذة مجدداً بعد ساعة أو عند إعادة تشغيل الحاسبة
    });

    // زر التحميل
    document.getElementById('btn-download-update')?.addEventListener('click', () => {
        ipcRenderer.send('start-download'); // إرسال الأمر للرادار
        document.getElementById('btn-download-update').style.display = 'none';
        document.getElementById('btn-ignore-update').style.display = 'none';
        document.getElementById('update-progress-container').style.display = 'block';
        document.getElementById('update-version-text').innerText = 'جاري التحميل... يمكنك إكمال البيع ولن يتم الإغلاق الآن';
    });

    // شريط التقدم الحي مع إظهار النسبة المئوية كأرقام
    ipcRenderer.on('download-progress', (event, percent) => {
        const bar = document.getElementById('update-progress-bar');
        if(bar) bar.style.width = percent + '%';
        
        const textEl = document.getElementById('update-version-text');
        if(textEl) textEl.innerText = `جاري التحميل... ${Math.floor(percent)}%`;
    });

    // التقاط الأخطاء لكي لا يبقى الزر معلقاً على الصفر
    ipcRenderer.on('update-error', (event, errMsg) => {
        const textEl = document.getElementById('update-version-text');
        if(textEl) {
            textEl.innerHTML = `<span style="color:var(--red-danger);">فشل التحديث! تأكد من الإنترنت أو أن المستودع على GitHub (Public).</span><br><small style="font-size:11px; color:#666;">الخطأ الفني: ${errMsg}</small>`;
        }
        
        const container = document.getElementById('update-progress-container');
        if(container) container.style.display = 'none';
        
        const btnIgnore = document.getElementById('btn-ignore-update');
        if(btnIgnore) {
            btnIgnore.style.display = 'block';
            btnIgnore.innerText = 'إغلاق والمحاولة لاحقاً';
        }
    });

    // عند اكتمال التحميل وجاهزية التثبيت
    ipcRenderer.on('update-ready', () => {
        document.getElementById('update-progress-container').style.display = 'none';
        document.getElementById('update-version-text').innerText = '✅ اكتمل التحميل! سيتم إعادة تشغيل النظام وتحديثه الآن...';
        
        // إغلاق النظام وتثبيت التحديث خلال ثانيتين
        setTimeout(() => {
            ipcRenderer.send('install-update');
        }, 2000);
    });
}
// إخفاء شاشة التحميل إجبارياً بعد ثانيتين (لدعم الأوفلاين)
window.addEventListener('load', () => {
    setTimeout(() => {
        // استبدل 'loading-screen-id' بالـ id الحقيقي لشاشة التحميل عندك في HTML
        const loadingScreen = document.getElementById('loading-screen-id'); 
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 2000); // 2000 تعني ثانيتين، يمكنك تقليلها إلى 1000
});
// محرك التلميحات العائمة الذكية (Custom Tooltips Engine)
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[title]');
    if (target) {
        // سحب النص من المربع الافتراضي ووضعه في التلميح الذكي
        target.setAttribute('data-tooltip', target.getAttribute('title'));
        // إزالة المربع الأصفر الافتراضي للويندوز/المتصفح
        target.removeAttribute('title'); 
    }
});
// =========================================================
// --- محرك السحب الحي (Real-Time Swipe Engine) للآيفون ---
// =========================================================
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let isSwiping = false;
let swipeDirectionLocked = false;
let activeSec = null;
let nextSec = null;
let prevSec = null;
const tabsOrder = ['dashboard', 'debts', 'wallet', 'subscriptions', 'more-menu'];

const adminScreenEl = document.getElementById('admin-screen');

if (adminScreenEl) {
    adminScreenEl.addEventListener('touchstart', (e) => {
        // منع السحب إذا كان الإصبع على جداول، بطاقات، القوائم المنبثقة، أو شريط التنقل لتجنب الأخطاء
        if (e.target.closest('table, .invoices-table, .cart-table, [style*="overflow-x"], .modal-content, .discount-wrapper, .mobile-bottom-nav')) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
        swipeDirectionLocked = false;
        
        let currentTab = sessionStorage.getItem('admin_tab') || 'dashboard';
        let currentIndex = tabsOrder.indexOf(currentTab);
        
        activeSec = document.getElementById('admin-' + currentTab);
        // بناءً على طلبك: السحب لليسار يفتح التبويب التالي
        nextSec = currentIndex < tabsOrder.length - 1 ? document.getElementById('admin-' + tabsOrder[currentIndex + 1]) : null; 
        prevSec = currentIndex > 0 ? document.getElementById('admin-' + tabsOrder[currentIndex - 1]) : null; 
        
        [activeSec, nextSec, prevSec].forEach(sec => {
            if(sec) {
                sec.style.transition = 'none'; // إلغاء الأنيميشن لكي يتبع الإصبع لحظياً
                sec.style.position = 'absolute';
                sec.style.width = 'calc(100% - 30px)'; 
                sec.style.top = '15px';
                sec.style.opacity = '1';
            }
        });
    }, { passive: true });

    adminScreenEl.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        touchCurrentX = e.touches[0].clientX;
        let touchCurrentY = e.touches[0].clientY;
        
        let diffX = touchCurrentX - touchStartX;
        let diffY = touchCurrentY - touchStartY;
        
        // قفل اتجاه السحب (يمنع السحب إذا كان الآدمن يتصفح للأعلى/الأسفل)
        if (!swipeDirectionLocked) {
            if (Math.abs(diffY) > Math.abs(diffX)) {
                isSwiping = false; cleanupSwipe(); return;
            }
            if (Math.abs(diffX) > 10) swipeDirectionLocked = true;
        }
        if (!swipeDirectionLocked) return;

        let screenW = window.innerWidth;
        
        // تحريك الشاشة الحالية وإعطائها شفافية كلما ابتعدت
        if(activeSec) {
            activeSec.style.transform = `translateX(${diffX}px)`;
            activeSec.style.opacity = 1 - (Math.abs(diffX) / (screenW * 1.2));
        }
        
        // حركة مرافقة للإصبع (Parallax Effect) للصفحة القادمة
        if (diffX < 0 && nextSec) { // السحب لليسار (يُظهر الصفحة التالية)
            nextSec.style.display = 'block';
            nextSec.style.transform = `translateX(${diffX + screenW}px)`;
            if(prevSec) prevSec.style.display = 'none';
        } else if (diffX > 0 && prevSec) { // السحب لليمين (يُظهر الصفحة السابقة)
            prevSec.style.display = 'block';
            prevSec.style.transform = `translateX(${diffX - screenW}px)`;
            if(nextSec) nextSec.style.display = 'none';
        }
    }, { passive: true });

    adminScreenEl.addEventListener('touchend', (e) => {
        if (!isSwiping || !swipeDirectionLocked) { cleanupSwipe(); return; }
        isSwiping = false;
        
        let diffX = touchCurrentX - touchStartX;
        let screenW = window.innerWidth;
        
        let currentTab = sessionStorage.getItem('admin_tab') || 'dashboard';
        let currentIndex = tabsOrder.indexOf(currentTab);
        let targetTab = currentTab;
        
        // تفعيل النعومة للارتداد أو إكمال السحب
        [activeSec, nextSec, prevSec].forEach(sec => {
            if(sec) sec.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s';
        });

        // إذا كان السحب أكثر من 60 بكسل، نكمل الانتقال
        if (diffX < -60 && nextSec) { 
            activeSec.style.transform = `translateX(-${screenW}px)`;
            activeSec.style.opacity = '0';
            nextSec.style.transform = `translateX(0px)`;
            targetTab = tabsOrder[currentIndex + 1];
        } else if (diffX > 60 && prevSec) { 
            activeSec.style.transform = `translateX(${screenW}px)`;
            activeSec.style.opacity = '0';
            prevSec.style.transform = `translateX(0px)`;
            targetTab = tabsOrder[currentIndex - 1];
        } else { // ارتداد مطاطي (لم يكمل السحب بشكل كافي)
            if(activeSec) { activeSec.style.transform = `translateX(0px)`; activeSec.style.opacity = '1'; }
            if(diffX < 0 && nextSec) nextSec.style.transform = `translateX(${screenW}px)`;
            if(diffX > 0 && prevSec) prevSec.style.transform = `translateX(-${screenW}px)`;
        }
        
        setTimeout(() => {
            cleanupSwipe();
            if (targetTab !== currentTab) {
                window.switchAdminTab(targetTab, 'none'); // انتقال صامت لأننا قمنا بالحركة يدوياً
            }
        }, 300);
        
    }, { passive: true });
    
    function cleanupSwipe() {
        [activeSec, nextSec, prevSec].forEach(sec => {
            if(sec) {
                sec.style.position = ''; sec.style.width = ''; sec.style.top = '';
                sec.style.transform = ''; sec.style.transition = ''; sec.style.opacity = '';
                sec.style.display = ''; // سيتم التحكم به عبر switchAdminTab
            }
        });
    }
}
