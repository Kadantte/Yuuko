import { SlashCommandBuilder, EmbedBuilder, type ColorResolvable } from "discord.js";
import { mwGetUserEntry } from "../Middleware/UserEntry";
import type { Command } from "../Structures";
import { EmbedError, GraphQLRequest, Footer, getOptions } from "../Utils";

const name = "user";
const usage = "user <?anilist name>";
const description = "Searches for an anilist user and displays information about them.";

export default {
  name,
  usage,
  description,
  middlewares: [mwGetUserEntry],
  commandType: "Anilist",
  withBuilder: new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .addStringOption((option) => option.setName("query").setRequired(false).setDescription("The user to search for")),

  run: async ({ interaction, client }): Promise<void> => {
    if (!interaction.isCommand()) return;

    const { query: anilistUser } = getOptions<{ query: string }>(interaction.options, ["query"]);

    let vars: Partial<{
      username: string;
      userid: number;
    }> = {
      username: anilistUser,
    };

    if (!anilistUser) {
      if (interaction.alID) {
        vars = { userid: interaction.alID };
      } else {
        return void interaction.editReply({ embeds: [EmbedError(`You have yet to set an AniList token.`)] });
      }
    }
    try {
      const {
        data: { User: response },
        headers,
      } = await GraphQLRequest("User", vars);
      if (response) {
        const titleEmbed = new EmbedBuilder().setAuthor({ name: response.name, iconURL: "https://anilist.co/img/icons/android-chrome-512x512.png", url: response.siteUrl || "https://anilist.co" }).setFooter(Footer(headers));

        if (response.avatar?.large) titleEmbed.setThumbnail(response.avatar.large);
        if (response.bannerImage) titleEmbed.setImage(response.bannerImage);

        const statistics = response.statistics;

        if (statistics) {
          titleEmbed.addFields(
            { name: "< Anime >\n\n", value: `**Watched:** ${statistics.anime?.count.toString()}\n**Average score**: ${statistics.anime?.meanScore.toString()}`, inline: true },
            { name: "< Manga >\n\n", value: `**Read:** ${statistics.manga?.count.toString()}\n**Average score**: ${statistics.manga?.meanScore.toString()}`, inline: true },
            { name: "\u200b", value: " ", inline: true },
            );
        }

        const favorites = response.favourites;

        if(favorites) {
          const anime = favorites.anime?.nodes?.slice(0, 5);
          const manga = favorites.manga?.nodes?.slice(0, 5)

          if(anime?.length) {
            titleEmbed.addFields({ name: "< Anime Favorites >\n\n", value: anime.map((a) => `[${a?.title?.romaji}](https://anilist.co/anime/${a?.id})`).join("\n"), inline: true });
          }
          if(manga?.length) {
            titleEmbed.addFields({ name: "< Manga Favorites >\n\n", value: manga.map((m) => `[${m?.title?.romaji}](https://anilist.co/manga/${m?.id})`).join("\n"), inline: true });
          }
        }

        let userColor: ColorResolvable | null;
        const profileColor = response.options?.profileColor;

        if (profileColor) {
          userColor = profileColor.charAt(0).toUpperCase() + profileColor.slice(1);

          if (profileColor === "pink") userColor = "LuminousVividPink";
          if (profileColor === "gray") userColor = "Grey";
          // this is just cancer
          // re: yeah, this is cancer
          titleEmbed.setColor(userColor as ColorResolvable);
        }
        interaction.editReply({ embeds: [titleEmbed] });
      } else {
        return void interaction.editReply({ embeds: [EmbedError(`Couldn't find any data.`, vars)] });
      }
    } catch (e: any) {
      console.error(e);
      interaction.editReply({ embeds: [EmbedError(e, vars)] });
    }
  },
} satisfies Command;
