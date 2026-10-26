import { prisma } from "../server/src/prisma/client";
import { seedDatabase } from "../server/src/prisma/seedData";

async function main() {
  await seedDatabase(prisma);
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
