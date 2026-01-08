"use server";

import { supabaseAdmin } from "./supabaseAdmin";

export async function createUser(username: string, password: string) {
  "use server";
  
  const { supabaseAdmin } = await import("./supabaseAdmin");

  try {
    console.log("🚀 Creating user:", { username });

    // 1. Erstelle Supabase Auth User (mit username als email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `${username.toLowerCase()}@critico.local`,  // Dummy-Email
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error("❌ Auth creation failed:", authError);
      throw new Error(authError.message);
    }

    console.log("✅ Auth user created:", authData.user.id);

    // 2. Erstelle User direkt
    const { data: user, error: userError } = await supabaseAdmin
      .from("User")
      .insert({
        username: username
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ User insert failed:", userError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(userError.message);
    }

    console.log("✅ User created:", user.User_ID);

    return {
      success: true,
      userId: user.User_ID,
      username: username
    };

  } catch (error: any) {
    console.error("💥 Create user failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}


// Einfache Auth-Funktion für normale User (Worker/Admin) - nur Prüfung
export async function authorizeUser() {
  "use server";
  
  const { supabaseAdmin } = await import("./supabaseAdmin");

  try {
    console.log("🔐 Authorizing user...");

    // Einfache Prüfung: Gibt es überhaupt User in der Tabelle?
    const { data: users, error } = await supabaseAdmin
      .from("User")
      .select("User_ID")
      .limit(1);

    if (error) {
      console.error("❌ Auth check failed:", error.message);
      return {
        success: false,
        authorized: false,
        message: "Authentifizierung fehlgeschlagen"
      };
    }

    // Wenn User existieren, ist Auth OK
    const authorized = !!(users && users.length > 0);

    console.log("✅ Authorization check:", authorized ? "OK" : "FAILED");

    return {
      success: true,
      authorized: authorized
    };

  } catch (error: any) {
    console.error("💥 Authorization failed:", error);
    return {
      success: false,
      authorized: false
    };
  }
}
