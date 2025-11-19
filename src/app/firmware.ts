// src/app/firmware.ts

// sessionCredentials = [email, password, sessionId]
// logState = true  -> login
// logState = false -> register

export async function sign(
  sessionCredentials: string[],
  logState: boolean
): Promise<string> {
  const [email, password] = sessionCredentials;

  const endpoint = logState ? "/api/auth/login" : "/api/auth/register";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return "";
    }

    const data = await res.json();

    return data.sessionId ?? "";
  } catch (err) {
    console.error("Auth error:", err);
    return "";
  }
}
