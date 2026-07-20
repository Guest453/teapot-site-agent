const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
if (!applicationId || !botToken) throw new Error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN");

const route = guildId
  ? `applications/${applicationId}/guilds/${guildId}/commands`
  : `applications/${applicationId}/commands`;
const command = {
  name: "site",
  type: 1,
  description: "Ask the AI agent to change the website",
  contexts: [0],
  integration_types: [0],
  options: [
    {
      name: "prompt",
      description: "Describe what you want changed",
      type: 3,
      required: true,
      max_length: 1800,
    },
  ],
};

const response = await fetch(`https://discord.com/api/v10/${route}`, {
  method: "POST",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(command),
});
if (!response.ok) throw new Error(`Discord returned ${response.status}: ${await response.text()}`);
console.log(`Registered /site command${guildId ? ` in guild ${guildId}` : " globally"}.`);
