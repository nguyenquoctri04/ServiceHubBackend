import { PrismaClient } from "@prisma/client-identity";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const roleIds = {
    ADMIN: "31000000-0000-4000-8000-000000000001",
    CUSTOMER: "31000000-0000-4000-8000-000000000002",
    PROVIDER: "31000000-0000-4000-8000-000000000003",
};

const permissionId = (n: number) => `32000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerId = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const verificationId = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const identityDocumentId = (n: number) => `51000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const providerLegalDocumentId = (n: number) => `52000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const now = new Date();

// Danh sách 60 khách hàng với họ tên và thông tin thực tế
const realCustomers = [
    { name: "Nguyễn Văn An", gender: "Nam", birth: "1995-03-15", cccd: "079095012345", phone: "0903123456", email: "an.nguyen@servicehub.vn", origin: "Hà Nội", address: "125 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Trần Thị Mai", gender: "Nữ", birth: "1998-07-22", cccd: "079198023456", phone: "0918234567", email: "mai.tran@servicehub.vn", origin: "Đà Nẵng", address: "45 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Lê Hoàng Nam", gender: "Nam", birth: "1992-11-05", cccd: "079092034567", phone: "0987345678", email: "nam.le@servicehub.vn", origin: "Hải Phòng", address: "88 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Phạm Minh Đức", gender: "Nam", birth: "1996-01-30", cccd: "079096045678", phone: "0934456789", email: "duc.pham@servicehub.vn", origin: "Nam Định", address: "230 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM" },
    { name: "Võ Thị Bích Thảo", gender: "Nữ", birth: "1999-09-18", cccd: "079199056789", phone: "0975567890", email: "thao.vo@servicehub.vn", origin: "Cần Thơ", address: "15 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM" },
    { name: "Hoàng Quốc Bảo", gender: "Nam", birth: "1994-05-12", cccd: "079094067890", phone: "0906678901", email: "bao.hoang@servicehub.vn", origin: "Huế", address: "410 Điện Biên Phủ, Phường 11, Quận 10, TP.HCM" },
    { name: "Đỗ Thanh Hằng", gender: "Nữ", birth: "1997-12-08", cccd: "079197078901", phone: "0917789012", email: "hang.do@servicehub.vn", origin: "Bắc Ninh", address: "55 Cách Mạng Tháng 8, Phường Bến Thành, Quận 1, TP.HCM" },
    { name: "Bùi Anh Tuấn", gender: "Nam", birth: "1993-04-25", cccd: "079093089012", phone: "0988890123", email: "tuan.bui@servicehub.vn", origin: "Thái Bình", address: "180 Ba Tháng Hai, Phường 12, Quận 10, TP.HCM" },
    { name: "Đặng Thu Hương", gender: "Nữ", birth: "1996-08-14", cccd: "079196090123", phone: "0939901234", email: "huong.dang@servicehub.vn", origin: "Quảng Ninh", address: "68 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM" },
    { name: "Vũ Trọng Phụng", gender: "Nam", birth: "1991-02-28", cccd: "079091101234", phone: "0901012345", email: "phung.vu@servicehub.vn", origin: "Hà Nam", address: "92 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Quận 1, TP.HCM" },
    { name: "Hồ Quỳnh Nga", gender: "Nữ", birth: "2000-06-19", cccd: "079100112345", phone: "0912123456", email: "nga.ho@servicehub.vn", origin: "Nghệ An", address: "33 Nguyễn Thông, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Dương Minh Trí", gender: "Nam", birth: "1994-10-03", cccd: "079094123456", phone: "0983234567", email: "tri.duong@servicehub.vn", origin: "Bình Định", address: "102 Lê Văn Sỹ, Phường 14, Quận 3, TP.HCM" },
    { name: "Lý Khánh Linh", gender: "Nữ", birth: "1998-03-27", cccd: "079198134567", phone: "0934345678", email: "linh.ly@servicehub.vn", origin: "Lâm Đồng", address: "78 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM" },
    { name: "Ngô Quang Hải", gender: "Nam", birth: "1995-07-16", cccd: "079095145678", phone: "0975456789", email: "hai.ngo@servicehub.vn", origin: "Khánh Hòa", address: "205 Phan Xích Long, Phường 2, Phú Nhuận, TP.HCM" },
    { name: "Đoàn Ngọc Ánh", gender: "Nữ", birth: "1999-11-21", cccd: "079199156789", phone: "0906567890", email: "anh.doan@servicehub.vn", origin: "Thanh Hóa", address: "312 Xô Viết Nghệ Tĩnh, Phường 25, Bình Thạnh, TP.HCM" },
    { name: "Trịnh Gia Huy", gender: "Nam", birth: "1993-09-09", cccd: "079093167890", phone: "0917678901", email: "huy.trinh@servicehub.vn", origin: "Vĩnh Phúc", address: "45 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, TP.HCM" },
    { name: "Mai Phương Thúy", gender: "Nữ", birth: "1997-04-02", cccd: "079197178901", phone: "0988789012", email: "thuy.mai@servicehub.vn", origin: "Hà Nội", address: "128 Bạch Đằng, Phường 24, Bình Thạnh, TP.HCM" },
    { name: "Phan Văn Hậu", gender: "Nam", birth: "1996-12-14", cccd: "079096189012", phone: "0939890123", email: "hau.phan@servicehub.vn", origin: "Thái Bình", address: "550 Nguyễn Kiệm, Phường 4, Phú Nhuận, TP.HCM" },
    { name: "Lương Kim Chi", gender: "Nữ", birth: "2001-08-30", cccd: "079101190123", phone: "0902901234", email: "chi.luong@servicehub.vn", origin: "Đồng Nai", address: "89 Phan Đăng Lưu, Phường 7, Phú Nhuận, TP.HCM" },
    { name: "Tô Vĩnh Diện", gender: "Nam", birth: "1992-06-06", cccd: "079092201234", phone: "0913012345", email: "dien.to@servicehub.vn", origin: "Ninh Bình", address: "64 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM" },
    { name: "Cao Thùy Trang", gender: "Nữ", birth: "1998-01-11", cccd: "079198212345", phone: "0984123456", email: "trang.cao@servicehub.vn", origin: "Bình Dương", address: "23 Võ Oanh, Phường 25, Bình Thạnh, TP.HCM" },
    { name: "Lâm Chí Dĩnh", gender: "Nam", birth: "1994-08-23", cccd: "079094223456", phone: "0935234567", email: "dinh.lam@servicehub.vn", origin: "Hải Dương", address: "19 Nguyễn Xí, Phường 26, Bình Thạnh, TP.HCM" },
    { name: "Chu Ngọc Hà", gender: "Nữ", birth: "1996-05-17", cccd: "079196234567", phone: "0976345678", email: "ha.chu@servicehub.vn", origin: "Phú Thọ", address: "78 D2, Phường 25, Bình Thạnh, TP.HCM" },
    { name: "Tạ Quang Bửu", gender: "Nam", birth: "1993-10-29", cccd: "079093245678", phone: "0907456789", email: "buu.ta@servicehub.vn", origin: "Nghệ An", address: "15 Đường số 2, Cư xá Đô Thành, Quận 3, TP.HCM" },
    { name: "Phùng Mỹ Linh", gender: "Nữ", birth: "2000-02-14", cccd: "079100256789", phone: "0918567890", email: "linh.phung@servicehub.vn", origin: "Hưng Yên", address: "80 Nguyễn Cửu Vân, Phường 17, Bình Thạnh, TP.HCM" },
    { name: "Vương Đình Huệ", gender: "Nam", birth: "1991-12-03", cccd: "079091267890", phone: "0989678901", email: "hue.vuong@servicehub.vn", origin: "Nghệ An", address: "40 Trần Não, Phường An Khánh, TP. Thủ Đức, TP.HCM" },
    { name: "Thái Bảo Trâm", gender: "Nữ", birth: "1997-07-07", cccd: "079197278901", phone: "0930789012", email: "tram.thai@servicehub.vn", origin: "Quảng Nam", address: "12 Quốc Hương, Phường Thảo Điền, TP. Thủ Đức, TP.HCM" },
    { name: "Khổng Minh Tuấn", gender: "Nam", birth: "1995-04-18", cccd: "079095289012", phone: "0971890123", email: "tuan.khong@servicehub.vn", origin: "Hà Tây", address: "55 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP.HCM" },
    { name: "La Thị Bích", gender: "Nữ", birth: "1999-09-25", cccd: "079199290123", phone: "0902901235", email: "bich.la@servicehub.vn", origin: "Vĩnh Long", address: "88 Song Hành, Phường An Phú, TP. Thủ Đức, TP.HCM" },
    { name: "Quách Thành Danh", gender: "Nam", birth: "1992-03-31", cccd: "079092301234", phone: "0913012346", email: "danh.quach@servicehub.vn", origin: "An Giang", address: "24 Mai Chí Thọ, Phường An Phú, TP. Thủ Đức, TP.HCM" },
    { name: "Nghiêm Xuân Tú", gender: "Nam", birth: "1996-06-20", cccd: "079096312345", phone: "0984123457", email: "tu.nghiem@servicehub.vn", origin: "Hà Nội", address: "105 Lương Định Của, Phường An Khánh, TP. Thủ Đức, TP.HCM" },
    { name: "Liêu Hà Trinh", gender: "Nữ", birth: "1998-12-05", cccd: "079198323456", phone: "0935234568", email: "trinh.lieu@servicehub.vn", origin: "Đà Nẵng", address: "33 Nguyễn Cơ Thạch, Phường An Lợi Đông, TP. Thủ Đức, TP.HCM" },
    { name: "Trịnh Thăng Bình", gender: "Nam", birth: "1993-01-16", cccd: "079093334567", phone: "0976345679", email: "binh.trinh@servicehub.vn", origin: "TP.HCM", address: "84 Tôn Dực Thắng, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Đinh Tiến Dũng", gender: "Nam", birth: "1990-11-28", cccd: "079090345678", phone: "0907456780", email: "dung.dinh@servicehub.vn", origin: "Hà Nội", address: "19 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Lưu Hương Giang", gender: "Nữ", birth: "1995-08-09", cccd: "079195356789", phone: "0918567891", email: "giang.luu@servicehub.vn", origin: "Nam Định", address: "123 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Hà Anh Tuấn", gender: "Nam", birth: "1994-02-17", cccd: "079094367890", phone: "0989678902", email: "tuan.ha@servicehub.vn", origin: "Ninh Bình", address: "45 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Bùi Bích Phương", gender: "Nữ", birth: "1997-10-11", cccd: "079197378901", phone: "0930789013", email: "phuong.bui@servicehub.vn", origin: "Quảng Ninh", address: "208 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Vũ Cát Tường", gender: "Nữ", birth: "1996-04-22", cccd: "079196389012", phone: "0971890124", email: "tuong.vu@servicehub.vn", origin: "An Giang", address: "77 Nguyễn Thị Diệu, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Sơn Tùng MTP", gender: "Nam", birth: "1994-07-05", cccd: "079094390123", phone: "0902901236", email: "tung.mtp@servicehub.vn", origin: "Thái Bình", address: "12 Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Đen Vâu", gender: "Nam", birth: "1991-05-13", cccd: "079091401234", phone: "0913012347", email: "den.vau@servicehub.vn", origin: "Quảng Ninh", address: "216 Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Trần Trúc Nhân", gender: "Nam", birth: "1995-11-30", cccd: "079095412345", phone: "0984123458", email: "nhan.truc@servicehub.vn", origin: "Bình Định", address: "88 Trương Định, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Nguyễn Hòa Minzy", gender: "Nữ", birth: "1998-05-31", cccd: "079198423456", phone: "0935234569", email: "hoa.minzy@servicehub.vn", origin: "Bắc Ninh", address: "35 Tú Xương, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Đức Phúc", gender: "Nam", birth: "1997-10-15", cccd: "079097434567", phone: "0976345680", email: "phuc.duc@servicehub.vn", origin: "Hà Nội", address: "91 Bà Huyện Thanh Quan, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Erik Lê", gender: "Nam", birth: "1999-10-13", cccd: "079099445678", phone: "0907456781", email: "erik.le@servicehub.vn", origin: "Hà Nội", address: "14 Đoàn Thị Điểm, Phường 1, Phú Nhuận, TP.HCM" },
    { name: "Hoàng Thùy Linh", gender: "Nữ", birth: "1993-08-11", cccd: "079193456789", phone: "0918567892", email: "linh.hoang@servicehub.vn", origin: "Hà Nội", address: "62 Thích Quảng Đức, Phường 5, Phú Nhuận, TP.HCM" },
    { name: "Phan Mạnh Quỳnh", gender: "Nam", birth: "1992-01-10", cccd: "079092467890", phone: "0989678903", email: "quynh.phan@servicehub.vn", origin: "Nghệ An", address: "115 Huỳnh Văn Bánh, Phường 17, Phú Nhuận, TP.HCM" },
    { name: "Văn Mai Hương", gender: "Nữ", birth: "1996-09-27", cccd: "079196478901", phone: "0930789014", email: "huong.van@servicehub.vn", origin: "Hà Nội", address: "208 Nguyễn Trọng Tuyển, Phường 8, Phú Nhuận, TP.HCM" },
    { name: "Vũ Quốc Việt", gender: "Nam", birth: "1990-03-04", cccd: "079090489012", phone: "0971890125", email: "viet.vu@servicehub.vn", origin: "Bình Thuận", address: "49 Trần Huy Liệu, Phường 12, Phú Nhuận, TP.HCM" },
    { name: "Tiên Cookie", gender: "Nữ", birth: "1994-02-26", cccd: "079194490123", phone: "0902901237", email: "tien.cookie@servicehub.vn", origin: "Hà Nội", address: "18 Lê Quý Đôn, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Châu Đăng Khoa", gender: "Nam", birth: "1993-06-26", cccd: "079093501234", phone: "0913012348", email: "khoa.chau@servicehub.vn", origin: "Đắk Lắk", address: "72 Ngô Thời Nhiệm, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Hứa Kim Tuyền", gender: "Nam", birth: "1995-01-08", cccd: "079095512345", phone: "0984123459", email: "tuyen.hua@servicehub.vn", origin: "TP.HCM", address: "50 Phạm Đình Toái, Phường Võ Thị Sáu, Quận 3, TP.HCM" },
    { name: "Orange Khương Hoàn", gender: "Nữ", birth: "1997-02-15", cccd: "079197523456", phone: "0935234570", email: "orange.khuong@servicehub.vn", origin: "TP.HCM", address: "10 Kỳ Đồng, Phường 9, Quận 3, TP.HCM" },
    { name: "AMEE Trần Huyền", gender: "Nữ", birth: "2000-03-23", cccd: "079100534567", phone: "0976345681", email: "amee.tran@servicehub.vn", origin: "Hà Nội", address: "93 Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "GREY D Đoàn Thế", gender: "Nam", birth: "1999-11-04", cccd: "079099545678", phone: "0907456782", email: "greyd.doan@servicehub.vn", origin: "Quảng Ngãi", address: "140 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM" },
    { name: "MONO Nguyễn Việt", gender: "Nam", birth: "2000-01-20", cccd: "079000556789", phone: "0918567893", email: "mono.nguyen@servicehub.vn", origin: "Thái Bình", address: "86 Mạc Đĩnh Chi, Phường Đa Kao, Quận 1, TP.HCM" },
    { name: "Wren Evans Lê Phan", gender: "Nam", birth: "2001-09-11", cccd: "079001567890", phone: "0989678904", email: "wren.evans@servicehub.vn", origin: "Hà Nội", address: "29 Phùng Khắc Khoan, Phường Đa Kao, Quận 1, TP.HCM" },
    { name: "tlinh Nguyễn Thảo", gender: "Nữ", birth: "2000-10-07", cccd: "079100578901", phone: "0930789015", email: "tlinh.nguyen@servicehub.vn", origin: "Hà Nội", address: "17 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "MCK Nghiêm Vũ", gender: "Nam", birth: "1999-03-02", cccd: "079099589012", phone: "0971890126", email: "mck.nghiem@servicehub.vn", origin: "Hà Nội", address: "39 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "HIEUTHUHAI Trần Minh", gender: "Nam", birth: "1999-09-28", cccd: "079099590123", phone: "0902901238", email: "hieu.thu2@servicehub.vn", origin: "TP.HCM", address: "15 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM" },
    { name: "Rhyder Quang Anh", gender: "Nam", birth: "2001-03-18", cccd: "079001601234", phone: "0913012349", email: "rhyder.qa@servicehub.vn", origin: "Thanh Hóa", address: "22 Chu Mạnh Trinh, Phường Bến Nghé, Quận 1, TP.HCM" }
];

// Danh sách 25 Nhà cung cấp với hồ sơ kinh doanh và địa chỉ thực tế
const realProviders = [
    // 10 Property Managers
    { id: 1, name: "Quản lý Vinhomes Central Park", company: "Công ty Cổ phần Quản lý Bất động sản Vinhomes", type: "PROPERTY_MANAGER", mst: "0105875412", license: "0105875412-001", rep: "Nguyễn Diệu Linh", pos: "Tổng Giám Đốc", phone: "0918000001", email: "support@vinhomes.vn", address: "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM", bank: "MB Bank", card: "0888999111" },
    { id: 2, name: "Ký túc xá Cỏ May", company: "Doanh nghiệp Tư nhân Quản lý KTX Cỏ May", type: "PROPERTY_MANAGER", mst: "0312456789", license: "0312456789-GP", rep: "Phạm Văn Bên", pos: "Chủ Quản KTX", phone: "0918000002", email: "banquanly@comay.edu.vn", address: "Khu đô thị Đại học Quốc gia, Phường Linh Trung, TP. Thủ Đức, TP.HCM", bank: "Vietcombank", card: "0071001234567" },
    { id: 3, name: "Căn hộ dịch vụ CityHouse", company: "Công ty Cổ phần Dịch vụ Lưu trú CityHouse", type: "PROPERTY_MANAGER", mst: "0314892301", license: "0314892301-KD", rep: "Trần Anh Tuấn", pos: "Giám Đốc Vận Hành", phone: "0918000003", email: "booking@cityhouseapartment.com", address: "17 Phạm Ngọc Thạch, Phường Võ Thị Sáu, Quận 3, TP.HCM", bank: "Techcombank", card: "19034567890012" },
    { id: 4, name: "Masteri Thảo Điền Property", company: "Công ty TNHH Quản lý BĐS Masterise Property", type: "PROPERTY_MANAGER", mst: "0313567812", license: "0313567812-DK", rep: "Lê Hoàng Quân", pos: "Giám Đốc Dự Án", phone: "0918000004", email: "contact@masterisehomes.com", address: "159 Xa Lộ Hà Nội, Phường Thảo Điền, TP. Thủ Đức, TP.HCM", bank: "Techcombank", card: "19123456789013" },
    { id: 5, name: "Hệ thống chung cư Eco Green", company: "Công ty Cổ phần Đầu tư Bất động sản Xuân Mai Sài Gòn", type: "PROPERTY_MANAGER", mst: "0314789023", license: "0314789023-BDS", rep: "Đỗ Thành Long", pos: "Phó Tổng Giám Đốc", phone: "0918000005", email: "cskh@ecogreen-saigon.vn", address: "39/8B Nguyễn Văn Linh, Phường Tân Thuận Tây, Quận 7, TP.HCM", bank: "BIDV", card: "12410005678901" },
    { id: 6, name: "Nhà ở xã hội EHome Nam Long", company: "Công ty Cổ phần Đầu tư Nam Long", type: "PROPERTY_MANAGER", mst: "0301452398", license: "0301452398-NL", rep: "Nguyễn Xuân Quang", pos: "Chủ Tịch HĐQT", phone: "0918000006", email: "hotro@namlongvn.com", address: "Hồ Học Lãm, Phường An Lạc, Quận Bình Tân, TP.HCM", bank: "Vietcombank", card: "0181002345678" },
    { id: 7, name: "Khu căn hộ Sunrise City", company: "Tập đoàn Đầu tư Địa ốc No Va", type: "PROPERTY_MANAGER", mst: "0301449938", license: "0301449938-NVL", rep: "Bùi Thành Nhơn", pos: "Đại Diện Pháp Luật", phone: "0918000007", email: "customerservice@novaland.com.vn", address: "23 Nguyễn Hữu Thọ, Phường Tân Hưng, Quận 7, TP.HCM", bank: "VPBank", card: "10987654321001" },
    { id: 8, name: "KTX Sinh viên ĐHQG TP.HCM", company: "Trung tâm Quản lý Ký túc xá ĐHQG TP.HCM", type: "PROPERTY_MANAGER", mst: "0305678912", license: "0305678912-DH", rep: "Tăng Hữu Thủy", pos: "Giám Đốc Trung Tâm", phone: "0918000008", email: "ktx@vnuhcm.edu.vn", address: "Khu phố 6, Phường Linh Trung, TP. Thủ Đức, TP.HCM", bank: "Agribank", card: "6100205123456" },
    { id: 9, name: "Hệ thống Nhà trọ Sinh Viên Thủ Đức", company: "Hộ kinh doanh Nhà trọ Hoàng Phát", type: "PROPERTY_MANAGER", mst: "8123456789", license: "8123456789-HKD", rep: "Vũ Văn Phát", pos: "Chủ Hộ Kinh Doanh", phone: "0918000009", email: "trohoangphat@gmail.com", address: "45 Đường số 8, Phường Linh Trung, TP. Thủ Đức, TP.HCM", bank: "ACB", card: "2456789012" },
    { id: 10, name: "Căn hộ mini Hàng Xanh Residence", company: "Công ty TNHH Bất Động Sản An Khang", type: "PROPERTY_MANAGER", mst: "0316789012", license: "0316789012-AK", rep: "Hoàng Minh Trí", pos: "Giám Đốc", phone: "0918000010", email: "ankhangresidence@gmail.com", address: "185 Xô Viết Nghệ Tĩnh, Phường 17, Bình Thạnh, TP.HCM", bank: "MB Bank", card: "099988877766" },

    // 15 External Services
    { id: 11, name: "Dịch vụ giặt ủi Sakura", company: "Công ty TNHH Giặt ủi Công nghệ Sakura", type: "EXTERNAL_SERVICE", mst: "0315678901", license: "0315678901-SK", rep: "Đặng Thị Thảo", pos: "Giám Đốc Điều Hành", phone: "0918000011", email: "giatsakurasaigon@gmail.com", address: "88 Nơ Trang Long, Phường 14, Bình Thạnh, TP.HCM", bank: "Vietcombank", card: "0071009876543" },
    { id: 12, name: "Vệ sinh Hoàn Mỹ", company: "Công ty Cổ phần Vệ sinh Môi trường Hoàn Mỹ", type: "EXTERNAL_SERVICE", mst: "0102345678", license: "0102345678-HM", rep: "Lê Văn Cường", pos: "Tổng Giám Đốc", phone: "0918000012", email: "info@vesinhhoanmy.vn", address: "25 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM", bank: "BIDV", card: "12010009876543" },
    { id: 13, name: "Điện nước Minh Trí", company: "Hộ kinh doanh Kỹ thuật Điện Nước Minh Trí", type: "EXTERNAL_SERVICE", mst: "8234567890", license: "8234567890-MT", rep: "Nguyễn Minh Trí", pos: "Kỹ Thuật Trưởng", phone: "0918000013", email: "diennuocminhtri@gmail.com", address: "142 Âu Cơ, Phường 9, Tân Bình, TP.HCM", bank: "Techcombank", card: "19023456789123" },
    { id: 14, name: "Điện lạnh Á Châu", company: "Công ty TNHH Cơ điện lạnh Á Châu", type: "EXTERNAL_SERVICE", mst: "0313456789", license: "0313456789-AC", rep: "Trần Thanh Bình", pos: "Giám Đốc Kỹ Thuật", phone: "0918000014", email: "dienlanhachau@gmail.com", address: "450 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM", bank: "ACB", card: "34567890123" },
    { id: 15, name: "Dọn dẹp JupViec", company: "Công ty Cổ phần Dịch vụ Gia đình JupViec.vn", type: "EXTERNAL_SERVICE", mst: "0106034567", license: "0106034567-JV", rep: "Phan Hồng Minh", pos: "Tổng Giám Đốc", phone: "0918000015", email: "dvkh@jupviec.vn", address: "Tòa nhà 27B Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP.HCM", bank: "MB Bank", card: "088812345678" },
    { id: 16, name: "Diệt côn trùng Rentokil", company: "Công ty TNHH Rentokil Initial Việt Nam", type: "EXTERNAL_SERVICE", mst: "0304567890", license: "0304567890-RI", rep: "Nguyễn Thị Phương Thảo", pos: "Tổng Giám Đốc", phone: "0918000016", email: "ihs-custcare-vn@rentokil-initial.com", address: "Lầu 3 Tòa nhà Hà Đô, 2 Hồng Hà, Phường 2, Tân Bình, TP.HCM", bank: "HSBC", card: "001234567001" },
    { id: 17, name: "Đại lý Nước suối AquaWater", company: "Hộ kinh doanh Nước uống AquaWater", type: "EXTERNAL_SERVICE", mst: "8345678901", license: "8345678901-AQ", rep: "Lê Thị Thu", pos: "Chủ Cơ Sở", phone: "0918000017", email: "aquawater.hcm@gmail.com", address: "55 Lạc Long Quân, Phường 3, Quận 11, TP.HCM", bank: "Vietcombank", card: "0071005544332" },
    { id: 18, name: "Sửa khóa nhanh 24/7", company: "Hộ kinh doanh Cứu hộ khóa 24/7", type: "EXTERNAL_SERVICE", mst: "8456789012", license: "8456789012-SK", rep: "Bùi Quốc Hùng", pos: "Thợ Khóa Trưởng", phone: "0918000018", email: "suakhoanhanh247@gmail.com", address: "230 Quang Trung, Phường 10, Gò Vấp, TP.HCM", bank: "VPBank", card: "109823456789" },
    { id: 19, name: "Camera quan sát Đạt Phát", company: "Công ty TNHH Viễn thông & An ninh Đạt Phát", type: "EXTERNAL_SERVICE", mst: "0316890123", license: "0316890123-DP", rep: "Ngô Tấn Đạt", pos: "Giám Đốc", phone: "0918000019", email: "cameradatphat@gmail.com", address: "123 Lũy Bán Bích, Phường Tân Thới Hòa, Tân Phú, TP.HCM", bank: "Techcombank", card: "1905678901234" },
    { id: 20, name: "Internet Cáp Quang Viettel", company: "Chi nhánh Tổng Công ty Viễn thông Viettel TP.HCM", type: "EXTERNAL_SERVICE", mst: "0100109106-001", license: "0100109106-VT", rep: "Đỗ Minh Phương", pos: "Phó Giám Đốc", phone: "0918000020", email: "cskh@viettel.com.vn", address: "285 Cách Mạng Tháng 8, Phường 12, Quận 10, TP.HCM", bank: "MB Bank", card: "000011112222" },
    { id: 21, name: "Bảo vệ Hoàng Long Security", company: "Công ty TNHH Dịch vụ Bảo vệ Chuyên nghiệp Hoàng Long", type: "EXTERNAL_SERVICE", mst: "0312901234", license: "0312901234-HL", rep: "Hoàng Đức Long", pos: "Chủ Tịch", phone: "0918000021", email: "hoanglongsecurity@gmail.com", address: "155 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM", bank: "BIDV", card: "13510001234567" },
    { id: 22, name: "Chuyển nhà Thành Hưng Sài Gòn", company: "Công ty Cổ phần Tập đoàn Vận tải Thành Hưng", type: "EXTERNAL_SERVICE", mst: "0303456789", license: "0303456789-TH", rep: "Nguyễn Văn Hưng", pos: "Tổng Giám Đốc", phone: "0918000022", email: "taxitaithanhhung@gmail.com", address: "1A Đường 22, Phường Linh Đông, TP. Thủ Đức, TP.HCM", bank: "VietinBank", card: "101800123456" },
    { id: 23, name: "Nội thất Xinh Decor", company: "Công ty Cổ phần Kiến trúc & Nội thất Xinh", type: "EXTERNAL_SERVICE", mst: "0314012345", license: "0314012345-NX", rep: "Phạm Hải Đăng", pos: "Giám Đốc Thiết Kế", phone: "0918000023", email: "noithatxinh@gmail.com", address: "200 Ba Tháng Hai, Phường 12, Quận 10, TP.HCM", bank: "Sacombank", card: "060123456789" },
    { id: 24, name: "Suất ăn công nghiệp Tâm Phát", company: "Công ty Cổ phần Cung cấp Thực phẩm Tâm Phát", type: "EXTERNAL_SERVICE", mst: "0315123456", license: "0315123456-TP", rep: "Trần Văn Tâm", pos: "Giám Đốc Sản Xuất", phone: "0918000024", email: "suatantamphat@gmail.com", address: "Lô B2 KCN Tân Bình, Phường Tây Thạnh, Tân Phú, TP.HCM", bank: "Vietcombank", card: "0071004455667" },
    { id: 25, name: "Sửa máy tính & mạng ITCare", company: "Hộ kinh doanh Dịch vụ Tin học ITCare", type: "EXTERNAL_SERVICE", mst: "8567890123", license: "8567890123-IT", rep: "Vũ Đình Trọng", pos: "Kỹ Thuật Viên Trưởng", phone: "0918000025", email: "itcare.tphcm@gmail.com", address: "58 Hoàng Hoa Thám, Phường 7, Bình Thạnh, TP.HCM", bank: "TPBank", card: "01234567891" },
];

async function main() {
    console.log("--> Đang seed Identity Service...");
    const passwordHash = await bcrypt.hash("123456", 10);
    const adminPasswordHash = await bcrypt.hash("88888888", 10);

    // 1. CLEAR DỮ LIỆU CŨ THEO ĐÚNG THỨ TỰ PHỤ THUỘC
    await prisma.providerLegalDocument.deleteMany();
    await prisma.provider.deleteMany();
    await prisma.identityDocument.deleteMany();
    await prisma.identityVerification.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.role.deleteMany();

    // 2. ROLES (CHUẨN TÊN ĐỂ KHỚP VỚI ROLESGUARD VÀ JWT STRATEGY: 'ADMIN', 'CUSTOMER', 'PROVIDER')
    await prisma.role.createMany({
        data: [
            { id: roleIds.ADMIN, name: "ADMIN", description: "Quản trị viên toàn hệ thống", createdAt: now, updatedAt: now },
            { id: roleIds.CUSTOMER, name: "CUSTOMER", description: "Khách hàng sử dụng dịch vụ và thuê phòng", createdAt: now, updatedAt: now },
            { id: roleIds.PROVIDER, name: "PROVIDER", description: "Nhà cung cấp dịch vụ và quản lý bất động sản", createdAt: now, updatedAt: now },
        ],
        skipDuplicates: true,
    });

    // 3. PERMISSIONS
    const permissions = [
        ["identity.read", "identity", "read", "Xem thông tin danh tính"],
        ["identity.manage", "identity", "manage", "Quản lý thông tin danh tính"],
        ["provider.read", "provider", "read", "Xem hồ sơ nhà cung cấp"],
        ["provider.manage", "provider", "manage", "Quản lý hồ sơ nhà cung cấp"],
        ["catalog.read", "catalog", "read", "Xem danh mục và dịch vụ"],
        ["catalog.manage", "catalog", "manage", "Quản lý danh mục và dịch vụ"],
        ["contract.read", "contract", "read", "Xem hợp đồng"],
        ["contract.manage", "contract", "manage", "Tạo và quản lý hợp đồng"],
        ["billing.read", "billing", "read", "Xem hóa đơn"],
        ["billing.manage", "billing", "manage", "Quản lý hóa đơn và thanh toán"],
        ["notification.read", "notification", "read", "Xem thông báo"],
        ["notification.manage", "notification", "manage", "Gửi và quản lý thông báo"],
        ["audit.read", "audit", "read", "Xem nhật ký kiểm toán"],
        ["system.manage", "system", "manage", "Quản trị hệ thống"],
    ] as const;

    await prisma.permission.createMany({
        data: permissions.map(([code, resource, action, description], index) => ({
            id: permissionId(index + 1), code, resource, action, description, createdAt: now,
        })),
        skipDuplicates: true,
    });

    const allPermissionIds = permissions.map((_, index) => permissionId(index + 1));
    const providerPermissionIds = [3, 4, 5, 6, 7, 8, 9, 10, 11].map(permissionId);
    const customerPermissionIds = [1, 3, 5, 7, 9, 11].map(permissionId);

    await prisma.rolePermission.createMany({
        data: [
            ...allPermissionIds.map((pId) => ({ roleId: roleIds.ADMIN, permissionId: pId })),
            ...providerPermissionIds.map((pId) => ({ roleId: roleIds.PROVIDER, permissionId: pId })),
            ...customerPermissionIds.map((pId) => ({ roleId: roleIds.CUSTOMER, permissionId: pId })),
        ],
        skipDuplicates: true,
    });

    // 4. IDENTITIES
    // Admin 1 (admin@servicehub.vn - Pass 123456) & Admin 2 (admin@servicehub.com - Pass 88888888)
    const adminIdentities = [
        { id: userId(1), email: "admin@servicehub.vn", phone: "0900000001", passwordHash, roleId: roleIds.ADMIN, status: "ACTIVE" as const, isEkycVerified: true, createdAt: now, updatedAt: now },
        { id: userId(2), email: "admin@servicehub.com", phone: "0900000000", passwordHash: adminPasswordHash, roleId: roleIds.ADMIN, status: "ACTIVE" as const, isEkycVerified: true, createdAt: now, updatedAt: now },
    ];

    // Customers (60 khách hàng thật)
    const customerIdentities = realCustomers.map((c, i) => ({
        id: userId(101 + i),
        email: c.email,
        phone: c.phone,
        passwordHash,
        roleId: roleIds.CUSTOMER,
        status: "ACTIVE" as const,
        isEkycVerified: true,
        createdAt: now,
        updatedAt: now,
    }));

    // Providers (25 nhà cung cấp)
    const providerIdentities = realProviders.map((p, i) => ({
        id: userId(201 + i),
        email: p.email,
        phone: p.phone,
        passwordHash,
        roleId: roleIds.PROVIDER,
        status: (p.id === 24 ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE", // Provider 24 inactive
        isEkycVerified: p.id !== 25, // Provider 25 chưa eKYC
        createdAt: now,
        updatedAt: now,
    }));

    await prisma.identity.createMany({
        data: [...adminIdentities, ...customerIdentities, ...providerIdentities],
        skipDuplicates: true,
    });

    // 5. PROVIDERS (Thực thể kinh doanh)
    const providers = realProviders.map((p, i) => {
        const isCompany = p.company.includes("Công ty") || p.company.includes("Tập đoàn");
        return {
            id: providerId(p.id),
            identityId: userId(201 + i),
            providerName: p.name,
            companyName: p.company,
            description: `Dịch vụ chuyên nghiệp hàng đầu: ${p.name}`,
            phone: p.phone,
            email: p.email,
            address: p.address,
            representativeName: p.rep,
            representativePosition: p.pos,
            businessType: isCompany ? "COMPANY" as const : "INDIVIDUAL" as const,
            providerType: p.type as "PROPERTY_MANAGER" | "EXTERNAL_SERVICE",
            status: (p.id === 24 ? "SUSPENDED" : (p.id === 25 ? "PENDING" : "ACTIVE")) as "ACTIVE" | "PENDING" | "SUSPENDED",
            taxCode: p.mst,
            businessLicenseNumber: p.license,
            numberCard: p.card,
            nameBank: p.bank,
            website: `https://${p.email.split("@")[1]}`,
            createdAt: now,
            updatedAt: now,
        };
    });

    await prisma.provider.createMany({
        data: providers,
        skipDuplicates: true,
    });

    // 6. EKYC CHO KHÁCH HÀNG & NHÀ CUNG CẤP
    const verifications = [];
    const idDocs = [];

    // Cho 60 khách hàng
    for (let i = 0; i < realCustomers.length; i++) {
        const c = realCustomers[i];
        const vId = verificationId(101 + i);
        verifications.push({
            id: vId,
            identityId: userId(101 + i),
            provider: "Hệ thống định danh điện tử VNeID / BCA",
            referenceId: `REF-VNEID-${101 + i}`,
            verificationLevel: "MỨC ĐỘ 2",
            status: "VERIFIED" as const,
            faceSimilarity: 98.75,
            livenessScore: 99.20,
            failureReason: null,
            verifiedAt: now,
            expiredAt: new Date("2035-12-31"),
            createdAt: now,
        });

        idDocs.push({
            id: identityDocumentId(101 + i),
            verificationId: vId,
            documentType: "Thẻ Căn cước công dân gắn chíp",
            documentNumber: c.cccd,
            fullName: c.name,
            dateOfBirth: new Date(c.birth),
            gender: c.gender,
            nationality: "Việt Nam",
            placeOfOrigin: c.origin,
            placeOfResidence: c.address,
            issueDate: new Date("2021-06-15"),
            expiryDate: new Date("2035-12-31"),
            issuingAuthority: "Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
            frontImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/cccd_front_${101 + i}.jpg`,
            backImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/cccd_back_${101 + i}.jpg`,
            selfieImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/selfie_${101 + i}.jpg`,
            createdAt: now,
        });
    }

    // Cho 25 Providers
    for (let i = 0; i < realProviders.length; i++) {
        const p = realProviders[i];
        const vId = verificationId(201 + i);
        verifications.push({
            id: vId,
            identityId: userId(201 + i),
            provider: "Hệ thống định danh doanh nghiệp quốc gia",
            referenceId: `REF-PROV-${201 + i}`,
            verificationLevel: "DOANH_NGHIEP_CHUAN",
            status: (p.id === 25 ? "PENDING" : "VERIFIED") as any,
            faceSimilarity: 99.00,
            livenessScore: 99.50,
            failureReason: null,
            verifiedAt: p.id === 25 ? null : now,
            expiredAt: new Date("2035-12-31"),
            createdAt: now,
        });

        idDocs.push({
            id: identityDocumentId(201 + i),
            verificationId: vId,
            documentType: "CCCD Người đại diện pháp luật",
            documentNumber: `0790${String(80000000 + i)}`,
            fullName: p.rep,
            dateOfBirth: new Date("1980-05-10"),
            gender: "Nam",
            nationality: "Việt Nam",
            placeOfOrigin: "TP. Hồ Chí Minh",
            placeOfResidence: p.address,
            issueDate: new Date("2021-04-10"),
            expiryDate: new Date("2035-12-31"),
            issuingAuthority: "Cục Cảnh sát QLHC về TTXH",
            frontImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/prov_cccd_front_${201 + i}.jpg`,
            backImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/prov_cccd_back_${201 + i}.jpg`,
            selfieImageUrl: `https://res.cloudinary.com/servicehub/image/upload/ekyc/prov_selfie_${201 + i}.jpg`,
            createdAt: now,
        });
    }

    await prisma.identityVerification.createMany({ data: verifications, skipDuplicates: true });
    await prisma.identityDocument.createMany({ data: idDocs, skipDuplicates: true });

    // 7. PROVIDER LEGAL DOCUMENTS (Giấy phép kinh doanh, MST, PCCC)
    const legalDocs = [];
    for (let i = 0; i < realProviders.length; i++) {
        const p = realProviders[i];
        // Giấy chứng nhận ĐKKD
        legalDocs.push({
            id: providerLegalDocumentId(i * 3 + 1),
            providerId: providerId(p.id),
            documentType: "BUSINESS_LICENSE" as const,
            documentName: "Giấy chứng nhận đăng ký doanh nghiệp / Hộ kinh doanh",
            documentNumber: p.license,
            fileUrl: `https://res.cloudinary.com/servicehub/raw/upload/legal/license_${p.id}.pdf`,
            issueDate: new Date("2020-01-15"),
            expiryDate: new Date("2035-01-15"),
            verificationStatus: (p.id === 25 ? "PENDING" : "VERIFIED") as any,
            verifiedBy: p.id === 25 ? null : userId(1),
            verifiedAt: p.id === 25 ? null : now,
            note: "Hồ sơ ĐKKD hợp lệ được kiểm tra qua cổng thông tin quốc gia.",
            createdAt: now,
        });

        // Giấy chứng nhận đăng ký thuế
        legalDocs.push({
            id: providerLegalDocumentId(i * 3 + 2),
            providerId: providerId(p.id),
            documentType: "TAX_CERTIFICATE" as const,
            documentName: "Giấy chứng nhận đăng ký thuế",
            documentNumber: p.mst,
            fileUrl: `https://res.cloudinary.com/servicehub/raw/upload/legal/tax_${p.id}.pdf`,
            issueDate: new Date("2020-01-20"),
            expiryDate: new Date("2035-01-20"),
            verificationStatus: (p.id === 25 ? "PENDING" : "VERIFIED") as any,
            verifiedBy: p.id === 25 ? null : userId(1),
            verifiedAt: p.id === 25 ? null : now,
            note: "Mã số thuế đang hoạt động trên hệ thống Tổng cục Thuế.",
            createdAt: now,
        });

        // Giấy chứng nhận PCCC hoặc đủ điều kiện kinh doanh
        legalDocs.push({
            id: providerLegalDocumentId(i * 3 + 3),
            providerId: providerId(p.id),
            documentType: "OTHER" as const,
            documentName: p.type === "PROPERTY_MANAGER" ? "Giấy chứng nhận đủ điều kiện PCCC" : "Giấy chứng nhận an toàn vệ sinh / dịch vụ",
            documentNumber: `PCCC-2020-${String(p.id).padStart(4, "0")}`,
            fileUrl: `https://res.cloudinary.com/servicehub/raw/upload/legal/pccc_${p.id}.pdf`,
            issueDate: new Date("2020-02-10"),
            expiryDate: new Date("2030-02-10"),
            verificationStatus: (p.id === 25 ? "PENDING" : "VERIFIED") as any,
            verifiedBy: p.id === 25 ? null : userId(1),
            verifiedAt: p.id === 25 ? null : now,
            note: "Đạt tiêu chuẩn an toàn PCCC theo Nghị định 136/2020/NĐ-CP.",
            createdAt: now,
        });
    }

    await prisma.providerLegalDocument.createMany({ data: legalDocs, skipDuplicates: true });

    console.log(`✅ Seed identity-service thành công: 2 Admins, ${realCustomers.length} Customers, ${realProviders.length} Providers, ${legalDocs.length} Giấy tờ pháp lý.`);
}

main()
    .catch((e) => {
        console.error("Lỗi seed identity-service:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
