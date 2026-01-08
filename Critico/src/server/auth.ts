"use server";

import type { PostgrestError } from '@supabase/supabase-js';

export async function createUser(
  email: string,      // ✅ Echte E-Mail als username!
  password: string,
  firstName: string,
  lastName: string
) {
  const { supabaseAdmin } = await import("./supabaseAdmin");

  try {
    console.log("🚀 Creating user:", { email, firstName, lastName });

    // 1. Erstelle Supabase Auth User mit echter E-Mail
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        firstName,
        lastName
      },
      email_confirm: true
    });

    if (authError) {
      console.error("❌ Auth creation failed:", authError);
      throw new Error(authError.message);
    }

    console.log("✅ Auth user created:", authData.user.id);

    // 2. Erstelle User-Profil 
    const { data: user, error: userError } = await supabaseAdmin
      .from("User")
      .insert({
        username: email,     // ✅ username = E-Mail
        Auth_ID: authData.user.id,
        first_name: firstName,
        last_name: lastName,
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
      email: email,
      authId: authData.user.id
    };

  } catch (error: any) {
    console.error("💥 Create user failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
/*
export async function authorizeUser() {
  const { supabaseAdmin } = await import("./supabaseAdmin");

  try {
    console.log("🔐 Authorizing user...");

    const { data: users, error } = await supabaseAdmin
      .from("User")
      .select("User_ID")
      .limit(1);

    if (error) {
      console.error("❌ Auth check failed:", error.message);
      return {
        success: false,
        authorized: false,
        message: error.message
      };
    }

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
*/