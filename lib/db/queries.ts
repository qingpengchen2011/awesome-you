import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users } from './schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    stripeProductId?: string | null;
    planName?: string | null;
    subscriptionStatus?: string | null;
  }
) {
  return db.update(teams).set(subscriptionData).where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: string) {
  const result = await db
    .select({
      user: users,
      team: teams,
      teamMember: teamMembers,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getActivityLogs(teamId: number) {
  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      createdAt: activityLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.teamId, teamId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(50);
}

export async function getTeamForUser(userId: string) {
  const result = await db
    .select({
      team: teams,
      teamMembers: teamMembers,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0].team,
    teamMembers: [
      {
        ...result[0].teamMembers,
        user: result[0].user,
      },
    ],
    user: result[0].user,
  };
}
