import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const patient = await prisma.patient.findUnique({ where: { id }, include: { person: true } });
  if (!patient) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json();
  const updated = await prisma.patient.update({ where: { id }, data: body, include: { person: true } });
  return NextResponse.json(updated);
}
