const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});

const player = new Player(client);

player.on('trackStart', (queue, track) => {
  queue.metadata.send(`🎶 Hraje: **${track.title}** v **${queue.connection.channel.name}**!`);
});

player.on('trackAdd', (queue, track) => {
  queue.metadata.send(`✅ Přidáno do fronty: **${track.title}**`);
});

player.on('error', (queue, error) => {
  console.log(`Chyba ve frontě ${queue.guild.name}: ${error.message}`);
});

client.once('ready', () => {
  console.log('Bot online!');
  // Deploy slash commands (spusť jednou v chatu !deploy)
});

client.on('messageCreate', async (message) => {
  if (message.content === '!deploy' && message.author.id === client.application.owner.id) {
    await message.guild.commands.set([
      {
        name: 'play',
        description: 'Přehraj píseň nebo playlist',
        options: [{ name: 'query', type: 3, description: 'URL nebo název písně', required: true }]
      },
      { name: 'skip', description: 'Přeskoč aktuální píseň' },
      { name: 'stop', description: 'Zastav hudbu a opuštění VC' }
    ]);
    await message.reply('Slash commands nasazeny!');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const queue = player.getQueue(interaction.guildId);

  if (interaction.commandName === 'play') {
    if (!interaction.member.voice.channel) return interaction.reply('Musíš být ve voice kanálu!');
    await interaction.deferReply();

    const query = interaction.options.get('query').value;
    const searchResult = await player.search(query, { requestedBy: interaction.user, searchEngine: QueryType.AUTO });

    if (!searchResult?.tracks.length) return interaction.followUp('Žádné výsledky nenalezeny!');

    if (!queue) {
      await player.createQueue(interaction.guild, { metadata: interaction.channel });
      queue = player.getQueue(interaction.guildId);
      queue.connect(interaction.member.voice.channel);
    }

    searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
    if (!queue.playing) await queue.play();
    return interaction.followUp(`⏱ Načítám ${searchResult.playlist ? 'playlist' : 'píseň'}...`);

  } else if (interaction.commandName === 'skip') {
    if (!queue?.playing) return interaction.reply('Nic nehraje!');
    queue.skip();
    return interaction.reply('⏭ Přeskočeno!');

  } else if (interaction.commandName === 'stop') {
    if (!queue?.playing) return interaction.reply('Nic nehraje!');
    queue.destroy();
    return interaction.reply('🛑 Hudba zastavena!');
  }
});

client.login(config.token);
