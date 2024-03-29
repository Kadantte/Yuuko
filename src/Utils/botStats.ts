import type { Client } from "../Structures";
import { stat, statTables, db } from "../Database/db";

export async function getStats() {
    const stats = (await stat.select().from(statTables.BotStats))[0];
    console.log(stats);
    if (!stats) return { servers: 0, members: 0, registered: 0 };
    return stats;
}

export async function updateBotStats(client: Client) {
    const servers = client.guilds.cache.size;
    const members = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const registered = (await db.query.anilistUser.findMany()).length;
    await stat.insert(statTables.BotStats).values({ servers, members, registered });
}