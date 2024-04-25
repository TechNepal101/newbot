const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const token = '7054382960:AAFPM9Wpn4doowCPDNQtTHop_FuHoM97hWc';

// Admin's chat ID
const adminChatId = '6145148767'; // Replace with your admin's chat ID

// Create a new bot instance
const bot = new TelegramBot(token, { polling: true });

// Load user data from JSON file or create if not exists
let userData = {};
const userDataPath = './userData.json';
if (fs.existsSync(userDataPath)) {
  userData = require(userDataPath);
} else {
  fs.writeFileSync(userDataPath, JSON.stringify(userData));
}

// Save user data to JSON file
function saveUserData() {
  fs.writeFile(userDataPath, JSON.stringify(userData), (err) => {
    if (err) {
      console.log('Error saving userData:', err);
    } else {
      console.log('userData saved successfully');
    }
  });
}

// Generate referral link in Telegram bot format
function generateReferralLink(userId) {
  return `https://t.me/task001abbot?start=${userId}`;
}

// Listen for /start command
// Listen for /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const referredBy = msg.text.split(' ')[1]; // Extract the referrer's ID from the start message

  if (!userData[userId]) {
    userData[userId] = {
      username: msg.from.username,
      telegramId: userId,
      binanceId: '',
      balance: 0,
      pendingBalance: 0, // Initialize pending balance to 0
      referralCount: 0,
      referralTimestamp: 0, // Initialize referral timestamp to 0
      waitingForBinanceId: false,
      waitingForAdminReply: false,
    };

    // Check if the user was referred by someone
    if (referredBy && userData[referredBy]) {
      // Add referral bonus to referrer's pending balance
      userData[referredBy].pendingBalance += 0.05;
      userData[referredBy].referralCount++; // Increment referral count
      userData[referredBy].referralTimestamp = Date.now(); // Set referral timestamp
      saveUserData();

      // Notify referrer about the referral bonus
      bot.sendMessage(referredBy, `🎉 You earned $0.05 as a referral bonus!`);

      // Transfer pending referral bonus to balance after 1 minute
      setTimeout(() => {
        userData[referredBy].balance += userData[referredBy].pendingBalance;
        userData[referredBy].pendingBalance = 0; // Reset pending balance
        saveUserData();
        bot.sendMessage(referredBy, 'Referral bonus transferred to your balance.');
      }, 1 * 60 * 1000); // 1 minute delay
    }

    const startMessage = `
🤑 *Earn 0.1$! Claim Binance Crypto Box* 🎁

1. [Scan QR Code](https://shorturl.at/dmBNT) or 🌐 [Visit Link](https://shorturl.at/dmBNT)
2. Claim your crypto box 📦
3. Submit Your Binance ID 💳

Press the button below to submit your Binance ID:
`;

    const keyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Submit ID', callback_data: 'submit_id' }]
        ]
      }
    };

    bot.sendMessage(chatId, startMessage, { parse_mode: 'Markdown', ...keyboardOptions });
  } else {
    // Send inline keyboards directly
    if (userData[userId].binanceId) {
      const keyboardOptions = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Profile', callback_data: 'profile' }],
            [{ text: 'Earn More', callback_data: 'earn_more' }],
            [{ text: 'Refer And Earn', callback_data: 'refer_earn' }],
            [{ text: 'Contact', callback_data: 'contact' }]
          ]
        }
      };
      bot.sendMessage(chatId, 'Choose an option:', keyboardOptions);
    } else {
      const keyboardOptions = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Submit ID', callback_data: 'submit_id' }]
          ]
        }
      };
      bot.sendMessage(chatId, 'Please submit your Binance ID first:', keyboardOptions);
    }
  }
});

bot.onText(/\/adminoptions/, (msg) => {
  const chatId = msg.chat.id;

  // Check if the user is an admin
  if (chatId.toString() === adminChatId) {
    const adminOptionsMessage = 'Admin Panel:';
    const keyboardOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Check Users', callback_data: 'view_users' }],
          [{ text: 'Leaderboard', callback_data: 'leaderboard' }],
          [{ text: 'Broadcast Message', callback_data: 'broadcast_message' }]
        ]
      }
    };

    bot.sendMessage(chatId, adminOptionsMessage, keyboardOptions);
  } else {
    bot.sendMessage(chatId, 'You are not authorized to access the admin panel.');
  }
});

// Listen for admin panel button callbacks
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Check if the callback is from the admin panel
  if (chatId.toString() === adminChatId) {
    if (data === 'view_users') {
      // Create a message with the list of users and their details
      let usersListMessage = 'Users List:\n\n';

      Object.keys(userData).forEach(userId => {
        const user = userData[userId];
        usersListMessage += `User ID: ${userId}\n`;
        usersListMessage += `Balance: $${user.balance}\n`;
        usersListMessage += `Referral Count: ${user.referralCount}\n\n`;
      });

      bot.sendMessage(chatId, usersListMessage);
    } else if (data === 'leaderboard') {
      // Sort users based on balance in ascending order
      const sortedUsers = Object.keys(userData).map(userId => userData[userId])
        .sort((a, b) => a.balance - b.balance);

      let leaderboardMessage = 'Leaderboard:\n\n';
      sortedUsers.forEach(user => {
        leaderboardMessage += `User ID: ${user.telegramId}\n`;
        leaderboardMessage += `Balance: $${user.balance}\n\n`;
      });

      bot.sendMessage(chatId, leaderboardMessage);
    }
    else if (data === 'broadcast_message') {
      // Ask the admin for the message to be broadcasted
      bot.sendMessage(chatId, 'Please enter the message you want to broadcast:').then(sentMessage => {
        // Listen for the admin's response
        bot.on('message', (msg) => {
          const broadcastMessage = msg.text;

          // Send the broadcast message to all users
          Object.keys(userData).forEach(userId => {
            bot.sendMessage(userId, broadcastMessage);
          });

          bot.sendMessage(chatId, 'Broadcast message sent to all users.');
        });
      });
    }
  }
});

const keyboardOptionsAfterSubmission = {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Profile', callback_data: 'profile' }],
      [{ text: 'Earn More', callback_data: 'earn_more' }],
      [{ text: 'Refer And Earn', callback_data: 'refer_earn' }],
      [{ text: 'Contact', callback_data: 'contact' }]
    ]
  }
};
// Listen for inline keyboard button callback
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'submit_id') {
    bot.sendMessage(chatId, 'Please enter your Binance ID:', {
      reply_markup: {
        force_reply: true  // Enable force reply to capture user's Binance ID
      }
    }).then(sentMessage => {
      // Save user ID and set flag for waiting for Binance ID
      const userId = sentMessage.chat.id;
      userData[userId].waitingForBinanceId = true;
      saveUserData();
    });
  } else if (data === 'profile') {
    const profileMessage = `
    Username: ${userData[chatId].username}
Telegram ID: ${userData[chatId].telegramId}
Binance ID: ${userData[chatId].binanceId}
Balance: $${userData[chatId].balance}
Pending Balance: $${userData[chatId].pendingBalance}
`;

    const keyboardOptionsProfile = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Withdraw', callback_data: 'withdraw' }]
        ]
      }
    };

    bot.sendMessage(chatId, profileMessage, keyboardOptionsProfile).then(() => {
        // Send the keyboard options after displaying the profile message
        bot.sendMessage(chatId, 'Choose an option:', keyboardOptionsAfterSubmission);
    });
}
 else if (data === 'earn_more') {
    // Send "Coming Soon" message
    bot.sendMessage(chatId, 'Coming Soon!').then(() => {
      // Send inline keyboards after displaying "Coming Soon" message
      bot.sendMessage(chatId, 'Choose an option:', keyboardOptionsAfterSubmission);
    });
  } else if (data === 'refer_earn') {
    const referralEarning = 0.05; // Earning per referral
    const referralCount = userData[chatId].referralCount;
    const referralLink = generateReferralLink(chatId);
    const referMessage = `
🚀 *Refer and Earn* 🎉

Invite your friends to earn rewards! For each successful referral, you earn $${referralEarning}.
Your Referral Count: ${referralCount}

Share your referral link: ${referralLink}
`;

    bot.sendMessage(chatId, referMessage,keyboardOptionsAfterSubmission, { parse_mode: 'Markdown' });
  }
});

// Listen for incoming messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const userId = msg.from.id;

  if (userData[userId] && userData[userId].waitingForBinanceId) {
    userData[userId].binanceId = messageText;
    userData[userId].waitingForBinanceId = false;
    saveUserData();
    bot.sendMessage(chatId, '✅ Binance ID saved successfully!');

    // Add $0.1 to pending balance when Binance ID is submitted
    userData[userId].pendingBalance += 0.1;

    // Send inline keyboards after submitting Binance ID
    const keyboardOptionsAfterSubmission = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Profile', callback_data: 'profile' }],
          [{ text: 'Earn More', callback_data: 'earn_more' }],
          [{ text: 'Refer And Earn', callback_data: 'refer_earn' }],
          [{ text: 'Contact', callback_data: 'contact' }]
        ]
      }
    };
    bot.sendMessage(chatId, 'Choose an option:', keyboardOptionsAfterSubmission);

    // Notify admin with user details and inline keyboard
    const adminMessage = `
New user submitted Binance ID.
User ID: ${userId}
Binance ID: ${messageText}
`;

    const adminKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Accept Pending Balance', callback_data: 'accept_pending_balance' }]
        ]
      }
    };

    bot.sendMessage(adminChatId, adminMessage, adminKeyboard);

    // Check if the user has referral bonus and the referral bonus is earned 5 hours ago
    if (userData[userId].pendingBalance > 0 && Date.now() - userData[userId].referralTimestamp >= 5 * 60 * 60 * 1000) {
      setTimeout(() => {
        userData[userId].balance += userData[userId].pendingBalance;
        userData[userId].pendingBalance = 0; // Reset pending balance
        saveUserData();

      }, 5 * 60 * 60 * 1000); // 1 minute delay
    } else {
      bot.sendMessage(chatId, 'Your referral bonus will be transferred soon');
    }
  } else {
    // Echo the received message back to the user
    bot.sendMessage(chatId, `You said: ${messageText}`);
  }
});

// Listen for inline keyboard button callback for admin
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'accept_pending_balance') {
    // Get user ID from the message text
    const userId = parseInt(query.message.text.match(/User ID: (\d+)/)[1], 10);

    // Transfer pending balance to balance
    userData[userId].balance += userData[userId].pendingBalance;
    userData[userId].pendingBalance = 0; // Reset pending balance
    saveUserData();
    bot.sendMessage(chatId, 'Pending balance accepted and transferred to user balance.');
  } else if (data === 'withdraw') {
    // Check if balance is greater than $1 for withdrawal
    if (userData[chatId].balance >= 1) {
      // Notify admin for withdrawal request
      const withdrawMessage = `
Withdrawal request received:
User ID: ${chatId}
Username: ${userData[chatId].username}
Balance: $${userData[chatId].balance}
Binance ID: ${userData[chatId].binanceId}
`;
      bot.sendMessage(adminChatId, withdrawMessage);
    } else {
      bot.sendMessage(chatId, 'Withdrawal amount should be at least $1.', keyboardOptionsAfterSubmission);
    }
  }
  else if (data === 'contact') {
    const userId = query.from.id;

    // Ask user for a message
    bot.sendMessage(chatId, 'Please enter your message for the admin:').then(sentMessage => {
      // Save user ID and set flag for waiting for admin reply
      userData[userId].waitingForAdminReply = true;
      saveUserData();

      // Listen for the user's message
      bot.on('message', (msg) => {
        // Check if the message is from the same user and waiting for admin reply
        if (msg.from.id === userId && userData[userId].waitingForAdminReply) {
          const userMessage = msg.text;

          // Forward message to admin with user ID
          const adminChatMessage = `
New message from user:
User ID: ${userId}
Message: ${userMessage}
`;
          bot.sendMessage(adminChatId, adminChatMessage);

          // Inform the user that the message has been sent
          bot.sendMessage(chatId, 'Your message has been sent to the admin.',keyboardOptionsAfterSubmission);

          // Reset waiting for admin reply flag
          userData[userId].waitingForAdminReply = false;
          saveUserData();
        }
      });
    });
  }
});
// Listen for /nepal command
