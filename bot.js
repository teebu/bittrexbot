let request = require('async-request');
let Twitter = require('twitter');
let _ = require('lodash');
const chalk = require('chalk');
const Discord = require("discord.js");
const Bot = new Discord.Client();

const config = require('./config.json');
const client = new Twitter(config.twitter_keys);

const coinList = require('./coins.json');

const prefix = "!"
let bot_running = false;
let channel;
let min_followers = 10000;


// start the processes
start();



async function start() {

	startBot(); //start the discord bot

	//let data = await getCoinsList(); // get bittrex coins list
	//let coins = data.result.map(currency => currency.MarketCurrency).filter(coin => coin != 'BTC') // map and filter bittrex coins list

	let coins = Object.keys(coinList)
	console.log('tracking: %d coins', coins.length)

	// start twitter stream
	const twitter_filter = 'binance, kucoin, mcaffee, palm beach, bitcoin, bittrex, coin of the day, altcoins, alt coin, shit coin, coin, crypto currency, crypto, shitcoin, blockchain, moon coin, 10x coin'
	let stream = client.stream('statuses/filter', {track: twitter_filter, tweet_mode:'extended'});
	const regex = new RegExp(`\\b(${coins.join("|")})\\b`, 'g')  // /\b(BTC|POWR)\b/g

	//console.log(regex)
	console.log('tracking twitter keywords:', twitter_filter)

	stream.on('data', function (event) {
		//console.log(event && event.text, '\n');
		let coins_mentioned = [];
		let str = event && event.text;
		let m;

		if (event.extended_tweet) {
      str = event.extended_tweet.full_text
		}

		if (event.user && event.user.followers_count && event.user.followers_count > min_followers) {
			while ((m = regex.exec(str)) !== null) {
				// This is necessary to avoid infinite loops with zero-width matches
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}
				// The result can be accessed through the `m`-variable.
				coins_mentioned.push(m[0])
			}

			if (coins_mentioned.length > 0) {
				coins_mentioned = _.uniq(coins_mentioned.map(coin => coin.toUpperCase()))

				// if discord bot is running send message to channel
				if (bot_running == true) {
					channel.send(getMessagEmbed(event, coins_mentioned))
					//.then(message => console.log(`Sent message: ${message.content}`))
						.catch(console.error);
				}
			}
		}
	});

	stream.on('error', function (error) {
		throw error;
	});
}

function startBot() {
  Bot.login(config.bot_token);

  Bot.on('ready', () => {
			bot_running = true;
			console.log('I am ready!');
			channel = Bot.channels.get("394630266435403786") // twitter
		});

  Bot.on('message', message => {
    if (message.content === prefix+'ping') {
      message.reply('pong');
    }
  });

  Bot.on('message', message => {
    let re = /min (\d+)/
    let match = re.exec(message)
    if (match) {
      min_followers = match[1]
      message.reply('setting min followers: ' + match[1]);
    }
  });

  Bot.on('message', message => {
    if (message.content === prefix+'go') {
      start(); // start listening to tweets
      message.reply('going');
    }
  });
}



function getMessagEmbed(event, coins_mentioned) {
	return {
		embed: {
			color: 3447003,
			author: {
				name: event.user.name,
				//icon_url: client.user.avatarURL
			},
			//title: event.user.name,
			description: event.text,
			fields: [
				{
					name: "Mentioned Coins",
					value: ':gem: ' + coins_mentioned.join(' :gem: ')
				},
				{
					name: 'Followers',
					value: event.user.followers_count
				}
			],
			timestamp: new Date(),
			footer: {
				text: "© Bitcoiner Bot"
			}
		}
	}
}

async function getCoinsList() {
	response = await request('https://bittrex.com/api/v1.1/public/getmarkets');
	if (response.statusCode > 300) throw "bad status " + response.statusCode
	return response = JSON.parse(response.body)
}
