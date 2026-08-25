import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtuPp8juKTJFSZv6Cdmtrli2NfFDKUnkw",
    authDomain: "roylairon.firebaseapp.com",
    databaseURL: "https://roylairon-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "roylairon",
    storageBucket: "roylairon.firebasestorage.app",
    messagingSenderId: "1065374551442",
    appId: "1:1065374551442:web:2b9bbdfb1144d289cb854b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// المتغيرات المحلية
let cart = [];
let pendingItem = null;
const today = new Date().toISOString().split('T')[0]; // صيغة YYYY-MM-DD

// التنقل بين الشاشات
window.switchScreen = (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById(id).classList.add('active-screen');
};
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');

// 1. جلب الخدمات من فايربيس (وإذا كانت فارغة نضيف الأساسيات)
const servicesRef = ref(db, 'services');
onValue(servicesRef, (snapshot) => {
    const data = snapshot.val();
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';
    if (data) {
        Object.keys(data).forEach(key => {
            const item = data[key];
            grid.innerHTML += `
                <div class="item-card" onclick='selectItem(${JSON.stringify(item)})'>
                    <i class="fa-solid ${item.icon}"></i>
                    <h3>${item.name}</h3>
                </div>
            `;
        });
    } else {
        // دفع عناصر افتراضية أول مرة لتسهيل العمل
        push(servicesRef, { name: 'بدلة رجالية', icon: 'fa-user-tie', wash: 8000, iron: 5000 });
        push(servicesRef, { name: 'قميص', icon: 'fa-shirt', wash: 3000, iron: 2000 });
    }
});

// 2. إضافة خدمة جديدة من قبل الكاشير
window.saveNewService = () => {
    const name = document.getElementById('new-item-name').value;
    const icon = document.getElementById('new-item-icon').value || 'fa-shirt';
    const wash = parseFloat(document.getElementById('new-wash-price').value);
    const iron = parseFloat(document.getElementById('new-iron-price').value);
    if(!name || !wash || !iron) return alert('أكمل الحقول!');
    push(ref(db, 'services'), { name, icon, wash, iron });
    closeModals();
};

// 3. اختيار القطعة للبيع
window.selectItem = (item) => {
    pendingItem = item;
    document.getElementById('st-title').innerText = item.name;
    document.getElementById('st-wash-price').innerText = item.wash + ' د.ع';
    document.getElementById('st-iron-price').innerText = item.iron + ' د.ع';
    openModal('modal-service-type');
};

window.addServiceToCart = (type) => {
    const isWash = type === 'wash_iron';
    const price = isWash ? pendingItem.wash : pendingItem.iron;
    const serviceName = isWash ? 'غسيل وكوي' : 'كوي فقط';
    
    const existing = cart.find(i => i.name === pendingItem.name && i.type === type);
    if(existing) existing.qty++;
    else cart.push({ name: pendingItem.name, type: type, serviceName, price, qty: 1 });
    
    updateCartUI();
    closeModals();
};

function updateCartUI() {
    const tbody = document.getElementById('cart-tbody');
    tbody.innerHTML = '';
    let total = 0;
    cart.forEach((c, idx) => {
        const rowTotal = c.price * c.qty;
        total += rowTotal;
        tbody.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td><span style="color:var(--gold); font-size:12px;">${c.serviceName}</span></td>
                <td>${c.price}</td>
                <td>${c.qty}</td>
                <td>${rowTotal}</td>
            </tr>
        `;
    });
    document.getElementById('cart-total').innerText = total;
}

// 4. إتمام البيع (كاش أو إلكتروني)
window.checkout = (paymentMethod) => {
    if(cart.length === 0) return;
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const invoice = {
        id: 'ROYAL-' + Date.now().toString().slice(-6),
        date: today,
        time: new Date().toLocaleTimeString(),
        method: paymentMethod, // 'cash' or 'electronic'
        items: cart,
        total: total,
        notes: document.getElementById('cart-notes').value
    };

    // حفظ الفاتورة
    push(ref(db, 'invoices'), invoice);

    // تحديث إحصائيات اليوم (مفصولة)
    const statRef = ref(db, `dailyStats/${today}/${paymentMethod}`);
    get(statRef).then(snap => {
        const current = snap.val() || 0;
        set(statRef, current + total);
    });

    // أمر الطباعة الصامت عبر Electron (إذا لم يكن يعمل كـ exe، سيتم تجاهله أو الطباعة العادية)
    if(window.electronAPI) {
        window.electronAPI.printReceipt(invoice);
    } else {
        console.log('الفاتورة طبعت برمجياً:', invoice);
        // لا نظهر window.print() هنا تجنباً للازعاج كما طلبت، سيتم الاعتماد على Electron.
    }

    cart = []; document.getElementById('cart-notes').value = ''; updateCartUI();
};

// 5. اختصار الكيبورد Ctrl + S للبيع كاش
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // منع حفظ الصفحة بالمتصفح
        checkout('cash');
    }
});

// 6. مراقبة المبيعات اليومية لشريط الكاشير والآدمن
onValue(ref(db, `dailyStats/${today}`), (snap) => {
    const data = snap.val() || { cash: 0, electronic: 0, expenses: 0 };
    const cash = data.cash || 0;
    const elec = data.electronic || 0;
    const expenses = data.expenses || 0;
    
    // واجهة الكاشير (المبيعات الكلية)
    document.getElementById('pos-daily-total').innerText = (cash + elec - expenses);
    
    // واجهة الآدمن (مفصلة)
    document.getElementById('stat-cash').innerText = cash;
    document.getElementById('stat-electronic').innerText = elec;
    document.getElementById('stat-expenses').innerText = expenses;
    document.getElementById('stat-net').innerText = (cash + elec - expenses);
});
