import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";

export const authOptions = {
	trustHost: true,
	adapter: PrismaAdapter(prisma),
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'text' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials: any) {
				if (!credentials) return null;
				const user = await prisma.user.findUnique({ where: { email: credentials.email } });
				// TODO: verify password with hashing
				if (user) return { id: user.id, email: user.email, name: user.name };
				return null;
			}
		})
	],
	callbacks: {
		async jwt({ token, user }: any) {
			if (user) token.role = (user as any).role ?? 'PATIENT';
			return token;
		},
		async session({ session, token }: any) {
			(session as any).role = (token as any).role;
			return session;
		}
	}
};

export default authOptions;
