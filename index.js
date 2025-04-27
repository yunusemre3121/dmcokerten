const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const dmCommand = require('./src/commands/dm.js');

const token = process.env.BOT_TOKEN;
const botIndex = parseInt(process.env.BOT_INDEX) || 0;
const isModerator = process.env.IS_MODERATOR === 'true';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.once('ready', () => {
  console.log(`${isModerator ? 'Moderatör' : 'Onur'} ${botIndex + 1} (${client.user.tag}) is ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('.dm')) {
    await dmCommand.execute(message, client, botIndex, isModerator);
  }
});

client.login(token).catch(err => {
  console.error(`${isModerator ? 'Moderatör' : 'Onur'} ${botIndex + 1} login failed:`, err);
  process.exit(1);
});