// --- DỮ LIỆU MẶC ĐỊNH ---
// Dữ liệu này sẽ được tự động nạp vào Supabase lần đầu tiên chạy nếu bảng đang trống.

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Trà Sữa Truyền Thống", type: "tea", priceM: 30000, priceL: 40000, img: "" },
    { id: 2, name: "Trà Sữa Thái Xanh", type: "tea", priceM: 35000, priceL: 45000, img: "" },
    { id: 3, name: "Trà Sữa Khoai Môn", type: "tea", priceM: 35000, priceL: 45000, img: "" },
    { id: 4, name: "Cafe Đen Đá", type: "coffee", priceM: 20000, priceL: 25000, img: "" },
    { id: 5, name: "Nước Suối Lavie", type: "drink", priceM: 10000, priceL: 0, img: "" }
];

const DEFAULT_USERS = [
    { username: 'admin', password: '123456', role: 'manager' },
    { username: 'phucvu', password: '123', role: 'waiter' },
    { username: 'phache', password: '123', role: 'barista' },
    { username: 'thungan', password: '123', role: 'cashier' }
];
