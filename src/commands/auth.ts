import { footer, graphQLRequest, getOptions, updateBotStats, getSubcommand, YuukoError } from "#utils/index";
import { anilistUser } from "#database/models/anilistUser";
import type { Command } from "#structures/index";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { db } from "#database/db";
import { eq } from "drizzle-orm";

const name = "auth";
const usage = "auth <help | wipe>";
const description = "Binds an existing AniList user to your Discord account in the bot database.";

export default {
    name,
    usage,
    description,
    commandType: "Anilist",
    withBuilder: new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addSubcommand((subcommand) => subcommand.setName("help").setDescription("Shows you info on how to get your AniList token."))
        .addSubcommand((subcommand) => subcommand.setName("wipe").setDescription("Unlink your AniList token from the bot.")),

    run: async ({ interaction, client }): Promise<void> => {

        const type = getSubcommand<["token", "help", "wipe"]>(interaction.options);
        const { token } = getOptions<{ token: string | undefined }>(interaction.options, ["token"]);

        db.query.anilistUser.findFirst({ where: (user, { eq }) => eq(user.discordId, interaction.user.id) });

        if (type === "help") {
            return void (await interaction.reply({
                embeds: [
                    {
                        title: `Steps to get your AniList Token.`,
                        description: `To add you as an user you have to [link your Discord account with Anilist](https://auth.yuuko.dev).\nBeware! Tokens last one year, so if you start experiencing an error of invalid token, it means you have to run \`/auth wipe\` and reconnect your account.`,
                        footer: footer(),
                    },
                ],
                flags: MessageFlags.Ephemeral,
            }));
        }

        const user = (await db.select().from(anilistUser).where(eq(anilistUser.discordId, interaction.user.id)).limit(1))[0];

        if (type === "wipe") {
            if (!user) throw new YuukoError("You don't have an AniList account bound to your Discord account.", null, true)
            await db.delete(anilistUser).where(eq(anilistUser.discordId, interaction.user.id));

            await updateBotStats(client);
            return void interaction.reply({
                embeds: [
                    {
                        title: `Successfully wiped your AniList account binding.`,
                        description: `Your Discord-bound AniList account has been wiped from our database.`,
                        color: 0x00ff00,
                        footer: footer(),
                    },
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Update existing user
        if (user) {
            if (!token) throw new YuukoError("Please provide a token with this option.", null, true);

            const { Viewer: data } = (await graphQLRequest("Viewer", {}, token)).data;

            if (!data) throw new YuukoError("Invalid token provided.", null, true);

            await db
                .update(anilistUser)
                .set({ anilistToken: await client.rsa.encrypt(token), anilistId: data.id })
                .where(eq(anilistUser.discordId, interaction.user.id));
            return void interaction.reply({
                embeds: [
                    {
                        title: `Successfully updated your AniList account binding.`,
                        description: `Your Discord-bound AniList account has been changed to \`${data.name}\`.`,
                        color: 0x00ff00,
                        footer: footer(),
                    },
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Create new user
        if (!token) throw new YuukoError("Please provide a token with this option.", null, true);

        const { Viewer: data } = (await graphQLRequest("Viewer", {}, token)).data;

        if (!data) throw new YuukoError("Invalid token provided.", null, true);

        await db.insert(anilistUser).values({ discordId: interaction.user.id, anilistToken: await client.rsa.encrypt(token), anilistId: data.id });
        await updateBotStats(client);
        return void interaction.reply({
            embeds: [
                {
                    title: `Successfully bound your AniList account to your Discord account.`,
                    description: `Your AniList account is now \`${data.name}\`.`,
                    color: 0x00ff00,
                    footer: footer(),
                },
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
} satisfies Command;
