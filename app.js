// ==================== تهيئة Firebase ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, push, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const db = getDatabase(app);

// ==================== المتغيرات العامة ====================
let currentCart = [];
let currentServiceChoice = null;
let currentInvoiceView = null;
let services = [];
let settings = {};
let dailyExpenses = [];
let operationalExpenses = [];
let allInvoices = [];
let selectedIcon = '👔';
let adminPassword = 'ahmed2003';

// ==================== الأيقونات المتاحة ====================
const iconLibrary = [
    '👔', '👕', '👖', '👗', '👘', '🕌', '🧥', '🧵', '🧶', '🧣',
    '🧤', '🧦', '👚', '🩳', '🩲', '🩱', '🩰', '👟', '👞', '👠',
    '👡', '👢', '🎽', '🏃', '🏋️', '🤵', '👰', '🤶', '🎅', '🧙',
    '🧝', '🧛', '🧟', '🦸', '🦹', '🧑', '👨', '👩', '👴', '👵',
    '👶', '🛏️', '🛋️', '🪑', '🛌', '🪟', '🚪', '🧻', '🧺', '🪣'
];

// ==================== التخزين المحلي (طبقة الحماية) ====================
function saveToLocal(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('خطأ في الحفظ المحلي:', e);
    }
}

function getFromLocal(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('خطأ في القراءة المحلية:', e);
        return null;
    }
}

// ==================== مزامنة Firebase ====================
function syncToFirebase(path, data) {
    set(ref(db, path), data).catch(err => console.error('خطأ في المزامنة:', err));
}

function syncCartToLocal() {
    saveToLocal('roylairon_cart', currentCart);
}

function loadCartFromLocal() {
    const saved = getFromLocal('roylairon_cart');
    if (saved && Array.isArray(saved)) {
        currentCart = saved;
        renderCart();
    }
}

// ==================== التنقل بين الشاشات ====================
function backToMain() {
    document.querySelectorAll('.pos-screen, .admin-screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('mainScreen').classList.remove('hidden');
}

function openPOS() {
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('posScreen').classList.remove('hidden');
    loadCartFromLocal();
    loadServices();
    loadDailySales();
}

function openAdminLogin() {
    document.getElementById('adminLoginModal').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
    setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}

function closeAdminLogin() {
    document.getElementById('adminLoginModal').classList.add('hidden');
}

function verifyAdmin() {
    const pass = document.getElementById('adminPassword').value;
    if (pass === adminPassword) {
        closeAdminLogin();
        openAdminScreen();
    } else {
        alert('رمز الدخول غير صحيح!');
        document.getElementById('adminPassword').value = '';
    }
}

function openAdminScreen() {
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('adminScreen').classList.remove('hidden');
    loadAdminData();
}

// ==================== إدارة المودالات ====================
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openExpensesModal() {
    document.getElementById('expensesModal').classList.remove('hidden');
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
}

function openAddServiceModal() {
    document.getElementById('addServiceModal').classList.remove('hidden');
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceWashPrice').value = '';
    document.getElementById('serviceIronPrice').value = '';
    renderIconPicker();
}

function openHistoryModal() {
    document.getElementById('historyModal').classList.remove('hidden');
    loadInvoices();
}

// ==================== إدارة الخدمات ====================
function renderIconPicker() {
    const grid = document.getElementById('iconGrid');
    grid.innerHTML = '';
    iconLibrary.forEach(icon => {
        const div = document.createElement('div');
        div.className = 'icon-option' + (icon === selectedIcon ? ' selected' : '');
        div.textContent = icon;
        div.onclick = () => {
            selectedIcon = icon;
            renderIconPicker();
        };
        grid.appendChild(div);
    });
}

function loadServices() {
    // محاولة التحميل من المحلي أولاً
    const localServices = getFromLocal('roylairon_services');
    if (localServices && localServices.length > 0) {
        services = localServices;
        renderServices();
    }
    
    // المزامنة مع Firebase
    onValue(ref(db, 'services'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            services = data;
            saveToLocal('roylairon_services', services);
            renderServices();
        }
    });
}

function renderServices() {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = '';
    services.forEach((service, index) => {
        const cell = document.createElement('div');
        cell.className = 'service-cell';
        cell.innerHTML = `
            <span class="service-icon">${service.icon || '👔'}</span>
            <div class="service-name">${service.name}</div>
            <div class="service-prices">
                <div class="wash-price">غسل وكوي: ${service.washPrice} د.ع</div>
                <div class="iron-price">كوي فقط: ${service.ironPrice} د.ع</div>
            </div>
        `;
        cell.onclick = () => showServiceChoice(service);
        cell.style.animationDelay = `${index * 0.05}s`;
        grid.appendChild(cell);
    });
}

function showServiceChoice(service) {
    currentServiceChoice = service;
    document.getElementById('serviceChoiceName').textContent = service.name;
    document.getElementById('serviceChoiceModal').classList.remove('hidden');
}

function addToCartWithService(serviceType) {
    if (!currentServiceChoice) return;
    
    const service = currentServiceChoice;
    const price = serviceType === 'wash' ? service.washPrice : service.ironPrice;
    
    // البحث عن نفس العنصر في القائمة
    const existingIndex = currentCart.findIndex(item => 
        item.serviceId === service.id && item.serviceType === serviceType
    );
    
    if (existingIndex > -1) {
        currentCart[existingIndex].quantity += 1;
        currentCart[existingIndex].total = currentCart[existingIndex].quantity * price;
    } else {
        currentCart.push({
            id: Date.now(),
            serviceId: service.id,
            serviceName: service.name,
            serviceIcon: service.icon || '👔',
            serviceType: serviceType,
            serviceTypeLabel: serviceType === 'wash' ? 'غسل وكوي' : 'كوي فقط',
            quantity: 1,
            price: price,
            total: price
        });
    }
    
    closeModal('serviceChoiceModal');
    currentServiceChoice = null;
    syncCartToLocal();
    renderCart();
    animateCartAdd();
}

function animateCartAdd() {
    // تأثير بصري عند الإضافة
    const cartSection = document.querySelector('.cart-section');
    cartSection.style.animation = 'none';
    setTimeout(() => {
        cartSection.style.animation = 'pulse-cart 0.5s ease';
    }, 10);
}

function addService() {
    const name = document.getElementById('serviceName').value.trim();
    const washPrice = parseFloat(document.getElementById('serviceWashPrice').value);
    const ironPrice = parseFloat(document.getElementById('serviceIronPrice').value);
    
    if (!name || !washPrice || !ironPrice) {
        alert('يرجى ملء جميع الحقول');
        return;
    }
    
    const newService = {
        id: Date.now().toString(),
        name: name,
        icon: selectedIcon,
        washPrice: washPrice,
        ironPrice: ironPrice,
        createdAt: new Date().toISOString()
    };
    
    services.push(newService);
    saveToLocal('roylairon_services', services);
    syncToFirebase('services', services);
    renderServices();
    closeModal('addServiceModal');
}

// ==================== إدارة القائمة ====================
function renderCart() {
    const tbody = document.getElementById('cartItems');
    tbody.innerHTML = '';
    let total = 0;
    
    currentCart.forEach((item, index) => {
        total += item.total;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.serviceIcon} ${item.serviceName}</td>
            <td>
                <button onclick="changeQuantity(${index}, -1)" class="qty-btn">-</button>
                ${item.quantity}
                <button onclick="changeQuantity(${index}, 1)" class="qty-btn">+</button>
            </td>
            <td><span class="service-badge ${item.serviceType}">${item.serviceTypeLabel}</span></td>
            <td>${item.price}</td>
            <td>${item.total}</td>
            <td><button class="delete-btn" onclick="removeFromCart(${index})">🗑️</button></td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('totalAmount').textContent = total;
    document.getElementById('cartCount').textContent = `${currentCart.length} قطعة`;
}

function changeQuantity(index, delta) {
    if (currentCart[index]) {
        currentCart[index].quantity += delta;
        if (currentCart[index].quantity <= 0) {
            currentCart.splice(index, 1);
        } else {
            currentCart[index].total = currentCart[index].quantity * currentCart[index].price;
        }
        syncCartToLocal();
        renderCart();
    }
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    syncCartToLocal();
    renderCart();
}

// ==================== إتمام البيع ====================
function completeSale(paymentType) {
    if (currentCart.length === 0) {
        alert('القائمة فارغة!');
        return;
    }
    
    const total = currentCart.reduce((sum, item) => sum + item.total, 0);
    const note = document.getElementById('cartNote').value.trim();
    const now = new Date();
    
    // توليد رقم فاتورة من 5 أرقام
    const invoiceNumber = generateInvoiceNumber();
    
    const invoice = {
        id: invoiceNumber,
        number: invoiceNumber,
        date: now.toLocaleDateString('ar-IQ'),
        time: now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: now.toISOString(),
        type: 'sale',
        paymentType: paymentType,
        items: JSON.parse(JSON.stringify(currentCart)),
        total: total,
        note: note,
        shopInfo: settings
    };
    
    // حفظ الفاتورة
    allInvoices.push(invoice);
    saveToLocal('roylairon_invoices', allInvoices);
    syncToFirebase(`invoices/${invoiceNumber}`, invoice);
    
    // تحديث المبيعات اليومية
    updateDailySales(total);
    
    // طباعة الفاتورة
    printInvoice(invoice);
    
    // مسح القائمة
    currentCart = [];
    syncCartToLocal();
    document.getElementById('cartNote').value = '';
    renderCart();
    
    // إظهار رسالة نجاح
    showSuccessMessage(`تم البيع بنجاح! رقم الفاتورة: ${invoiceNumber}`);
}

function generateInvoiceNumber() {
    let number;
    do {
        number = Math.floor(10000 + Math.random() * 90000).toString();
    } while (allInvoices.some(inv => inv.number === number));
    return number;
}

function updateDailySales(amount) {
    const today = new Date().toLocaleDateString('ar-IQ');
    let dailyData = getFromLocal('roylairon_daily_sales') || {};
    
    if (!dailyData[today]) {
        dailyData[today] = { total: 0, cash: 0, electronic: 0, expenses: 0 };
    }
    
    dailyData[today].total += amount;
    
    saveToLocal('roylairon_daily_sales', dailyData);
    syncToFirebase('daily_sales', dailyData);
    
    loadDailySales();
}

function loadDailySales() {
    const today = new Date().toLocaleDateString('ar-IQ');
    const dailyData = getFromLocal('roylairon_daily_sales') || {};
    
    let total = 0;
    let expenses = 0;
    
    if (dailyData[today]) {
        total = dailyData[today].total || 0;
        expenses = dailyData[today].expenses || 0;
    }
    
    const netTotal = total - expenses;
    const displayEl = document.getElementById('dailySales');
    displayEl.textContent = netTotal;
    
    // تأثير حركي
    displayEl.classList.remove('changed');
    void displayEl.offsetWidth;
    displayEl.classList.add('changed');
}

function showSuccessMessage(message) {
    // إظهار رسالة نجاح أنيقة
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2E7D32, #4CAF50);
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        font-size: 1.1rem;
        font-weight: 700;
        z-index: 2000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== الصرفيات ====================
function saveExpense() {
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const note = document.getElementById('expenseNote').value.trim();
    
    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
    }
    
    const now = new Date();
    const expense = {
        id: Date.now().toString(),
        amount: amount,
        note: note,
        date: now.toLocaleDateString('ar-IQ'),
        time: now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString()
    };
    
    dailyExpenses.push(expense);
    saveToLocal('roylairon_daily_expenses', dailyExpenses);
    syncToFirebase('daily_expenses', dailyExpenses);
    
    // تحديث المبيعات اليومية بخصم الصرفيات
    const today = new Date().toLocaleDateString('ar-IQ');
    let dailyData = getFromLocal('roylairon_daily_sales') || {};
    if (!dailyData[today]) {
        dailyData[today] = { total: 0, cash: 0, electronic: 0, expenses: 0 };
    }
    dailyData[today].expenses += amount;
    saveToLocal('roylairon_daily_sales', dailyData);
    syncToFirebase('daily_sales', dailyData);
    
    closeModal('expensesModal');
    loadDailySales();
    showSuccessMessage('تم تسجيل الصرف بنجاح');
}

// ==================== الفواتير السابقة ====================
function loadInvoices() {
    const localInvoices = getFromLocal('roylairon_invoices') || [];
    
    onValue(ref(db, 'invoices'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allInvoices = Object.values(data);
        } else {
            allInvoices = localInvoices;
        }
        renderInvoiceList(allInvoices);
    });
}

function renderInvoiceList(invoices) {
    const list = document.getElementById('invoiceList');
    list.innerHTML = '';
    
    // ترتيب تنازلي حسب التاريخ
    const sorted = [...invoices].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sorted.forEach(invoice => {
        const item = document.createElement('div');
        item.className = 'invoice-item';
        item.innerHTML = `
            <span class="invoice-num">#${invoice.number}</span>
            <span class="invoice-date">${invoice.date} - ${invoice.time}</span>
            <span class="invoice-total">${invoice.total} د.ع</span>
            <span class="invoice-type">${invoice.paymentType === 'cash' ? '💰' : '💳'}</span>
        `;
        item.onclick = () => viewInvoice(invoice);
        list.appendChild(item);
    });
}

function viewInvoice(invoice) {
    currentInvoiceView = invoice;
    const details = document.getElementById('invoiceDetails');
    details.innerHTML = `
        <div class="invoice-view-content">
            <h3>فاتورة رقم: ${invoice.number}</h3>
            <p>التاريخ: ${invoice.date}</p>
            <p>الوقت: ${invoice.time}</p>
            <p>نوع الدفع: ${invoice.paymentType === 'cash' ? 'كاش' : 'إلكتروني'}</p>
            <hr>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>القطعة</th>
                        <th>العدد</th>
                        <th>الخدمة</th>
                        <th>السعر</th>
                        <th>المجموع</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td>${item.serviceIcon} ${item.serviceName}</td>
                            <td>${item.quantity}</td>
                            <td>${item.serviceTypeLabel}</td>
                            <td>${item.price}</td>
                            <td>${item.total}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${invoice.note ? `<p class="invoice-note">📝 ملاحظة: ${invoice.note}</p>` : ''}
            <div class="total-display">
                <span>المجموع الكلي:</span>
                <span class="total-number">${invoice.total} د.ع</span>
            </div>
        </div>
    `;
    document.getElementById('viewInvoiceModal').classList.remove('hidden');
}

function printInvoiceFromView() {
    if (currentInvoiceView) {
        printInvoice(currentInvoiceView);
    }
}

// ==================== الطباعة ====================
function printInvoice(invoice) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const itemsHtml = invoice.items.map(item => `
        <div class="print-item">
            <span>${item.serviceName}</span>
            <span>${item.quantity} × ${item.price}</span>
            <span>${item.total}</span>
        </div>
        <div class="print-item-detail">
            <small>${item.serviceTypeLabel}</small>
        </div>
    `).join('');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>فاتورة ${invoice.number}</title>
            <style>
                @page {
                    margin: 0;
                    size: 80mm auto;
                }
                body {
                    font-family: 'Cairo', sans-serif;
                    width: 80mm;
                    margin: 0;
                    padding: 10px;
                    font-size: 12px;
                    color: #000;
                }
                .print-header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .print-logo {
                    font-size: 24px;
                    text-align: center;
                }
                .print-title {
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                }
                .print-info {
                    text-align: center;
                    font-size: 11px;
                    margin: 5px 0;
                }
                .print-items {
                    margin: 10px 0;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                }
                .print-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 3px 0;
                }
                .print-item-detail {
                    font-size: 10px;
                    color: #555;
                    padding-right: 10px;
                }
                .print-total {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .print-footer {
                    text-align: center;
                    font-size: 10px;
                    margin-top: 20px;
                    border-top: 2px dashed #000;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="print-logo">👑</div>
                <div class="print-title">${settings.shopName || 'رويال آيرون'}</div>
            </div>
            <div class="print-info">
                <div>فاتورة رقم: ${invoice.number}</div>
                <div>التاريخ: ${invoice.date}</div>
                <div>الوقت: ${invoice.time}</div>
                <div>نوع الدفع: ${invoice.paymentType === 'cash' ? 'كاش 💰' : 'إلكتروني 💳'}</div>
            </div>
            <div class="print-items">
                ${itemsHtml}
            </div>
            ${invoice.note ? `<div class="print-info">📝 ملاحظة: ${invoice.note}</div>` : ''}
            <div class="print-total">
                المجموع الكلي: ${invoice.total} د.ع
            </div>
            <div class="print-footer">
                ${settings.shopAddress || ''}<br>
                ${settings.shopPhone || ''}<br>
                ${settings.shopInstagram ? `انستغرام: ${settings.shopInstagram}<br>` : ''}
                ${settings.shopTikTok ? `تيك توك: ${settings.shopTikTok}` : ''}
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ==================== بيانات الأدمن ====================
function loadAdminData() {
    loadAdminStats();
    loadAdminSales();
    loadAdminExpenses();
    loadAdminServices();
    loadSettings();
}

function loadAdminStats() {
    const dailyData = getFromLocal('roylairon_daily_sales') || {};
    const today = new Date().toLocaleDateString('ar-IQ');
    const currentMonth = new Date().toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });
    
    let todayTotal = dailyData[today]?.total || 0;
    let monthTotal = 0;
    
    Object.keys(dailyData).forEach(date => {
        if (date.includes(new Date().getFullYear()) || true) {
            monthTotal += dailyData[date].total || 0;
        }
    });
    
    const opExpenses = getFromLocal('roylairon_operational_expenses') || [];
    const totalOpExpenses = opExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    document.getElementById('adminTodaySales').textContent = todayTotal;
    document.getElementById('adminMonthSales').textContent = monthTotal;
    document.getElementById('adminExpenses').textContent = totalOpExpenses;
    document.getElementById('adminNetProfit').textContent = monthTotal - totalOpExpenses;
}

function loadAdminSales() {
    const invoices = getFromLocal('roylairon_invoices') || [];
    const tbody = document.getElementById('adminSalesTable');
    tbody.innerHTML = '';
    
    const sorted = [...invoices].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sorted.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${invoice.number}</td>
            <td>${invoice.date}</td>
            <td>${invoice.time}</td>
            <td>${invoice.paymentType === 'cash' ? 'كاش' : 'إلكتروني'}</td>
            <td>${invoice.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td>${invoice.total}</td>
            <td>${invoice.paymentType === 'cash' ? '💰' : '💳'}</td>
            <td><button class="delete-btn" onclick="viewInvoiceFromAdmin('${invoice.number}')">👁️</button></td>
        `;
        tbody.appendChild(row);
    });
}

function viewInvoiceFromAdmin(number) {
    const invoice = allInvoices.find(inv => inv.number === number);
    if (invoice) {
        viewInvoice(invoice);
    }
}

function loadAdminExpenses() {
    const opExpenses = getFromLocal('roylairon_operational_expenses') || [];
    const dailyExp = getFromLocal('roylairon_daily_expenses') || [];
    
    const opList = document.getElementById('operationalExpensesList');
    opList.innerHTML = '';
    opExpenses.forEach(exp => {
        const div = document.createElement('div');
        div.className = 'invoice-item';
        div.innerHTML = `
            <span>${exp.name}</span>
            <span>${exp.amount} د.ع</span>
            <span>${exp.date || ''}</span>
        `;
        opList.appendChild(div);
    });
    
    const dailyList = document.getElementById('dailyExpensesList');
    dailyList.innerHTML = '';
    dailyExp.forEach(exp => {
        const div = document.createElement('div');
        div.className = 'invoice-item';
        div.innerHTML = `
            <span>${exp.note || 'صرف'}</span>
            <span>${exp.amount} د.ع</span>
            <span>${exp.date} ${exp.time}</span>
        `;
        dailyList.appendChild(div);
    });
}

function loadAdminServices() {
    const list = document.getElementById('adminServicesList');
    list.innerHTML = '';
    services.forEach(service => {
        const div = document.createElement('div');
        div.className = 'invoice-item';
        div.innerHTML = `
            <span>${service.icon} ${service.name}</span>
            <span>غسل: ${service.washPrice} د.ع</span>
            <span>كوي: ${service.ironPrice} د.ع</span>
            <button class="delete-btn" onclick="deleteService('${service.id}')">🗑️</button>
        `;
        list.appendChild(div);
    });
}

function deleteService(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    
    services = services.filter(s => s.id !== id);
    saveToLocal('roylairon_services', services);
    syncToFirebase('services', services);
    renderServices();
    loadAdminServices();
}

function openAddOperationalExpense() {
    document.getElementById('operationalExpenseModal').classList.remove('hidden');
    document.getElementById('opExpenseName').value = '';
    document.getElementById('opExpenseAmount').value = '';
}

function saveOperationalExpense() {
    const name = document.getElementById('opExpenseName').value.trim();
    const amount = parseFloat(document.getElementById('opExpenseAmount').value);
    
    if (!name || !amount) {
        alert('يرجى ملء جميع الحقول');
        return;
    }
    
    const expense = {
        id: Date.now().toString(),
        name: name,
        amount: amount,
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().toISOString()
    };
    
    const opExpenses = getFromLocal('roylairon_operational_expenses') || [];
    opExpenses.push(expense);
    saveToLocal('roylairon_operational_expenses', opExpenses);
    syncToFirebase('operational_expenses', opExpenses);
    
    closeModal('operationalExpenseModal');
    loadAdminExpenses();
    loadAdminStats();
    showSuccessMessage('تم حفظ المصروف التشغيلي');
}

// ==================== الإعدادات ====================
function loadSettings() {
    const localSettings = getFromLocal('roylairon_settings');
    if (localSettings) {
        settings = localSettings;
        document.getElementById('shopName').value = settings.shopName || '';
        document.getElementById('shopAddress').value = settings.shopAddress || '';
        document.getElementById('shopPhone').value = settings.shopPhone || '';
        document.getElementById('shopInstagram').value = settings.shopInstagram || '';
        document.getElementById('shopTikTok').value = settings.shopTikTok || '';
    }
}

function saveSettings() {
    settings = {
        shopName: document.getElementById('shopName').value.trim(),
        shopAddress: document.getElementById('shopAddress').value.trim(),
        shopPhone: document.getElementById('shopPhone').value.trim(),
        shopInstagram: document.getElementById('shopInstagram').value.trim(),
        shopTikTok: document.getElementById('shopTikTok').value.trim()
    };
    
    saveToLocal('roylairon_settings', settings);
    syncToFirebase('settings', settings);
    showSuccessMessage('تم حفظ الإعدادات');
}

function changeAdminPassword() {
    const newPass = document.getElementById('newAdminPass').value;
    if (newPass.length < 4) {
        alert('الرمز يجب أن يكون 4 أحرف على الأقل');
        return;
    }
    
    adminPassword = newPass;
    saveToLocal('roylairon_admin_pass', adminPassword);
    document.getElementById('newAdminPass').value = '';
    showSuccessMessage('تم تغيير رمز الأدمن');
}

// ==================== التبويبات ====================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

// ==================== اختصارات لوحة المفاتيح ====================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!document.getElementById('posScreen').classList.contains('hidden')) {
            completeSale('cash');
        }
    }
});

// ==================== التهيئة الأولية ====================
function initializeAppData() {
    // تحميل رمز الأدمن المحفوظ
    const savedPass = getFromLocal('roylairon_admin_pass');
    if (savedPass) {
        adminPassword = savedPass;
    }
    
    // تحميل الإعدادات
    const localSettings = getFromLocal('roylairon_settings');
    if (localSettings) {
        settings = localSettings;
    }
    
    // تحميل الخدمات الافتراضية إذا لم توجد
    if (!getFromLocal('roylairon_services')) {
        const defaultServices = [
            { id: 's1', name: 'قميص', icon: '👔', washPrice: 4000, ironPrice: 2000 },
            { id: 's2', name: 'بنطلون', icon: '👖', washPrice: 3000, ironPrice: 1500 },
            { id: 's3', name: 'دشداشة', icon: '🕌', washPrice: 5000, ironPrice: 2500 },
            { id: 's4', name: 'فستان', icon: '👗', washPrice: 6000, ironPrice: 3000 },
            { id: 's5', name: 'جاكيت', icon: '🧥', washPrice: 8000, ironPrice: 4000 },
            { id: 's6', name: 'تنورة', icon: '👘', washPrice: 4000, ironPrice: 2000 },
            { id: 's7', name: 'بلوزة', icon: '👚', washPrice: 3500, ironPrice: 1750 },
            { id: 's8', name: 'بدلة', icon: '🤵', washPrice: 10000, ironPrice: 5000 },
            { id: 's9', name: 'لحاف', icon: '🛏️', washPrice: 12000, ironPrice: 6000 },
            { id: 's10', name: 'ستارة', icon: '🪟', washPrice: 8000, ironPrice: 4000 },
            { id: 's11', name: 'مفرش', icon: '🛋️', washPrice: 7000, ironPrice: 3500 },
            { id: 's12', name: 'منديل', icon: '🧻', washPrice: 2000, ironPrice: 1000 }
        ];
        saveToLocal('roylairon_services', defaultServices);
        syncToFirebase('services', defaultServices);
    }
}

// ==================== بدء التشغيل ====================
initializeAppData();
loadSettings();
loadServices();

// دالة عامة للوصول من HTML
window.completeSale = completeSale;
window.saveExpense = saveExpense;
window.addService = addService;
window.openExpensesModal = openExpensesModal;
window.openAddServiceModal = openAddServiceModal;
window.openHistoryModal = openHistoryModal;
window.closeModal = closeModal;
window.showServiceChoice = showServiceChoice;
window.addToCartWithService = addToCartWithService;
window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;
window.viewInvoice = viewInvoice;
window.printInvoiceFromView = printInvoiceFromView;
window.openPOS = openPOS;
window.openAdminLogin = openAdminLogin;
window.closeAdminLogin = closeAdminLogin;
window.verifyAdmin = verifyAdmin;
window.backToMain = backToMain;
window.switchTab = switchTab;
window.openAddOperationalExpense = openAddOperationalExpense;
window.saveOperationalExpense = saveOperationalExpense;
window.saveSettings = saveSettings;
window.changeAdminPassword = changeAdminPassword;
window.deleteService = deleteService;
window.viewInvoiceFromAdmin = viewInvoiceFromAdmin;
