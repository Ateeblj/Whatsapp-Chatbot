const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

console.log("🚀 Starting WhatsApp + Ollama bot...");

const client = new Client({
    authStrategy: new LocalAuth()
});

// Show QR Code if no session exists
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan this QR code with WhatsApp.');
});

// When WhatsApp client is ready
client.on('ready', () => {
    console.log('✅ WhatsApp client is ready! Ollama mode enabled.');
});

// Handle new messages
client.on('message', async (message) => {
    if (!message.fromMe && message.type === "chat" && !message.isStatus) {
        const contact = await message.getContact();
        const userName = contact.pushname || contact.name || contact.number;
        const text = message.body.trim();

        console.log(`📩 ${userName} said: ${text}`);

        try {
            // Get reply from Ollama
            const response = await getOllamaResponse(text);
            console.log(`🤖 Replying to ${userName}: ${response}`);

            // Send reply back
            await message.reply(response);
        } catch (error) {
            console.error('❌ Error generating response:', error.message);
            await message.reply('⚠️ Sorry, something went wrong with Ollama.');
        }
    }
});

// Function: Send prompt to Ollama
async function getOllamaResponse(prompt) {
    try {
        const res = await axios.post(
            "http://localhost:11434/api/generate",
            {
                model: "ateeb-style",
                prompt: prompt,
                options: {
                    temperature: 0.7,
                    num_predict: 200
                },
                stream: false
            },
            { timeout: 60000 }
        );

        // ✅ Fix: Ollama sometimes returns res.data.response OR res.data
        if (res.data) {
            if (typeof res.data.response === "string") {
                return res.data.response.trim();
            } else if (typeof res.data === "string") {
                return res.data.trim();
            } else {
                return JSON.stringify(res.data, null, 2); // fallback: dump raw response
            }
        }

        return "⚠️ No response from model.";
    } catch (err) {
        console.error("❌ getOllamaResponse error:", err.message);
        return "⚠️ Error: Could not reach Ollama.";
    }
}

// Handle disconnections
client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
});

// Start the bot
client.initialize();
