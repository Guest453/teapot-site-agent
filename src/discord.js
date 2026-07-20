export const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
export const ResponseType = { PONG: 1, DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5 };
export const EPHEMERAL = 1 << 6;

export function getInvokingUserId(interaction) {
  return interaction.member?.user?.id || interaction.user?.id || null;
}
export function getPrompt(interaction) {
  return interaction.data?.options?.find((option) => option.name === "prompt")?.value?.trim() || "";
}

export async function editOriginalResponse(applicationId, interactionToken, content) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
    },
  );
  if (!response.ok) throw new Error(`Discord follow-up failed: ${response.status}`);
}
