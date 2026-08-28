// استيراد مكتبات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// المتغيرات العامة
let localData = {
    catalog: [], invoices: [], expenses: [], operatingCosts: [], debts: [],
    dailySalesCash: 0, dailySalesElectronic: 0, lastDate: new Date().toDateString()
};
let currentCart = [];
let editingInvoiceId = null; 
let pendingItem = null;

const availableIcons = [
    'fa-shirt', 'fa-user-tie', 'fa-person-dress', 'fa-user-nurse', 'fa-person-military-rifle',
    'fa-user-secret', 'fa-user-doctor', 'fa-person', 'fa-socks', 'fa-mitten', 
    'fa-hat-cowboy', 'fa-graduation-cap', 'fa-baby-carriage', 'fa-bed', 'fa-rug',
    'fa-mattress-pillow', 'fa-towel', 'fa-bag-shopping', 'fa-shoe-prints'
];

// دالة جلب البيانات من السحابة عند تشغيل النظام
async function initializeDB() {
    try {
        const snapshot = await get(child(dbRef, `royal_data`));
        if (snapshot.exists()) {
            localData = snapshot.val();
            
            // 🔴 الحل السحري لإصلاح تلف المصفوفات القادم من فايربيس
            localData.invoices = Object.values(localData.invoices || {});
            localData.catalog = Object.values(localData.catalog || {});
            localData.expenses = Object.values(localData.expenses || {});
            localData.operatingCosts = Object.values(localData.operatingCosts || {});
            localData.debts = Object.values(localData.debts || {});

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
            localData.invoices = []; localData.expenses = []; localData.operatingCosts = []; localData.debts = [];
            saveDataToCloud();
        }
        
        document.getElementById('loading-screen').style.display = 'none';
        renderItems();
        updateUI();

        if(localStorage.getItem('cart_draft')) {
            currentCart = JSON.parse(localStorage.getItem('cart_draft'));
            renderCart();
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

// ---------------- الأزرار العامة ----------------
window.showPOS = () => { document.getElementById('main-screen').style.display = 'none'; document.getElementById('pos-screen').classList.add('active-screen'); };
window.exitToMain = () => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen')); document.getElementById('main-screen').style.display = 'flex'; };
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
    if(document.getElementById('admin-password').value === 'ahmed2003') {
        window.closeModals();
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('admin-screen').classList.add('active-screen');
        document.getElementById('admin-password').value = '';
        window.updateAdminDashboard();
    } else { alert('رمز الدخول خاطئ!'); }
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

// 🔴 السحر: اعتراض جميع رسائل المتصفح (alert) وتحويلها للنافذة الذكية تلقائياً
window.alert = (msg) => {
    let type = 'warning';
    // تحديد نوع الرسالة من خلال الكلمات المفتاحية
    if(msg.includes('بنجاح') || msg.includes('تم')) type = 'success';
    else if(msg.includes('خاطئ') || msg.includes('خطأ') || msg.includes('فارغة') || msg.includes('فشل') || msg.includes('غير صحيح')) type = 'error';
    
    window.showAlert(msg, type);
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

    saveDataToCloud();
    editingInvoiceId = null; currentCart = []; document.getElementById('cart-notes').value = '';
    localStorage.removeItem('cart_draft'); renderCart();

    document.getElementById('btn-save-edit').style.display = 'none';
    document.querySelector('.btn-cash').style.display = 'flex';
    document.querySelector('.btn-electronic').style.display = 'flex';
    document.querySelector('.btn-credit').style.display = 'flex';
    alert('تم حفظ تعديلات الفاتورة بنجاح!');
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
    saveDataToCloud();
    window.closeModals();
    document.getElementById('expense-detail').value = ''; 
    document.getElementById('expense-amount').value = '';
    alert('تم خصم المصروف من الصندوق بنجاح!');
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

        localData.expenses.splice(index, 1);
        saveDataToCloud();
        window.openPreviousExpenses(); 
        alert('تم حذف المصروف بنجاح!'); 
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
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-${tab}`).classList.add('active');
    event.target.classList.add('active');
    window.updateAdminDashboard();
};

window.updateAdminDashboard = () => {
    let totalSalesCash = 0; let totalSalesElectronic = 0;
    (localData.invoices || []).forEach(i => {
        if(i.type === 'cash') totalSalesCash += i.total;
        else if (i.type === 'electronic') totalSalesElectronic += i.total;
        else if (i.type === 'credit' && i.customer) totalSalesCash += i.customer.paid;
    });

    let totalExpenses = (localData.expenses || []).reduce((sum, e) => sum + e.amount, 0);
    let totalCosts = (localData.operatingCosts || []).reduce((sum, c) => sum + c.amount, 0);
    let netProfit = (totalSalesCash + totalSalesElectronic) - totalExpenses - totalCosts;

    document.getElementById('admin-month-sales-cash').innerText = totalSalesCash.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-sales-electronic').innerText = totalSalesElectronic.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-expenses').innerText = totalExpenses.toLocaleString() + ' د.ع';
    document.getElementById('admin-month-costs').innerText = totalCosts.toLocaleString() + ' د.ع';
    document.getElementById('admin-net-profit').innerText = netProfit.toLocaleString() + ' د.ع';

    const costsTbody = document.getElementById('costs-table-body');
    costsTbody.innerHTML = '';
    (localData.operatingCosts || []).forEach(c => { costsTbody.innerHTML += `<tr><td>${c.date}</td><td>${c.name}</td><td>${c.amount.toLocaleString()}</td></tr>`; });

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

window.addOperatingCost = () => {
    const name = document.getElementById('cost-name').value;
    const amount = parseFloat(document.getElementById('cost-amount').value);
    if(!name || isNaN(amount)) return alert('الرجاء الإدخال بشكل صحيح');
    localData.operatingCosts.push({ date: new Date().toLocaleDateString(), name, amount });
    saveDataToCloud();
    document.getElementById('cost-name').value = ''; document.getElementById('cost-amount').value = '';
};

window.payDebt = (index) => {
    let debt = localData.debts[index];
    let pay = prompt(`المبلغ المتبقي على ${debt.name} هو ${debt.remaining.toLocaleString()}. أدخل مبلغ التسديد (نقدي):`);
    if(pay) {
        pay = parseFloat(pay);
        if(pay > 0 && pay <= debt.remaining) {
            debt.remaining -= pay; debt.paid += pay; localData.dailySalesCash += pay; 
            if(debt.remaining === 0) alert('تم تسديد الدين بالكامل!');
            saveDataToCloud();
        } else { alert('مبلغ غير صحيح'); }
    }
};

window.onload = initializeDB;
