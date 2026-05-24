// --- CÁC BIẾN TOÀN CỤC ---
let products = [];
let users = [];
let orders = [];
let currentTable = null;
let cart = [];
let selectedSize = {};
let currentUser = null;

// --- 1. HÀM LƯU & TẢI DỮ LIỆU (LOCALSTORAGE) ---
function saveData() {
    localStorage.setItem('smarttea_products', JSON.stringify(products));
    localStorage.setItem('smarttea_users', JSON.stringify(users));
    localStorage.setItem('smarttea_orders', JSON.stringify(orders));
}

function loadData() {

    const savedProducts = localStorage.getItem('smarttea_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        products = [...DEFAULT_PRODUCTS];
    }

    const savedUsers = localStorage.getItem('smarttea_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        users = [...DEFAULT_USERS];
    }

    const savedOrders = localStorage.getItem('smarttea_orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    } else {
        orders = [];
    }
}

function resetAllData() {
    if (confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu về mặc định?")) {
        localStorage.removeItem('smarttea_products');
        localStorage.removeItem('smarttea_users');
        localStorage.removeItem('smarttea_orders');
        location.reload();
    }
}

// --- 2. KHỞI TẠO ---
window.onload = function () {

    loadData();

    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');

    if (tableId) {

        currentUser = {
            username: 'Khách',
            role: 'customer'
        };

        initApp();

        setTimeout(() => {
            selectTable(parseInt(tableId));
        }, 100);
    }
};

// --- 3. LOGIN ---
function handleLogin() {

    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (!u) {
        showToast('Vui lòng nhập tên đăng nhập!', 'error');
        return;
    }

    if (!p) {
        showToast('Vui lòng nhập mật khẩu!', 'error');
        return;
    }

    if (u.toLowerCase() === 'customer') {

        currentUser = {
            username: 'Khách',
            role: 'customer'
        };

        initApp();
        return;
    }

    const user = users.find(x => x.username === u);

    if (!user) {
        showToast('Tài khoản không tồn tại!', 'error');
        return;
    }

    if (user.password !== p) {
        showToast('Sai mật khẩu!', 'error');
        return;
    }

    currentUser = user;

    initApp();
}

function logout() {

    currentUser = null;

    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');

    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

function initApp() {

    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');

    document.getElementById('user-display-name').innerText = currentUser.username;
    document.getElementById('user-role-display').innerText = getRoleName(currentUser.role);

    document.querySelectorAll('main > section').forEach(el => {
        el.classList.add('hidden');
    });

    document.getElementById(`view-${currentUser.role}`).classList.remove('hidden');

    if (currentUser.role === 'customer') {
        renderCustomerSimGrid();
    }

    if (currentUser.role === 'waiter') {
        renderWaiterView();
    }

    if (currentUser.role === 'barista') {
        renderBaristaView();
    }

    if (currentUser.role === 'cashier') {
        renderCashierView();
    }

    if (currentUser.role === 'manager') {
        renderManagerView();
    }
}

function getRoleName(role) {

    const names = {
        manager: 'Giám đốc',
        waiter: 'Phục vụ',
        barista: 'Pha chế',
        cashier: 'Thu ngân',
        customer: 'Khách hàng'
    };

    return names[role] || role;
}

// --- 4. CUSTOMER ---
function renderCustomerSimGrid() {

    const grid = document.getElementById('table-grid-qr-sim');

    grid.innerHTML = '';

    for (let i = 1; i <= 20; i++) {

        const btn = document.createElement('div');

        btn.className = 'table-qr-card';

        btn.innerHTML = `
            <i class="fas fa-qrcode" style="font-size:2rem; color:#888; margin-bottom:10px;"></i>
            <br>
            Bàn ${i}
        `;

        btn.onclick = () => selectTable(i);

        grid.appendChild(btn);
    }
}

function selectTable(num) {

    currentTable = num;

    document.getElementById('customer-step-1').classList.add('hidden');
    document.getElementById('customer-step-2').classList.remove('hidden');
    document.getElementById('cart-btn').classList.remove('hidden');

    document.getElementById('customer-greeting').innerText = `Menu - Bàn ${num}`;

    showToast(`Đã chọn Bàn ${num}`);

    renderMenu();
}

function resetTable() {

    currentTable = null;
    cart = [];

    updateCartUI();

    document.getElementById('customer-step-1').classList.remove('hidden');
    document.getElementById('customer-step-2').classList.add('hidden');
    document.getElementById('cart-btn').classList.add('hidden');
}

function renderMenu(filter = 'all') {

    const container = document.getElementById('menu-container');

    container.innerHTML = '';

    const filtered = filter === 'all'
        ? products
        : products.filter(p => p.type === filter);

    filtered.forEach(p => {

        let imgUrl = p.img || `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/300/200`;

        const card = document.createElement('div');

        card.className = 'product-card';

        card.innerHTML = `
            <img src="${imgUrl}" class="product-img">

            <div class="product-info">

                <div class="product-title">${p.name}</div>

                <div class="size-selector">

                    <div class="size-btn active"
                        id="size-m-${p.id}"
                        onclick="selectSize(${p.id}, 'M', ${p.priceM})">
                        M: ${formatShortPrice(p.priceM)}
                    </div>

                    ${
                        p.priceL > 0
                        ?
                        `<div class="size-btn"
                            id="size-l-${p.id}"
                            onclick="selectSize(${p.id}, 'L', ${p.priceL})">
                            L: ${formatShortPrice(p.priceL)}
                        </div>`
                        :
                        ''
                    }

                </div>

                <div class="product-price"
                    id="price-display-${p.id}">
                    ${formatCurrency(p.priceM)}
                </div>

                <button class="add-btn"
                    onclick="addToCart(${p.id})">

                    <i class="fas fa-plus-circle"></i>
                    Thêm

                </button>

            </div>
        `;

        container.appendChild(card);

        selectedSize[p.id] = {
            size: 'M',
            price: p.priceM
        };
    });
}

function filterMenu(type) {
    renderMenu(type);
}

function selectSize(id, size, price) {

    selectedSize[id] = {
        size,
        price
    };

    document.getElementById(`size-m-${id}`).classList.remove('active');

    if (document.getElementById(`size-l-${id}`)) {
        document.getElementById(`size-l-${id}`).classList.remove('active');
    }

    document.getElementById(`size-${size.toLowerCase()}-${id}`).classList.add('active');

    document.getElementById(`price-display-${id}`).innerText = formatCurrency(price);
}

function addToCart(id) {

    const product = products.find(p => p.id === id);

    const selection = selectedSize[id];

    const existingItem = cart.find(i =>
        i.id === id &&
        i.size === selection.size
    );

    if (existingItem) {
        existingItem.qty++;
    } else {

        cart.push({
            id: product.id,
            name: product.name,
            size: selection.size,
            price: selection.price,
            qty: 1
        });
    }

    updateCartUI();

    showToast('Đã thêm món');
}

function updateCartUI() {

    const count = cart.reduce((sum, item) => sum + item.qty, 0);

    const total = cart.reduce((sum, item) =>
        sum + (item.price * item.qty), 0);

    document.getElementById('cart-count').innerText = count;

    document.getElementById('cart-total').innerText = formatCurrency(total);
}

function openCart() {

    const container = document.getElementById('cart-items-container');

    if (cart.length === 0) {

        container.innerHTML = '<p>Giỏ hàng trống</p>';

    } else {

        container.innerHTML = cart.map((item, index) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed #eee; padding-bottom:5px;">

                <div>
                    <b>${item.name}</b>
                    (${item.size}) x ${item.qty}
                </div>

                <div style="display:flex; gap:10px; align-items:center;">

                    <b>${formatCurrency(item.price * item.qty)}</b>

                    <button class="btn btn-danger"
                        style="padding:2px 8px;"
                        onclick="removeFromCart(${index})">

                        X

                    </button>

                </div>

            </div>
        `).join('');
    }

    const total = cart.reduce((sum, item) =>
        sum + (item.price * item.qty), 0);

    document.getElementById('modal-cart-total').innerText = formatCurrency(total);

    openModal('modal-cart');
}

function removeFromCart(index) {

    cart.splice(index, 1);

    openCart();

    updateCartUI();
}

function submitOrder() {

    if (cart.length === 0) {
        showToast('Giỏ hàng trống!', 'error');
        return;
    }

    if (!currentTable) {
        showToast('Lỗi bàn!', 'error');
        return;
    }

    const total = cart.reduce((sum, item) =>
        sum + (item.price * item.qty), 0);

    const newOrder = {
        id: 'ORD' + Date.now().toString().slice(-6),
        tableId: currentTable,
        items: [...cart],
        total: total,
        status: 'new',
        timestamp: new Date()
    };

    orders.push(newOrder);

    saveData();

    cart = [];

    updateCartUI();

    closeModal('modal-cart');

    showToast('Đặt món thành công!');
}

// --- 5. WAITER ---
function renderWaiterView() {

    const container = document.getElementById('waiter-list-current');

    const activeOrders = orders.filter(o =>
        o.status === 'new' ||
        o.status === 'ready'
    );

    if (activeOrders.length === 0) {

        container.innerHTML = `
            <p class="order-meta"
                style="display:block;text-align:center;margin-top:20px;">
                Không có đơn hàng.
            </p>
        `;

        return;
    }

    container.innerHTML = activeOrders.map(o => `

        <div class="order-item status-${o.status}">

            <div class="order-content">

                <div class="order-details">
                    <h4>Bàn ${o.tableId} - ${o.id}</h4>
                </div>

                <div class="order-meta">
                    ${new Date(o.timestamp).toLocaleTimeString('vi-VN')}
                    - ${getStatusLabel(o.status)}
                </div>

                <ul class="order-items-list">

                    ${o.items.map(i => `
                        <li>
                            <span>${i.qty}x ${i.name} (${i.size})</span>
                            <span>${formatCurrency(i.price * i.qty)}</span>
                        </li>
                    `).join('')}

                </ul>

            </div>

            <div class="order-actions">

                ${
                    o.status === 'new'
                    ?
                    `<button class="btn btn-info"
                        onclick="updateOrderStatus('${o.id}', 'confirmed')">
                        Chuyển Bar
                    </button>`
                    :
                    ''
                }

                ${
                    o.status === 'ready'
                    ?
                    `<button class="btn btn-success"
                        onclick="updateOrderStatus('${o.id}', 'served')">
                        Đã phục vụ
                    </button>`
                    :
                    ''
                }

            </div>

        </div>

    `).join('');
}

// --- 6. BARISTA ---
function renderBaristaView() {

    const container = document.getElementById('barista-list-current');

    const taskOrders = orders.filter(o =>
        o.status === 'confirmed'
    );

    if (taskOrders.length === 0) {

        container.innerHTML = `
            <p class="order-meta"
                style="display:block;text-align:center;margin-top:20px;">
                Không có đơn pha chế.
            </p>
        `;

        return;
    }

    container.innerHTML = taskOrders.map(o => `

        <div class="order-item status-making">

            <div class="order-content">

                <div class="order-details">
                    <h4>Bàn ${o.tableId}</h4>
                </div>

                <ul class="order-items-list">

                    ${o.items.map(i => `
                        <li>
                            <b>${i.qty}x ${i.name} (${i.size})</b>
                        </li>
                    `).join('')}

                </ul>

            </div>

            <div class="order-actions">

                <button class="btn btn-primary"
                    onclick="updateOrderStatus('${o.id}', 'ready')">

                    Đã Xong

                </button>

            </div>

        </div>

    `).join('');
}

// --- 7. CASHIER ---
function renderCashierView() {

    const container = document.getElementById('cashier-list-current');

    const unpaidOrders = orders.filter(o =>
        o.status === 'served' ||
        o.status === 'paid'
    );

    if (unpaidOrders.length === 0) {

        container.innerHTML = `
            <p class="order-meta"
                style="display:block;text-align:center;margin-top:20px;">
                Chưa có bill.
            </p>
        `;

        return;
    }

    container.innerHTML = unpaidOrders.map(o => `

        <div class="order-item ${o.status === 'paid' ? 'status-paid' : ''}">

            <div class="order-content">

                <div class="order-details">
                    <h4>Bàn ${o.tableId} - ${o.id}</h4>
                </div>

                <ul class="order-items-list">

                    ${o.items.map(i => `
                        <li>
                            ${i.qty}x ${i.name}
                            (${i.size})
                            - ${formatCurrency(i.price * i.qty)}
                        </li>
                    `).join('')}

                </ul>

                <div style="font-weight:bold;font-size:1.2rem;margin-top:5px;">

                    Tổng:
                    ${formatCurrency(o.total)}

                </div>

            </div>

            <div class="order-actions">

                ${
                    o.status === 'served'
                    ?
                    `<button class="btn btn-success"
                        onclick="updateOrderStatus('${o.id}', 'paid')">
                        Thanh toán
                    </button>`
                    :
                    `<span style="color:green;font-weight:bold;">
                        Đã TT
                    </span>`
                }

            </div>

        </div>

    `).join('');
}

function updateOrderStatus(orderId, newStatus) {

    const order = orders.find(o => o.id === orderId);

    if (!order) return;

    order.status = newStatus;

    saveData();

    showToast(getStatusLabel(newStatus));

    renderWaiterView();
    renderBaristaView();
    renderCashierView();

    if (currentUser.role === 'manager') {
        renderManagerView();
    }
}

function getStatusLabel(status) {

    const map = {
        new: 'Mới',
        confirmed: 'Đã xác nhận',
        ready: 'Đã xong',
        served: 'Chờ thanh toán',
        paid: 'Đã thanh toán'
    };

    return map[status] || status;
}

// --- 8. MANAGER ---
function renderManagerView() {

    const logBody = document.getElementById('all-orders-log');

    if (!logBody) return;

    logBody.innerHTML = orders.map(o => `

        <tr>

            <td>${o.id}</td>

            <td>Bàn ${o.tableId}</td>

            <td>${formatCurrency(o.total)}</td>

            <td>${getStatusLabel(o.status)}</td>

            <td>${new Date(o.timestamp).toLocaleTimeString()}</td>

        </tr>

    `).join('');
}

// --- UTILS ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function formatShortPrice(amount) {
    return (amount / 1000) + 'k';
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function showToast(msg, type = 'success') {

    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');

    toast.className = 'toast';

    toast.style.borderLeft =
        `5px solid ${
            type === 'success'
            ? 'var(--success)'
            : 'var(--danger)'
        }`;

    toast.innerText = msg;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
