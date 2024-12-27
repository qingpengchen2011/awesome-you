import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { randomUUID } from 'crypto';
import { hashPassword } from '@/lib/auth/session';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const email = 'test@test.com';
  const name = 'Test User';
  const password = 'admin123';

  const [user] = await db
    .insert(users)
    .values([
      {
        id: randomUUID(),
        name,
        email,
        role: 'owner',
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    )
    .returning();

  console.log('Initial user created.')

  const [team] = await db
    .insert(teams)
    .values([
      {
      name: 'Test Team',
    }
  ])
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  await createStripeProducts();
  console.log('Seed completed successfully');

}

// Only run seed() if this file is being run directly
if (require.main === module) {
  seed()
    .catch((error) => {
      console.error('Seed process failed:', error);
      process.exit(1);
    })
    .finally(() => {
      console.log('Seed process finished. Exiting...');
      process.exit(0);
    });
}
