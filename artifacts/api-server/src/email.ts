import sgMail from '@sendgrid/mail';
import { storage } from './storage';

let connectionSettings: any;

function getBaseUrl(): string {
  return 'https://geoquestgame.live';
}

async function canSendEmail(email: string, emailType: 'weekly' | 'daily' | 'welcome'): Promise<boolean> {
  if (emailType === 'welcome') {
    return true;
  }
  
  const preferences = await storage.getEmailPreferences(email);
  if (!preferences) {
    return true;
  }
  
  if (!preferences.emailSubscribed) {
    console.log(`📧 Email blocked - user unsubscribed: ${email}`);
    return false;
  }
  
  if (emailType === 'weekly' && !preferences.weeklyProgressEmails) {
    console.log(`📧 Weekly email blocked - preference disabled: ${email}`);
    return false;
  }
  
  if (emailType === 'daily' && !preferences.dailyReminderEmails) {
    console.log(`📧 Daily email blocked - preference disabled: ${email}`);
    return false;
  }
  
  return true;
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getEmailFooter(email: string): string {
  const baseUrl = getBaseUrl();
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  return `
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; margin-top: 20px;">
      <p style="margin: 0 0 10px 0;">
        GeoQuest Games - Educational Geography for Kids Ages 5+<br>
        <a href="${baseUrl}/privacy" style="color: #6B7280;">Privacy Policy</a> | 
        <a href="${baseUrl}/terms" style="color: #6B7280;">Terms of Service</a>
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe from emails</a> | 
        <a href="${baseUrl}/email-preferences?email=${encodeURIComponent(email)}" style="color: #9CA3AF; text-decoration: underline;">Manage email preferences</a>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #D1D5DB;">
        You're receiving this email because you registered for GeoQuest Games.
      </p>
    </div>
  `;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    console.log(`📧 Attempting to send email from ${fromEmail} to ${options.to}`);
    
    await client.send({
      to: options.to,
      from: {
        email: fromEmail,
        name: 'GeoQuest Games'
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        }
      }
    });
    
    console.log(`📧 Email sent successfully to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send email:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export interface EmailWithAttachmentsOptions extends EmailOptions {
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
  }>;
}

export async function sendEmailWithAttachments(options: EmailWithAttachmentsOptions): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    console.log(`📧 Attempting to send email with attachments from ${fromEmail} to ${options.to}`);
    
    await client.send({
      to: options.to,
      from: {
        email: fromEmail,
        name: 'GeoQuest Games'
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      attachments: options.attachments,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        }
      }
    });
    
    console.log(`📧 Email with ${options.attachments?.length || 0} attachments sent successfully to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send email with attachments:', error);
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
      <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">One more step to start your adventure!</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi there!</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Thank you for signing up for GeoQuest Games! Please use the code below to verify your email address:
      </p>
      
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 15px; padding: 25px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Your verification code is:</p>
        <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6;">
        This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
      </p>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #4F46E5;">The GeoQuest Team</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
      <p style="margin: 0;">
        GeoQuest Games - Educational Geography for Kids Ages 5+<br>
        <a href="${baseUrl}/privacy" style="color: #6B7280;">Privacy Policy</a> | 
        <a href="${baseUrl}/terms" style="color: #6B7280;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your GeoQuest Account - Code: ' + code,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
      <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">Let's get you back to exploring!</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi there!</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        We received a request to reset your password for your GeoQuest Games account. 
        Use the code below to set a new password:
      </p>
      
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 15px; padding: 25px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #92400E; font-size: 14px;">Your password reset code is:</p>
        <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #D97706;">${code}</p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6;">
        This code will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.
      </p>
      
      <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 13px;">
          <strong>Security tip:</strong> Never share this code with anyone. GeoQuest team members will never ask for your password or reset code.
        </p>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #D97706;">The GeoQuest Team</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
      <p style="margin: 0;">
        GeoQuest Games - Educational Geography for Kids Ages 5+<br>
        <a href="${baseUrl}/privacy" style="color: #6B7280;">Privacy Policy</a> | 
        <a href="${baseUrl}/terms" style="color: #6B7280;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your GeoQuest Password - Code: ' + code,
    html,
  });
}

export async function sendPlayerInviteEmail(email: string, playerName: string, inviterName: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited to GeoQuest!</h1>
      <p style="color: #CCFBF1; margin: 10px 0 0 0; font-size: 16px;">Join ${inviterName} on a geography adventure</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${playerName}!</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        ${inviterName} has invited you to join them on GeoQuest Games - an educational geography game for kids and families!
      </p>
      
      <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 15px; padding: 25px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #065F46; font-size: 16px; font-weight: bold;">What is GeoQuest?</p>
        <p style="margin: 0; color: #047857; font-size: 14px;">
          A fun way to learn about world cities, countries, and cultures through games and quizzes!
        </p>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        <strong>Here's what you can do:</strong>
      </p>
      <ul style="color: #4B5563; line-height: 1.8;">
        <li>Play the "Guess & Go" card game to discover cities around the world</li>
        <li>Complete daily quests and earn stars</li>
        <li>Collect passport stamps and achievements</li>
        <li>Learn fun facts about geography in a playful way</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/?signup=true" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(20,184,166,0.3);">
          Join the Adventure
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6;">
        When you sign up with this email address, any progress you make will be saved to your account!
      </p>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #0D9488;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to GeoQuest Games!`,
    html,
  });
}

export async function sendWelcomeEmail(parentName: string, email: string, playerNames: string[]): Promise<boolean> {
  const playerList = playerNames.map(name => `<li style="margin: 5px 0;">${name}</li>`).join('');
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GeoQuest!</h1>
      <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Your geography adventure begins now</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Thank you for registering your explorer${playerNames.length > 1 ? 's' : ''} for GeoQuest Games! 
        We're excited to take them on an educational journey around the world.
      </p>
      
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400E;">Registered Explorers:</p>
        <ul style="margin: 0; padding-left: 20px; color: #92400E;">
          ${playerList}
        </ul>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        <strong>What's next?</strong>
      </p>
      <ul style="color: #4B5563; line-height: 1.8;">
        <li>Play the main "Guess & Go" game to learn about cities worldwide</li>
        <li>Complete Daily Quests for bonus stars</li>
        <li>Collect location cards and unlock achievements</li>
        <li>Track progress in the Passport section</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          Start Playing Now
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #4F46E5;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `Welcome to GeoQuest, ${parentName}!`,
    html,
  });
}

export async function sendGeoAdventuresWelcomeEmail(parentName: string, email: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const adventuresUrl = `${baseUrl}/geoadventures`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #faf8f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #E8962F 0%, #D4872B 100%); border-radius: 20px 20px 0 0; padding: 32px 30px; text-align: center;">
      <p style="color: #fff3e0; margin: 0 0 8px 0; font-size: 15px; letter-spacing: 0.5px;">✈️ GeoAdventures</p>
      <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; line-height: 1.3;">Hi ${parentName} 👋</h1>
      <p style="color: #fff3e0; margin: 10px 0 0 0; font-size: 15px; line-height: 1.5;">You've just unlocked a better way<br>to travel with your kids.</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 32px 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.08);">

      <p style="font-size: 15px; color: #374151; line-height: 1.7; margin-top: 0;">
        Not more planning.&nbsp; Not more chaos.<br>
        <strong style="color: #D4872B;">👉 Just smoother days and kids who actually enjoy the journey.</strong>
      </p>

      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 24px 0;">

      <!-- What it does -->
      <h2 style="font-size: 16px; color: #1F2937; margin: 0 0 10px 0;">🧭 What GeoAdventures does (in plain English)</h2>
      <p style="font-size: 14px; color: #6B7280; margin: 0 0 10px 0;">Most family trips look like this:</p>
      <ul style="font-size: 14px; color: #6B7280; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;">
        <li>Too much planning</li>
        <li>Kids get bored or tired</li>
        <li>Parents constantly adjust on the fly</li>
      </ul>
      <p style="font-size: 14px; color: #374151; line-height: 1.7; margin: 0 0 6px 0; font-weight: 600;">GeoAdventures flips that.</p>
      <ul style="font-size: 14px; color: #374151; line-height: 1.8; margin: 0 0 0 0; padding-left: 20px;">
        <li>👉 We tell you exactly what to do next</li>
        <li>👉 We keep kids engaged (without screens taking over)</li>
        <li>👉 We adapt when things don't go as planned</li>
      </ul>

      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 24px 0;">

      <!-- What to do first -->
      <h2 style="font-size: 16px; color: #1F2937; margin: 0 0 10px 0;">🚀 What to do first</h2>
      <p style="font-size: 14px; color: #6B7280; margin: 0 0 14px 0;">When you open GeoAdventures, here's all you need:</p>

      <div style="background: #FFF8ED; border-radius: 12px; padding: 16px 20px; margin-bottom: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #92400E;">1. Create your trip</p>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Pick your destination and dates — we'll build a kid-friendly plan instantly.</p>
      </div>
      <div style="background: #FFF8ED; border-radius: 12px; padding: 16px 20px; margin-bottom: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #92400E;">2. Start your day</p>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Each morning, we guide you with one simple plan.</p>
      </div>
      <div style="background: #FFF8ED; border-radius: 12px; padding: 16px 20px; margin-bottom: 0;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #92400E;">3. Follow the flow</p>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Next stop → What to do → When to leave. No overthinking.</p>
      </div>

      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 24px 0;">

      <!-- What kids love -->
      <h2 style="font-size: 16px; color: #1F2937; margin: 0 0 10px 0;">🎒 What your kids will love</h2>
      <ul style="font-size: 14px; color: #374151; line-height: 1.8; margin: 0 0 12px 0; padding-left: 20px;">
        <li>Stories that bring places to life</li>
        <li>Simple challenges at each stop</li>
        <li>Quick games during rides</li>
      </ul>
      <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.7;">
        👉 Less <em>"Are we there yet?"</em><br>
        👉 More <em>"What's next?"</em>
      </p>

      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 24px 0;">

      <!-- When things don't go as planned -->
      <h2 style="font-size: 16px; color: #1F2937; margin: 0 0 10px 0;">💡 When things don't go as planned (they won't 😄)</h2>
      <p style="font-size: 14px; color: #6B7280; margin: 0 0 10px 0;">We've got you. Tap once to:</p>
      <ul style="font-size: 14px; color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Find food nearby 🍔</li>
        <li>Take a break 😴</li>
        <li>Simplify your day 🔄</li>
      </ul>

      <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 24px 0;">

      <!-- One rule -->
      <div style="background: #F0FDF4; border-left: 4px solid #22C55E; border-radius: 0 12px 12px 0; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #166534;">🎯 One rule to remember</p>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">Don't explore the app.<br>
        <strong>👉 Just tap "Start Day" and follow along.</strong></p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 8px 0 28px 0;">
        <a href="${adventuresUrl}" style="display: inline-block; background: linear-gradient(135deg, #E8962F 0%, #D4872B 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(212,135,43,0.35);">
          Start Your First Adventure
        </a>
      </div>

      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0; text-align: center; line-height: 1.6;">
        Let's make this a trip your kids actually remember ❤️<br>
        <strong style="color: #D4872B;">– Team GeoAdventures</strong>
      </p>
    </div>

    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Your family adventure starts here, ${parentName} ✈️`,
    html,
  });
}

export async function sendTripCreatedEmail(parentName: string, email: string, tripName: string, destination: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const tripUrl = `${baseUrl}/geoadventures`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#faf8f5;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);border-radius:20px 20px 0 0;padding:32px 30px;text-align:center;">
    <p style="color:#fff3e0;margin:0 0 8px 0;font-size:15px;">✈️ GeoAdventures</p>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:700;line-height:1.3;">Hi ${parentName} 👋</h1>
    <p style="color:#fff3e0;margin:10px 0 0 0;font-size:16px;font-weight:600;">Your trip is ready.</p>
  </div>

  <div style="background:white;padding:32px 30px;border-radius:0 0 20px 20px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">

    <div style="background:#FFF8ED;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your adventure</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1F2937;">👉 ${tripName}</p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 6px 0;">
      No spreadsheets. No guesswork.<br>
      <strong style="color:#D4872B;">Just a plan that works with your kids.</strong>
    </p>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0;">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 12px 0;">🧭 What we've done for you</h2>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 24px 0;padding-left:20px;">
      <li>Built a day-by-day plan</li>
      <li>Balanced stops so kids don't burn out</li>
      <li>Added food + break flexibility</li>
    </ul>

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 12px 0;">👀 Before you go</h2>
    <p style="font-size:14px;color:#6B7280;margin:0 0 10px 0;">Take 2 minutes to scan your trip:</p>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 24px 0;padding-left:20px;">
      <li>Swap anything you don't like</li>
      <li>Check pacing (too packed? too light?)</li>
      <li>Add anything you really don't want to miss</li>
    </ul>

    <div style="background:#F0FDF4;border-left:4px solid #22C55E;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#166534;">🎯 What matters most</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">You don't need a perfect plan.<br>
      <strong>👉 You need a plan that's easy to follow.</strong></p>
    </div>

    <div style="text-align:center;margin:8px 0 28px 0;">
      <a href="${tripUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);color:white;padding:16px 48px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(212,135,43,0.35);">
        View Your Trip
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:14px;margin:0;text-align:center;line-height:1.6;">
      We'll guide you the rest of the way when your trip starts.<br>
      <strong style="color:#D4872B;">– Team GeoAdventures</strong>
    </p>
  </div>

  ${getEmailFooter(email)}
</div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: `Your ${destination} trip is ready — here's what to do next`,
    html,
  });
}

export async function sendTripStartsTomorrowEmail(parentName: string, email: string, tripName: string, firstStopName: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const tripUrl = `${baseUrl}/geoadventures`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#faf8f5;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);border-radius:20px 20px 0 0;padding:32px 30px;text-align:center;">
    <p style="color:#fff3e0;margin:0 0 8px 0;font-size:15px;">✈️ GeoAdventures</p>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:700;line-height:1.3;">Hi ${parentName} 👋</h1>
    <p style="color:#fff3e0;margin:10px 0 0 0;font-size:16px;">Your trip starts <strong>tomorrow</strong>.</p>
  </div>

  <div style="background:white;padding:32px 30px;border-radius:0 0 20px 20px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 6px 0;">
      Take a breath — you're already ahead of 90% of families.
    </p>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0;">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 12px 0;">✅ Quick readiness check</h2>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 10px 0;padding-left:20px;list-style:none;">
      <li>✔ Plan looks balanced</li>
      <li>✔ Travel time makes sense</li>
    </ul>
    <p style="font-size:14px;color:#6B7280;margin:0 0 8px 0;font-weight:600;">⚠ Just double-check:</p>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 24px 0;padding-left:20px;">
      <li>Tickets (if needed)</li>
      <li>Opening hours</li>
      <li>First stop timing</li>
    </ul>

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 12px 0;">🧭 Tomorrow morning will look like this</h2>
    <div style="background:#FFF8ED;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.9;">
        Open GeoAdventures →<br>
        👉 Tap <strong>Start Day</strong> →<br>
        👉 Follow the plan<br><br>
        <strong>That's it.</strong>
      </p>
    </div>

    <div style="background:#FFF8ED;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#92400E;">💡 One tip (this matters)</p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#6B7280;">Don't try to do everything.</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
        👉 If kids are tired, just tap:<br>
        &nbsp; • Food 🍔<br>
        &nbsp; • Break 😴<br>
        &nbsp; • Make it easier 🔄<br><br>
        We'll adjust the day for you.
      </p>
    </div>

    <div style="background:#F0FDF4;border-left:4px solid #22C55E;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#166534;">🎯 First stop</p>
      <p style="margin:0;font-size:15px;color:#374151;font-weight:600;">${firstStopName}</p>
    </div>

    <div style="text-align:center;margin:8px 0 28px 0;">
      <a href="${tripUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);color:white;padding:16px 48px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(212,135,43,0.35);">
        Open Your Plan
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:14px;margin:0;text-align:center;line-height:1.6;">
      You've done the hard part. Tomorrow, just follow along.<br>
      <strong style="color:#D4872B;">– Team GeoAdventures</strong>
    </p>
  </div>

  ${getEmailFooter(email)}
</div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: `${tripName} starts tomorrow — quick 2-minute check`,
    html,
  });
}

export async function sendDayCompleteEmail(
  parentName: string,
  email: string,
  stopsExplored: number,
  xpEarned: number,
  momentsCount: number,
  nextDayPreview: string,
  tripUrl: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#faf8f5;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);border-radius:20px 20px 0 0;padding:32px 30px;text-align:center;">
    <p style="color:#fff3e0;margin:0 0 8px 0;font-size:15px;">✈️ GeoAdventures</p>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:700;line-height:1.3;">Hi ${parentName} 👋</h1>
    <p style="color:#fff3e0;margin:10px 0 0 0;font-size:16px;">That was a good day.</p>
  </div>

  <div style="background:white;padding:32px 30px;border-radius:0 0 20px 20px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 12px 0;">🎉 What you did today</h2>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 24px 0;padding-left:0;list-style:none;">
      <li>✔ ${stopsExplored} stop${stopsExplored !== 1 ? 's' : ''} explored</li>
      <li>⭐ Kids earned ${xpEarned} XP</li>
      ${momentsCount > 0 ? `<li>📸 ${momentsCount} moment${momentsCount !== 1 ? 's' : ''} captured</li>` : ''}
    </ul>

    <div style="background:#FFF8ED;border-radius:12px;padding:20px;margin:0 0 24px 0;">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#92400E;">❤️ This is the part that matters</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
        These are the days your kids will remember.<br><br>
        Not everything you planned.<br>
        Just the moments you experienced together.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0;">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 10px 0;">🧭 Tomorrow (quick preview)</h2>
    <p style="font-size:14px;color:#374151;margin:0 0 24px 0;font-weight:600;">${nextDayPreview}</p>

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 10px 0;">🎯 Before tomorrow</h2>
    <p style="font-size:14px;color:#6B7280;margin:0 0 8px 0;">Take 30 seconds:</p>
    <ul style="font-size:14px;color:#374151;line-height:2;margin:0 0 24px 0;padding-left:20px;">
      <li>Check tickets</li>
      <li>Glance at timing</li>
      <li>That's it</li>
    </ul>

    <div style="text-align:center;margin:8px 0 28px 0;">
      <a href="${tripUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);color:white;padding:16px 48px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(212,135,43,0.35);">
        Preview Tomorrow
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:14px;margin:0;text-align:center;line-height:1.6;">
      See you tomorrow.<br>
      <strong style="color:#D4872B;">– Team GeoAdventures</strong>
    </p>
  </div>

  ${getEmailFooter(email)}
</div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: `Day complete — ${stopsExplored} stop${stopsExplored !== 1 ? 's' : ''}, ${xpEarned} XP earned`,
    html,
  });
}

export async function sendTripCompleteEmail(
  parentName: string,
  email: string,
  tripName: string,
  totalStops: number,
  totalXP: number,
  memoriesCount: number,
  nextAdventureUrl: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#faf8f5;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);border-radius:20px 20px 0 0;padding:32px 30px;text-align:center;">
    <p style="color:#fff3e0;margin:0 0 8px 0;font-size:15px;">✈️ GeoAdventures</p>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:700;line-height:1.3;">Hi ${parentName} 👋</h1>
    <p style="color:#fff3e0;margin:10px 0 0 0;font-size:15px;line-height:1.5;">You didn't just complete a trip.<br>
    👉 You created something your family will remember.</p>
  </div>

  <div style="background:white;padding:32px 30px;border-radius:0 0 20px 20px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">

    <div style="background:#FFF8ED;border-radius:12px;padding:20px;margin:0 0 24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#92400E;text-align:center;">✈️ ${tripName}</p>
      <ul style="font-size:14px;color:#374151;line-height:2;margin:0;padding-left:0;list-style:none;text-align:center;">
        <li>✔ ${totalStops} stop${totalStops !== 1 ? 's' : ''} explored</li>
        <li>⭐ Kids earned ${totalXP} XP</li>
        ${memoriesCount > 0 ? `<li>📸 ${memoriesCount} moment${memoriesCount !== 1 ? 's' : ''} captured</li>` : ''}
      </ul>
    </div>

    <div style="background:#F0FDF4;border-left:4px solid #22C55E;border-radius:0 12px 12px 0;padding:16px 20px;margin:0 0 24px 0;">
      <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#166534;">❤️ This is what matters</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
        Not every stop. Not every plan.<br><br>
        Just the laughs, the surprises, the little moments in between.
      </p>
    </div>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0;">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 10px 0;">📤 Want to share this?</h2>
    <p style="font-size:14px;color:#6B7280;margin:0 0 16px 0;">Send your trip story to family &amp; friends:</p>

    <div style="text-align:center;margin:8px 0 16px 0;">
      <a href="${nextAdventureUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);color:white;padding:16px 48px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(212,135,43,0.35);">
        View Your Trip Story
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0;">

    <h2 style="font-size:16px;color:#1F2937;margin:0 0 10px 0;">🧭 Ready for the next one?</h2>
    <p style="font-size:14px;color:#6B7280;margin:0 0 16px 0;">The best part? You don't have to start from scratch again.</p>

    <div style="text-align:center;margin:8px 0 28px 0;">
      <a href="${baseUrl}/geoadventures" style="display:inline-block;background:#1F2937;color:white;padding:14px 40px;text-decoration:none;border-radius:50px;font-weight:600;font-size:15px;">
        Plan Your Next Adventure
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:14px;margin:0;text-align:center;line-height:1.6;">
      Let's do it again soon ✈️<br>
      <strong style="color:#D4872B;">– Team GeoAdventures</strong>
    </p>
  </div>

  ${getEmailFooter(email)}
</div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: `Trip complete! ${totalStops} stops, ${totalXP} XP — your family adventure story`,
    html,
  });
}

export async function sendWeeklyProgressEmail(
  parentName: string, 
  email: string, 
  playerName: string,
  stats: {
    gamesPlayed: number;
    totalStars: number;
    citiesVisited: number;
    currentStreak: number;
    newCitiesThisWeek?: number;
    starsEarnedThisWeek?: number;
  }
): Promise<boolean> {
  if (!await canSendEmail(email, 'weekly')) {
    return false;
  }
  
  const baseUrl = getBaseUrl();
  const weeklyHighlight = stats.newCitiesThisWeek && stats.starsEarnedThisWeek 
    ? `<div style="background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%); border-radius: 15px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 5px 0; color: #4338CA; font-size: 14px; font-weight: bold;">This Week's Highlights</p>
        <p style="margin: 0; color: #3730A3; font-size: 18px;">
          <strong>${stats.newCitiesThisWeek}</strong> new cities explored, 
          <strong>${stats.starsEarnedThisWeek}</strong> stars earned!
        </p>
      </div>`
    : '';
    
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Weekly Progress Report</h1>
      <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">${playerName}'s GeoQuest Journey</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Here's ${playerName}'s weekly geography adventure update!
      </p>
      
      ${weeklyHighlight}
      
      <div style="margin: 25px 0;">
        <table width="100%" cellpadding="0" cellspacing="10" style="border-collapse: separate;">
          <tr>
            <td width="50%" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="font-size: 36px; font-weight: bold; color: #D97706;">${stats.totalStars}</div>
              <div style="color: #92400E; font-size: 14px;">Total Stars</div>
            </td>
            <td width="50%" style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="font-size: 36px; font-weight: bold; color: #2563EB;">${stats.citiesVisited}</div>
              <div style="color: #1E40AF; font-size: 14px;">Cities Visited</div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="font-size: 36px; font-weight: bold; color: #059669;">${stats.gamesPlayed}</div>
              <div style="color: #065F46; font-size: 14px;">Games Played</div>
            </td>
            <td width="50%" style="background: linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="font-size: 36px; font-weight: bold; color: #DB2777;">${stats.currentStreak}</div>
              <div style="color: #9D174D; font-size: 14px;">Day Streak</div>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          Continue the Adventure
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        See you next week!<br>
        <strong style="color: #4F46E5;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `${playerName}'s Weekly GeoQuest Report`,
    html,
  });
}

export interface ParentSnapshotData {
  parentName: string;
  childName: string;
  citiesExplored: string[];
  gamesPlayed: number;
  explorerStreak: number;
  completedGeoAdventures: { name: string; destination: string }[];
}

const CONVERSATION_STARTERS = [
  "You explored {cities} this week — what's something you remember about {firstCity}?",
  "I heard you visited {firstCity} in your game — did you see anything cool there?",
  "Which place was your favorite this week — {citiesList}?",
  "If you could visit {firstCity} for real, what would you want to see?",
];

export async function sendParentSnapshotEmail(data: ParentSnapshotData, email: string): Promise<boolean> {
  if (!await canSendEmail(email, 'weekly')) {
    return false;
  }
  
  const baseUrl = getBaseUrl();
  const { parentName, childName, citiesExplored, gamesPlayed, explorerStreak, completedGeoAdventures } = data;
  
  const hasActivity = citiesExplored.length > 0 || gamesPlayed > 0 || completedGeoAdventures.length > 0;
  
  if (!hasActivity) {
    return false;
  }
  
  const citiesList = citiesExplored.length > 0 
    ? citiesExplored.slice(0, 4).join(', ')
    : 'familiar places';
  const firstCity = citiesExplored.length > 0 ? citiesExplored[0] : 'their favorite city';
  
  const starterTemplate = CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
  const conversationStarter = starterTemplate
    .replace('{cities}', citiesList)
    .replace('{firstCity}', firstCity)
    .replace('{citiesList}', citiesList);
  
  const journeySection = citiesExplored.length > 0 
    ? `<p style="margin: 0 0 8px 0; color: #166534;">
        <strong>Explored ${citiesExplored.length} new place${citiesExplored.length !== 1 ? 's' : ''}</strong><br>
        <span style="color: #374151; font-size: 14px;">(${citiesList})</span>
      </p>`
    : '';
  
  const geoAdventureSection = completedGeoAdventures.length > 0
    ? `<p style="margin: 0 0 8px 0; color: #166534;">
        <strong>Completed ${completedGeoAdventures.length} GeoAdventure${completedGeoAdventures.length !== 1 ? 's' : ''}</strong><br>
        <span style="color: #374151; font-size: 14px;">${completedGeoAdventures.map(a => a.destination || a.name).join(', ')}</span>
      </p>`
    : '';
  
  const streakSection = explorerStreak > 0
    ? `<p style="margin: 0; color: #166534;">
        <strong>Built on their explorer streak through play</strong><br>
        <span style="color: #374151; font-size: 14px;">${explorerStreak} day${explorerStreak !== 1 ? 's' : ''} of curiosity</span>
      </p>`
    : '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">Your explorer discovered new places this week</h1>
      <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">${childName}'s GeoQuest Journey</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        This week in GeoQuest, ${childName} explored the world in small, meaningful moments.
      </p>
      
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 20px;">
        Here's a snapshot of where their curiosity took them:
      </p>
      
      <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-radius: 15px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">This Week's Journey</h3>
        ${journeySection}
        ${geoAdventureSection}
        ${streakSection}
        <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 12px; font-style: italic;">
          (No timers. No scores. Just exploration.)
        </p>
      </div>
      
      <div style="background: #F3F4F6; border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">What This Builds (quietly)</h3>
        <p style="color: #4B5563; line-height: 1.6; font-size: 14px; margin: 0;">
          Through play, your child is:
        </p>
        <ul style="color: #4B5563; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 5px;">Becoming familiar with world landmarks</li>
          <li style="margin-bottom: 5px;">Strengthening spatial awareness</li>
          <li style="margin-bottom: 5px;">Building curiosity about places beyond home</li>
        </ul>
        <p style="color: #6B7280; font-size: 13px; margin: 15px 0 0 0; font-style: italic;">
          You don't need to quiz them — recognition grows naturally.
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #78350F; font-size: 16px;">A Conversation Starter</h3>
        <p style="color: #451A03; line-height: 1.6; font-size: 14px; margin: 0 0 10px 0;">
          If you want to connect their play to real life, try asking:
        </p>
        <p style="color: #78350F; font-size: 15px; font-style: italic; margin: 0; padding: 10px 15px; background: white; border-radius: 8px;">
          "${conversationStarter}"
        </p>
        <p style="color: #78350F; font-size: 13px; margin: 10px 0 0 0;">
          Let them lead the answer. There's no right response.
        </p>
      </div>
      
      <div style="background: #F9FAFB; border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Looking Ahead</h3>
        <p style="color: #4B5563; line-height: 1.6; font-size: 14px; margin: 0;">
          GeoQuest will keep introducing places as your child plays —
          there's nothing to unlock or keep up with.
        </p>
        <p style="color: #6B7280; font-size: 14px; margin: 10px 0 0 0;">
          They can jump back in anytime.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/passport" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          View Their Passport
        </a>
      </div>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 11px;">
      <p style="margin: 0;">
        You're receiving this because you're connected to ${childName}'s GeoQuest account.<br>
        No ads. No comparisons. Just exploration.
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `This week, ${childName} explored the world`,
    html,
  });
}

export interface ExplorerWeeklyData {
  explorerName: string;
  citiesExplored: string[];
  gamesPlayed: number;
  explorerStreak: number;
  completedGeoAdventures: { name: string; destination: string }[];
}

export interface ConsolidatedSnapshotData {
  parentName: string;
  explorers: ExplorerWeeklyData[];
}

function generateExplorerSection(explorer: ExplorerWeeklyData): string {
  const { explorerName, citiesExplored, explorerStreak, completedGeoAdventures } = explorer;
  
  const citiesList = citiesExplored.length > 0 
    ? citiesExplored.slice(0, 4).join(', ')
    : '';
  
  const journeySection = citiesExplored.length > 0 
    ? `<p style="margin: 0 0 8px 0; color: #166534;">
        <strong>Explored ${citiesExplored.length} new place${citiesExplored.length !== 1 ? 's' : ''}</strong><br>
        <span style="color: #374151; font-size: 14px;">(${citiesList})</span>
      </p>`
    : '';
  
  const geoAdventureSection = completedGeoAdventures.length > 0
    ? `<p style="margin: 0 0 8px 0; color: #166534;">
        <strong>Completed ${completedGeoAdventures.length} GeoAdventure${completedGeoAdventures.length !== 1 ? 's' : ''}</strong><br>
        <span style="color: #374151; font-size: 14px;">${completedGeoAdventures.map(a => a.destination || a.name).join(', ')}</span>
      </p>`
    : '';
  
  const streakSection = explorerStreak > 0
    ? `<p style="margin: 0; color: #166534;">
        <strong>Built on their explorer streak through play</strong><br>
        <span style="color: #374151; font-size: 14px;">${explorerStreak} day${explorerStreak !== 1 ? 's' : ''} of curiosity</span>
      </p>`
    : '';

  return `
    <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-radius: 15px; padding: 20px; margin: 15px 0;">
      <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px; border-bottom: 2px solid #86EFAC; padding-bottom: 10px;">
        🌍 ${explorerName}'s Journey
      </h3>
      ${journeySection}
      ${geoAdventureSection}
      ${streakSection}
      ${!journeySection && !geoAdventureSection && !streakSection 
        ? '<p style="margin: 0; color: #374151; font-size: 14px;">Taking a break this week — ready to explore again soon!</p>' 
        : ''}
    </div>
  `;
}

export async function sendConsolidatedSnapshotEmail(data: ConsolidatedSnapshotData, email: string): Promise<boolean> {
  if (!await canSendEmail(email, 'weekly')) {
    return false;
  }
  
  const baseUrl = getBaseUrl();
  const { parentName, explorers } = data;
  
  if (explorers.length === 0) {
    return false;
  }
  
  const explorersWithActivity = explorers.filter(e => 
    e.citiesExplored.length > 0 || e.gamesPlayed > 0 || e.completedGeoAdventures.length > 0
  );
  
  if (explorersWithActivity.length === 0) {
    return false;
  }
  
  const explorerSections = explorers.map(generateExplorerSection).join('');
  
  const explorerNames = explorersWithActivity.map(e => e.explorerName);
  const explorerNamesStr = explorerNames.length === 1 
    ? explorerNames[0]
    : explorerNames.length === 2 
      ? explorerNames.join(' and ')
      : explorerNames.slice(0, -1).join(', ') + ', and ' + explorerNames[explorerNames.length - 1];
  
  const totalCities = explorersWithActivity.reduce((sum, e) => sum + e.citiesExplored.length, 0);
  const allCities = explorersWithActivity.flatMap(e => e.citiesExplored);
  const firstCity = allCities.length > 0 ? allCities[0] : 'their favorite city';
  const citiesSample = allCities.slice(0, 3).join(', ');
  
  const starterTemplate = CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
  const conversationStarter = starterTemplate
    .replace('{cities}', citiesSample || 'places')
    .replace('{firstCity}', firstCity)
    .replace('{citiesList}', citiesSample || 'places');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">Your explorers discovered new places this week</h1>
      <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Weekly Family GeoQuest Journey</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        This week in GeoQuest, ${explorerNamesStr} explored the world in small, meaningful moments.
      </p>
      
      <p style="color: #6B7280; font-size: 14px; margin-bottom: 20px;">
        Here's a snapshot of where their curiosity took them:
      </p>
      
      ${explorerSections}
      
      <p style="margin: 15px 0 0 0; color: #9CA3AF; font-size: 12px; font-style: italic; text-align: center;">
        (No timers. No scores. Just exploration.)
      </p>
      
      <div style="background: #F3F4F6; border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">What This Builds (quietly)</h3>
        <p style="color: #4B5563; line-height: 1.6; font-size: 14px; margin: 0;">
          Through play, your child${explorersWithActivity.length > 1 ? 'ren are' : ' is'}:
        </p>
        <ul style="color: #4B5563; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 5px;">Becoming familiar with world landmarks</li>
          <li style="margin-bottom: 5px;">Strengthening spatial awareness</li>
          <li style="margin-bottom: 5px;">Building curiosity about places beyond home</li>
        </ul>
        <p style="color: #6B7280; font-size: 13px; margin: 15px 0 0 0; font-style: italic;">
          You don't need to quiz them — recognition grows naturally.
        </p>
      </div>
      
      ${totalCities > 0 ? `
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #78350F; font-size: 16px;">A Conversation Starter</h3>
        <p style="color: #451A03; line-height: 1.6; font-size: 14px; margin: 0 0 10px 0;">
          If you want to connect their play to real life, try asking:
        </p>
        <p style="color: #78350F; font-size: 15px; font-style: italic; margin: 0; padding: 10px 15px; background: white; border-radius: 8px;">
          "${conversationStarter}"
        </p>
        <p style="color: #78350F; font-size: 13px; margin: 10px 0 0 0;">
          Let them lead the answer. There's no right response.
        </p>
      </div>
      ` : ''}
      
      <div style="background: #F9FAFB; border-radius: 15px; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Looking Ahead</h3>
        <p style="color: #4B5563; line-height: 1.6; font-size: 14px; margin: 0;">
          GeoQuest will keep introducing places as your child${explorersWithActivity.length > 1 ? 'ren play' : ' plays'} —
          there's nothing to unlock or keep up with.
        </p>
        <p style="color: #6B7280; font-size: 14px; margin: 10px 0 0 0;">
          They can jump back in anytime.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/passport" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          View Their Passports
        </a>
      </div>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 11px;">
      <p style="margin: 0;">
        You're receiving this because you're connected to your family's GeoQuest account.<br>
        No ads. No comparisons. Just exploration.
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  const subjectLine = explorersWithActivity.length === 1
    ? `This week, ${explorersWithActivity[0].explorerName} explored the world`
    : `This week, your explorers discovered ${totalCities} new place${totalCities !== 1 ? 's' : ''}`;
  
  return sendEmail({
    to: email,
    subject: subjectLine,
    html,
  });
}

export interface TripStop {
  name: string;
  description?: string | null;
}

export async function sendTripItineraryEmail(
  recipientEmail: string,
  senderName: string,
  tripName: string,
  destination: string,
  stops: TripStop[],
  personalMessage?: string
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const messageBlock = personalMessage 
    ? `<div style="background: #F3F4F6; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <p style="margin: 0; color: #374151; font-style: italic;">"${personalMessage}"</p>
        <p style="margin: 10px 0 0 0; color: #6B7280; font-size: 14px;">— ${senderName}</p>
      </div>`
    : '';
  
  const stopsHtml = stops.map((stop, i) => `
    <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
      <div style="background: #14B8A6; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; margin-right: 12px;">${i + 1}</div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #1F2937;">${stop.name}</p>
        ${stop.description ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">${stop.description}</p>` : ''}
      </div>
    </div>
  `).join('');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Trip Itinerary</h1>
      <p style="color: #CCFBF1; margin: 10px 0 0 0; font-size: 16px;">${senderName} shared a travel plan with you</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi there!</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        ${senderName} has shared their travel itinerary for <strong>${destination}</strong> with you.
      </p>
      
      <div style="background: linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%); border-radius: 15px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0D9488;">${tripName}</p>
        <p style="margin: 10px 0 0 0; color: #0F766E; font-size: 16px;">📍 ${destination} • ${stops.length} stops</p>
      </div>
      
      ${messageBlock}
      
      <h3 style="color: #1F2937; margin: 25px 0 15px 0; font-size: 18px;">Trip Stops</h3>
      <div style="background: #F9FAFB; border-radius: 12px; padding: 20px;">
        ${stopsHtml}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/geoadventures" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(20,184,166,0.3);">
          Plan Your Adventure
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy travels!<br>
        <strong style="color: #0D9488;">The GeoQuest Team</strong>
      </p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
      <p style="margin: 0;">
        GeoQuest Games - Family Travel Education<br>
        <a href="${baseUrl}/privacy" style="color: #6B7280;">Privacy Policy</a> | 
        <a href="${baseUrl}/terms" style="color: #6B7280;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: recipientEmail,
    subject: `${senderName} shared a trip itinerary: ${tripName}`,
    html,
  });
}

export interface DayMetrics {
  dayName: string;
  date: string;
  totalSessions: number;
  totalGamesPlayed: number;
  gamesPerSession: number;
  game2StartPercent: number;
  game3StartPercent: number;
  shareClicks: number;
}

export interface WeeklyMetricsReport {
  weekStart: string;
  weekEnd: string;
  days: DayMetrics[];
  totals: {
    totalSessions: number;
    totalGamesPlayed: number;
    avgGamesPerSession: number;
    avgGame2StartPercent: number;
    avgGame3StartPercent: number;
    totalShareClicks: number;
  };
}

export async function sendWeeklyMetricsEmail(report: WeeklyMetricsReport): Promise<boolean> {
  const dayRows = report.days.map(day => `
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 10px 8px; color: #374151; font-weight: 500;">${day.dayName}<br><span style="font-size: 11px; color: #9CA3AF;">${day.date}</span></td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.totalSessions}</td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.totalGamesPlayed}</td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.gamesPerSession.toFixed(1)}</td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.game2StartPercent.toFixed(0)}%</td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.game3StartPercent.toFixed(0)}%</td>
      <td style="padding: 10px 8px; color: #111827; text-align: center;">${day.shareClicks}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">GeoQuest Weekly Metrics</h1>
      <p style="color: #E0E7FF; margin: 8px 0 0 0; font-size: 14px;">${report.weekStart} - ${report.weekEnd}</p>
    </div>
    
    <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">Daily Breakdown</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F9FAFB;">
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: left;">Day</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">Sessions</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">Games</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">Games/Sess</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">G2 Start</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">G3 Start</th>
              <th style="padding: 12px 8px; color: #6B7280; font-weight: 600; text-align: center;">Shares</th>
            </tr>
          </thead>
          <tbody>
            ${dayRows}
          </tbody>
          <tfoot>
            <tr style="background: #EEF2FF; font-weight: bold;">
              <td style="padding: 12px 8px; color: #4F46E5;">Week Total</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.totalSessions}</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.totalGamesPlayed}</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.avgGamesPerSession.toFixed(2)}</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.avgGame2StartPercent.toFixed(0)}%</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.avgGame3StartPercent.toFixed(0)}%</td>
              <td style="padding: 12px 8px; color: #4F46E5; text-align: center;">${report.totals.totalShareClicks}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: 'support@geoquestgame.com',
    subject: `GeoQuest Weekly Metrics - ${report.weekStart} to ${report.weekEnd}`,
    html,
  });
}

export async function sendDailyReminderEmail(
  parentName: string,
  email: string,
  playerNames: string[]
): Promise<boolean> {
  if (!await canSendEmail(email, 'daily')) {
    return false;
  }
  
  const names = playerNames.length === 1 
    ? playerNames[0] 
    : playerNames.slice(0, -1).join(', ') + ' and ' + playerNames[playerNames.length - 1];
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Daily Quest Awaits!</h1>
      <p style="color: #DDD6FE; margin: 10px 0 0 0; font-size: 16px;">A new geography challenge is ready</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        A new Daily Quest is available for ${names}! 
        Complete it today to keep their streak going and earn bonus stars.
      </p>
      
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 15px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; color: #92400E; font-size: 18px; font-weight: bold;">
          Today's reward: Up to 3 bonus stars!
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139,92,246,0.3);">
          Play Daily Quest
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #4F46E5;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `Daily Quest Ready for ${names}!`,
    html,
  });
}

export interface WeeklyAnalytics {
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  uniqueVisitors: number;
  firstSessionCompletionRate: number;
  avgTimeToFirstPlaySeconds: number;
  avgSessionLengthSeconds: number;
  mobilePercent: number;
  desktopPercent: number;
  gamesPerSession: number;
  game2StartPercent: number;
  game3StartPercent: number;
  shareClicks: number;
  pwaInstalls: number;
  pwaReturnRate: number;
}

export async function sendWeeklyAnalyticsEmail(metrics: WeeklyAnalytics): Promise<boolean> {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">GeoQuest Weekly Analytics</h1>
      <p style="color: #D1FAE5; margin: 8px 0 0 0; font-size: 14px;">${metrics.weekStart} - ${metrics.weekEnd}</p>
    </div>
    
    <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">Session Metrics</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Total Sessions</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.totalSessions}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Unique Visitors</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.uniqueVisitors}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Avg Session Length</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${formatTime(metrics.avgSessionLengthSeconds)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">First Session Completion</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.firstSessionCompletionRate.toFixed(1)}%</td>
        </tr>
      </table>
      
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">Engagement Metrics</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Games/Session</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.gamesPerSession.toFixed(2)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Time to First Play</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${formatTime(metrics.avgTimeToFirstPlaySeconds)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Game 2 Start %</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.game2StartPercent.toFixed(1)}%</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Game 3 Start %</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.game3StartPercent.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Share Clicks</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.shareClicks}</td>
        </tr>
      </table>
      
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">Device & PWA Metrics</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Mobile %</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.mobilePercent.toFixed(1)}%</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">Desktop %</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.desktopPercent.toFixed(1)}%</td>
        </tr>
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">PWA Installs</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.pwaInstalls}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #374151; font-weight: 500;">PWA 7-Day Return Rate</td>
          <td style="padding: 12px 0; color: #111827; font-weight: bold; text-align: right;">${metrics.pwaReturnRate.toFixed(1)}%</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: 'support@geoquestgame.com',
    subject: `GeoQuest Weekly Analytics - ${metrics.weekStart} to ${metrics.weekEnd}`,
    html,
  });
}

export async function sendPriceLock30DayWarningEmail(
  parentName: string,
  email: string,
  foundingFamilyNumber: number,
  priceLockExpirationDate: Date
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const formattedDate = priceLockExpirationDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Price Lock Update</h1>
      <p style="color: #FEF3C7; margin: 10px 0 0 0; font-size: 16px;">Founding Family #${foundingFamilyNumber}</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Thank you for being part of our Founding Families community! This is a friendly reminder that your 
        special Founding Family price lock of <strong style="color: #059669;">$4.99/month</strong> will expire on 
        <strong>${formattedDate}</strong> (30 days from now).
      </p>
      
      <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 15px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #059669; font-size: 14px; font-weight: bold;">Your Founding Family Benefits</p>
        <ul style="text-align: left; color: #047857; margin: 0; padding-left: 25px; line-height: 1.8;">
          <li>Founding Family badge displayed forever</li>
          <li>Full GeoQuest Explorer features at founding rate</li>
          <li>Priority support and early access to new features</li>
        </ul>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        <strong>What happens after the price lock expires?</strong><br>
        Your subscription will continue at the standard GeoQuest Explorer rate of $8.99/month. 
        Your Founding Family badge and all benefits will remain active!
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/pricing" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          View Subscription Details
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Thank you for being an early believer!<br>
        <strong style="color: #059669;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `Founding Family Price Lock Expires in 30 Days`,
    html,
  });
}

export async function sendPriceLock7DayWarningEmail(
  parentName: string,
  email: string,
  foundingFamilyNumber: number,
  priceLockExpirationDate: Date
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const formattedDate = priceLockExpirationDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">7 Days Left!</h1>
      <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 16px;">Your Founding Family price lock is ending soon</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        This is a reminder that your special Founding Family price lock of 
        <strong style="color: #059669;">$4.99/month</strong> will expire on 
        <strong>${formattedDate}</strong> — just 7 days from now.
      </p>
      
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 0 10px 10px 0;">
        <p style="margin: 0; font-weight: bold; color: #92400E;">What This Means:</p>
        <p style="margin: 10px 0 0 0; color: #92400E;">
          After ${formattedDate}, your subscription will renew at the standard rate of $8.99/month. 
          You'll keep all your Founding Family benefits including your Founding Family #${foundingFamilyNumber} badge!
        </p>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        We want to thank you again for being one of our first 100 founding families. Your early support 
        helped us build GeoQuest into what it is today. 💚
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/pricing" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          View Your Subscription
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Questions? Reply to this email anytime.<br>
        <strong style="color: #059669;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `Your Founding Family Price Lock Expires in 7 Days`,
    html,
  });
}

export async function sendPriceLockExpiredEmail(
  parentName: string,
  email: string,
  foundingFamilyNumber: number
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Price Lock Update Complete</h1>
      <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Founding Family #${foundingFamilyNumber}</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Your 12-month Founding Family price lock period has now ended. Starting with your next billing cycle, 
        your subscription will be at the standard GeoQuest Explorer rate of $8.99/month.
      </p>
      
      <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 15px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #059669; font-size: 14px; font-weight: bold;">🎉 Your Founding Family Benefits Continue!</p>
        <ul style="text-align: left; color: #047857; margin: 0; padding-left: 25px; line-height: 1.8;">
          <li>Founding Family #${foundingFamilyNumber} badge — yours forever</li>
          <li>All GeoQuest Explorer features included</li>
          <li>Priority support and early access to new features</li>
          <li>Unlimited offline access and Video Maker</li>
        </ul>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Thank you for your continued support and for being part of our founding journey. 
        Your early belief in GeoQuest helped us grow and improve!
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          Continue Exploring
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #4F46E5;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `Your Founding Family Price Lock Period Has Ended`,
    html,
  });
}

export async function sendPhysicalGameFollowUpEmail(
  email: string,
  parentName: string
): Promise<boolean> {
  const canSend = await canSendEmail(email, 'weekly'); // Uses weekly preference as product update
  if (!canSend) {
    console.log(`📧 Physical game follow-up email blocked by preferences: ${email}`);
    return false;
  }
  
  const baseUrl = getBaseUrl();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoQuest Cards - Early Access Update</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; border-radius: 20px 20px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🃏 GeoQuest Cards</h1>
      <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 16px;">Early Access Update</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${parentName || 'there'},</p>
      
      <p style="color: #4B5563; line-height: 1.6;">
        Thanks for joining our GeoQuest Cards early access list! We're still working on bringing the 
        physical card game to life, and your interest means a lot to us.
      </p>
      
      <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 15px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #059669; font-size: 14px; font-weight: bold;">What happens next?</p>
        <ul style="color: #047857; margin: 0; padding-left: 25px; line-height: 1.8;">
          <li>We'll notify you when the physical cards are available</li>
          <li>Early access families will be the first to know</li>
          <li>No commitment — just early access to something special</li>
        </ul>
      </div>
      
      <p style="color: #4B5563; line-height: 1.6;">
        In the meantime, keep exploring! The more your family plays, the more cities and countries 
        you'll discover together.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
          Continue Exploring
        </a>
      </div>
      
      <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 0;">
        Happy exploring!<br>
        <strong style="color: #059669;">The GeoQuest Team</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `GeoQuest Cards - You're on the Early Access List!`,
    html,
  });
}

// Waitlist confirmation email sent to user immediately after signup
export async function sendPhysicalGameWaitlistConfirmationEmail(
  email: string,
  name: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Guess & Go early access list</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 20px 20px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🌍 GeoQuest</h1>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 20px 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi${name ? ` ${name}` : ''},</p>
      
      <p style="color: #4B5563; line-height: 1.8;">
        Thanks for raising your hand for early access to the Guess & Go physical card game.
      </p>
      
      <p style="color: #4B5563; line-height: 1.8;">
        We're taking what kids already love in GeoQuest and bringing it to the table — a screen-free way to explore places, think together, and play as a family.
      </p>
      
      <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 15px; padding: 20px; margin: 25px 0; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; color: #92400E; font-weight: bold;">
          ✨ As promised, the first 100 families will receive 30% off when we open orders.
        </p>
        <p style="margin: 10px 0 0 0; color: #92400E;">
          There's no code to remember — we'll handle that part.
        </p>
      </div>
      
      <p style="color: #4B5563; line-height: 1.8;">
        We're still putting the final touches on the cards, rules, and packaging, and we'll email you when everything is ready.
      </p>
      
      <p style="color: #4B5563; line-height: 1.8;">
        Until then, thanks for being part of GeoQuest.<br>
        It means a lot to us.
      </p>
      
      <p style="color: #6B7280; font-size: 16px; margin-top: 30px; margin-bottom: 0;">
        Warmly,<br>
        <strong style="color: #F59E0B;">Geo Explorers at GeoQuest</strong>
      </p>
    </div>
    
    ${getEmailFooter(email)}
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject: `You're on the Guess & Go early access list 🌍`,
    html,
  });
}

// Notification email sent to support when someone joins waitlist
export async function sendPhysicalGameWaitlistNotificationEmail(
  userName: string,
  userEmail: string,
  waitlistNumber: number
): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  const now = new Date();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Waitlist Signup</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; border-radius: 15px 15px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">🎉 New Waitlist Signup!</h1>
    </div>
    
    <div style="background: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Waitlist #</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #374151; font-size: 18px; font-weight: bold;">${waitlistNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${userName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6B7280; font-weight: bold;">Signed Up</td>
          <td style="padding: 10px 0; color: #374151;">${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background: #F0FDF4; border-radius: 10px; text-align: center;">
        <p style="margin: 0; color: #166534; font-weight: bold;">
          Total Waitlist Signups: ${waitlistNumber}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: supportEmail,
    subject: `[Waitlist #${waitlistNumber}] ${userName} joined Guess & Go early access`,
    html,
  });
}

export async function sendReviewNotification(review: {
  parentName: string;
  childAges?: string;
  rating: number;
  reviewText: string;
  modeTag: string;
  userId?: number | null;
}): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  const now = new Date();
  const baseUrl = getBaseUrl();

  const modeLabel = review.modeTag === 'both' ? 'GeoGames + GeoAdventures' 
    : review.modeTag === 'geogames' ? 'GeoGames' : 'GeoAdventures';

  const starsHtml = [...Array(5)].map((_, i) => 
    i < review.rating ? '⭐' : '☆'
  ).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(to bottom, #FDF2F8, #FEF3C7);">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); padding: 20px; border-radius: 15px 15px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">⭐ New Review Submitted!</h1>
    </div>
    
    <div style="background: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="text-align: center; font-size: 28px; margin-bottom: 15px;">
        ${starsHtml}
      </div>
      
      <div style="background: #F3E8FF; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <p style="margin: 0; color: #374151; font-style: italic; line-height: 1.6;">
          "${review.reviewText}"
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Parent Name</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${review.parentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Child Ages</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${review.childAges || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Mode</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${modeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Rating</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${review.rating}/5</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-weight: bold;">Submitted</td>
          <td style="padding: 8px 0; color: #374151;">${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background: #FEF3C7; border-radius: 10px; text-align: center;">
        <p style="margin: 0; color: #92400E; font-weight: bold;">
          ⚠️ This review needs approval before appearing on the Reviews page
        </p>
        <p style="margin: 10px 0 0 0; color: #92400E; font-size: 14px;">
          Approve it in the admin panel or database
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `[Review] ${review.rating}★ review from ${review.parentName} - ${modeLabel}`,
    html,
  });
}

export async function sendFeedbackNotification(feedback: {
  feedbackArea: string;
  feedbackSubarea?: string | null;
  feedbackText: string;
  userId?: number | null;
  userEmail?: string | null;
}): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  const now = new Date();

  const areaLabels: Record<string, string> = {
    geogames: 'GeoGames',
    geoadventures: 'GeoAdventures',
    app_overall: 'App Overall',
    idea: 'Idea/Suggestion',
  };

  const subareaLabels: Record<string, string> = {
    guess_and_go: 'Guess & Go',
    daily_quest: 'Daily Quest',
    treasure_vault: 'Treasure Vault',
    crossworld: 'CrossWorld',
    passports: 'Passports/Progress',
    trips: 'Trips',
    journey_packs: 'Journey Packs',
    stops: 'Exploration Places',
    video_collage: 'Video/Collage',
    memories: 'Memories',
    notifications: 'Notifications',
    other: 'Other',
  };

  const areaLabel = areaLabels[feedback.feedbackArea] || feedback.feedbackArea;
  const subareaLabel = feedback.feedbackSubarea 
    ? subareaLabels[feedback.feedbackSubarea] || feedback.feedbackSubarea 
    : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(to bottom, #EFF6FF, #E0E7FF);">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 20px; border-radius: 15px 15px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">💬 New Feedback Received!</h1>
    </div>
    
    <div style="background: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Area</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${areaLabel}</td>
        </tr>
        ${subareaLabel ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Subarea</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${subareaLabel}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">User ID</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${feedback.userId || 'Anonymous'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Email</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${feedback.userEmail || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-weight: bold;">Submitted</td>
          <td style="padding: 8px 0; color: #374151;">${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      
      <div style="background: #EFF6FF; padding: 15px; border-radius: 10px;">
        <h3 style="margin: 0 0 10px 0; color: #1E40AF; font-size: 14px;">Feedback Message:</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6; white-space: pre-wrap;">
${feedback.feedbackText || '(No message provided)'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `[Feedback] ${areaLabel}${subareaLabel ? ` - ${subareaLabel}` : ''}`,
    html,
  });
}

export async function sendNegativeReviewNotification(review: {
  parentName: string;
  childAges?: string;
  rating: number;
  reviewText: string;
  modeTag: string;
  userId?: number | null;
  reviewId: string;
}): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  const now = new Date();
  const baseUrl = getBaseUrl();

  const modeLabel = review.modeTag === 'both' ? 'GeoGames + GeoAdventures' 
    : review.modeTag === 'geogames' ? 'GeoGames' : 'GeoAdventures';

  const starsHtml = [...Array(5)].map((_, i) => 
    i < review.rating ? '⭐' : '☆'
  ).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(to bottom, #FEE2E2, #FEF3C7);">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #DC2626 0%, #F97316 100%); padding: 20px; border-radius: 15px 15px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">⚠️ Negative Review Incoming!</h1>
    </div>
    
    <div style="background: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="text-align: center; font-size: 28px; margin-bottom: 15px;">
        ${starsHtml}
      </div>
      
      <div style="background: #FEE2E2; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
        <p style="margin: 0; color: #374151; font-style: italic; line-height: 1.6;">
          "${review.reviewText}"
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Parent Name</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${review.parentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Child Ages</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${review.childAges || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Mode</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #374151;">${modeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-weight: bold;">Rating</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #E5E7EB; color: #DC2626; font-weight: bold;">${review.rating}/5</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-weight: bold;">Submitted</td>
          <td style="padding: 8px 0; color: #374151;">${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        </tr>
      </table>
      
      <div style="margin-top: 25px; text-align: center;">
        <p style="color: #6B7280; margin-bottom: 15px;">This review requires your approval before appearing publicly:</p>
        <div style="display: inline-block;">
          <a href="${baseUrl}/api/admin/reviews/${review.reviewId}/approve-from-email?action=approve&token=${process.env.REVIEW_APPROVAL_SECRET || 'geoquest-review-approval-2026'}" 
             style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 10px;">
            ✓ Accept Review
          </a>
          <a href="${baseUrl}/api/admin/reviews/${review.reviewId}/approve-from-email?action=reject&token=${process.env.REVIEW_APPROVAL_SECRET || 'geoquest-review-approval-2026'}" 
             style="display: inline-block; background: #EF4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ✕ Reject Review
          </a>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #FEF3C7; border-radius: 10px; text-align: center;">
        <p style="margin: 0; color: #92400E; font-size: 14px;">
          Low-rated reviews are held for manual approval. Consider reaching out to this user to understand their concerns.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `⚠️ [Negative Review Incoming] ${review.rating}★ from ${review.parentName}`,
    html,
  });
}

export async function sendContactEmail(contact: {
  name: string;
  email: string;
  message: string;
}): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Contact Form Submission</h1>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">From:</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${contact.name}</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Email:</p>
          <p style="margin: 0;">
            <a href="mailto:${contact.email}" style="color: #0d9488; text-decoration: none; font-size: 16px;">${contact.email}</a>
          </p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Message:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #0d9488;">
            <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${contact.message}</p>
          </div>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="mailto:${contact.email}?subject=Re: GeoQuest Contact Form" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reply to ${contact.name}</a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
        <p style="margin: 0;">This message was sent from the GeoQuest contact form.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `📬 Contact Form: Message from ${contact.name}`,
    html,
  });
}

export async function sendStoryRetentionEmail(
  parentName: string,
  email: string,
  tripName: string,
  destination: string,
  tripId: string,
  triggerType: '1_week' | '1_month'
): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const storyUrl = `${baseUrl}/s/${tripId}`;

  const isWeek = triggerType === '1_week';
  const subject = isWeek
    ? `Relive your ${destination} trip ✈️`
    : `Remember this moment? 🧡`;

  const headline = isWeek
    ? `It's been a week since ${destination} 🗺️`
    : `One month since ${destination} ✨`;

  const body = isWeek
    ? `The sights, the laughs, the little moments — they're all still there, waiting for you. Your family story is ready to read, share, or print.`
    : `A month has passed since your ${destination} adventure. The best travel memories don't fade — they get richer with time. Your family story is saved and ready whenever you want to revisit it.`;

  const ctaLabel = isWeek ? 'Read Your Family Story' : 'Revisit Your Adventure';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#faf8f5;">
<div style="max-width:600px;margin:0 auto;padding:20px;">

  <div style="background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);border-radius:20px 20px 0 0;padding:32px 30px;text-align:center;">
    <p style="color:#fff3e0;margin:0 0 8px 0;font-size:15px;">✈️ GeoAdventures</p>
    <h1 style="color:white;margin:0;font-size:26px;font-weight:700;line-height:1.3;">${headline}</h1>
    <p style="color:#fff3e0;margin:10px 0 0 0;font-size:15px;">Hi ${parentName} 👋</p>
  </div>

  <div style="background:white;padding:32px 30px;border-radius:0 0 20px 20px;box-shadow:0 4px 6px rgba(0,0,0,0.08);">

    <div style="background:#FFF8ED;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your adventure</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1F2937;">👉 ${tripName}</p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">${body}</p>

    <div style="text-align:center;margin:8px 0 28px 0;">
      <a href="${storyUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8962F 0%,#D4872B 100%);color:white;padding:16px 48px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;box-shadow:0 4px 15px rgba(212,135,43,0.35);">
        ${ctaLabel}
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:14px;margin:0;text-align:center;line-height:1.6;">
      <strong style="color:#D4872B;">– Team GeoAdventures</strong>
    </p>
  </div>

  ${getEmailFooter(email)}
</div>
</body>
</html>`;

  return sendEmail({ to: email, subject, html });
}

export async function sendWaitlistEmail(waitlist: {
  name: string;
  email: string;
  timestamp: string;
}): Promise<boolean> {
  const supportEmail = 'support@geoquestgame.com';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎴 New Physical Deck Waitlist Signup!</h1>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Name:</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${waitlist.name}</p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Email:</p>
          <p style="margin: 0;">
            <a href="mailto:${waitlist.email}" style="color: #0d9488; text-decoration: none; font-size: 16px;">${waitlist.email}</a>
          </p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Registration Date & Time:</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${waitlist.timestamp}</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="mailto:${waitlist.email}?subject=GeoQuest Physical Deck - You're on the waitlist!" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Contact ${waitlist.name}</a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 12px;">
        <p style="margin: 0;">This person signed up for the GeoQuest physical deck waitlist.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: supportEmail,
    subject: `🎴 Waitlist Signup: ${waitlist.name} wants the Physical Deck!`,
    html,
  });
}
