// استيراد مكتبات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
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
    catalog: [], invoices: [], expenses: [], operatingCosts: [], debts: [], logs: [],
    dailySalesCash: 0, dailySalesElectronic: 0, lastDate: new Date().toDateString()
};
let currentCart = [];
let editingInvoiceId = null; 
let pendingItem = null;
// --- التدخل الجراحي: توحيد صيغة التاريخ لجميع الأجهزة لحماية الحسابات المالية ---
Date.prototype.toLocaleDateString = function() {
    const year = this.getFullYear();
    const month = String(this.getMonth() + 1).padStart(2, '0');
    const day = String(this.getDate()).padStart(2, '0');
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
        // --- حقن الأمان: تسجيل الدخول السري قبل أي اتصال بالقاعدة ---
        await signInAnonymously(auth);
        
        const snapshot = await get(child(dbRef, `royal_data`));
        if (snapshot.exists()) {
            localData = snapshot.val();
            
            // 🔴 الحل السحري لإصلاح تلف المصفوفات القادم من فايربيس
            localData.invoices = Object.values(localData.invoices || {});
            localData.catalog = Object.values(localData.catalog || {});
            localData.expenses = Object.values(localData.expenses || {});
            localData.operatingCosts = Object.values(localData.operatingCosts || {});
            localData.debts = Object.values(localData.debts || {});
            localData.logs = Object.values(localData.logs || {});
            localData.settings = localData.settings || { name: "مكوى رويال VIP", phone: "07800000000", address: "الكوفة، النجف الأشرف", password: "ahmed2003" };

            // تصفير مبيعات اليوم إذا بدأ يوم جديد
            if(localData.lastDate !== new Date().toDateString()) {
                localData.dailySalesCash = 0;
                localData.dailySalesElectronic = 0;
                localData.lastDate = new Date().toDateString();
                saveDataToCloud();
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
            localData.invoices = []; localData.expenses = []; localData.operatingCosts = []; localData.debts = []; localData.logs = [];
            localData.settings = { name: "مكوى رويال VIP", phone: "07800000000", address: "الكوفة، النجف الأشرف", password: "ahmed2003" };
            saveDataToCloud();
        }
        
        document.getElementById('loading-screen').style.display = 'none';
        renderItems();
        updateUI();

        if(localStorage.getItem('cart_draft')) {
            currentCart = JSON.parse(localStorage.getItem('cart_draft'));
            renderCart();
        }
        
        // --- استرجاع حالة الشاشة والتبويب بعد التحديث (الرفرش) ---
        const savedScreen = sessionStorage.getItem('active_screen');
        if (savedScreen === 'pos') {
            window.showPOS();
        } else if (savedScreen === 'admin') {
            document.getElementById('main-screen').style.display = 'none';
            document.getElementById('admin-screen').classList.add('active-screen');
            const savedTab = sessionStorage.getItem('admin_tab') || 'dashboard';
            window.switchAdminTab(savedTab);
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        alert("حدث خطأ في الاتصال بقاعدة البيانات. يرجى التحقق من الإنترنت.");
    }
}

function saveDataToCloud() {
    set(ref(database, 'royal_data'), localData).then(() => {
        updateUI();
    }).catch((error) => {
        alert("فشل في حفظ البيانات: " + error.message);
    });
}

// دالة المراقبة (سجل الحركات) - تسجل كل حركة تلقائياً
window.logAction = (actionType, details, amount = 0, snapshot = null) => {
    if(!localData.logs) localData.logs = [];
    localData.logs.push({
        id: 'LOG-' + Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
        type: actionType,
        details: details,
        amount: amount,
        snapshot: snapshot // الصورة الشعاعية للبيانات
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
    if(document.getElementById('admin-password').value === localData.settings.password) {
        sessionStorage.setItem('active_screen', 'admin'); // حفظ مسار الآدمن
        window.closeModals();
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('admin-screen').classList.add('active-screen');
        document.getElementById('admin-password').value = '';
        window.updateAdminDashboard();
    } else { window.showAlert('رمز الدخول خاطئ!', 'error'); }
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

// ---------------- نظام البيع ----------------
window.checkout = (type) => {
    if(currentCart.length === 0) return alert('السلة فارغة!');
    const total = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const invoice = {
        id: generateInvoiceID(), date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
        timestamp: Date.now(), type: type, items: [...currentCart], total: total,
        notes: document.getElementById('cart-notes').value, customer: null
    };
    finalizeSale(invoice);
};

// اختصار الكيبورد (Ctrl + S)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if(document.getElementById('pos-screen').classList.contains('active-screen') && !editingInvoiceId) {
            window.checkout('cash');
        }
    }
});

window.openCreditModal = () => {
    if(currentCart.length === 0) return alert('السلة فارغة!');
    document.getElementById('credit-name').value = ''; document.getElementById('credit-phone').value = ''; document.getElementById('credit-paid').value = '0';
    document.getElementById('modal-credit').style.display = 'flex';
};

window.confirmCreditSale = () => {
    const name = document.getElementById('credit-name').value;
    const phone = document.getElementById('credit-phone').value;
    const paid = parseFloat(document.getElementById('credit-paid').value) || 0;
    const total = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    if(!name || !phone) return alert('يرجى إدخال اسم الزبون ورقم الهاتف');
    
    const invoice = {
        id: generateInvoiceID(), date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(),
        timestamp: Date.now(), type: 'credit', items: [...currentCart], total: total,
        notes: document.getElementById('cart-notes').value, customer: { name, phone, paid, remaining: total - paid }
    };

    localData.debts.push({
        date: invoice.date, name: name, phone: phone, invoiceId: invoice.id, total: total, paid: paid, remaining: total - paid
    });

    finalizeSale(invoice);
    window.closeModals();
};

function finalizeSale(invoice) {
    localData.invoices.push(invoice);
    if(invoice.type === 'cash') localData.dailySalesCash += invoice.total;
    if(invoice.type === 'electronic') localData.dailySalesElectronic += invoice.total;
    if(invoice.type === 'credit' && invoice.customer) localData.dailySalesCash += invoice.customer.paid;

    window.logAction(invoice.type === 'credit' ? 'بيع آجل' : 'بيع', 'رقم الفاتورة: ' + invoice.id, invoice.total, invoice);
    saveDataToCloud();
    
    if(document.getElementById('auto-print').checked) window.printInvoice(invoice);

    currentCart = []; document.getElementById('cart-notes').value = '';
    localStorage.removeItem('cart_draft'); renderCart();
}

// ---------------- الفواتير السابقة (عرض، تعديل، حذف) ----------------
window.openPreviousInvoices = () => {
    const tbody = document.getElementById('invoices-list-body');
    tbody.innerHTML = '';
    const sorted = (localData.invoices || []).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
    sorted.forEach(inv => {
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

window.filterInvoices = (val) => {
    const rows = document.getElementById('invoices-list-body').getElementsByTagName('tr');
    for(let i=0; i<rows.length; i++) {
        if(rows[i].innerText.toLowerCase().includes(val.toLowerCase())) rows[i].style.display = '';
        else rows[i].style.display = 'none';
    }
};

window.editInvoice = (id) => {
    const invoice = localData.invoices.find(i => i.id === id);
    if(invoice) {
        // --- إصلاح: منع تعديل فواتير الآجل لتجنب تضارب سجلات الديون ---
        if(invoice.type === 'credit') return window.showAlert('عذراً، لا يمكن تعديل فواتير البيع الآجل للحفاظ على دقة السجلات المالية للديون.', 'error');
        // -----------------------------------------------------------
        currentCart = JSON.parse(JSON.stringify(invoice.items));
        document.getElementById('cart-notes').value = invoice.notes || '';
        editingInvoiceId = invoice.id;
        renderCart();
        window.closeModals();
        
        document.getElementById('btn-save-edit').style.display = 'flex';
        document.querySelector('.btn-cash').style.display = 'none';
        document.querySelector('.btn-electronic').style.display = 'none';
        document.querySelector('.btn-credit').style.display = 'none';
    }
};

window.saveEditedInvoice = () => {
    const newTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const oldIndex = localData.invoices.findIndex(i => i.id === editingInvoiceId);
    const oldInvoice = localData.invoices[oldIndex];
    
    // تعديل الدخل اليومي إذا كانت الفاتورة تابعة لليوم
    if (oldInvoice.date === new Date().toLocaleDateString()) {
        if(oldInvoice.type === 'cash') localData.dailySalesCash -= oldInvoice.total;
        if(oldInvoice.type === 'electronic') localData.dailySalesElectronic -= oldInvoice.total;
        
        if(oldInvoice.type === 'cash') localData.dailySalesCash += newTotal;
        if(oldInvoice.type === 'electronic') localData.dailySalesElectronic += newTotal;
    }

    localData.invoices[oldIndex].items = [...currentCart];
    localData.invoices[oldIndex].total = newTotal;
    localData.invoices[oldIndex].notes = document.getElementById('cart-notes').value;

    window.logAction('تعديل فاتورة', 'تعديل فاتورة رقم: ' + editingInvoiceId, newTotal, { oldInvoice: oldInvoice, newCart: currentCart });
    saveDataToCloud();
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

        if (inv.date === new Date().toLocaleDateString()) {
            if(inv.type === 'cash') localData.dailySalesCash -= inv.total;
            else if(inv.type === 'electronic') localData.dailySalesElectronic -= inv.total;
            else if(inv.type === 'credit' && inv.customer) localData.dailySalesCash -= inv.customer.paid;
        }

        // --- إصلاح: حذف الدين المرتبط بالفاتورة إذا كانت آجل ---
        if (inv.type === 'credit') {
            const debtIndex = (localData.debts || []).findIndex(d => d.invoiceId === inv.id);
            if (debtIndex > -1) {
                localData.debts.splice(debtIndex, 1);
            }
        }
        // -------------------------------------------------

        window.logAction('حذف فاتورة', 'تم حذف فاتورة رقم: ' + inv.id, inv.total, inv);
        localData.invoices.splice(index, 1);
        saveDataToCloud();
        window.openPreviousInvoices(); 
    });
};

window.viewInvoice = (id) => {
    const invoice = localData.invoices.find(i => i.id === id);
    if(!invoice) return;
    
    document.getElementById('view-inv-id').innerText = invoice.id;
    document.getElementById('view-inv-date').innerText = invoice.date + ' ' + invoice.time;
    document.getElementById('view-inv-type').innerText = invoice.type === 'cash' ? 'نقدي' : (invoice.type === 'electronic' ? 'إلكتروني' : 'آجل');
    
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
    document.getElementById('print-header-name').innerText = localData.settings.name;
    document.getElementById('print-footer-info').innerHTML = `العنوان: ${localData.settings.address}<br>هاتف: ${localData.settings.phone}<br>لمسة ملكية تليق بك`;
    document.getElementById('p-date').innerText = invoice.date; document.getElementById('p-time').innerText = invoice.time;
    document.getElementById('p-inv').innerText = invoice.id; document.getElementById('p-type').innerText = invoice.type === 'cash' ? 'نقدي' : (invoice.type === 'electronic' ? 'إلكتروني' : 'آجل');
    
    if(invoice.type === 'credit' && invoice.customer) {
        document.getElementById('p-customer-row').style.display = 'block'; document.getElementById('p-customer').innerText = invoice.customer.name;
    } else { document.getElementById('p-customer-row').style.display = 'none'; }

    const tbody = document.getElementById('p-items');
    tbody.innerHTML = '';
    invoice.items.forEach(item => { tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.serviceName}</td><td>${item.qty}</td><td>${item.price * item.qty}</td></tr>`; });
    document.getElementById('p-total').innerText = invoice.total.toLocaleString();
    
    if(invoice.notes) {
        document.getElementById('p-notes-row').style.display = 'block'; document.getElementById('p-notes').innerText = invoice.notes;
    } else { document.getElementById('p-notes-row').style.display = 'none'; }
    window.print();
};

// ---------------- الصرفيات ----------------
window.openExpensesModal = () => { document.getElementById('modal-expenses').style.display = 'flex'; };

window.saveExpense = () => {
    const detail = document.getElementById('expense-detail').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    if(!detail || isNaN(amount)) return alert('يرجى ملء الحقول');

    if(!localData.expenses) localData.expenses = [];
    localData.expenses.push({ 
        timestamp: Date.now(), // أضفنا طابع زمني لترتيبها من الأحدث للأقدم
        date: new Date().toLocaleDateString(), 
        detail: detail, 
        amount: amount 
    });
    
    localData.dailySalesCash -= amount;
    window.logAction('إضافة مصروف', detail, amount);
    saveDataToCloud();
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
        tbody.innerHTML += `
            <tr>
                <td>${exp.date}</td>
                <td>${exp.detail}</td>
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
    
    // إذا كان المصروف لليوم الحالي، نقوم بإرجاع المبلغ القديم للصندوق وخصم المبلغ الجديد
    if(oldExp.date === new Date().toLocaleDateString()) {
        localData.dailySalesCash += oldExp.amount; // إرجاع القديم
        localData.dailySalesCash -= newAmount;     // خصم الجديد
    }

    localData.expenses[editingExpenseIndex].detail = newDetail;
    localData.expenses[editingExpenseIndex].amount = newAmount;
    window.logAction('تعديل مصروف', 'تعديل من: ' + oldExp.detail, newAmount, { oldExpense: oldExp, newExpense: {detail: newDetail, amount: newAmount} });

    saveDataToCloud();
    window.openPreviousExpenses(); // العودة لقائمة الصرفيات بعد التعديل
};

window.deleteExpense = (index) => {
    window.showConfirm('هل أنت متأكد من حذف هذا المصروف نهائياً؟ سيتم إرجاع مبلغه لصندوق اليوم.', () => {
        const exp = localData.expenses[index];
        
        // التحقق من إرجاع المبلغ للصندوق
        if(exp && exp.date === new Date().toLocaleDateString()) {
            localData.dailySalesCash += exp.amount;
        }

        window.logAction('حذف مصروف', exp.detail, exp.amount, exp);
        localData.expenses.splice(index, 1);
        saveDataToCloud();
        window.openPreviousExpenses(); 
        window.showAlert('تم حذف المصروف بنجاح!', 'success'); 
    });
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
        if (progress < 1) { window.requestAnimationFrame(step); }
    };
    window.requestAnimationFrame(step);
}

// ---------------- وظائف الآدمن ----------------
window.switchAdminTab = (tab) => {
    sessionStorage.setItem('admin_tab', tab); // حفظ التبويب المحدد
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-${tab}`).classList.add('active');
    event.target.classList.add('active');
    
    if(tab === 'dashboard') window.updateAdminDashboard();
    if(tab === 'logs') window.renderLogs();
    if(tab === 'settings') {
        document.getElementById('set-name').value = localData.settings.name;
        document.getElementById('set-phone').value = localData.settings.phone;
        document.getElementById('set-address').value = localData.settings.address;
    }
};

window.updateAdminDashboard = () => {
    // جلب فلتر الشهر
    let monthInput = document.getElementById('admin-month-filter');
    if (!monthInput.value) {
        let now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const selectedMonth = monthInput.value;
    const isAllTime = selectedMonth === 'all';

    let totalSalesCash = 0; let totalSalesElectronic = 0;
    let totalExpenses = 0; let totalCosts = 0;
    let dailyReports = {}; // كائن لتجميع بيانات الأيام

    // حساب الفواتير
    (localData.invoices || []).forEach(inv => {
        // تسريع المعالجة: تجنب تكرار بناء كائن التاريخ إذا كان مسجلاً سابقاً
        let monthStr = inv.monthStr || `${new Date(inv.timestamp || Date.now()).getFullYear()}-${String(new Date(inv.timestamp || Date.now()).getMonth() + 1).padStart(2, '0')}`;
        let dayStr = invDate.toLocaleDateString();

        if (isAllTime || monthStr === selectedMonth) {
            let amount = (inv.type === 'credit' && inv.customer) ? inv.customer.paid : inv.total;
            if(inv.type === 'cash' || inv.type === 'credit') totalSalesCash += amount;
            else if (inv.type === 'electronic') totalSalesElectronic += amount;

            if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: invDate.getTime() };
            dailyReports[dayStr].sales += amount;
        }
    });

    // حساب الصرفيات
    (localData.expenses || []).forEach(exp => {
        let expDate = new Date(exp.timestamp || Date.now());
        let monthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        let dayStr = expDate.toLocaleDateString();

        if (isAllTime || monthStr === selectedMonth) {
            totalExpenses += exp.amount;
            if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: expDate.getTime() };
            dailyReports[dayStr].expenses += exp.amount;
            dailyReports[dayStr].details.push(exp.detail);
        }
    });

    // --- إصلاح: إدخال الدفعات المسددة من الديون في تقارير وملخص الآدمن ---
    (localData.logs || []).forEach(log => {
        if(log.type === 'تسديد دين') {
            let logDate = new Date(log.timestamp || Date.now());
            let monthStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
            let dayStr = logDate.toLocaleDateString();

            if (isAllTime || monthStr === selectedMonth) {
                totalSalesCash += log.amount; // إضافتها للكاش الإجمالي
                if(!dailyReports[dayStr]) dailyReports[dayStr] = { sales: 0, expenses: 0, details: [], timestamp: logDate.getTime() };
                dailyReports[dayStr].sales += log.amount; // إضافتها لمبيعات اليوم
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

    // قسم الديون
    const debtsTbody = document.getElementById('debts-table-body');
    debtsTbody.innerHTML = '';
    (localData.debts || []).forEach((d, index) => {
        debtsTbody.innerHTML += `<tr>
            <td>${d.name}</td><td>${d.invoiceId}</td>
            <td style="color:var(--red-danger); font-weight:bold;">${d.remaining.toLocaleString()}</td>
            <td><button class="top-bar-btn" onclick="window.payDebt(${index})">تسديد دفعة</button></td>
        </tr>`;
    });
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

    if (oldP !== localData.settings.password) return window.showAlert('كلمة المرور القديمة غير صحيحة!', 'error');
    if (newP.length < 4) return window.showAlert('كلمة المرور الجديدة قصيرة جداً', 'error');
    if (newP !== confP) return window.showAlert('كلمات المرور الجديدة غير متطابقة!', 'error');

    localData.settings.password = newP;
    saveDataToCloud();
    window.showAlert('تم تغيير كلمة المرور بنجاح!', 'success');
    document.getElementById('set-old-pass').value = ''; document.getElementById('set-new-pass').value = ''; document.getElementById('set-confirm-pass').value = '';
};

window.addOperatingCost = () => {
    const name = document.getElementById('cost-name').value;
    const amount = parseFloat(document.getElementById('cost-amount').value);
    if(!name || isNaN(amount)) return alert('الرجاء الإدخال بشكل صحيح');
    localData.operatingCosts.push({ date: new Date().toLocaleDateString(), name, amount });
    saveDataToCloud();
    document.getElementById('cost-name').value = ''; document.getElementById('cost-amount').value = '';
};

let currentDebtIndex = null;
window.payDebt = (index) => {
    currentDebtIndex = index;
    let debt = localData.debts[index];
    document.getElementById('debt-pay-msg').innerText = `المبلغ المتبقي على ${debt.name} هو ${debt.remaining.toLocaleString()} د.ع`;
    document.getElementById('debt-pay-amount').value = '';
    document.getElementById('modal-pay-debt').style.display = 'flex';
};

window.confirmPayDebt = () => {
    let debt = localData.debts[currentDebtIndex];
    let pay = parseFloat(document.getElementById('debt-pay-amount').value);
    
    if (pay && pay > 0 && pay <= debt.remaining) {
        debt.remaining -= pay;
        debt.paid += pay;
        // المبالغ المسددة اليوم تُضاف لصندوق مبيعات اليوم مباشرة
        localData.dailySalesCash += pay; 
        
        // --- إصلاح: تسجيل حركة تسديد الدين في سجل الحركات ---
        window.logAction('تسديد دين', 'تسديد دفعة من حساب: ' + debt.name, pay, { debtName: debt.name, amountPaid: pay, remainingNow: debt.remaining });
        // -------------------------------------------------
        
        saveDataToCloud();
        window.closeModals();
        
        if(debt.remaining === 0) window.showAlert('تم تسديد الدين بالكامل!', 'success');
        else window.showAlert('تم تسديد الدفعة بنجاح', 'success');
    } else {
        window.showAlert('مبلغ التسديد غير صحيح أو أكبر من المتبقي!', 'error');
    }
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
            // فاتورة محذوفة أو مبيوعة
            contentHTML += `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #444;">
                                <p><strong>رقم الفاتورة:</strong> <span style="color:var(--text-gray);">${snap.id || '-'}</span></p>
                                <p><strong>المبلغ الكلي:</strong> <span style="color:var(--gold);">${(snap.total || log.amount).toLocaleString()} د.ع</span></p>
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
        contentHTML += `<div style="background:rgba(74, 144, 226, 0.1); padding:15px; border-radius:8px; border:1px solid #4a90e2;">
                            <p><strong>اسم الزبون:</strong> <span style="color:var(--text-white);">${snap.debtName}</span></p>
                            <p><strong>المبلغ المسدد الآن:</strong> <span style="color:var(--green-success); font-weight:bold;">${snap.amountPaid.toLocaleString()} د.ع</span></p>
                            <p><strong>المتبقي بذمته:</strong> <span style="color:var(--red-danger); font-weight:bold;">${snap.remainingNow.toLocaleString()} د.ع</span></p>
                        </div>`;
    } else {
        // حالة افتراضية للعمليات الأخرى
        contentHTML += `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #444;">
                            <p><strong>التفاصيل:</strong> <span style="color:var(--text-gray);">${log.details}</span></p>
                            <p><strong>القيمة المرتبطة:</strong> <span style="color:var(--gold);">${log.amount.toLocaleString()} د.ع</span></p>
                        </div>`;
    }

    document.getElementById('log-deep-view-content').innerHTML = contentHTML;
    document.getElementById('modal-log-details').style.display = 'flex';
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
        
        tbody.innerHTML += `
            <tr>
                <td>${exp.date}</td>
                <td style="color:var(--gold); font-weight:bold;">${dayName}</td>
                <td>${exp.detail}</td>
                <td style="color:var(--red-danger); font-weight:bold;">${exp.amount.toLocaleString()} د.ع</td>
            </tr>
        `;
    });
    
    document.getElementById('modal-admin-expenses').style.display = 'flex';
};
// دالة عرض وتصفية سجل الحركات (Audit Log)
window.renderLogs = (filterText = '') => {
    const tbody = document.getElementById('logs-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const sorted = (localData.logs || []).sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(log => {
        if(filterText && !log.details.includes(filterText) && !log.type.includes(filterText)) return;
        
        let typeClass = 'log-type ';
        if(log.type.includes('حذف')) typeClass += 'log-delete';
        else if(log.type.includes('تعديل')) typeClass += 'log-edit';
        else typeClass += 'log-add';

        // زر العين يظهر فقط إذا كانت هناك بيانات ملتقطة (snapshot)
        let actionBtn = log.snapshot ? `<button class="top-bar-btn" style="padding: 4px 10px; font-size:12px; border-color:#4a90e2; color:#4a90e2;" onclick="window.viewLogDetails('${log.id}')" title="عرض التفاصيل"><i class="fa-solid fa-eye"></i></button>` : '-';

        tbody.innerHTML += `
            <tr>
                <td style="font-size:13px; color:var(--text-gray);">${log.date} <br> ${log.time}</td>
                <td><span class="${typeClass}">${log.type}</span></td>
                <td>${log.details}</td>
                <td style="font-weight:bold;">${log.amount.toLocaleString()} د.ع</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
};

window.filterLogs = (val) => window.renderLogs(val);
