import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const { name, personality } = await req.json();
    
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Night Has Come <onboarding@resend.dev>',
        to: 'mofazzolwasimahmed@gmail.com',
        subject: 'New Player Joined: Night Has Come',
        html: `
          <h2>New Player Registration</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Personality:</strong> ${personality}</p>
          <p>Please approve them in the admin panel.</p>
        `
      });
      console.log(`[EMAIL SENT] To: Zahid Arman. New player joined: ${name} (${personality})`);
    } else {
      console.log(`[EMAIL MOCK] To: Zahid Arman. New player joined: ${name} (${personality})`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json({ error: 'Failed to notify admin' }, { status: 500 });
  }
}
