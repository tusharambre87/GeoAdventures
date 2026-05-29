import { db } from "./db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";
import type { Request } from "express";

type AuditAction = 
  | 'login_success'
  | 'login_failed'
  | 'signup'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'admin_action'
  | 'admin_data_access'
  | 'sensitive_data_access'
  | 'email_change'
  | 'account_deletion'
  | 'rate_limit_exceeded';

interface AuditContext {
  userId?: string;
  action: AuditAction;
  resource?: string;
  details?: Record<string, any>;
  success?: boolean;
  req?: Request;
}

export async function logAudit(context: AuditContext): Promise<void> {
  try {
    const { userId, action, resource, details = {}, success = true, req } = context;
    
    const ipAddress = req 
      ? (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown')
      : undefined;
    
    const userAgent = req?.headers['user-agent'] || undefined;

    const logEntry: InsertAuditLog = {
      userId: userId || null,
      action,
      resource: resource || null,
      details,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      success,
    };

    await db.insert(auditLogs).values(logEntry);
    
    if (!success || action.includes('failed') || action === 'rate_limit_exceeded') {
      console.warn(`🔐 [Audit] ${action}:`, { 
        userId, 
        resource, 
        ip: ipAddress,
        success 
      });
    }
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export async function logLoginAttempt(
  req: Request, 
  email: string, 
  success: boolean, 
  userId?: string,
  reason?: string
): Promise<void> {
  await logAudit({
    userId,
    action: success ? 'login_success' : 'login_failed',
    resource: 'auth',
    details: { email, reason },
    success,
    req,
  });
}

export async function logAdminAction(
  req: Request,
  userId: string,
  actionType: string,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    action: 'admin_action',
    resource: 'admin',
    details: { actionType, ...details },
    success: true,
    req,
  });
}

export async function logSensitiveDataAccess(
  req: Request,
  userId: string | undefined,
  resource: string,
  details?: Record<string, any>
): Promise<void> {
  await logAudit({
    userId,
    action: 'sensitive_data_access',
    resource,
    details,
    success: true,
    req,
  });
}
