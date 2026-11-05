import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run database migrations");
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: resolve(process.cwd(), "drizzle") });
    console.info("Database migrations are up to date");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed", error);
  process.exitCode = 1;
});
