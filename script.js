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
    // Load Products
    const savedProducts = localStorage.getItem('smarttea_products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        // Nếu chưa có data trong trình duyệt, lấy từ file data.js
        products = [...DEFAULT_PRODUCTS]; 
    }

    // Load Users
    const savedUsers = localStorage.getItem('smarttea_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        users = [...DEFAULT_USERS];
    }

    // Load Orders
    const savedOrders = localStorage.getItem('smarttea_orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    } else {
        orders = [];
    }
}

function resetAllData() {
    if(confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu về mặc định?")) {
        localStorage.removeItem('smarttea_products');
        localStorage.removeItem('smarttea_users');
        localStorage.removeItem('smarttea_orders');
        location.reload();
    }
}

// --- 2. KHỞI TẠO (Chạy khi mở web) ---
window.onload = function() {
    loadData();

    // KIỂM TRA URL ĐỂ TỰ ĐỘNG CHỌN BÀN (CHO QR CODE)
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');

    if (tableId) {
        // Nếu có param ?table=1 -> Tự động chọn bàn 1
        // Mô phỏng khách hàng quét QR
        currentUser = { username: 'Khách', role: 'customer' };
        initApp();
        // Gọi hàm chọn bàn (sẽ được định nghĩa ở dưới, nhưng cần đảm bảo đã load xong UI)
        // Ta dùng setTimeout nhỏ để đảm bảo UI render xong
        setTimeout(() => selectTable(parseInt(tableId)), 100);
    }
    // Nếu không có param -> Để màn hình login (mặc định trong HTML)
};

// --- 3. HỆ THỐNG ĐĂNG NHẬP ---
function handleLogin() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (!u) { showToast('Vui lòng nhập tên đăng nhập!', 'error'); return; }
    if (!p) { showToast('Vui lòng nhập mật khẩu!', 'error'); return; }

    if (u.toLowerCase() === 'customer') {
        currentUser = { username: 'Khách', role: 'customer' };
        initApp();
        return;
    }

    const user = users.find(x => x.username === u);
    
    if (!user) { showToast('Tài khoản không tồn tại!', 'error'); return; }
    if (user.password !== p) { showToast('Sai mật khẩu!', 'error'); return; }

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

    document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${currentUser.role}`).classList.remove('hidden');

    if (currentUser.role === 'customer') {
        renderCustomerSimGrid(); 
    } else if (currentUser.role === 'waiter') {
        renderWaiterView();
    } else if (currentUser.role === 'barista') {
        renderBaristaView();
    } else if (currentUser.role === 'cashier') {
        renderCashierView();
    } else if (currentUser.role === 'manager') {
        renderManagerView();
    }
}

function getRoleName(role) {
    const names = { 'manager': 'Giám đốc', 'waiter': 'Phục vụ', 'barista': 'Pha chế', 'cashier': 'Thu ngân', 'customer': 'Khách hàng' };
    return names[role] || role;
}

// --- 4. LOGIC KHÁCH HÀNG ---
function renderCustomerSimGrid() {
    const grid = document.getElementById('table-grid-qr-sim');
    grid.innerHTML = '';
    for(let i=1; i<=20; i++) {
        const btn = document.createElement('div');
        btn.className = 'table-qr-card';
        btn.innerHTML = `<i class="fas fa-qrcode" style="font-size:2rem; color:#888; margin-bottom:10px;"></i><br>Bàn ${i}`;
        btn.onclick = () => selectTable(i);
        grid.appendChild(btn);
    }
}

function selectTable(num) {
    currentTable = num;
    // Ẩn màn hình chọn bàn nếu đang ở chế độ giả lập
    if(document.getElementById('customer-step-1')) {
        document.getElementById('customer-step-1').classList.add('hidden');
        document.getElementById('customer-step-2').classList.remove('hidden');
        document.getElementById('cart-btn').classList.remove('hidden');
    }
    
    const greeting = document.getElementById('customer-greeting');
    if(greeting) greeting.innerText = `Menu - Bàn ${num}`;
    
    showToast(`Đã chọn Bàn ${num}!`);
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
    if(!container) return; // Tránh lỗi nếu chưa ở view khách
    container.innerHTML = '';
    const filtered = filter === 'all' ? products : products.filter(p => p.type === filter);

    filtered.forEach(p => {
        let imgUrl = p.img || `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/300/200`;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${imgUrl}" class="product-img" alt="${p.name}">
            <div class="product-info">
                <div class="product-title" title="${p.name}">${p.name}</div>
                <div class="size-selector">
                    <div class="size-btn active" id="size-m-${p.id}" onclick="selectSize(${p.id}, 'M', ${p.priceM})">M: ${formatShortPrice(p.priceM)}</div>
                    ${p.priceL > 0 ? `<div class="size-btn" id="size-l-${p.id}" onclick="selectSize(${p.id}, 'L', ${p.priceL})">L: ${formatShortPrice(p.priceL)}</div>` : ''}
                </div>
                <div class="product-price" id="price-display-${p.id}">${formatCurrency(p.priceM)}</div>
                <button class="add-btn" onclick="addToCart(${p.id})"><i class="fas fa-plus-circle"></i> Thêm</button>
            </div>
        `;
        container.appendChild(card);
        selectedSize[p.id] = { size: 'M', price: p.priceM };
    });
}

function filterMenu(type) { renderMenu(type); }

function selectSize(id, size, price) {
    selectedSize[id] = { size, price };
    document.getElementById(`size-m-${id}`).classList.remove('active');
    document.getElementById(`size-l-${id}`).classList.remove('active');
    document.getElementById(`size-${size.toLowerCase()}-${id}`).classList.add('active');
    document.getElementById(`price-display-${id}`).innerText = formatCurrency(price);
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const selection = selectedSize[id];
    const existingItem = cart.find(i => i.id === id && i.size === selection.size);
    
    if (existingItem) existingItem.qty++;
    else cart.push({ id: product.id, name: product.name, size: selection.size, price: selection.price, qty: 1 });
    
    updateCartUI();
    showToast('Đã thêm món');
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('cart-count').innerText = count;
    document.getElementById('cart-total').innerText = formatCurrency(total);
}

function openCart() {
    const container = document.getElementById('cart-items-container');
    if(cart.length === 0) container.innerHTML = '<p>Giỏ hàng trống</p>';
    else {
        container.innerHTML = cart.map((item, index) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed #eee; padding-bottom:5px;">
                <div><b>${item.name}</b> (${item.size}) x ${item.qty}</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <b>${formatCurrency(item.price * item.qty)}</b>
                    <button class="btn btn-danger" style="padding:2px 8px;" onclick="removeFromCart(${index})">X</button>
                </div>
            </div>
        `).join('');
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('modal-cart-total').innerText = formatCurrency(total);
    openModal('modal-cart');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    openCart(); updateCartUI();
}

function submitOrder() {
    if(cart.length === 0) return showToast('Giỏ hàng trống!', 'error');
    if(!currentTable) return showToast('Lỗi bàn!', 'error');

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
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
    showToast('Đặt hàng thành công!');
}

// --- 5. LOGIC NHÂN VIÊN ---
function renderWaiterView() {
    const container = document.getElementById('waiter-orders');
    const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'ready' || o.status === 'confirmed');
    if(activeOrders.length === 0) { container.innerHTML = '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Không có đơn hàng mới.</p>'; return; }
    container.innerHTML = activeOrders.map(o => `
        <div class="order-item status-${o.status}">
            <div class="order-content">
                <div class="order-details"><h4>Bàn ${o.tableId} - ${o.id}</h4></div>
                <div class="order-meta">${new Date(o.timestamp).toLocaleTimeString('vi-VN')} - ${getStatusLabel(o.status)}</div>
                <ul class="order-items-list">${o.items.map(i => `<li><span>${i.qty}x ${i.name} (${i.size})</span> <span>${formatCurrency(i.price * i.qty)}</span></li>`).join('')}</ul>
            </div>
            <div class="order-actions" style="margin-left:10px;">
                ${o.status === 'new' ? `<button class="btn btn-info" onclick="updateOrderStatus('${o.id}', 'confirmed')">Chuyển Bar</button>` : ''}
                ${o.status === 'ready' ? `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'served')">Đã Phục Vụ</button>` : ''}
            </div>
        </div>
    `).join('');
}

function renderBaristaView() {
    const container = document.getElementById('barista-orders');
    const taskOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'making');
    if(taskOrders.length === 0) { container.innerHTML = '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Hàng chờ trống.</p>'; return; }
    container.innerHTML = taskOrders.map(o => `
        <div class="order-item status-making">
            <div class="order-content">
                <div class="order-details"><h4>Bàn ${o.tableId}</h4></div>
                <ul class="order-items-list">${o.items.map(i => `<li><b>${i.qty}x ${i.name} (${i.size})</b></li>`).join('')}</ul>
            </div>
            <div class="order-actions" style="margin-left:10px;">
                <button class="btn btn-primary" onclick="updateOrderStatus('${o.id}', 'ready')">Đã Xong</button>
            </div>
        </div>
    `).join('');
}

function renderCashierView() {
    const container = document.getElementById('cashier-orders');
    const unpaidOrders = orders.filter(o => o.status === 'served' || o.status === 'paid');
    if(unpaidOrders.length === 0) { container.innerHTML = '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Chưa có bill.</p>'; return; }
    container.innerHTML = unpaidOrders.map(o => `
        <div class="order-item ${o.status === 'paid' ? 'status-paid' : ''}">
            <div class="order-content">
                <div class="order-details"><h4>Bàn ${o.tableId} - ${o.id}</h4></div>
                <ul class="order-items-list">${o.items.map(i => `<li>${i.qty}x ${i.name} (${i.size}) - ${formatCurrency(i.price * i.qty)}</li>`).join('')}</ul>
                <div style="font-weight:bold; font-size:1.2rem; margin-top:5px;">Tổng: ${formatCurrency(o.total)}</div>
            </div>
            <div class="order-actions" style="margin-left:10px;">
                ${o.status === 'served' ? `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'paid')">Thanh Toán</button>` : `<span style="color:green; font-weight:bold;">Đã TT</span>`}
            </div>
        </div>
    `).join('');
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if(order) {
        order.status = newStatus;
        saveData();
        showToast(`${getStatusLabel(newStatus)}`);
        if(currentUser.role === 'waiter') renderWaiterView();
        if(currentUser.role === 'barista') renderBaristaView();
        if(currentUser.role === 'cashier') renderCashierView();
        if(currentUser.role === 'manager') renderManagerView();
    }
}

function getStatusLabel(status) {
    const map = { 'new': 'Mới', 'confirmed': 'Đã xác nhận', 'making': 'Đang làm', 'ready': 'Đã xong', 'served': 'Chờ tính tiền', 'paid': 'Đã thanh toán' };
    return map[status] || status;
}

// --- 6. LOGIC QUẢN LÝ ---
function renderManagerView() {
    // Inventory
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.img || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
            <td>${p.name}</td>
            <td>${p.type}</td>
            <td>${formatShortPrice(p.priceM)}</td>
            <td>${p.priceL ? formatShortPrice(p.priceL) : '-'}</td>
            <td><button class="btn btn-danger" style="font-size:0.7rem; padding:4px 8px;" onclick="deleteProduct(${p.id})">Xóa</button></td>
        </tr>
    `).join('');

    // Users
    const userBody = document.getElementById('users-table-body');
    userBody.innerHTML = users.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${getRoleName(u.role)}</td>
            <td>
                ${u.username !== 'admin' ? `
                    <button class="btn btn-warning" style="font-size:0.7rem; padding:4px 8px;" onclick="openEditUserModal('${u.username}')">Sửa</button>
                    <button class="btn btn-danger" style="font-size:0.7rem; padding:4px 8px;" onclick="deleteUser('${u.username}')">Xóa</button>
                ` : '<small style="color:#888;">Root</small>'}
            </td>
        </tr>
    `).join('');

    // Tables QR
    const qrGrid = document.getElementById('admin-table-qr-grid');
    qrGrid.innerHTML = '';
    for(let i=1; i<=20; i++) {
        const div = document.createElement('div');
        div.className = 'table-qr-card';
        div.innerHTML = `
            <div style="font-weight:bold;">Bàn ${i}</div>
            <div class="qr-placeholder">QR Code</div>
            <button class="btn btn-info" style="font-size:0.8rem" onclick="showQRCode(${i})">Xem QR</button>
        `;
        qrGrid.appendChild(div);
    }

    // ANALYTICS
    const today = new Date().toDateString();
    const paidOrders = orders.filter(o => o.status === 'paid');
    const todayPaid = paidOrders.filter(o => new Date(o.timestamp).toDateString() === today);
    
    const revenue = todayPaid.reduce((sum, o) => sum + o.total, 0);
    const revEl = document.getElementById('stat-revenue-today');
    if(revEl) revEl.innerText = formatCurrency(revenue);
    
    const countEl = document.getElementById('stat-orders-count');
    if(countEl) countEl.innerText = todayPaid.length;

    const hourlyData = new Array(24).fill(0);
    todayPaid.forEach(o => {
        const hour = new Date(o.timestamp).getHours();
        hourlyData[hour] += o.total;
    });
    const maxVal = Math.max(...hourlyData, 100000);
    let chartHtml = '';
    for(let i=8; i<=22; i++) {
        const val = hourlyData[i];
        const height = (val / maxVal) * 100;
        chartHtml += `
            <div class="bar" style="height: ${height}%">
                <span class="bar-val">${val > 0 ? formatShortPrice(val) : ''}</span>
                <span class="bar-label">${i}h</span>
            </div>`;
    }
    const chartEl = document.getElementById('revenue-chart');
    if(chartEl) chartEl.innerHTML = chartHtml;

    const catRevenue = { 'tea': 0, 'coffee': 0, 'drink': 0 };
    paidOrders.forEach(o => {
        o.items.forEach(i => {
            const p = products.find(prod => prod.id === i.id);
            if(p) catRevenue[p.type] += (i.price * i.qty);
        });
    });
    const catList = document.getElementById('category-stats');
    if(catList) {
        catList.innerHTML = `
            <li>Trà sữa: <b>${formatCurrency(catRevenue.tea)}</b></li>
            <li>Cafe: <b>${formatCurrency(catRevenue.coffee)}</b></li>
            <li>Nước ngọt/Khác: <b>${formatCurrency(catRevenue.drink)}</b></li>
        `;
    }

    const logBody = document.getElementById('paid-orders-log');
    if(logBody) {
        if(paidOrders.length === 0) logBody.innerHTML = '<tr><td colspan="4">Chưa có dữ liệu.</td></tr>';
        else {
            logBody.innerHTML = paidOrders.map(o => `
                <tr>
                    <td>${o.id}</td>
                    <td>Bàn ${o.tableId}</td>
                    <td>${formatCurrency(o.total)}</td>
                    <td>${new Date(o.timestamp).toLocaleTimeString()}</td>
                </tr>
            `).join('');
        }
    }
}

function toggleManagerTab(tab) {
    ['inventory', 'tables', 'users', 'analytics'].forEach(t => {
        const el = document.getElementById(`manager-${t}`);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(`manager-${tab}`);
    if(target) target.classList.remove('hidden');
}

// USER MANAGEMENT
function openAddUserModal() {
    document.getElementById('edit-user-mode').value = 'create';
    document.getElementById('user-modal-title').innerText = 'Tạo Tài Khoản Mới';
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-name').readOnly = false;
    document.getElementById('new-user-name').style.backgroundColor = '#fff';
    document.getElementById('user-readonly-hint').style.display = 'none';
    document.getElementById('new-user-pass').value = '';
    document.getElementById('new-user-role').value = 'waiter';
    openModal('modal-add-user');
}

function openEditUserModal(username) {
    const user = users.find(u => u.username === username);
    if(!user) return;

    document.getElementById('edit-user-mode').value = 'edit';
    document.getElementById('user-modal-title').innerText = 'Sửa Tài Khoản';
    document.getElementById('new-user-name').value = user.username;
    document.getElementById('new-user-name').readOnly = true;
    document.getElementById('new-user-name').style.backgroundColor = '#eee';
    document.getElementById('user-readonly-hint').style.display = 'block';
    document.getElementById('new-user-pass').value = user.password;
    document.getElementById('new-user-role').value = user.role;
    openModal('modal-add-user');
}

function saveUser() {
    const mode = document.getElementById('edit-user-mode').value;
    const u = document.getElementById('new-user-name').value.trim();
    const p = document.getElementById('new-user-pass').value.trim();
    const r = document.getElementById('new-user-role').value;

    if(!u || !p) return showToast('Thiếu thông tin!', 'error');

    if(mode === 'create') {
        if(users.find(x => x.username === u)) return showToast('Tên đăng nhập đã tồn tại!', 'error');
        users.push({ username: u, password: p, role: r });
        showToast('Đã tạo tài khoản mới!');
    } else {
        const index = users.findIndex(x => x.username === u);
        if(index !== -1) {
            users[index].password = p;
            users[index].role = r;
            showToast('Đã cập nhật tài khoản!');
        }
    }
    saveData();
    closeModal('modal-add-user');
    renderManagerView();
}

function deleteUser(username) {
    if(confirm('Xóa tài khoản này?')) {
        users = users.filter(u => u.username !== username);
        saveData();
        renderManagerView();
    }
}

// PRODUCT MANAGEMENT
function openAddProductModal() { openModal('modal-add-product'); }
function saveNewProduct() {
    const name = document.getElementById('new-prod-name').value;
    const type = document.getElementById('new-prod-type').value;
    const priceM = parseInt(document.getElementById('new-prod-price-m').value);
    const priceL = parseInt(document.getElementById('new-prod-price-l').value) || 0;
    const img = document.getElementById('new-prod-img').value;

    if(!name || !priceM) return showToast('Vui lòng nhập tên và giá M!', 'error');

    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, type, priceM, priceL, img });
    
    saveData();
    showToast('Đã thêm sản phẩm!');
    closeModal('modal-add-product');
    renderManagerView();
    document.getElementById('new-prod-name').value = '';
    document.getElementById('new-prod-price-m').value = '';
}
function deleteProduct(id) {
    if(confirm('Xóa sản phẩm này?')) {
        products = products.filter(p => p.id !== id);
        saveData();
        renderManagerView();
    }
}

// QR
function showQRCode(tableId) {
    const currentDomain = window.location.origin; 
    const tableUrl = `${currentDomain}/?table=${tableId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tableUrl)}`;
    
    document.getElementById('qr-image-display').src = qrUrl;
    document.getElementById('qr-modal-title').innerText = `QR Code Bàn ${tableId}`;
    openModal('modal-show-qr');
}

// UTILS
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US').format(amount) + ' đ';
}
function formatShortPrice(amount) {
    return (amount / 1000) + 'k';
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg, type='success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `5px solid ${type === 'success' ? 'var(--success)' : 'var(--danger)'}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}