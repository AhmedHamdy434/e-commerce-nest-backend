import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AppRole } from '../../common/enums/app-role.enum';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  comparePassword,
  hashPassword,
} from '../../common/utils/password.util';
import { userSelect } from './constants/auth.select';

interface OtpData {
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly otpStore = new Map<string, OtpData>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // sign up
  async signup(signupDto: SignupDto) {
    const { email, password, name, image } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مسجل بالفعل.');
    }

    const hashedPassword = await hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        image: image ?? null,
        role: AppRole.USER,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as AppRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  // log in
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as AppRole,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  /**
   * جلب الملف الشخصي للمستخدم عبر معرفه (User Profile)
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود.');
    }

    return user;
  }

  /**
   * تغيير كلمة المرور للمستخدم المسجل حالياً
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود.');
    }

    const isMatch = await comparePassword(dto.currentPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.',
      );
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: 'تم تغيير كلمة المرور بنجاح.',
    };
  }

  /**
   * طلب استعادة كلمة المرور عبر إرسال رمز OTP
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    let otp: string | undefined;

    // توليد الرمز وتخزينه فقط إذا كان الحساب مسجلاً، دون كشف وجود الحساب للمستخدم
    if (user) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      this.otpStore.set(email, { otp, expiresAt });
    }

    return {
      message: 'تم إرسال رمز التحقق بنجاح إلى البريد الإلكتروني.',
      ...(process.env.NODE_ENV !== 'production' && otp ? { otp } : {}),
    };
  }

  /**
   * إعادة تعيين كلمة المرور باستخدام رمز OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const otpRecord = this.otpStore.get(email);

    if (!user || !otpRecord || otpRecord.otp !== otp) {
      throw new BadRequestException('رمز التحقق غير صحيح أو غير صالح.');
    }

    if (new Date() > otpRecord.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('لقد انتهت صلاحية رمز التحقق.');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    this.otpStore.delete(email);

    return {
      message: 'تم إعادة تعيين كلمة المرور بنجاح.',
    };
  }
}
