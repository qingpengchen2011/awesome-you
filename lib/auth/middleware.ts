import { z } from 'zod';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any; // This allows for additional properties
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('User is not authenticated');
    }

    const user = await getUser();
    if (!user) {
      throw new Error('User not found');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData, user);
  };
}

type ActionWithTeamFunction<T> = (
  team: TeamDataWithMembers,
  user: User
) => Promise<T>;

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (): Promise<T> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('User is not authenticated');
    }

    const user = await getUser();
    if (!user) {
      throw new Error('User not found');
    }

    const team = await getTeamForUser(user.id);
    if (!team) {
      redirect('/onboarding');
    }

    return action(team, user);
  };
}
