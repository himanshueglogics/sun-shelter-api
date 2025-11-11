import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

import sendEmail from '../utils/sendEmail.js';

class AuthService {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
  }

  // Validate reset token without changing password
  async validateResetToken(resetToken) {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired token');
    }
    return { valid: true };
  }

  // Register new user
  async register(userData) {
    const { name, email, password, role } = userData;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user (hash password)
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name || 'Admin User',
        phone,
        email,
        password: hashed,
        role: role || 'admin',
        createdAt: new Date()
      }
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  // Login user
  async login(email, password) {
    // Check for user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Restrict login to super_admin only
    if (user.role !== 'super_admin') {
      throw new Error('Not authorized');
    }

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  // Get current user
  async getCurrentUser(userId) {
    const id = typeof userId === 'string' ? Number(userId) : userId;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Forgot password
  async forgotPassword(email, baseUrl) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    // Restrict forgot-password to super_admin only
    if (user.role !== 'super_admin') {
      throw new Error('Not authorized');
    }

    // Generate reset token and persist via Prisma
    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashed,
        resetPasswordExpire: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    // Create reset url with safe base
    const clientBase = baseUrl || process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientBase.replace(/\/$/, '')}/reset-password/${resetToken}`;

    const message = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; padding: 24px; background: #f9fafb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;">
          <tr>
            <td style="padding: 24px 24px 0 24px;">
              <h2 style="margin: 0 0 8px 0; font-size: 22px;">Reset your Sun Shelter password</h2>
              <p style="margin: 0 0 16px 0; color: #374151;">You requested a password reset. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 8px 24px;">
              <p style="margin: 0 0 8px 0; color: #374151;">Or copy and paste this URL into your browser:</p>
              <p style="margin: 0; word-break: break-all; color: #2563eb;"><a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 24px 24px;">
              <p style="margin: 0; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Sun Shelter password',
        html: message
      });

      return { message: 'Email sent' };
    } catch (err) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: null, resetPasswordExpire: null }
      });
      throw new Error('Email could not be sent');
    }
  }

  // Reset password
  async resetPassword(resetToken, newPassword) {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { gt: new Date() }
      }
    });

    if (!user) {
      throw new Error('Invalid or expired token');
    }

    // Set new password (hash)
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash, resetPasswordToken: null, resetPasswordExpire: null }
    });

    const token = this.generateToken(updated.id);

    return {
      token,
      user: {
        _id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role
      }
    };
  }
}

export default new AuthService();

