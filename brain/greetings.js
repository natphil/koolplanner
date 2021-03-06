module.exports.init = function (controller) {
    controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function (bot, message) {

        bot.api.reactions.add({
            timestamp: message.ts,
            channel: message.channel,
            name: 'robot_face',
        }, function (err, res) {
            if (err) {
                bot.botkit.log('Failed to add emoji reaction :(', err);
            }
        });


        controller.storage.users.get(message.user, function (err, user) {
            if (user && user.name) {
                bot.reply(message, 'Hello ' + user.name + '!!');
            } else {
                bot.reply(message, 'Hello.');
            }
        });
    });

    controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.get(message.user, function (err, user) {
            if (user && user.name) {
                bot.reply(message, 'Your name is ' + user.name);
            } else {
                bot.startConversation(message, function (err, convo) {
                    if (!err) {
                        convo.say('I do not know your name yet!');
                        convo.ask('What should I call you?', function (response, convo) {
                            convo.ask('You want me to call you `' + response.text + '`?', [
                                {
                                    pattern: 'yes',
                                    callback: function (response, convo) {
                                        // since no further messages are queued after this,
                                        // the conversation will end naturally with status == 'completed'
                                        convo.next();
                                    }
                                },
                                {
                                    pattern: 'no',
                                    callback: function (response, convo) {
                                        // stop the conversation. this will cause it to end with status == 'stopped'
                                        convo.stop();
                                    }
                                },
                                {
                                    default: true,
                                    callback: function (response, convo) {
                                        convo.repeat();
                                        convo.next();
                                    }
                                }
                            ]);

                            convo.next();
                        }, {'key': 'nickname'}); // store the results in a field called nickname

                        convo.on('end', function (convo) {
                            if (convo.status == 'completed') {
                                bot.reply(message, 'OK! I will update my dossier...');

                                controller.storage.users.get(message.user, function (err, user) {
                                    if (!user) {
                                        user = {
                                            id: message.user,
                                        };
                                    }

                                    user.name = convo.extractResponse('nickname');

                                    controller.storage.users.save(user, function (err, id) {
                                        bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                    });
                                });
                            } else {
                                // this happens if the conversation ended prematurely for some reason
                                bot.reply(message, 'OK, nevermind!');
                            }
                        });
                    }
                });
            }
        });
    });
}