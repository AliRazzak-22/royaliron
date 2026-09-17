// استيراد مكتبات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref, set, get, child, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// إعدادات Firebase الخاصة بمكوى رويال
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

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const dbRef = ref(database);
const auth = getAuth(app); // تشغيل محرك الأمان

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
    // تحويل الوقت لصيغة AM/PM للواجهة
    const realTimeFormat = realDate.toLocaleTimeString('ar-IQ', { timeZone: 'Asia/Baghdad' });

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
    'fa-mattress-pillow', 'fa-towel', 'fa-bag-shopping', 'fa-shoe-prints'
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
                
                // مزامنة فورية للذاكرة المحلية
                localData.invoices = Object.values(incomingData.invoices || {});
                localData.catalog = Object.values(incomingData.catalog || {});
                localData.expenses = Object.values(incomingData.expenses || {});
                localData.operatingCosts = Object.values(incomingData.operatingCosts || {});
                localData.debts = Object.values(incomingData.debts || {});
                localData.logs = Object.values(incomingData.logs || {});
                localData.partnerTx = Object.values(incomingData.partnerTx || {});
                localData.subscriptions = Object.values(incomingData.subscriptions || {});
                localData.payments = Object.values(incomingData.payments || {});
                
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
                if(window.loadInvoiceTemplateToEditor) window.loadInvoiceTemplateToEditor();
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
        if (savedScreen === 'pos') {
            window.showPOS();
        } else if (savedScreen === 'admin') {
            // التدخل الجراحي: منع الدخول التلقائي للآدمن لحماية البيانات
            sessionStorage.removeItem('active_screen'); 
            document.getElementById('main-screen').style.display = 'flex';
            window.showAlert('تم إنهاء جلسة الآدمن لدواعي أمنية. يرجى تسجيل الدخول مجدداً.', 'warning');
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
                // المتبقي تمت معالجته كدفعة منفصلة في مسار payments لتجنب التكرار
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
                // دفعات الكاش تذهب لـ realCash
                if(pay.type !== 'دفع إلكتروني (متبقي طلب)') {
                    realCash += pay.amount;
                } else {
                    realElectronic += pay.amount; // الدفع الإلكتروني
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
    
    // 2. خصم المصروفات لليوم الحالي
    (localData.expenses || []).forEach(exp => {
        if(exp.timestamp && exp.timestamp >= todayStart.getTime()) { 
            realCash -= exp.amount; 
        }
    });
    
   // 3. إضافة مبالغ الديون واشتراكات الـ VIP للصندوق اليومي
    (localData.payments || []).forEach(pay => {
        if((pay.type === 'تسديد دين' || pay.type.includes('VIP')) && pay.timestamp && pay.timestamp >= todayStart.getTime()) { 
            // إذا كانت العملية "إلغاء اشتراك"، سيتم خصم المبلغ من الصندوق
            if(pay.type === 'إلغاء اشتراك VIP') realCash -= pay.amount;
            else realCash += pay.amount; 
        }
    });
    
    // تحديث الأرقام بناءً على الحساب الواقعي 100%
    localData.dailySalesCash = realCash;
    localData.dailySalesElectronic = realElectronic;
};

function saveDataToCloud() {
    window.recalculateDailySales(); // فلتر الأمان: إعادة حساب الصندوق قبل الحفظ
    
    // التدخل الجراحي: رفع المسارات الفرعية فقط لمنع التدمير اللحظي (Race Condition) للفواتير والصرفيات
    const updates = {};
    if(localData.catalog) updates['royal_data/catalog'] = localData.catalog;
    if(localData.operatingCosts) updates['royal_data/operatingCosts'] = localData.operatingCosts;
    if(localData.debts) updates['royal_data/debts'] = localData.debts;
    if(localData.partnerTx) updates['royal_data/partnerTx'] = localData.partnerTx; // حفظ المحفظة
    if(localData.subscriptions) updates['royal_data/subscriptions'] = localData.subscriptions; // حفظ الاشتراكات
    if(localData.payments) updates['royal_data/payments'] = localData.payments;
    if(localData.settings) {
        updates['royal_data/settings/name'] = localData.settings.name;
        updates['royal_data/settings/phone'] = localData.settings.phone;
        updates['royal_data/settings/address'] = localData.settings.address;
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
    document.getElementById('main-screen').style.display = 'flex'; 
    
    // --- إلغاء ملء الشاشة وتحرير الشاشة عند الخروج للرئيسية ---
    if(document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.log(e));
    }
    if(screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
};

// --- دالة ملء الشاشة المتطورة للكاشير ---
window.toggleFullScreen = () => {
    const btnIcon = document.querySelector('#fullscreen-btn i');
    if (!document.fullscreenElement) { 
        document.documentElement.requestFullscreen().catch(err => console.log(err));
        if(btnIcon) { btnIcon.classList.remove('fa-expand'); btnIcon.classList.add('fa-compress'); }
    } else { 
        if (document.exitFullscreen) { document.exitFullscreen(); }
        if(btnIcon) { btnIcon.classList.remove('fa-compress'); btnIcon.classList.add('fa-expand'); }
    }
};
// ----------------------------------------
window.openAdminLogin = () => { document.getElementById('modal-admin-login').style.display = 'flex'; };
window.closeModals = () => { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); };
// ---------------- نظام رسائل التأكيد المخصصة ----------------
let pendingConfirmAction = null;
window.showConfirm = (msg, actionCallback) => {
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
// ---------------- نظام التنبيهات الذكي (بديل المتصفح) ----------------
window.showAlert = (msg, type = 'warning') => {
    const iconContainer = document.getElementById('alert-icon-container');
    const titleContainer = document.getElementById('alert-title');
    
    iconContainer.className = 'pop-animate'; // تشغيل الحركة
    titleContainer.className = '';

    if (type === 'success') {
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i>';
        titleContainer.innerText = 'نجاح';
        titleContainer.classList.add('text-success');
    } else if (type === 'error') {
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
        titleContainer.innerText = 'خطأ';
        titleContainer.classList.add('text-danger');
    } else {
        iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i>';
        titleContainer.innerText = 'تنبيه';
        titleContainer.classList.add('text-warning');
    }

    document.getElementById('alert-message').innerText = msg;
    document.getElementById('modal-custom-alert').style.display = 'flex';
};

window.closeAlertModal = () => {
    document.getElementById('modal-custom-alert').style.display = 'none';
    document.getElementById('alert-icon-container').className = ''; // إعادة تهيئة الحركة
};

// 🔴 السحر المطور: أي خطأ برمجي سيظهر كخطأ أحمر، ورسائل النجاح نحددها برمجياً
window.alert = (msg) => {
    window.showAlert(msg, 'error'); 
};

// ---------------- بناء الواجهة (الخلايا) ----------------
function renderItems() {
    const grid = document.getElementById('items-grid');
    if(!grid) return; // حماية إضافية
    grid.innerHTML = '';
    if(localData.catalog) {
        localData.catalog.forEach(item => {
            const cell = document.createElement('div');
            cell.className = 'item-cell';
            cell.onclick = () => window.openServiceModal(item);
            cell.innerHTML = `
                <i class="fa-solid ${item.icon} item-icon"></i>
                <div class="item-name">${item.name}</div>
            `;
            grid.appendChild(cell);
        });
    }
}

// ---------------- إضافة/تعديل/حذف خدمة (الكتالوج) ----------------
window.openAddServiceModal = () => {
    document.getElementById('new-srv-name').value = '';
    document.getElementById('new-srv-price-wash').value = '';
    document.getElementById('new-srv-price-iron').value = '';
    
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
    const priceWash = parseFloat(document.getElementById('new-srv-price-wash').value);
    const priceIron = parseFloat(document.getElementById('new-srv-price-iron').value);

    if(!name || isNaN(priceWash) || isNaN(priceIron)) return alert('الرجاء إدخال البيانات بشكل صحيح.');

    const newItem = {
        id: 'item_' + Date.now(),
        name: name, icon: icon,
        prices: { wash_iron: priceWash, iron_only: priceIron }
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
    document.getElementById('modal-edit-service').style.display = 'flex';
};

window.loadServiceToEdit = () => {
    const id = document.getElementById('edit-srv-select').value;
    const item = localData.catalog.find(i => i.id === id);
    if(item) {
        document.getElementById('edit-srv-name').value = item.name;
        document.getElementById('edit-srv-price-wash').value = item.prices.wash_iron;
        document.getElementById('edit-srv-price-iron').value = item.prices.iron_only;
    }
};

window.saveEditedService = () => {
    const id = document.getElementById('edit-srv-select').value;
    const name = document.getElementById('edit-srv-name').value;
    const priceWash = parseFloat(document.getElementById('edit-srv-price-wash').value);
    const priceIron = parseFloat(document.getElementById('edit-srv-price-iron').value);

    if(!id || !name || isNaN(priceWash) || isNaN(priceIron)) return alert('الرجاء إدخال البيانات بشكل صحيح');

    const index = localData.catalog.findIndex(i => i.id === id);
    if(index > -1) {
        localData.catalog[index].name = name;
        localData.catalog[index].prices.wash_iron = priceWash;
        localData.catalog[index].prices.iron_only = priceIron;
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
    document.getElementById('service-item-name').innerText = item.name;
    document.getElementById('price-wash').innerText = item.prices.wash_iron.toLocaleString() + ' د.ع';
    document.getElementById('price-iron').innerText = item.prices.iron_only.toLocaleString() + ' د.ع';
    document.getElementById('modal-service').style.display = 'flex';
};

window.addToCartSelected = (serviceType) => {
    const price = pendingItem.prices[serviceType];
    const serviceName = serviceType === 'wash_iron' ? 'غسيل وكوي' : 'كوي فقط';
    
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

function renderCart() {
    const tbody = document.getElementById('cart-items');
    tbody.innerHTML = '';
    let total = 0;
    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        const serviceClass = item.service === 'wash_iron' ? 'srv-wash-iron' : 'srv-iron';
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
    document.getElementById('cart-total-val').innerText = total.toLocaleString() + ' د.ع';
    localStorage.setItem('cart_draft', JSON.stringify(currentCart));
}

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

// دالة حساب الرقم التسلسلي (تصفير تلقائي كل 3 أيام)
function getNextDailyNumber() {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const epoch = new Date('2024-01-01T00:00:00').getTime();
    const now = Date.now();
    
    // حساب دورة الـ 3 أيام الحالية
    const currentDays = Math.floor((now - epoch) / MS_PER_DAY);
    const currentCycle = Math.floor(currentDays / 3);
    
    let maxNumber = 0;
    
    // التدخل الجراحي: جدار زمني لفلترة الفواتير (نبحث في آخر 4 أيام فقط)
    // هذا سيمنع المعالج من فحص آلاف الفواتير القديمة!
    const timeBarrier = now - (4 * MS_PER_DAY);
    
    (localData.invoices || []).forEach(inv => {
        // فلتر الأمان: إذا كانت الفاتورة أقدم من 4 أيام، نتجاوزها فوراً بدون عمليات رياضية
        if (inv.dailyNumber && inv.timestamp && inv.timestamp >= timeBarrier) {
            const invDays = Math.floor((inv.timestamp - epoch) / MS_PER_DAY);
            const invCycle = Math.floor(invDays / 3);
            
            // إذا كانت الفاتورة السابقة ضمن نفس دورة الـ 3 أيام، ننافس على أعلى رقم
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
    const total = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if(newDeposit > total) return window.showAlert('العربون أكبر من المجموع الكلي!', 'error');

    // === حالة (تعديل طلب موجود) ===
    if (editingInvoiceId) {
        const index = localData.invoices.findIndex(i => i.id === editingInvoiceId);
        const oldInv = localData.invoices[index];
        const oldDeposit = oldInv.customer ? oldInv.customer.paid : 0;
        
        // القاعدة المالية: إذا تغير العربون، نعدل الصندوق لليوم الحالي حصراً (الفرق بين القديم والجديد)
        const depositDifference = newDeposit - oldDeposit;
        if (depositDifference !== 0 && getRealTime().date === oldInv.date) {
            localData.dailySalesCash += depositDifference;
        }

        localData.invoices[index].items = [...currentCart];
        localData.invoices[index].total = total;
        localData.invoices[index].notes = document.getElementById('cart-notes').value;
        localData.invoices[index].customer = { name, phone, pickupDate, pickupTime, paid: newDeposit, remaining: total - newDeposit };

        window.logAction('تعديل طلب', `تعديل طلب رقم: ${oldInv.dailyNumber || oldInv.id}`, total, { oldInvoice: oldInv, newCart: currentCart });
        
        // تحديث السحابة
        update(ref(database, 'royal_data/invoices/' + editingInvoiceId), {
            items: localData.invoices[index].items,
            total: total,
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
    currentCart = []; document.getElementById('cart-notes').value = '';
    localStorage.removeItem('cart_draft'); renderCart();
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
        editingInvoiceId = invoice.id;
        renderCart();
        window.closeModals();
        
        // التدخل الجراحي: إخفاء زر (بيع) وإظهار زر (حفظ التعديلات)
        document.getElementById('btn-main-checkout').style.display = 'none';
        document.getElementById('btn-save-edit').style.display = 'flex';
    }
};

window.saveEditedInvoice = () => {
    const newTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const oldIndex = localData.invoices.findIndex(i => i.id === editingInvoiceId);
    const oldInvoice = localData.invoices[oldIndex];
    
    // تعديل الدخل اليومي إذا كانت الفاتورة تابعة لليوم
    if (oldInvoice.date === getRealTime().date) {
        if(oldInvoice.type === 'cash') localData.dailySalesCash -= oldInvoice.total;
        if(oldInvoice.type === 'electronic') localData.dailySalesElectronic -= oldInvoice.total;
        
        if(oldInvoice.type === 'cash') localData.dailySalesCash += newTotal;
        if(oldInvoice.type === 'electronic') localData.dailySalesElectronic += newTotal;
    }

    localData.invoices[oldIndex].items = [...currentCart];
    localData.invoices[oldIndex].total = newTotal;
    localData.invoices[oldIndex].notes = document.getElementById('cart-notes').value;

    window.logAction('تعديل فاتورة', 'تعديل فاتورة رقم: ' + editingInvoiceId, newTotal, { oldInvoice: oldInvoice, newCart: currentCart });
    
    // التدخل الجراحي: تحديث الفاتورة في مسارها الخاص فقط باستخدام update
    const invoiceRef = ref(database, 'royal_data/invoices/' + editingInvoiceId);
    update(invoiceRef, {
        items: localData.invoices[oldIndex].items,
        total: localData.invoices[oldIndex].total,
        notes: localData.invoices[oldIndex].notes
    });
    
    window.recalculateDailySales();
    updateUI();

    editingInvoiceId = null; currentCart = []; document.getElementById('cart-notes').value = '';
    localStorage.removeItem('cart_draft'); renderCart();

    document.getElementById('btn-save-edit').style.display = 'none';
    document.querySelector('.btn-cash').style.display = 'flex';
    document.querySelector('.btn-electronic').style.display = 'flex';
    document.querySelector('.btn-credit').style.display = 'flex';
    window.showAlert('تم حفظ تعديلات الفاتورة بنجاح!', 'success');
};

window.deleteInvoice = (id) => {
    // استدعاء النافذة المخصصة بدلاً من confirm
    window.showConfirm('تحذير: هل أنت متأكد من حذف هذه الفاتورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', () => {
        const index = localData.invoices.findIndex(i => i.id === id);
        const inv = localData.invoices[index];

        if (inv.date === getRealTime().date) {
            if(inv.type === 'cash') localData.dailySalesCash -= inv.total;
            else if(inv.type === 'electronic') localData.dailySalesElectronic -= inv.total;
            else if(inv.type === 'credit' && inv.customer) localData.dailySalesCash -= inv.customer.paid;
        }

        // --- إصلاح: حذف الدين المرتبط بالفاتورة إذا كانت آجل ---
        if (inv.type === 'credit') {
            const debtIndex = (localData.debts || []).findIndex(d => d.invoiceId === inv.id);
            if (debtIndex > -1) {
                const debtId = localData.debts[debtIndex].id; // افتراض وجود id
                localData.debts.splice(debtIndex, 1);
                // التدخل الجراحي: مسح مسار الدين مباشرة
                if (debtId) remove(ref(database, 'royal_data/debts/' + debtId));
            }
        }
        // -------------------------------------------------

        window.logAction('حذف فاتورة', 'تم حذف فاتورة رقم: ' + inv.id, inv.total, inv);
        localData.invoices.splice(index, 1);
        
        // التدخل الجراحي: مسح الفاتورة من مسارها الخاص فقط باستخدام remove
        remove(ref(database, 'royal_data/invoices/' + id));
        window.recalculateDailySales();
        updateUI();
        
       // التدخل الجراحي: تحديث فوري وسلس للنافذة المفتوحة أمام الكاشير
        if (document.getElementById('modal-active-orders').style.display === 'flex') {
            window.renderActiveOrders(); // تحديث المستودع فوراً
        } else if (document.getElementById('modal-invoices').style.display === 'flex') {
            window.openPreviousInvoices(); // تحديث الفواتير السابقة
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

window.printInvoice = (invoice) => {
    const printArea = document.getElementById('print-area');
    let template = localStorage.getItem('royal_invoice_template');
    
    // إذا لم يقم الآدمن بوضع تصميم بعد، نعطيه تصميماً احتياطياً قوياً
    if (!template) {
        template = `<div style="text-align:center; font-family:'Cairo', sans-serif;"><h2>مكوى رويال VIP</h2><p>رقم الطلب: [رقم_الطلب]</p>[جدول_المبيعات]<p style="font-weight:bold;">المجموع: [المجموع] د.ع</p></div>`;
    }

    // 1. توليد جدول المبيعات وتنسيقه
    let itemsRows = invoice.items.map(item => `<tr><td style="border:1px solid #000; padding:5px;">${item.name} (${item.serviceName})</td><td style="border:1px solid #000; padding:5px;">${item.qty}</td><td style="border:1px solid #000; padding:5px;">${(item.price * item.qty).toLocaleString()}</td></tr>`).join('');
    let itemsTable = `<table style="width:100%; border-collapse:collapse; margin:15px 0; border:2px solid #000; text-align:center; font-size:14px;">
                        <thead><tr style="background:#e0e0e0; font-weight:bold;"><th style="border:1px solid #000; padding:5px;">القطعة والخدمة</th><th style="border:1px solid #000; padding:5px;">العدد</th><th style="border:1px solid #000; padding:5px;">المجموع</th></tr></thead>
                        <tbody>${itemsRows}</tbody>
                      </table>`;

    // 2. تجهيز المتغيرات الذكية
    let custName = invoice.customer ? invoice.customer.name : 'بدون اسم';
    let deposit = invoice.customer ? invoice.customer.paid.toLocaleString() : '0';
    let remaining = invoice.customer ? invoice.customer.remaining.toLocaleString() : invoice.total.toLocaleString();
    let dailyNum = invoice.dailyNumber ? invoice.dailyNumber.toString() : invoice.id;
    let dayName = new Intl.DateTimeFormat('ar-IQ', { weekday: 'long' }).format(new Date(invoice.timestamp));
    let timeOnly = new Date(invoice.timestamp).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    // 3. حقن المتغيرات داخل قالب الـ A5
    let finalPrint = template
        .replace(/\[رقم_الطلب\]/g, dailyNum)
        .replace(/\[اليوم\]/g, dayName)
        .replace(/\[الوقت\]/g, timeOnly)
        .replace(/\[التاريخ\]/g, invoice.date)
        .replace(/\[اسم_الزبون\]/g, custName)
        .replace(/\[جدول_المبيعات\]/g, itemsTable)
        .replace(/\[المجموع\]/g, invoice.total.toLocaleString())
        .replace(/\[العربون\]/g, deposit)
        .replace(/\[المتبقي\]/g, remaining);

    printArea.innerHTML = finalPrint;
    
    // أمر الطباعة السريع والمباشر (في Electron سيتم توجيهه للطابعة الصامتة)
    setTimeout(() => { window.print(); }, 150);
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
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set }) => {
            set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment);
        });
    }

    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ update }) => {
        update(ref(window.db || database, 'royal_data/invoices/' + inv.id), { type: 'archived', paymentType: paymentType, customer: inv.customer });
    });
    
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

    // حفظ في السحابة فوراً (لا يؤثر على الكاصة اليومية)
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref }) => {
        set(ref(window.db || database, 'royal_data/partnerTx/' + txId), newTx);
    });

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
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) { 
            window.requestAnimationFrame(step); 
        } else {
            obj.innerHTML = end.toLocaleString(); // ضمان توقف الرقم النهائي بدقة تامة
        }
    };
    window.requestAnimationFrame(step);
}

// ---------------- وظائف الآدمن ----------------
window.switchAdminTab = (tab) => {
    if (!secureAdminToken) { window.exitToMain(); return window.showAlert('محاولة وصول غير مصرح بها!', 'error'); }
    sessionStorage.setItem('admin_tab', tab); // حفظ التبويب المحدد
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-${tab}`).classList.add('active');
    event.target.classList.add('active');
    
    if(tab === 'dashboard') window.updateAdminDashboard();
    if(tab === 'logs') window.renderLogs();
    if(tab === 'subscriptions' && window.renderAdminSubs) window.renderAdminSubs();
    if(tab === 'settings') {
        document.getElementById('set-name').value = localData.settings.name;
        document.getElementById('set-phone').value = localData.settings.phone;
        document.getElementById('set-address').value = localData.settings.address;
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

    // حساب الصرفيات
    (localData.expenses || []).forEach(exp => {
        let expDate = new Date(exp.timestamp || Date.now());
        let monthStr = exp.monthStr || `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        let dayStr = exp.date || window.formatRoyalDate(expDate);

        if (isAllTime || monthStr === selectedMonth) {
            totalExpenses += exp.amount;
            if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: expDate.getTime() };
            dailyReports[dayStr].expenses += exp.amount;
            dailyReports[dayStr].details.push(exp.detail);
        }
    });

    // --- التدخل الجراحي: الحساب الدقيق لاشتراكات الـ VIP وتصفية المبالغ المسترجعة ---
    (localData.payments || []).forEach(pay => {
        if(pay.type === 'تسديد دين' || pay.type.includes('VIP')) {
            let payDate = new Date(pay.timestamp || Date.now());
            let monthStr = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
            // استخدام دالتنا الآمنة للتاريخ 
            let dayStr = window.formatRoyalDate(payDate);

            if (isAllTime || monthStr === selectedMonth) {
                if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: payDate.getTime() };
                
                // الخدعة المحاسبية: إذا كان نوع العملية "إلغاء اشتراك"، يجب (خصمها) من المبيعات
                if (pay.type === 'إلغاء اشتراك VIP') {
                    totalSalesCash -= pay.amount; 
                    dailyReports[dayStr].sales -= pay.amount; 
                    dailyReports[dayStr].details.push(`استرجاع اشتراك: -${pay.amount}`);
                } else {
                    totalSalesCash += pay.amount; 
                    dailyReports[dayStr].sales += pay.amount; 
                }
            }
        }
    });
    // -----------------------------------------------------------------

    // التكاليف التشغيلية (تحسب للكلي حالياً)
    (localData.operatingCosts || []).forEach(c => { totalCosts += c.amount; });

    let netProfit = (totalSalesCash + totalSalesElectronic) - totalExpenses - totalCosts;

    // تحديث الأرقام العلوية
    document.getElementById('admin-month-sales-cash').innerText = totalSalesCash.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-sales-electronic').innerText = totalSalesElectronic.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-expenses').innerText = totalExpenses.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-costs').innerText = totalCosts.toLocaleString() + ' د.ع';
    document.getElementById('admin-net-profit').innerText = netProfit.toLocaleString() + ' د.ع';

    // توليد جدول التقارير اليومية
    const dailyTbody = document.getElementById('admin-daily-reports-body');
    dailyTbody.innerHTML = '';
    
    // ترتيب الأيام من الأحدث للأقدم
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

    // قسم الديون - تجميع ذكي لكل زبون
    const debtsTbody = document.getElementById('debts-table-body');
    debtsTbody.innerHTML = '';
    
    // تجميع الحسابات بناءً على اسم الزبون
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
        // التدخل الجراحي: عرض رقم الفواتير المرتبطة بشكل أنيق
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

        // 1. حساب كل المبيعات التراكمية
        (localData.invoices || []).forEach(inv => {
            let amount = 0;
            if(inv.type === 'cash' || inv.type === 'electronic') amount = inv.total;
            else if(inv.type === 'credit' && inv.customer) amount = inv.customer.paid;
            else if(inv.type === 'active' && inv.customer) amount = inv.customer.paid;
            else if(inv.type === 'archived' && inv.customer) {
                amount = inv.customer.paid;
                if(inv.paymentType !== 'credit') amount += (inv.customer.remainingPaid || 0);
            }
            lifetimeSales += amount;
        });
        (localData.logs || []).forEach(log => { if(log.type === 'تسديد دين') lifetimeSales += log.amount; });
        
        // 2. المصروفات والتكاليف
        (localData.expenses || []).forEach(e => lifetimeExpenses += e.amount);
        (localData.operatingCosts || []).forEach(c => lifetimeCosts += c.amount);

        // 3. صافي الربح الكلي وحصة كل شريك (50%)
        let lifetimeNetProfit = lifetimeSales - lifetimeExpenses - lifetimeCosts;
        let baseShare = lifetimeNetProfit / 2;
        let razaqBal = baseShare, shabaBal = baseShare;

        // 4. تطبيق السحب والإيداع للحصول على الرصيد النهائي
        (localData.partnerTx || []).forEach(tx => {
            if(tx.account === 'أحمد رزاق العامري') {
                if(tx.type === 'إيداع') razaqBal += tx.amount; else razaqBal -= tx.amount;
            } else if(tx.account === 'أحمد شاكر شبع') {
                if(tx.type === 'إيداع') shabaBal += tx.amount; else shabaBal -= tx.amount;
            }
        });

        // 5. عرض الأرصدة في الواجهة
        if(document.getElementById('wallet-ahmed-razaq')) {
            document.getElementById('wallet-ahmed-razaq').innerText = razaqBal.toLocaleString() + ' د.ع';
            document.getElementById('wallet-ahmed-razaq').style.color = razaqBal >= 0 ? '#4a90e2' : 'var(--red-danger)';
            document.getElementById('wallet-ahmed-shaba').innerText = shabaBal.toLocaleString() + ' د.ع';
            document.getElementById('wallet-ahmed-shaba').style.color = shabaBal >= 0 ? 'var(--green-success)' : 'var(--red-danger)';
        }

        // 6. عرض جدول الحركات مع حساب "الرصيد التاريخي" اللحظي
        const walletTbody = document.getElementById('wallet-transactions-body');
        if(walletTbody) {
            walletTbody.innerHTML = '';
            const sortedTx = [...(localData.partnerTx || [])].sort((a,b) => b.timestamp - a.timestamp);
            
            // دالة دقيقة تحسب رصيد الشريك في اللحظة الزمنية التي تمت فيها الحركة
            const getHistoricalBal = (acc, ts) => {
                let tS = 0, tE = 0, tC = 0;
                (localData.invoices || []).forEach(i => {
                    if(i.timestamp <= ts) {
                        if(i.type === 'cash' || i.type === 'electronic') tS += i.total;
                        else if(i.type === 'active' || i.type === 'archived' || i.type === 'credit') tS += (i.customer ? i.customer.paid : 0);
                        if(i.type === 'archived' && i.paymentType !== 'credit') tS += (i.customer ? i.customer.remainingPaid || 0 : 0);
                    }
                });
                (localData.logs || []).forEach(l => { if(l.type === 'تسديد دين' && l.timestamp <= ts) tS += l.amount; });
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
    // التدخل الجراحي: حقن الدفعة مباشرة في السحابة
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref }) => {
        set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment);
    });

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
        // حالة افتراضية للعمليات الأخرى
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

window.loadInvoiceTemplateToEditor = () => {
    const editor = document.getElementById('invoice-editor-area');
    if (!editor) return;
    
    let saved = localStorage.getItem('royal_invoice_template');
    if (saved) {
        editor.innerHTML = saved;
    } else {
        // التصميم الافتراضي الأنيق الذي سيجده الآدمن جاهزاً للتعديل
        editor.innerHTML = `<div style="text-align: center;">
            <h1 style="margin-bottom: 5px;">مكوى رويال VIP</h1>
            <p style="margin-top: 0; font-size: 14px; color: #555;">لمسة ملكية تليق بك</p>
            <hr style="border: 2px solid #000; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; text-align: right; font-size: 16px; font-weight:bold;">
                <div>رقم الطلب اليومي: <span style="font-size:24px;">[رقم_الطلب]</span></div>
                <div>[اليوم] - [الوقت]</div>
            </div>
            <div style="text-align: right; font-size: 18px; margin-top: 15px;"><strong>السيد/ة:</strong> [اسم_الزبون]</div>
            [جدول_المبيعات]
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; margin-top: 15px; border-top: 1px solid #000; padding-top:10px;">
                <div>المجموع الكلي: [المجموع] د.ع</div>
                <div style="color: green;">العربون: [العربون] د.ع</div>
                <div style="color: red;">المطلوب عند الاستلام: [المتبقي] د.ع</div>
            </div>
            <hr style="border: 1px dashed #000; margin: 20px 0;">
            <p style="font-size: 14px;">العنوان: الكوفة - النجف الأشرف | هاتف: 07800000000</p>
        </div>`;
    }
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

// التدخل الجراحي: نظام الشراء والترقية الذكي مع إضافة المبلغ للصندوق
window.confirmBuySub = () => {
    const pkgId = document.getElementById('sub-package-id').value;
    const name = window.escapeHTML(document.getElementById('sub-customer-name').value.trim());
    const phone = window.escapeHTML(document.getElementById('sub-customer-phone').value.trim());
    
    if(!name) return window.showAlert('يرجى إدخال اسم الزبون لتفعيل الباقة', 'warning');
    
    const pkg = VIP_PACKAGES.find(p => p.id === pkgId);
    const realT = getRealTime();
    
    const existingSubIndex = localData.subscriptions.findIndex(s => s.customerName === name);
    let subId, actionType, payAmount, logMsg;
    
    if (existingSubIndex > -1) {
        const existingSub = localData.subscriptions[existingSubIndex];
        subId = existingSub.id;
        
        if (existingSub.packageId === pkg.id) {
            actionType = 'تجديد VIP';
            payAmount = pkg.pay;
            logMsg = `تجديد باقة ${pkg.name} للزبون ${name}`;
        } else {
            actionType = 'ترقية VIP';
            // يدفع الفرق فقط (أو يدفع الجديد إذا كان أرخص كعقوبة)
            payAmount = (pkg.pay > existingSub.paidAmount) ? (pkg.pay - existingSub.paidAmount) : pkg.pay;
            logMsg = `ترقية باقة الزبون ${name} إلى ${pkg.name} (دفع الفرق: ${payAmount})`;
        }
        
        existingSub.packageId = pkg.id;
        existingSub.packageName = pkg.name;
        existingSub.paidAmount = pkg.pay; 
        existingSub.totalValue = pkg.value; 
        existingSub.consumedAmount = 0; // تصفير العداد
        existingSub.timestamp = realT.timestamp;
        existingSub.date = realT.date;
        existingSub.time = realT.time;
    } else {
        actionType = 'اشتراك VIP';
        payAmount = pkg.pay;
        subId = 'SUB-' + realT.timestamp;
        const sub = {
            id: subId, timestamp: realT.timestamp, date: realT.date, time: realT.time,
            customerName: name, customerPhone: phone, packageId: pkg.id, packageName: pkg.name,
            paidAmount: pkg.pay, totalValue: pkg.value, consumedAmount: 0, invoices: []
        };
        if(!localData.subscriptions) localData.subscriptions = [];
        localData.subscriptions.push(sub);
        logMsg = `تفعيل الفئة ${pkg.name} للزبون ${name}`;
    }
    
    // تسجيل الأموال فوراً في المسار المالي (payments)
    const paymentId = 'PAY-' + realT.timestamp;
    const newPayment = {
        id: paymentId, timestamp: realT.timestamp, date: realT.date,
        type: actionType, amount: payAmount, details: logMsg
    };
    if(!localData.payments) localData.payments = [];
    localData.payments.push(newPayment);
    
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref, update }) => {
        set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment);
        if (existingSubIndex > -1) update(ref(window.db || database, 'royal_data/subscriptions/' + subId), localData.subscriptions[existingSubIndex]);
        else set(ref(window.db || database, 'royal_data/subscriptions/' + subId), localData.subscriptions[localData.subscriptions.length - 1]);
    });
    
    window.logAction(actionType, logMsg, payAmount, { customerName: name, pkgName: pkg.name });
    saveDataToCloud(); // يقوم بحساب الأرقام الجديدة للصندوق
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
    let sorted = [...(localData.subscriptions || [])].sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(sub => {
        if(filterText && !sub.customerName.toLowerCase().includes(filterText) && !(sub.customerPhone || '').includes(filterText)) return;
        
        let remaining = sub.totalValue - sub.consumedAmount;
        let actions = '';
        
        if(sub.consumedAmount === 0) {
            actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:#4a90e2; border-color:#4a90e2; margin-left:5px;" onclick="window.upgradeSub('${sub.id}')">تعديل (ترقية)</button>`;
        }
        actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:var(--green-success); border-color:var(--green-success); margin-left:5px;" onclick="window.renewSub('${sub.id}')">تجديد</button>`;
        actions += `<button class="top-bar-btn" style="padding:4px 8px; font-size:12px; color:var(--red-danger); border-color:var(--red-danger);" onclick="window.confirmDeleteSubWarning('${sub.id}')">حذف</button>`;
        
        tbody.innerHTML += `<tr>
            <td style="font-size:12px;">${sub.date}</td>
            <td style="font-weight:bold;">${sub.customerName}</td>
            <td style="font-size:12px;">${sub.customerPhone || '-'}</td>
            <td><span style="background:var(--dark-gray); padding:3px 6px; border-radius:4px; border:1px solid var(--gold);">${sub.packageName}</span></td>
            <td style="color:var(--green-success); font-weight:bold;">${sub.paidAmount.toLocaleString()}</td>
            <td style="color:var(--gold); font-weight:bold; font-size:16px;">${remaining.toLocaleString()}</td>
            <td>${actions}</td>
        </tr>`;
    });
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
        
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref, update }) => {
            set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment);
            update(ref(window.db || database, 'royal_data/subscriptions/' + subId), sub);
        });
        
        window.logAction('تجديد VIP', newPayment.details, sub.paidAmount, sub);
        saveDataToCloud(); window.renderCashierSubs(); window.showAlert('تم التجديد!', 'success');
    });
};

// زر التعديل (يفتح نافذة الباقات لعملية الترقية التي صممناها)
window.upgradeSub = (subId) => {
    const sub = localData.subscriptions.find(s => s.id === subId);
    if(!sub) return;
    document.getElementById('sub-customer-name').value = sub.customerName;
    document.getElementById('sub-customer-phone').value = sub.customerPhone || '';
    window.closeModals();
    window.showAlert('انقر على الفئة الجديدة التي يريد الترقية إليها لسحب الفرق المالي.', 'success');
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

// الحذف مع استرجاع المبالغ
window.executeSubDelete = () => {
    const subId = document.getElementById('delete-sub-id').value;
    const subIndex = localData.subscriptions.findIndex(s => s.id === subId);
    if(subIndex === -1) return;
    const sub = localData.subscriptions[subIndex];
    
    let refundable = sub.paidAmount - sub.consumedAmount;
    if(refundable < 0) refundable = 0;
    
    const realT = getRealTime();
    if(refundable > 0) {
        const paymentId = 'PAY-' + realT.timestamp;
        const newPayment = { id: paymentId, timestamp: realT.timestamp, date: realT.date, type: 'إلغاء اشتراك VIP', amount: refundable, details: `إرجاع مبلغ اشتراك ${sub.customerName}` };
        if(!localData.payments) localData.payments = []; localData.payments.push(newPayment);
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ set, ref }) => set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment));
    }
    
    window.logAction('إلغاء اشتراك VIP', `حذف اشتراك ${sub.customerName} (المبلغ المُرجع: ${refundable})`, refundable, sub);
    localData.subscriptions.splice(subIndex, 1);
    
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ remove, ref }) => remove(ref(window.db || database, 'royal_data/subscriptions/' + subId)));
    
    saveDataToCloud(); document.getElementById('modal-delete-sub-warning').style.display = 'none'; window.openCashierSubs();
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

    // تسجيل الدفعة النقدية (إن وجدت) فوراً
    const realT = getRealTime();
    let paymentId = null, newPayment = null;
    if(cashAmount > 0) {
        paymentId = 'PAY-' + realT.timestamp;
        newPayment = {
            id: paymentId, timestamp: realT.timestamp, date: realT.date,
            type: 'دفع مختلط (VIP + كاش)', amount: cashAmount, details: `متبقي فاتورة ${inv.dailyNumber||inv.id} للزبون ${sub.customerName}`
        };
        if(!localData.payments) localData.payments = [];
        localData.payments.push(newPayment);
    }
    
    // حفظ كل شيء في السحابة معاً
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js").then(({ update, ref, set }) => {
        update(ref(window.db || database, 'royal_data/invoices/' + inv.id), {
            type: inv.type, paymentType: inv.paymentType, customer: inv.customer, notes: inv.notes
        });
        update(ref(window.db || database, 'royal_data/subscriptions/' + subId), sub);
        if(paymentId && newPayment) {
            set(ref(window.db || database, 'royal_data/payments/' + paymentId), newPayment);
        }
    });
    
    window.logAction('تسليم طلب (VIP)', `خصم ${deductAmount} من باقة ${sub.customerName}` + (cashAmount > 0 ? ` ودفع ${cashAmount} كاش` : ''), cashAmount, inv);
    saveDataToCloud(); // يحدث الواجهة وصندوق المبيعات فوراً
    
    document.getElementById('modal-pay-via-sub').style.display = 'none';
    window.openActiveOrders();
    window.printInvoice(inv); 
    window.showAlert('تم الخصم من الباقة وطباعة الفاتورة بنجاح!', 'success');
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

window.filterLogs = () => window.renderLogs();
