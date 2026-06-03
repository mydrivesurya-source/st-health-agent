/**
 * ST - AI Health Assistant Agent
 * Sends daily WhatsApp reminders via Twilio
 * Run: node index.js
 */

require("dotenv").config();
const express = require("express");
const cron = require("node-cron");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Config ────────────────────────────────────────────────────────────────
const USER_WHATSAPP = `whatsapp:+91${process.env.USER_PHONE || "9908227530"}`;
const TWILIO_WHATSAPP = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"}`; // Twilio sandbox default
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ─── Daily Content Bank ────────────────────────────────────────────────────
const yogaPoses = [
  { name: "Bhujangasana (Cobra Pose)", benefit: "Strengthens spine & opens chest", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/bhujangasana.gif" },
  { name: "Vrikshasana (Tree Pose)", benefit: "Improves balance & focus", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/vriksasana.gif" },
  { name: "Trikonasana (Triangle Pose)", benefit: "Stretches legs & spine", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/trikonasana.gif" },
  { name: "Balasana (Child's Pose)", benefit: "Relieves stress & fatigue", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/balasana.gif" },
  { name: "Tadasana (Mountain Pose)", benefit: "Improves posture & grounding", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/tadasana.gif" },
  { name: "Adho Mukha Svanasana (Downward Dog)", benefit: "Full body energizer", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/adho-mukha-svanasana.gif" },
  { name: "Virabhadrasana (Warrior I)", benefit: "Builds strength & confidence", gif: "https://www.tummee.com/yoga-sequences/animated_gifs/virabhadrasana-i.gif" },
];

const vegDietPlans = [
  { morning: "Idli (3) + Sambar + Coconut chutney", lunch: "Brown rice + Dal + Mixed veg curry + Salad", evening: "Upma + Green tea", calories: "~1600 kcal" },
  { morning: "Oats porridge + Banana + Almonds (10)", lunch: "Chapati (2) + Paneer sabzi + Curd", evening: "Vegetable soup + Light dosa (1)", calories: "~1550 kcal" },
  { morning: "Poha + Sprouts chaat + Lemon water", lunch: "Millet khichdi + Raita + Salad", evening: "Vegetable dalia + Herbal tea", calories: "~1500 kcal" },
  { morning: "Whole wheat toast + Peanut butter + Fruit", lunch: "Rajma chawal + Salad + Buttermilk", evening: "Masoor dal soup + Roti (1)", calories: "~1700 kcal" },
  { morning: "Ragi dosa (2) + Sambar + Chutney", lunch: "Quinoa + Palak paneer + Salad", evening: "Moong dal cheela + Curd", calories: "~1580 kcal" },
  { morning: "Besan chilla (2) + Mint chutney", lunch: "Jeera rice + Dal tadka + Aloo gobi", evening: "Vegetable oats soup + Crackers", calories: "~1620 kcal" },
  { morning: "Smoothie (banana+spinach+milk) + Nuts", lunch: "Chole + Chapati (2) + Onion salad", evening: "Tomato soup + Grilled paneer sandwich", calories: "~1650 kcal" },
];

const motivationalLines = [
  "💪 Every rep counts. Every sip matters. You've got this, Surya!",
  "🌟 Champions are built in the morning. Today is YOUR day!",
  "🔥 Small steps every day = massive results over time. Keep going!",
  "🌱 Your body is your temple. Treat it like royalty today!",
  "⚡ Energy flows where focus goes. Focus on your health TODAY!",
  "🎯 One healthy day at a time. You're building something great!",
  "🌄 Rise, fuel up, and conquer. The world needs the best version of you!",
];

// ─── Daily State (simple JSON file storage) ────────────────────────────────
const STATE_FILE = "./daily_state.json";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getTodayState() {
  const state = loadState();
  const today = getTodayKey();
  if (!state[today]) {
    const dayIndex = new Date().getDay(); // 0-6
    state[today] = {
      date: today,
      water: false,
      gym: false,
      waterLitres: 0,
      skipped: false,
      yoga: yogaPoses[dayIndex % yogaPoses.length],
      diet: vegDietPlans[dayIndex % vegDietPlans.length],
      motivation: motivationalLines[dayIndex % motivationalLines.length],
      meals: [],
      calories: 0,
    };
    saveState(state);
  }
  return state[today];
}

function updateTodayState(updates) {
  const state = loadState();
  const today = getTodayKey();
  state[today] = { ...getTodayState(), ...updates };
  saveState(state);
  return state[today];
}

// ─── Message Builders ──────────────────────────────────────────────────────
function buildMorningMessage() {
  const s = getTodayState();
  return `Good morning Surya! 🌞
I'm *ST*, your personal health assistant.

━━━━━━━━━━━━━━━
🗓 *Today's Health Plan*
━━━━━━━━━━━━━━━

💧 *Water Goal:* Drink 3 litres today
🏋️ *Gym:* 45 minutes of workout
🥗 *Vegetarian Diet Plan:*
  • Morning: ${s.diet.morning}
  • Lunch: ${s.diet.lunch}
  • Dinner: ${s.diet.evening}
  • Est. Calories: ${s.diet.calories}

🧘 *Yoga Pose:* ${s.yoga.name}
   _${s.yoga.benefit}_

━━━━━━━━━━━━━━━
${s.motivation}
━━━━━━━━━━━━━━━

Reply with:
✅ *done* — all tasks completed
💧 *water* — water goal done
🏋️ *gym done* — gym done
📸 *food photo* — send food for calorie check
⏭ *skip today* — take a rest day`;
}

function buildEveningMessage() {
  const s = getTodayState();
  const waterStatus = s.water ? "✅ Done! Great work!" : "❌ Not yet — drink up now!";
  const gymStatus = s.gym ? "✅ Crushed it! 💪" : "❌ Still time for a quick workout!";

  return `Good evening Surya! 🌙
*ST Health Check — End of Day*

━━━━━━━━━━━━━━━
📊 *Your Progress Today*
━━━━━━━━━━━━━━━

💧 Water (3L): ${waterStatus}
🏋️ Gym (45 min): ${gymStatus}
🍽 Calories tracked: *${s.calories > 0 ? s.calories + " kcal" : "Not tracked yet"}*

━━━━━━━━━━━━━━━
🥗 *Light Dinner Suggestion:*
${s.diet.evening}

🧘 *Evening Stretch:* 10 mins of ${s.yoga.name}
   _Great for winding down!_

━━━━━━━━━━━━━━━

Reply with:
📸 *food photo* — upload dinner for calorie check
💧 *water* — mark water done
🏋️ *gym done* — mark gym done
✅ *done* — wrap up today perfectly!`;
}

// ─── Send WhatsApp Message ─────────────────────────────────────────────────
async function sendWhatsApp(body, mediaUrl = null) {
  const params = { from: TWILIO_WHATSAPP, to: USER_WHATSAPP, body };
  if (mediaUrl) params.mediaUrl = [mediaUrl];
  try {
    const msg = await client.messages.create(params);
    console.log(`[ST] Sent: ${msg.sid}`);
    return msg;
  } catch (err) {
    console.error("[ST] Send error:", err.message);
  }
}

async function sendMorningMessage() {
  console.log("[ST] Sending morning message...");
  const s = getTodayState();
  await sendWhatsApp(buildMorningMessage());
  // Send yoga GIF separately
  await sendWhatsApp(`🧘 *Yoga of the Day:* ${s.yoga.name}`, s.yoga.gif);
}

async function sendEveningMessage() {
  console.log("[ST] Sending evening message...");
  await sendWhatsApp(buildEveningMessage());
}

// ─── Incoming Message Handler ──────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  const body = (req.body.Body || "").trim().toLowerCase();
  const mediaUrl = req.body.MediaUrl0;
  const twiml = new twilio.twiml.MessagingResponse();

  console.log(`[ST] Incoming: "${body}" | Media: ${mediaUrl || "none"}`);

  let reply = "";

  if (body === "done") {
    updateTodayState({ water: true, gym: true });
    reply = `🎉 Amazing work Surya! Both water and gym marked as *DONE* for today!\n\nYou're building a healthier version of yourself every single day. Keep it up! 💪🌟`;

  } else if (body === "water") {
    updateTodayState({ water: true });
    reply = `💧 Water goal *DONE*! Excellent hydration today, Surya!\n\nYour cells are thanking you right now! 🙏`;

  } else if (body === "gym done" || body === "gym") {
    updateTodayState({ gym: true });
    reply = `🏋️ Gym *DONE*! That's a win, Surya!\n\nEvery session makes you stronger. Rest well, eat right! 💪`;

  } else if (body === "skip today") {
    updateTodayState({ skipped: true });
    reply = `😴 Rest day noted. Recovery is part of the journey, Surya!\n\nCome back stronger tomorrow. I'll check on you at 6 AM! 🌅`;

  } else if (body === "diet" || body === "diet plan") {
    const s = getTodayState();
    reply = `🥗 *Today's Vegetarian Diet Plan:*\n\n🌅 Morning: ${s.diet.morning}\n☀️ Lunch: ${s.diet.lunch}\n🌙 Dinner: ${s.diet.evening}\n\n📊 Estimated: ${s.diet.calories}`;

  } else if (body === "yoga") {
    const s = getTodayState();
    reply = `🧘 *Today's Yoga Pose:*\n\n*${s.yoga.name}*\n_${s.yoga.benefit}_\n\nPractice for 5-10 minutes. Focus on your breath. 🌬️`;
    await sendWhatsApp(reply);
    await sendWhatsApp(`Here's your guided GIF:`, s.yoga.gif);
    res.type("text/xml").send(twiml.toString());
    return;

  } else if (body === "calories" || body === "status") {
    const s = getTodayState();
    reply = `📊 *Today's Summary:*\n\n💧 Water: ${s.water ? "✅ Done" : "❌ Pending"}\n🏋️ Gym: ${s.gym ? "✅ Done" : "❌ Pending"}\n🍽 Calories: ${s.calories > 0 ? s.calories + " kcal" : "Not tracked"}\n\nKeep going Surya! You can do it! 🔥`;

  } else if (body === "food photo" || mediaUrl) {
    // Food photo received — estimate calories using Claude API
    if (mediaUrl) {
      reply = await estimateCaloriesFromPhoto(mediaUrl);
    } else {
      reply = `📸 Please send your food photo directly in the next message and I'll estimate the calories for you!`;
    }

  } else if (body === "help" || body === "hi" || body === "hello") {
    reply = `👋 Hi Surya! I'm *ST*, your health assistant!\n\n*Commands I understand:*\n✅ done — mark all tasks complete\n💧 water — mark water done\n🏋️ gym done — mark gym done\n🥗 diet — see today's diet plan\n🧘 yoga — see today's yoga pose\n📊 calories / status — today's summary\n📸 food photo — send a food pic for calorie estimate\n⏭ skip today — rest day\n\nSend me a food photo anytime for calorie tracking! 🍽`;

  } else {
    reply = `🤔 I didn't get that, Surya. Reply *help* to see all commands, or send a food photo for calorie tracking! 😊`;
  }

  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

// ─── Calorie Estimation via Claude API ─────────────────────────────────────
async function estimateCaloriesFromPhoto(imageUrl) {
  try {
    // Fetch the image and convert to base64
    const fetch = (await import("node-fetch")).default;
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.buffer();
    const base64 = buffer.toString("base64");
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
            { type: "text", text: "This is a vegetarian meal photo. Identify the food items and estimate total calories. Reply in this exact format:\n🍽 Food: [items]\n🔥 Est. Calories: [number] kcal\n💡 Tip: [one healthy eating tip in 1 sentence]" }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "Could not analyze the photo.";

    // Update calories in state
    const calMatch = text.match(/(\d+)\s*kcal/i);
    if (calMatch) {
      const s = getTodayState();
      updateTodayState({ calories: s.calories + parseInt(calMatch[1]) });
    }

    return `📸 *Food Analysis by ST:*\n\n${text}\n\n_Keep making healthy choices, Surya! 🥗_`;
  } catch (err) {
    console.error("[ST] Calorie estimation error:", err.message);
    return `📸 Photo received! I had trouble analyzing it right now. Try sending again in good lighting! 🌟`;
  }
}

// ─── Cron Schedulers ──────────────────────────────────────────────────────
// 6:00 AM daily morning message (IST = UTC+5:30, so UTC 00:30)
cron.schedule("30 0 * * *", sendMorningMessage, { timezone: "Asia/Kolkata" });

// 7:00 PM daily evening message (IST)
cron.schedule("0 19 * * *", sendEveningMessage, { timezone: "Asia/Kolkata" });

console.log("[ST] Health schedulers active: 6:00 AM & 7:00 PM IST");

// ─── Manual Trigger Endpoints ──────────────────────────────────────────────
app.get("/send/morning", async (req, res) => {
  await sendMorningMessage();
  res.json({ ok: true, message: "Morning message sent!" });
});

app.get("/send/evening", async (req, res) => {
  await sendEveningMessage();
  res.json({ ok: true, message: "Evening message sent!" });
});

app.get("/state", (req, res) => {
  res.json(getTodayState());
});

app.get("/health", (req, res) => {
  res.json({ status: "ST is running 💚", time: new Date().toISOString() });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 ST Health Assistant running on port ${PORT}`);
  console.log(`📱 WhatsApp: ${USER_WHATSAPP}`);
  console.log(`⏰ Morning: 6:00 AM IST | Evening: 7:00 PM IST`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook\n`);
});
