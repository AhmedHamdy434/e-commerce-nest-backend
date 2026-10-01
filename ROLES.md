# توثيق الصلاحيات والأدوار في المشروع (Project Roles Documentation)

يوضح هذا المستند جميع الأدوار (Roles) المعرفة في نظام المتجر الإلكتروني، طريقة تخزينها، وآلية التحقق منها وتطبيقها على مستوى المسارات (Endpoints).

---

## 1. نظرة عامة (Overview)

يعتمد نظام المصادقة والصلاحيات (Authentication & RBAC) في المشروع على:
1. **قاعدة البيانات (Prisma Schema):**
   - تم تعريف التعداد (Enum) باسم `Role` في ملف `prisma/schema.prisma`.
   - يحتوي جدول المستخدمين `User` على الحقل `role` بقيمة افتراضية `"USER"`.

2. **كود التطبيق (TypeScript Enum / Constant):**
   - تم تغليف الـ Enum داخل كائن ثابت `AppRole` في المسار:
     [`src/common/enums/app-role.enum.ts`](file:///d:/front/node/e-commerce-nest/src/common/enums/app-role.enum.ts).

---

## 2. قائمة الأدوار (Roles List)

| الدور (Role) | القيمة في الكود (`AppRole`) | القيمة في قاعدة البيانات | الوصف | الصلاحيات ونطاق الوصول |
| :--- | :--- | :--- | :--- | :--- |
| **مدير النظام (Admin)** | `AppRole.ADMIN` | `"ADMIN"` | مسؤول أو مدير لوحة التحكم للنظام والمتجر | - الوصول الكامل لمسارات الإدارة المسبوقة بـ `/admin/*`<br>- إدارة المنتجات، التصنيفات، الطلبات، والتقارير<br>- مسارات المصادقة الخاصة بالإدارة: `/admin/auth/*` |
| **المستخدم العادي (User)** | `AppRole.USER` | `"USER"` | العميل أو المشتري المسجل في المتجر | - تصفح المتجر، إضافة المنتجات للسلة، وإتمام عمليات الشراء<br>- إدارة الملف الشخصي، العناوين، وسجل الطلبات الخاصة به<br>- مسارات المصادقة الخاصة بالعميل: `/auth/*` |

---

## 3. تفاصيل المسارات المرتبطة بكل دور (Endpoints Matrix)

### أ) مسارات مصادقة المدير (`Admin Auth`)
المتحكم: [`admin-auth.controller.ts`](file:///d:/front/node/e-commerce-nest/src/modules/auth/admin-auth.controller.ts)  
البادئة: `/admin/auth`

| المسار (Route) | نوع الطلب (Method) | الدور المطلوب (Required Role) | الحماية (Guards) | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/auth/login` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | تسجيل دخول المدير والحصول على JWT Token |
| `/admin/auth/me` | `GET` | **`ADMIN`** | `JwtAuthGuard`, `RolesGuard` | جلب بيانات الملف الشخصي للمدير المسجل |
| `/admin/auth/change-password` | `PATCH` | **`ADMIN`** | `JwtAuthGuard` | تغيير كلمة المرور للمدير الحالي |
| `/admin/auth/forgot-password` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | طلب استعادة كلمة المرور وإرسال رمز OTP |
| `/admin/auth/reset-password` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | إعادة تعيين كلمة المرور باستخدام رمز OTP |

---

### ب) مسارات مصادقة المستخدم / العميل (`User Auth`)
المتحكم: [`auth.controller.ts`](file:///d:/front/node/e-commerce-nest/src/modules/auth/auth.controller.ts)  
البادئة: `/auth`

| المسار (Route) | نوع الطلب (Method) | الدور المطلوب (Required Role) | الحماية (Guards) | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/signup` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | تسجيل حساب جديد للعميل بصلاحية افتراضية `USER` |
| `/auth/login` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | تسجيل دخول العميل والحصول على JWT Token |
| `/auth/me` | `GET` | **`USER`** | `JwtAuthGuard`, `RolesGuard` | استرجاع بيانات الملف الشخصي للعميل |
| `/auth/change-password` | `PATCH` | **`USER`** | `JwtAuthGuard` | تغيير كلمة المرور للعميل الحالي |
| `/auth/forgot-password` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | طلب استعادة كلمة المرور وإرسال رمز OTP |
| `/auth/reset-password` | `POST` | متاح للجميع (Public) | `ThrottlerGuard` | إعادة تعيين كلمة المرور باستخدام رمز OTP |

---

## 4. كيفية حماية المسارات برمجياً (How to Protect Routes with Roles)

لحماية أي مسار برمجياً وجعله مقتصراً على دور معين، يتم استخدام الديكوريتور `@Roles` مع الحراس `JwtAuthGuard` و `RolesGuard`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AppRole } from '../../common/enums/app-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from './interfaces/authenticated-request.interface';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminProductsController {
  
  // مسار متاح للمدير فقط
  @Get()
  @Roles(AppRole.ADMIN)
  async getAllProductsForAdmin(@CurrentUser() user: RequestUser) {
    return { adminId: user.id, message: 'مرحباً بك في لوحة تحكم المنتجات' };
  }
}
```

---

## 5. هيكل حمولة التوكن (JWT Payload Structure)

عند تسجيل الدخول أو إنشاء الحساب، يتم تضمين الدور داخل التوكن وفق واجهة [`JwtPayload`](file:///d:/front/node/e-commerce-nest/src/modules/auth/interfaces/jwt-payload.interface.ts):

```typescript
export interface JwtPayload {
  sub: string;      // معرّف المستخدم (User ID)
  role: AppRole;    // دور المستخدم (ADMIN أو USER)
}
```

يقوم [`RolesGuard`](file:///d:/front/node/e-commerce-nest/src/common/guards/roles.guard.ts) بقراءة الدور من التوكن ومقارنته بالأدوار المحددة في `@Roles(...)`. في حال عدم التطابق، يتم إرجاع استجابة `403 Forbidden` برسالة:
`"ليس لديك الصلاحية للوصول إلى هذا المورد."`
