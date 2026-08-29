/**
 * Discord Webhook Dispatcher
 * Sends rich markdown embeds to a Discord channel when Secret Santa events occur.
 */
export async function sendDiscordAnnouncement(
  webhookUrl: string,
  title: string,
  description: string,
  color: number = 0x165b33 // Festive Green
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return false;
  }

  try {
    const payload = {
      embeds: [
        {
          title: `🎁 ${title}`,
          description,
          color,
          footer: {
            text: 'Discord Secret Santa • santa.lightmedia.club',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to dispatch Discord webhook:', err);
    return false;
  }
}
