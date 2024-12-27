'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations,
  User,
} from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { signIn as NextAuthSignIn } from 'next-auth/react';

async function logActivity(
  teamId: number | null | undefined,
  userId: string,
  type: ActivityType,
  ipAddress?: string,
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  priceId: z.string().optional(),
  redirect: z.string().optional(),
});

export const createTeam = validatedActionWithUser(
  createTeamSchema,
  async (data, _, user) => {
    const { name, priceId, redirect } = data;

    const existingTeam = await getUserWithTeam(user.id);
    if (existingTeam?.team) {
      return { error: 'You already have a team' };
    }

    const newTeam: NewTeam = {
      name,
    };

    const [team] = await db.insert(teams).values(newTeam).returning();

    const newTeamMember: NewTeamMember = {
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    };

    await db.insert(teamMembers).values(newTeamMember);

    await logActivity(team.id, user.id, ActivityType.TEAM_CREATE);

    if (priceId) {
      const session = await createCheckoutSession({
        priceId,
        clientReferenceId: user.id,
        customerId: team.stripeCustomerId,
      });

      if (session.url) {
        redirect(session.url);
      }
    }

    if (redirect) {
      redirect(redirect);
    }

    return { success: 'Team created successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.string(),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.team) {
      return { error: 'You are not a member of any team' };
    }

    const team = userWithTeam.team;

    if (userWithTeam.teamMember.role !== 'owner') {
      return { error: 'Only team owners can invite members' };
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const existingMember = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, existingUser[0].id)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        return { error: 'User is already a member of this team' };
      }
    }

    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await db.insert(invitations).values({
      teamId: team.id,
      email,
      role,
      token,
      expires,
    });

    await logActivity(team.id, user.id, ActivityType.MEMBER_INVITE);

    // TODO: Send invitation email

    return { success: 'Invitation sent successfully' };
  }
);

export async function signIn() {
  await NextAuthSignIn('credentials', {
    redirect: false,
  });
}
export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  // await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  // (await cookies()).delete('session');
}