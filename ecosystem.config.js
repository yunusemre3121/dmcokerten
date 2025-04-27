const config = require('./config.json');

module.exports = {
  apps: config.bots.map((bot, index) => ({
    name: `onur-${index + 1}${bot.isModerator ? '-mod' : ''}`,
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      BOT_TOKEN: bot.token,
      BOT_INDEX: index,
      IS_MODERATOR: bot.isModerator || false
    }
  }))
};