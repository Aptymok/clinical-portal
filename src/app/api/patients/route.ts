import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const patients = await prisma.patient.findMany({ include: { person: true } });
  return NextResponse.json(patients);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.person || !body.person.firstName) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const created = await prisma.patient.create({
    data: {
      mrn: body.mrn,
      person: { create: body.person }
    },
    include: { person: true }
  });
  return NextResponse.json(created, { status: 201 });
}
