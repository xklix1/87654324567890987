import { pool, getIsPostgresAvailable } from './pool';
import { ChatMessageRecord, ChatChannel } from '../types';

interface QueryResultRow {
  [column: string]: unknown;
}

const memChatMessages: ChatMessageRecord[] = [];
let chatIdCounter = 1;

export class ChatStore {
  public static async saveMessage(params: {
    channel: ChatChannel;
    senderId: string;
    senderUsername: string;
    receiverId?: string | null;
    receiverUsername?: string | null;
    content: string;
  }): Promise<ChatMessageRecord> {
    const now = new Date();
    const createdAtIso = now.toISOString();

    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `INSERT INTO chat_messages (channel, sender_id, receiver_id, content, created_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, channel, sender_id, receiver_id, content, created_at`,
          [
            params.channel,
            params.senderId,
            params.receiverId ?? null,
            params.content,
            now,
          ]
        );
        const row = result.rows[0];
        if (row) {
          return {
            id: Number(row.id),
            channel: row.channel as ChatChannel,
            sender_id: String(row.sender_id),
            sender_username: params.senderUsername,
            receiver_id: row.receiver_id ? String(row.receiver_id) : null,
            receiver_username: params.receiverUsername ?? null,
            content: String(row.content),
            created_at: new Date(String(row.created_at)).toISOString(),
          };
        }
      } catch (err: unknown) {
        process.stdout.write(
          `[ChatStore] Error saving message in PostgreSQL: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    const newMsg: ChatMessageRecord = {
      id: chatIdCounter++,
      channel: params.channel,
      sender_id: params.senderId,
      sender_username: params.senderUsername,
      receiver_id: params.receiverId ?? null,
      receiver_username: params.receiverUsername ?? null,
      content: params.content,
      created_at: createdAtIso,
    };
    memChatMessages.push(newMsg);
    if (memChatMessages.length > 500) {
      memChatMessages.shift();
    }
    return { ...newMsg };
  }

  public static async getGlobalMessages(limit = 50): Promise<ChatMessageRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT m.id, m.channel, m.sender_id, u.username AS sender_username, 
                  m.receiver_id, m.content, m.created_at
           FROM chat_messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.channel = 'GLOBAL'
           ORDER BY m.created_at DESC
           LIMIT $1`,
          [limit]
        );
        return result.rows
          .map((r) => ({
            id: Number(r.id),
            channel: 'GLOBAL' as ChatChannel,
            sender_id: String(r.sender_id),
            sender_username: String(r.sender_username),
            receiver_id: null,
            receiver_username: null,
            content: String(r.content),
            created_at: new Date(String(r.created_at)).toISOString(),
          }))
          .reverse();
      } catch (err: unknown) {
        process.stdout.write(
          `[ChatStore] Error querying global messages: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    return memChatMessages
      .filter((m) => m.channel === 'GLOBAL')
      .slice(-limit);
  }

  public static async getDirectMessages(
    userAId: string,
    userBId: string,
    limit = 50
  ): Promise<ChatMessageRecord[]> {
    if (getIsPostgresAvailable()) {
      try {
        const result = await pool.query<QueryResultRow>(
          `SELECT m.id, m.channel, m.sender_id, u1.username AS sender_username, 
                  m.receiver_id, u2.username AS receiver_username, m.content, m.created_at
           FROM chat_messages m
           JOIN users u1 ON m.sender_id = u1.id
           LEFT JOIN users u2 ON m.receiver_id = u2.id
           WHERE m.channel = 'DIRECT'
             AND ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
           ORDER BY m.created_at DESC
           LIMIT $3`,
          [userAId, userBId, limit]
        );
        return result.rows
          .map((r) => ({
            id: Number(r.id),
            channel: 'DIRECT' as ChatChannel,
            sender_id: String(r.sender_id),
            sender_username: String(r.sender_username),
            receiver_id: r.receiver_id ? String(r.receiver_id) : null,
            receiver_username: r.receiver_username ? String(r.receiver_username) : null,
            content: String(r.content),
            created_at: new Date(String(r.created_at)).toISOString(),
          }))
          .reverse();
      } catch (err: unknown) {
        process.stdout.write(
          `[ChatStore] Error querying direct messages: ${err instanceof Error ? err.message : String(err)}\n`
        );
      }
    }

    return memChatMessages
      .filter(
        (m) =>
          m.channel === 'DIRECT' &&
          ((m.sender_id === userAId && m.receiver_id === userBId) ||
            (m.sender_id === userBId && m.receiver_id === userAId))
      )
      .slice(-limit);
  }
}
