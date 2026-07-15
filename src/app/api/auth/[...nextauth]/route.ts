import NextAuth from 'next-auth';
import authOptions from '@/auth';

const handler = NextAuth(authOptions as any);

export async function GET(request: Request) {
	const h: any = handler as any;
	if (typeof h.GET === 'function') return h.GET(request);
	if (typeof h === 'function') return h(request);
	return new Response('Not implemented', { status: 501 });
}

export async function POST(request: Request) {
	const h: any = handler as any;
	if (typeof h.POST === 'function') return h.POST(request);
	if (typeof h === 'function') return h(request);
	return new Response('Not implemented', { status: 501 });
}