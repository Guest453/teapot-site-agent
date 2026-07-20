import express from "express";
import { verifyKeyMiddleware } from "discord-interactions";
import { SiteAgent } from "./agent.js";
import { getConfig } from "./config.js";
import {
  editOriginalResponse,
  EPHEMERAL,
  getInvokingUserId,
  getPrompt,
  InteractionType,
  ResponseType,
} from "./discord.js";
import { GitHubSite } from "./github.js";

const config = getConfig();
const app = express();
const agent = new SiteAgent({ apiKey: config.openaiApiKey, model: config.openaiModel });
const github = new GitHubSite({
  token: config.githubToken,
  repository: config.githubRepository,
  defaultBranch: config.githubDefaultBranch,
});

app.get("/health", (_request, response) => response.json({ ok: true }));

app.post("/interactions", verifyKeyMiddleware(config.discordPublicKey), async (request, response) => {
  const interaction = request.body;
  if (interaction.type === InteractionType.PING) return response.json({ type: ResponseType.PONG });
  if (interaction.type !== InteractionType.APPLICATION_COMMAND || interaction.data?.name !== "site") {
    return response.status(400).json({ error: "Unknown interaction" });
  }

  const userId = getInvokingUserId(interaction);
  const prompt = getPrompt(interaction);
  if (!userId || interaction.guild_id !== config.discordGuildId) {
    return response.json({
      type: 4,
      data: { content: "This command can only edit the configured server's site.", flags: EPHEMERAL },
    });
  }
  if (!prompt || prompt.length > 1800) {
    return response.json({
      type: 4,
      data: { content: "Give me a prompt between 1 and 1800 characters.", flags: EPHEMERAL },
    });
  }

  response.json({
    type: ResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: EPHEMERAL },
  });

  try {
    const current = await github.readSite();
    const plan = await agent.propose(prompt, current.files);
    const pull = await github.publishProposal({
      ...current,
      ...plan,
      requestedBy: userId,
    });
    let result = `Created PR #${pull.number}: ${pull.html_url}\n${plan.summary}`;
    if (config.autoMerge) {
      const merge = await github.mergePull(pull.number);
      result = merge.data.merged
        ? `Published via PR #${pull.number}: ${pull.html_url}\n${plan.summary}`
        : `${result}\nAuto-merge was requested but GitHub did not merge it.`;
    }
    await editOriginalResponse(config.discordApplicationId, interaction.token, result);
  } catch (error) {
    console.error(error);
    await editOriginalResponse(
      config.discordApplicationId,
      interaction.token,
      `I could not prepare the site change: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
});

app.listen(config.port, () => console.log(`Teapot site agent listening on port ${config.port}`));
