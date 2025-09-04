# HAR to Mockoon Converter

Tool này giúp bạn **chuyển đổi file HAR (HTTP Archive)** thành file cấu hình của [Mockoon](https://mockoon.com/), để dựng mock API từ dữ liệu request/response thật.

## 📂 Cấu trúc thư mục

```
├── convert.bat          # Script batch để chạy converter
├── har2mockoon.js       # Script chính xử lý convert HAR → Mockoon
├── input/               # Thư mục chứa các file HAR cần convert
├── output/              # Thư mục output cho các file được tạo
│   └── mockoon.json     # File cấu hình Mockoon sau khi convert
├── setup.bat            # Script cài đặt dependencies
├── node_modules/        # Thư viện Node.js
└── README.md            # Tài liệu hướng dẫn
```

## 🚀 Cách sử dụng

### 1. Cài đặt
Chạy script setup để cài đặt dependencies (chỉ cần 1 lần):
```bash
setup.bat
```

### 2. Convert file HAR
1. Đặt các file `.har` vào thư mục `input/`
2. Chạy converter:
   ```bash
   convert.bat
   ```
3. Tool sẽ:
   - Xử lý tất cả file `.har` trong thư mục `input/`
   - Chuyển đổi sang định dạng Mockoon
   - Merge các API mới vào `output/mockoon.json`
   - **Xóa các file HAR đã xử lý** khỏi thư mục `input/`

👉 Kết quả: sinh ra file `output/mockoon.json` có thể import vào Mockoon.

### 3. Thêm API mới
Để thêm API mới:
1. Đặt file `.har` mới vào thư mục `input/`
2. Chạy lại `convert.bat`
3. Các API mới sẽ được merge vào `mockoon.json` hiện có

> ⚠️ **Quan trọng**: Tool sẽ tự động xóa file HAR sau khi xử lý xong. Hãy backup file HAR nếu cần thiết.

> 💡 **Merge thông minh**: Tool tự động phát hiện API bị trùng và chỉ thêm mới, giữ nguyên cấu hình hiện có.

### 4. Sử dụng với Mockoon
- Mở **Mockoon app** hoặc **Mockoon CLI**
- Import file `output/mockoon.json`
- Chạy mock server và test API

## 📌 Ghi chú
- HAR file có thể export trực tiếp từ **Chrome DevTools** hoặc các tool proxy như **Fiddler**, **Charles**, **Postman**
- Tool xử lý tất cả file `.har` trong thư mục `input/` cùng lúc
- Mỗi file HAR được xử lý xong sẽ bị xóa để tránh xử lý lại
- Nếu muốn reset lại toàn bộ, hãy xóa `output/mockoon.json` và chạy lại từ bước **Convert file HAR**
- Tool tự động xử lý các HTTP method, status code và response type khác nhau
