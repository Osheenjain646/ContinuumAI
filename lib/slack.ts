/**
 * Slack API Driver
 * Fetches user activity: messages, thread participations, channel mentions
 */

import type { SlackMessage } from "@/types";

// Legacy request type — used internally by this driver only
interface FetchSlackActivityRequest {
  userId: string;
  token?: string;
  channelIds?: string[];
  daysBack?: number;
}

const SLACK_API_BASE = "https://slack.com/api";

async function slackFetch<T>(
  method: string,
  params: Record<string, string | number | boolean>,
  token?: string
): Promise<T> {
  const authToken = token || process.env.SLACK_BOT_TOKEN;
  if (!authToken) throw new Error("Slack token is required");

  const url = new URL(`${SLACK_API_BASE}/${method}`);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Slack HTTP error: ${res.status}`);
  }

  const data = (await res.json()) as T & { ok: boolean; error?: string };
  if (!(data as { ok: boolean }).ok) {
    throw new Error(`Slack API error: ${(data as { error?: string }).error}`);
  }

  return data;
}

// â”€â”€â”€ Fetch channels the user is a member of â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchUserChannels(
  userId: string,
  token?: string
): Promise<{ id: string; name: string }[]> {
  try {
    const data = await slackFetch<{
      channels: { id: string; name: string }[];
    }>(
      "users.conversations",
      {
        user: userId,
        types: "public_channel",
        exclude_archived: true,
        limit: 100,
      },
      token
    );
    return data.channels;
  } catch (err) {
    console.error("[slack] fetchUserChannels error:", err);
    return [];
  }
}

// â”€â”€â”€ Fetch messages in a channel matching user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchChannelMessages(
  channelId: string,
  channelName: string,
  userId: string,
  oldest: number,
  token?: string
): Promise<SlackMessage[]> {
  try {
    const data = await slackFetch<{
      messages: {
        client_msg_id?: string;
        text: string;
        user?: string;
        ts: string;
        thread_ts?: string;
        reply_count?: number;
        reactions?: { name: string; count: number }[];
      }[];
    }>(
      "conversations.history",
      {
        channel: channelId,
        oldest: oldest.toString(),
        limit: 200,
      },
      token
    );

    // Filter messages where the user was mentioned or is the author
    const mentionPattern = new RegExp(`<@${userId}>`, "i");
    const userMessages = data.messages.filter(
      (msg) => msg.user === userId || mentionPattern.test(msg.text)
    );

    return userMessages.map((msg) => ({
      id: msg.client_msg_id || msg.ts,
      channel: channelName,
      channelId,
      text: msg.text,
      timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      threadTs: msg.thread_ts,
      replyCount: msg.reply_count,
      url: `https://slack.com/archives/${channelId}/p${msg.ts.replace(".", "")}`,
      reactions: msg.reactions,
    }));
  } catch (err) {
    console.error(`[slack] fetchChannelMessages(${channelName}) error:`, err);
    return [];
  }
}

// â”€â”€â”€ Search Slack for user-specific messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function searchSlackForUser(
  req: FetchSlackActivityRequest
): Promise<SlackMessage[]> {
  const { userId, token, daysBack = 30 } = req;
  const oldest = Math.floor(
    (Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000
  );

  try {
    // Search messages from the user using search.messages
    const authToken = token || process.env.SLACK_USER_TOKEN;
    if (!authToken) return [];

    const data = await slackFetch<{
      messages: {
        matches: {
          iid: string;
          text: string;
          channel: { id: string; name: string };
          ts: string;
          permalink: string;
        }[];
      };
    }>(
      "search.messages",
      {
        query: `from:<@${userId}>`,
        sort: "timestamp",
        sort_dir: "desc",
        count: 100,
      },
      authToken
    );

    return data.messages.matches.map((match) => ({
      id: match.iid,
      channel: match.channel.name,
      channelId: match.channel.id,
      text: match.text,
      timestamp: new Date(parseFloat(match.ts) * 1000).toISOString(),
      url: match.permalink,
    }));
  } catch {
    // Fallback: fetch from user's channels
    const channels = await fetchUserChannels(userId, token);
    const targetChannels = req.channelIds
      ? channels.filter((c) => req.channelIds?.includes(c.name))
      : channels.slice(0, 10); // limit to 10 channels

    const allMessages: SlackMessage[] = [];
    for (const channel of targetChannels) {
      const msgs = await fetchChannelMessages(
        channel.id,
        channel.name,
        userId,
        oldest,
        token
      );
      allMessages.push(...msgs);
    }

    return allMessages.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export async function fetchAllSlackActivity(req: FetchSlackActivityRequest) {
  const messages = await searchSlackForUser(req);
  return { messages };
}


