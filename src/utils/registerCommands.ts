import path from "node:path";
import fs from "node:fs";
import type { Client, Command } from "#structures/index";
import { REST, Routes } from "discord.js";
import { env } from '#env';
import { srcPath } from "./paths";
import { logger } from "#src/utils/logger";

export async function registerCommands(client: Client) {
  const environment = env.NODE_ENV;
  logger.info("Starting bot", { type: "startup", environment })

  const commandsPath = srcPath("commands");
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".ts"));

  logger.info("Loaded commands", { type: "startup", total: commandFiles.length, commands: commandFiles })
  const commandPayloads: unknown[] = [];
  const loadedCommandNames: string[] = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const module = (await import(filePath)) as { default?: Command };

    if (!module.default?.name || !module.default?.withBuilder) {
      logger.warn(`Command file "${file}" is missing a default Command export`, { type: "startup" });
      continue;
    }

    const command = module.default;
    client.commands.set(command.name, command);
    commandPayloads.push(command.withBuilder.toJSON());
    loadedCommandNames.push(command.name);
  }

  logger.info("Loaded slash commands", { type: "startup", total: loadedCommandNames.length })

  // ^ Register Slash Commands
  const rest = new REST({ version: "10" }).setToken(env.TOKEN);

  const clientId = env.CLIENT_ID;
  const guildId = env.GUILD_ID;
  const isProduction = environment === "production" || environment === "docker";

  const route = isProduction
    ? Routes.applicationCommands(clientId)
    : Routes.applicationGuildCommands(clientId, guildId);

  try {
    logger.info(`Refreshing ${commandPayloads.length} slash (/) commands.`, {
      type: "startup",
      commands: loadedCommandNames,
    });

    await rest.put(route, { body: commandPayloads });

    logger.info(`Refreshed ${commandPayloads.length} slash (/) commands.`, {
      type: "startup",
      commands: loadedCommandNames,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to refresh slash commands", { type: "startup", error: message });
  }
}
