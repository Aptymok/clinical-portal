import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.appointment.findMany({ include: { patient: { include: { person: true } }, provider: true } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.appointment.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
