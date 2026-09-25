import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import { verifyPassword } from "./lib/auth-password";
import { logAudit } from "./lib/audit";

export const authOptions = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: any) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await verifyPassword(password, user?.passwordHash);

        await logAudit({
          actorId: valid ? user?.id : null,
          action: valid ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILURE',
          resource: 'User',
          resourceId: valid ? user?.id : undefined,
          status: valid ? 'SUCCESS' : 'REJECTED',
          meta: { email }
        });

        if (!user || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.role = (user as any).role ?? 'PATIENT';
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};

export default authOptions;
