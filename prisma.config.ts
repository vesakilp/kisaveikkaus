import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Load from environment variable for CLI commands
    // This is safe to commit as it references the environment variable
    url: process.env.DIRECT_URL || "",
  },
});
