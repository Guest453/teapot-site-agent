function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getConfig() {
  return {
    discordApplicationId: required("DISCORD_APPLICATION_ID"),
    discordPublicKey: required("DISCORD_PUBLIC_KEY"),
    discordBotToken: required("DISCORD_BOT_TOKEN"),
    discordGuildId: required("DISCORD_GUILD_ID"),
    openaiApiKey: required("OPENAI_API_KEY"),
    openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    githubToken: required("GITHUB_TOKEN"),
    githubRepository: required("GITHUB_REPOSITORY"),
    githubDefaultBranch: process.env.GITHUB_DEFAULT_BRANCH?.trim() || "main",
    autoMerge: process.env.AUTO_MERGE === "true",
    port: Number(process.env.PORT || 3000),
  };
}
