import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const item = await prisma.encounter.findUnique({ where: { id }, include: { observations: true, diagnoses: true } });
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json();
  const updated = await prisma.encounter.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}
