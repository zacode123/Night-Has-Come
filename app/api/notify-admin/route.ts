import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const { name, personality, age } = await req.json();
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Night Has Come <server@night-has-come.vercel.app>',
        to: 'mofazzolwasimahmed@gmail.com',
        subject: 'New Player Joined: Night Has Come',
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #d32f2f;">New Player Registration</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Age:</strong> ${age}</p>
            <p><strong>Personality:</strong> ${personality}</p>
            <p>Please approve them in the admin panel.</p>
          </div>
        `
      });
      console.log(`[EMAIL SENT] To: Zahid Arman. New player joined: ${name} (${personality}, ${age})`);
    } else {
      console.error('[EMAIL SEND FAILED] API KEY not found!');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json({ error: 'Failed to notify admin' }, { status: 500 });
  }
}
