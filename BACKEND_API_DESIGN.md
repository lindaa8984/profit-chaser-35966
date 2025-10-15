# Backend API Design - نظام إدارة العقارات DIG

## 📋 نظرة عامة
هذا المستند يحتوي على التصميم الكامل للـ Backend المطلوب لنظام إدارة العقارات.

---

## 🗄️ هيكل قاعدة البيانات (Database Schema)

### 1. جدول المستخدمين (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2. جدول العقارات (properties)
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('residential', 'commercial', 'industrial', 'mixed')),
    total_units INTEGER NOT NULL DEFAULT 0,
    building_year INTEGER,
    total_area DECIMAL(10, 2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_maintenance')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_type ON properties(property_type);
```

### 3. جدول الوحدات (units)
```sql
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    floor_number INTEGER,
    unit_type VARCHAR(50) CHECK (unit_type IN ('apartment', 'villa', 'office', 'shop', 'warehouse')),
    bedrooms INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    area DECIMAL(10, 2),
    monthly_rent DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
```

### 4. جدول العملاء (clients)
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    nationality VARCHAR(50),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    client_type VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
    company_name VARCHAR(200),
    tax_number VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_national_id ON clients(national_id);
```

### 5. جدول العقود (contracts)
```sql
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    unit_id UUID REFERENCES units(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) DEFAULT 0,
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'card')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    contract_terms TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_unit ON contracts(unit_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);
```

### 6. جدول المدفوعات (payments)
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'rent' CHECK (payment_type IN ('rent', 'deposit', 'maintenance', 'penalty', 'other')),
    payment_method VARCHAR(20) DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'card')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'late', 'cancelled')),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_dates ON payments(payment_date, due_date);
```

### 7. جدول الصيانة (maintenance_requests)
```sql
CREATE TABLE maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES units(id),
    property_id UUID REFERENCES properties(id),
    client_id UUID REFERENCES clients(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) CHECK (category IN ('plumbing', 'electrical', 'hvac', 'structural', 'general', 'other')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    reported_date DATE NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    assigned_to VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_unit ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);
```

### 8. جدول سجل التغييرات (audit_log)
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin|user|viewer",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Role Permissions
- **admin**: كل الصلاحيات (CRUD على كل الجداول)
- **user**: قراءة/إضافة/تعديل (لا يمكن حذف العقارات أو المستخدمين)
- **viewer**: قراءة فقط

---

## 🌐 API Endpoints

### Base URL
```
http://your-vps-domain.com/api/v1
```

### 1. Authentication Endpoints

#### 1.1 تسجيل الدخول
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "اسم المستخدم",
      "role": "admin"
    }
  }
}

Response 401:
{
  "success": false,
  "error": "بيانات الدخول غير صحيحة"
}
```

#### 1.2 تسجيل مستخدم جديد
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "fullName": "اسم المستخدم",
  "phone": "+966501234567",
  "role": "user"
}

Response 201:
{
  "success": true,
  "data": {
    "message": "تم إنشاء الحساب بنجاح",
    "userId": "uuid"
  }
}
```

#### 1.3 تحديث التوكن
```http
POST /auth/refresh
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "token": "new-jwt-token"
  }
}
```

#### 1.4 تسجيل الخروج
```http
POST /auth/logout
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "message": "تم تسجيل الخروج بنجاح"
  }
}
```

---

### 2. Properties Endpoints

#### 2.1 جلب كل العقارات
```http
GET /properties?page=1&limit=10&status=active&type=residential
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "uuid",
        "name": "عمارة النخيل",
        "address": "شارع الملك فهد، الرياض",
        "propertyType": "residential",
        "totalUnits": 24,
        "buildingYear": 2020,
        "totalArea": 5000.00,
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

#### 2.2 جلب عقار واحد
```http
GET /properties/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "عمارة النخيل",
    "address": "شارع الملك فهد، الرياض",
    "propertyType": "residential",
    "totalUnits": 24,
    "units": [
      {
        "id": "uuid",
        "unitNumber": "101",
        "status": "occupied",
        "monthlyRent": 3000.00
      }
    ]
  }
}
```

#### 2.3 إضافة عقار جديد
```http
POST /properties
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "عمارة الياسمين",
  "address": "شارع العليا، الرياض",
  "propertyType": "commercial",
  "totalUnits": 12,
  "buildingYear": 2022,
  "totalArea": 3000.00,
  "notes": "عقار تجاري في موقع استراتيجي"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "عمارة الياسمين",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.4 تحديث عقار
```http
PUT /properties/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "عمارة الياسمين المحدثة",
  "totalUnits": 15
}

Response 200:
{
  "success": true,
  "data": {
    "message": "تم تحديث العقار بنجاح"
  }
}
```

#### 2.5 حذف عقار (Admin فقط)
```http
DELETE /properties/{id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "message": "تم حذف العقار بنجاح"
  }
}
```

---

### 3. Units Endpoints

#### 3.1 جلب كل الوحدات
```http
GET /units?propertyId=uuid&status=vacant&page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "units": [
      {
        "id": "uuid",
        "propertyId": "uuid",
        "unitNumber": "201",
        "floorNumber": 2,
        "unitType": "apartment",
        "bedrooms": 2,
        "bathrooms": 2,
        "area": 120.50,
        "monthlyRent": 4000.00,
        "status": "vacant"
      }
    ],
    "pagination": {...}
  }
}
```

#### 3.2 إضافة وحدة جديدة
```http
POST /units
Authorization: Bearer {token}
Content-Type: application/json

{
  "propertyId": "uuid",
  "unitNumber": "305",
  "floorNumber": 3,
  "unitType": "apartment",
  "bedrooms": 3,
  "bathrooms": 2,
  "area": 150.00,
  "monthlyRent": 5000.00
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم إضافة الوحدة بنجاح"
  }
}
```

---

### 4. Clients Endpoints

#### 4.1 جلب كل العملاء
```http
GET /clients?search=محمد&isActive=true&page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "fullName": "محمد أحمد",
        "email": "mohamed@example.com",
        "phone": "+966501234567",
        "nationalId": "1234567890",
        "clientType": "individual",
        "isActive": true,
        "activeContracts": 2
      }
    ],
    "pagination": {...}
  }
}
```

#### 4.2 إضافة عميل جديد
```http
POST /clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "أحمد علي",
  "email": "ahmed@example.com",
  "phone": "+966509876543",
  "nationalId": "9876543210",
  "nationality": "سعودي",
  "address": "الرياض، حي الملقا",
  "clientType": "individual"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم إضافة العميل بنجاح"
  }
}
```

---

### 5. Contracts Endpoints

#### 5.1 جلب كل العقود
```http
GET /contracts?status=active&clientId=uuid&page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": "uuid",
        "contractNumber": "CNT-2024-001",
        "client": {
          "id": "uuid",
          "fullName": "محمد أحمد",
          "phone": "+966501234567"
        },
        "unit": {
          "id": "uuid",
          "unitNumber": "201",
          "property": "عمارة النخيل"
        },
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "monthlyRent": 4000.00,
        "status": "active"
      }
    ],
    "pagination": {...}
  }
}
```

#### 5.2 إضافة عقد جديد
```http
POST /contracts
Authorization: Bearer {token}
Content-Type: application/json

{
  "contractNumber": "CNT-2024-025",
  "clientId": "uuid",
  "unitId": "uuid",
  "startDate": "2024-06-01",
  "endDate": "2025-05-31",
  "monthlyRent": 5000.00,
  "securityDeposit": 5000.00,
  "paymentDay": 1,
  "paymentMethod": "bank_transfer"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم إنشاء العقد بنجاح"
  }
}
```

---

### 6. Payments Endpoints

#### 6.1 جلب كل المدفوعات
```http
GET /payments?contractId=uuid&status=pending&fromDate=2024-01-01&toDate=2024-12-31
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "contract": {
          "contractNumber": "CNT-2024-001",
          "client": "محمد أحمد"
        },
        "amount": 4000.00,
        "paymentDate": "2024-01-05",
        "dueDate": "2024-01-01",
        "paymentType": "rent",
        "status": "paid"
      }
    ],
    "summary": {
      "totalAmount": 48000.00,
      "paidAmount": 40000.00,
      "pendingAmount": 8000.00
    },
    "pagination": {...}
  }
}
```

#### 6.2 إضافة دفعة جديدة
```http
POST /payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "contractId": "uuid",
  "amount": 4000.00,
  "paymentDate": "2024-06-01",
  "dueDate": "2024-06-01",
  "paymentType": "rent",
  "paymentMethod": "bank_transfer",
  "status": "paid",
  "referenceNumber": "TRX123456"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم تسجيل الدفعة بنجاح"
  }
}
```

---

### 7. Maintenance Endpoints

#### 7.1 جلب كل طلبات الصيانة
```http
GET /maintenance?status=pending&priority=high&propertyId=uuid
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "title": "تسريب مياه في الحمام",
        "description": "يوجد تسريب في أنبوب الماء",
        "priority": "high",
        "category": "plumbing",
        "status": "in_progress",
        "unit": {
          "unitNumber": "305",
          "property": "عمارة النخيل"
        },
        "reportedDate": "2024-06-01",
        "estimatedCost": 500.00
      }
    ],
    "pagination": {...}
  }
}
```

#### 7.2 إضافة طلب صيانة جديد
```http
POST /maintenance
Authorization: Bearer {token}
Content-Type: application/json

{
  "unitId": "uuid",
  "propertyId": "uuid",
  "clientId": "uuid",
  "title": "عطل في التكييف",
  "description": "التكييف لا يعمل بشكل صحيح",
  "priority": "medium",
  "category": "hvac",
  "reportedDate": "2024-06-15",
  "estimatedCost": 800.00
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم إنشاء طلب الصيانة بنجاح"
  }
}
```

---

### 8. Reports Endpoints

#### 8.1 تقرير الإيرادات
```http
GET /reports/revenue?fromDate=2024-01-01&toDate=2024-12-31&groupBy=month
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "totalRevenue": 480000.00,
    "breakdown": [
      {
        "period": "2024-01",
        "revenue": 40000.00,
        "payments": 10
      },
      {
        "period": "2024-02",
        "revenue": 42000.00,
        "payments": 11
      }
    ]
  }
}
```

#### 8.2 تقرير الإشغال
```http
GET /reports/occupancy?propertyId=uuid
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "totalUnits": 50,
    "occupiedUnits": 42,
    "vacantUnits": 8,
    "occupancyRate": 84.0,
    "propertyBreakdown": [
      {
        "propertyId": "uuid",
        "propertyName": "عمارة النخيل",
        "totalUnits": 24,
        "occupiedUnits": 20,
        "occupancyRate": 83.33
      }
    ]
  }
}
```

#### 8.3 تقرير الصيانة
```http
GET /reports/maintenance?fromDate=2024-01-01&toDate=2024-12-31
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "totalRequests": 156,
    "completed": 120,
    "inProgress": 24,
    "pending": 12,
    "totalCost": 45000.00,
    "categoryBreakdown": [
      {
        "category": "plumbing",
        "count": 45,
        "totalCost": 12000.00
      }
    ]
  }
}
```

---

## 📊 Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (خطأ في البيانات المرسلة) |
| 401  | Unauthorized (غير مصرح) |
| 403  | Forbidden (ممنوع - صلاحيات غير كافية) |
| 404  | Not Found (غير موجود) |
| 409  | Conflict (تعارض - مثل رقم عقد مكرر) |
| 500  | Internal Server Error (خطأ في الخادم) |

---

## 🔒 Security Best Practices

1. **استخدم HTTPS فقط** للاتصال بـ API
2. **JWT Tokens** يجب أن تنتهي صلاحيتها بعد 24 ساعة
3. **Rate Limiting**: حد أقصى 100 طلب في الدقيقة لكل IP
4. **Input Validation**: تحقق من كل البيانات المرسلة قبل حفظها
5. **SQL Injection Protection**: استخدم Parameterized Queries دائماً
6. **Audit Log**: سجل كل العمليات الحساسة (إضافة/تعديل/حذف)
7. **Password Hashing**: استخدم bcrypt أو argon2 لتشفير كلمات المرور

---

## 📦 Recommended Backend Stack

- **Framework**: Express.js (Node.js) أو NestJS
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken library)
- **ORM**: Prisma أو TypeORM
- **Validation**: Joi أو Zod
- **Security**: Helmet.js, express-rate-limit
- **Documentation**: Swagger/OpenAPI

---

## 🚀 Next Steps

1. **إنشاء قاعدة البيانات**: نفذ SQL Scripts أعلاه على PostgreSQL في VPS
2. **تطوير Backend API**: استخدم التصميم أعلاه لكتابة الكود
3. **ربط Frontend**: سأساعدك بتعديل React Frontend للاتصال بـ API
4. **Testing**: اختبر كل Endpoint قبل النشر
5. **Deployment**: انشر Backend على VPS وربطه بـ Domain

---

## 📞 Support

إذا احتجت مساعدة في أي جزء من التطبيق، أخبرني! 🚀
