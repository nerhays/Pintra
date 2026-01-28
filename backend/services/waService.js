const fetch = require("node-fetch");

async function sendWhatsApp(params) {
  const phone = params.phone;
  const message = params.message;

  const payload = {
    api_key: process.env.WATZAP_TOKEN,
    number_key: process.env.WATZAP_SENDER,
    phone_no: phone.startsWith("62") ? phone : "62" + phone.replace(/^0/, ""),
    message: message,
  };

  console.log("WATZAP PAYLOAD:", payload);

  const res = await fetch("https://api.watzap.id/v1/send_message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log("RAW WATZAP RESPONSE:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error("Response bukan JSON");
  }

  if (data.status !== "200") {
    throw new Error(data.message || "WA gagal");
  }

  return data;
}

module.exports = { sendWhatsApp };
