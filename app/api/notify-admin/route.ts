import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, personality } = await request.json();

    // In a real application, we would use a service like Resend, SendGrid, or Nodemailer here.
    // For this prototype, we'll just log it to the server console.
    console.log(`[EMAIL NOTIFICATION] New player joined the game.`);
    console.log(`Name: ${name}`);
    console.log(`Personality: ${personality}`);
    console.log(`Please approve them in the admin panel.`);

    return NextResponse.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
  }
}
