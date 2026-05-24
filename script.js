// --- CẤU HÌNH SUPABASE ---
let supabase = null;
let supabaseConfig = {
    url: localStorage.getItem('sb_url') || '',
    key: localStorage.getItem('sb_key') || ''
};

// --- BIẾN TOÀN CỤC ---
let products = [];
let users = [];
let orders = []; 
let currentTable = null;
let cart = [];
let selectedSize = {}; 
let currentUser = null; 
let currentTab = {
    waiter: 'current',
    barista: 'current',
    cashier: 'current',
    manager: 'analytics'
};

// Polling interval ID
let pollingInterval = null;

// --- 1. HÀM CẤU HÌNH ---
function initSupabase() {
    if (!supabaseConfig.url || !supabaseConfig.key) {
        return false;
    }
    try {
        supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
        return true;
    } catch (e) {
        console.error("Lỗi khởi tạo Supabase", e);
        return false;
    }
}

function saveConfig() {
    const url = document.getElementById('cfg-url').value.trim();
    const key = document.getElementById('cfg-key').value.trim();
    if(!url || !key) return showToast('Vui lòng nhập đầy đủ!', 'error');
    
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    location.reload();
}

function openConfigModal() {
    document.getElementById('cfg-url').value = supabaseConfig.url;
    document.getElementById('cfg-key').value = supabaseConfig.key;
    openModal('modal-config');
}

// --- 2. HÀM TẢI DỮ LIỆU (ASYNC) ---
async function loadData() {
    if (!initSupabase()) return;

    // Load Products
    const { data: prods, error: errProds } = await supabase.from('products').select('*');
    if (!errProds && prods) {
        products = prods;
    } else {
        // Nếu chưa có data, nạp mặc định
        products = [...DEFAULT_PRODUCTS];
        const { error: insertErr } = await supabase.from('products').insert(products);
        if(insertErr) console.error("Lỗi nạp sản phẩm mặc định:", insertErr);
    }

    // Load Users
    const { data: usrs, error: errUsrs } = await supabase.from('users').select('*');
    if (!errUsrs && usrs) {
        users = usrs;
    } else {
        users = [...DEFAULT_USERS];
        const { error: insertErr } = await supabase.from('users').insert(users);
        if(insertErr) console.error("Lỗi nạp user mặc định:", insertErr);
    }

    // Load Orders
    const { data: ords, error: errOrds } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
    if (!errOrds && ords) {
        orders = ords;
    } else {
        orders = [];
    }
}

function resetAllData() {
    if(confirm("Xóa toàn bộ dữ liệu trên Supabase?")) {
        if(!supabase) return showToast('Chưa kết nối DB!', 'error');
        supabase.from('products').delete().neq('id', 0); // Xóa tất cả (trick logic)
        // Trong thực tế Supabase delete cần điều kiện. Đơn giản là xóa các row
        // Cách an toàn hơn là xóa từng bảng rồi reload để nạp default lại
        // Ở đây ta chỉ reload và logic loadData sẽ check rỗng để nạp default.
        localStorage.removeItem('sb_url');
        localStorage.removeItem('sb_key');
        location.reload();
    }
}

// --- 3. POLLING REALTIME (Cập nhật tự động) ---
function startPolling() {
    // Xóa interval cũ nếu có
    if(pollingInterval) clearInterval(pollingInterval);

    // Poll mỗi 3 giây
    pollingInterval = setInterval(async () => {
        if (!supabase || !currentUser) return;
        
        // Chỉ poll khi đang là nhân viên hoặc Admin
        if (['waiter', 'barista', 'cashier', 'manager'].includes(currentUser.role)) {
            const { data: newOrders } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
            
            // Chỉ cập nhật UI nếu danh sách thay đổi (để tránh nháy màn hình)
            if (JSON.stringify(orders) !== JSON.stringify(newOrders)) {
                orders = newOrders;
                if(currentUser.role === 'waiter') renderWaiterView();
                if(currentUser.role === 'barista') renderBaristaView();
                if(currentUser.role === 'cashier') renderCashierView();
                if(currentUser.role === 'manager') renderManagerView();
            }
        }
    }, 3000);
}

// --- 4. KHỞI TẠO & LOGIN ---
window.onload = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');

    if (tableId) {
        currentUser = { username: 'Khách', role: 'customer' };
        await initSupabase(); // Khách cũng cần kết nối để đặt món
        if (supabase) await loadData();
        initApp();
        setTimeout(() => selectTable(parseInt(tableId)), 100);
    }
};

function handleLogin() {
    if (!initSupabase()) {
        openConfigModal();
        return showToast('Vui lòng cấu hình Database trước!', 'error');
    }

    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    if (!u || !p) return showToast('Thiếu thông tin!', 'error');

    if (u.toLowerCase() === 'customer') {
        currentUser = { username: 'Khách', role: 'customer' };
        initApp();
        return;
    }
    const user = users.find(x => x.username === u);
    if (!user) return showToast('Tài khoản không tồn tại!', 'error');
    if (user.password !== p) return showToast('Sai mật khẩu!', 'error');

    currentUser = user;
    initApp();
}

function logout() {
    currentUser = null;
    if(pollingInterval) clearInterval(pollingInterval);
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
    
    // Reset tab
    if(currentTab[currentUser.role]) currentTab[currentUser.role] = 'current';

    // Khởi chạy Polling cho nhân viên
    if (['waiter', 'barista', 'cashier', 'manager'].includes(currentUser.role)) {
        startPolling();
    }

    if (currentUser.role === 'customer') renderCustomerSimGrid(); 
    else if (currentUser.role === 'waiter') renderWaiterView();
    else if (currentUser.role === 'barista') renderBaristaView();
    else if (currentUser.role === 'cashier') renderCashierView();
    else if (currentUser.role === 'manager') renderManagerView();
}

// --- 5. TAB & UTILS ---
function switchRoleTab(role, type) {
    currentTab[role] = type;
    document.getElementById(`tab-${role}-current`).classList.remove('active');
    document.getElementById(`tab-${role}-history`).classList.remove('active');
    document.getElementById(`tab-${role}-${type}`).classList.add('active');
    document.getElementById(`${role}-list-current`).classList.add('hidden');
    document.getElementById(`${role}-list-history`).classList.add('hidden');
    document.getElementById(`${role}-list-${type}`).classList.remove('hidden');
    if(role === 'waiter') renderWaiterView();
    if(role === 'barista') renderBaristaView();
    if(role === 'cashier') renderCashierView();
}
function getRoleName(role) {
    const names = { 'manager': 'Giám đốc', 'waiter': 'Phục vụ', 'barista': 'Pha chế', 'cashier': 'Thu ngân', 'customer': 'Khách' };
    return names[role] || role;
}
function formatCurrency(amount) { return new Intl.NumberFormat('en-US').format(amount) + ' đ'; }
function formatShortPrice(amount) { return (amount / 1000) + 'k'; }
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

// --- 6. CUSTOMER LOGIC ---
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
    currentTable = null; cart = []; updateCartUI();
    document.getElementById('customer-step-1').classList.remove('hidden');
    document.getElementById('customer-step-2').classList.add('hidden');
    document.getElementById('cart-btn').classList.add('hidden');
}
function renderMenu(filter = 'all') {
    const container = document.getElementById('menu-container');
    if(!container) return;
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
    showToast('Đã thêm');
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
                <div style="display:flex; align-items:center; gap:10px;"><b>${formatCurrency(item.price * item.qty)}</b><button class="btn btn-danger" style="padding:2px 8px;" onclick="removeFromCart(${index})">X</button></div>
            </div>
        `).join('');
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('modal-cart-total').innerText = formatCurrency(total);
    openModal('modal-cart');
}
function removeFromCart(index) {
    cart.splice(index, 1); openCart(); updateCartUI();
}
async function submitOrder() {
    if(cart.length === 0) return showToast('Giỏ trống!', 'error');
    if(!currentTable) return showToast('Lỗi bàn!', 'error');
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const newOrder = {
        id: 'ORD' + Date.now().toString().slice(-6),
        table_id: currentTable, // Snake_case cho Supabase
        total: total,
        status: 'new', 
        items: cart // Supabase sẽ tự chuyển thành JSONB
    };
    
    const { error } = await supabase.from('orders').insert([newOrder]);
    if(error) return showToast('Lỗi đặt hàng!', 'error');
    
    cart = []; updateCartUI(); closeModal('modal-cart'); showToast('Đặt thành công!');
}

// --- 7. STAFF LOGIC ---
function renderWaiterView() {
    const mode = currentTab.waiter;
    const containerCurrent = document.getElementById('waiter-list-current');
    const containerHistory = document.getElementById('waiter-list-history');
    const currentOrders = orders.filter(o => o.status === 'new');
    containerCurrent.innerHTML = currentOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Không đơn mới.</p>' : currentOrders.map(o => renderOrderCard(o, 'waiter')).join('');
    const historyOrders = orders.filter(o => ['confirmed', 'ready', 'served', 'paid'].includes(o.status));
    containerHistory.innerHTML = historyOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Chưa có lịch sử.</p>' : historyOrders.map(o => renderOrderCard(o, 'waiter', true)).join('');
}
function renderBaristaView() {
    const containerCurrent = document.getElementById('barista-list-current');
    const containerHistory = document.getElementById('barista-list-history');
    const currentOrders = orders.filter(o => ['confirmed', 'making'].includes(o.status));
    containerCurrent.innerHTML = currentOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Không đơn đang chờ.</p>' : currentOrders.map(o => renderOrderCard(o, 'barista')).join('');
    const historyOrders = orders.filter(o => ['ready', 'served', 'paid'].includes(o.status));
    containerHistory.innerHTML = historyOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Chưa có lịch sử.</p>' : historyOrders.map(o => renderOrderCard(o, 'barista', true)).join('');
}
function renderCashierView() {
    const containerCurrent = document.getElementById('cashier-list-current');
    const containerHistory = document.getElementById('cashier-list-history');
    const currentOrders = orders.filter(o => o.status === 'served');
    containerCurrent.innerHTML = currentOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Không hóa đơn chờ.</p>' : currentOrders.map(o => renderOrderCard(o, 'cashier')).join('');
    const historyOrders = orders.filter(o => o.status === 'paid');
    containerHistory.innerHTML = historyOrders.length === 0 ? '<p class="order-meta" style="display:block; text-align:center; margin-top:20px;">Chưa có lịch sử.</p>' : historyOrders.map(o => renderOrderCard(o, 'cashier', true)).join('');
}
function renderOrderCard(o, role, isHistory = false) {
    let actionButtons = '';
    if (!isHistory) {
        if (role === 'waiter') {
            if (o.status === 'new') actionButtons = `<button class="btn btn-info" onclick="updateOrderStatus('${o.id}', 'confirmed')">Xác nhận</button>`;
            if (o.status === 'ready') actionButtons = `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'served')">Đã phục vụ</button>`;
        }
        if (role === 'barista') {
            if (o.status === 'confirmed') actionButtons = `<button class="btn btn-primary" onclick="updateOrderStatus('${o.id}', 'making')">Làm</button>`;
            if (o.status === 'making') actionButtons = `<button class="btn btn-primary" onclick="updateOrderStatus('${o.id}', 'ready')">Xong</button>`;
        }
        if (role === 'cashier') {
            if (o.status === 'served') actionButtons = `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'paid')">Thanh toán</button>`;
        }
    } else {
        if (o.status === 'paid') actionButtons = `<span style="color:green; font-weight:bold;">Đã thanh toán</span>`;
        else if (o.status === 'ready') actionButtons = `<span style="color:var(--success);">Đã xong</span>`;
        else if (o.status === 'served') actionButtons = `<span style="color:var(--info);">Đã phục vụ</span>`;
        else if (o.status === 'confirmed') actionButtons = `<span style="color:var(--warning);">Đã xác nhận</span>`;
    }
    return `
        <div class="order-item ${isHistory ? 'history-item' : ''} status-${o.status}">
            <div class="order-content">
                <div class="order-details"><h4>Bàn ${o.table_id} - ${o.id}</h4></div>
                <div class="order-meta">${new Date(o.timestamp).toLocaleTimeString('vi-VN')} - ${o.status}</div>
                <ul class="order-items-list">${o.items.map(i => `<li><span>${i.qty}x ${i.name} (${i.size})</span> <span>${formatCurrency(i.price * i.qty)}</span></li>`).join('')}</ul>
            </div>
            <div class="order-actions" style="margin-left:10px; display:flex; align-items:center;">${actionButtons}</div>
        </div>
    `;
}
async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if(error) return showToast('Cập nhật thất bại!', 'error');
    showToast('Đã cập nhật!');
}
function getStatusLabel(status) { return status; } // Supabase lưu thẳng chuỗi, nên trả về luôn

// --- 8. MANAGER LOGIC ---
async function renderManagerView() {
    // Inventory
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = products.map(p => `
        <tr><td><img src="${p.img || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td><td>${p.name}</td><td>${p.type}</td><td>${formatShortPrice(p.price_m)}</td><td>${p.price_l ? formatShortPrice(p.price_l) : '-'}</td><td><button class="btn btn-danger" style="font-size:0.7rem; padding:4px 8px;" onclick="deleteProduct(${p.id})">Xóa</button></td></tr>
    `).join('');
    // Users
    const userBody = document.getElementById('users-table-body');
    userBody.innerHTML = users.map(u => `
        <tr><td>${u.username}</td><td>${getRoleName(u.role)}</td><td>${u.username !== 'admin' ? `<button class="btn btn-warning" style="font-size:0.7rem; padding:4px 8px;" onclick="openEditUserModal('${u.username}')">Sửa</button><button class="btn btn-danger" style="font-size:0.7rem; padding:4px 8px;" onclick="deleteUser('${u.username}')">Xóa</button>` : '<small style="color:#888;">Root</small>'}</td></tr>
    `).join('');
    // Tables
    const qrGrid = document.getElementById('admin-table-qr-grid');
    qrGrid.innerHTML = '';
    for(let i=1; i<=20; i++) {
        const div = document.createElement('div');
        div.className = 'table-qr-card';
        div.innerHTML = `<div style="font-weight:bold;">Bàn ${i}</div><div class="qr-placeholder">QR</div><button class="btn btn-info" style="font-size:0.8rem" onclick="showQRCode(${i})">Xem</button>`;
        qrGrid.appendChild(div);
    }
    // Analytics
    const today = new Date().toDateString();
    const paidOrders = orders.filter(o => o.status === 'paid');
    const todayPaid = paidOrders.filter(o => new Date(o.timestamp).toDateString() === today);
    const revenue = todayPaid.reduce((sum, o) => sum + o.total, 0);
    document.getElementById('stat-revenue-today').innerText = formatCurrency(revenue);
    document.getElementById('stat-orders-count').innerText = todayPaid.length;
    const logBody = document.getElementById('all-orders-log');
    if(logBody) {
        logBody.innerHTML = orders.length === 0 ? '<tr><td colspan="5">Chưa có data.</td></tr>'
        : orders.map(o => `<tr><td>${o.id}</td><td>Bàn ${o.table_id}</td><td>${formatCurrency(o.total)}</td><td><span class="role-badge" style="font-size:0.7rem; background:${getStatusColor(o.status)}">${o.status}</span></td><td>${new Date(o.timestamp).toLocaleTimeString()}</td></tr>`).join('');
    }
}
function getStatusColor(status) { const colors = { 'new': '#17a2b8', 'confirmed': '#ffc107', 'making': '#fd7e14', 'ready': '#28a745', 'served': '#6f42c1', 'paid': '#28a745' }; return colors[status] || '#6c757d'; }
function toggleManagerTab(tab) { ['inventory', 'tables', 'users', 'analytics'].forEach(t => { const el = document.getElementById(`manager-${t}`); if(el) el.classList.add('hidden'); }); const target = document.getElementById(`manager-${tab}`); if(target) target.classList.remove('hidden'); }

// USER MGMT
function openAddUserModal() { document.getElementById('edit-user-mode').value = 'create'; document.getElementById('user-modal-title').innerText = 'Tạo User'; document.getElementById('new-user-name').value = ''; document.getElementById('new-user-name').readOnly = false; document.getElementById('new-user-name').style.backgroundColor = '#fff'; document.getElementById('user-readonly-hint').style.display = 'none'; document.getElementById('new-user-pass').value = ''; document.getElementById('new-user-role').value = 'waiter'; openModal('modal-add-user'); }
function openEditUserModal(username) { const user = users.find(u => u.username === username); if(!user) return; document.getElementById('edit-user-mode').value = 'edit'; document.getElementById('user-modal-title').innerText = 'Sửa User'; document.getElementById('new-user-name').value = user.username; document.getElementById('new-user-name').readOnly = true; document.getElementById('new-user-name').style.backgroundColor = '#eee'; document.getElementById('user-readonly-hint').style.display = 'block'; document.getElementById('new-user-pass').value = user.password; document.getElementById('new-user-role').value = user.role; openModal('modal-add-user'); }
async function saveUser() {
    const mode = document.getElementById('edit-user-mode').value;
    const u = document.getElementById('new-user-name').value.trim();
    const p = document.getElementById('new-user-pass').value.trim();
    const r = document.getElementById('new-user-role').value;
    if(!u || !p) return showToast('Thiếu thông tin!', 'error');
    if(mode === 'create') {
        if(users.find(x => x.username === u)) return showToast('User đã tồn tại!', 'error');
        const { error } = await supabase.from('users').insert({ username: u, password: p, role: r });
        if(error) return showToast('Lỗi tạo user!', 'error');
    } else {
        const { error } = await supabase.from('users').update({ password: p, role: r }).eq('username', u);
        if(error) return showToast('Lỗi sửa user!', 'error');
    }
    showToast('Lưu thành công!'); closeModal('modal-add-user'); renderManagerView();
}
async function deleteUser(username) {
    if(confirm('Xóa?')) { const { error } = await supabase.from('users').delete().eq('username', username); if(!error) renderManagerView(); } }

// PRODUCT MGMT
function openAddProductModal() { openModal('modal-add-product'); }
async function saveNewProduct() {
    const name = document.getElementById('new-prod-name').value;
    const type = document.getElementById('new-prod-type').value;
    const priceM = parseInt(document.getElementById('new-prod-price-m').value);
    const priceL = parseInt(document.getElementById('new-prod-price-l').value) || 0;
    const img = document.getElementById('new-prod-img').value;
    if(!name || !priceM) return showToast('Thiếu tên/giá!', 'error');
    const { error } = await supabase.from('products').insert({ name, type, price_m: priceM, price_l: priceL, img });
    if(error) return showToast('Lỗi thêm món!', 'error');
    showToast('Đã thêm!'); closeModal('modal-add-product'); renderManagerView(); document.getElementById('new-prod-name').value = ''; document.getElementById('new-prod-price-m').value = '';
}
async function deleteProduct(id) {
    if(confirm('Xóa?')) { const { error } = await supabase.from('products').delete().eq('id', id); if(!error) renderManagerView(); } }

// QR
function showQRCode(tableId) {
    const currentDomain = window.location.origin; const tableUrl = `${currentDomain}/?table=${tableId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tableUrl)}`;
    document.getElementById('qr-image-display').src = qrUrl; document.getElementById('qr-modal-title').innerText = `QR Bàn ${tableId}`; openModal('modal-show-qr');
}
