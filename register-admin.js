import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: "https://kk46vc2t.us-east.insforge.app",
  anonKey: "ik_d5a1b793123f49b951393d5a00977d29"
});

async function main() {
  console.log("Registering admin@inzuma.co on InsForge...");
  try {
    const { data, error } = await insforge.auth.signUp({
      email: "admin@inzuma.co",
      password: "cogitoergosum"
    });

    if (error) {
      console.error("SignUp failed:", error);
    } else {
      console.log("SignUp successful! User data:", data);
      
      console.log("Seeding user profile...");
      const profilePayload = {
        id: data.user.id,
        name: "Admin",
        role: "admin",
        country: "US",
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await insforge.database
        .from('user_profiles')
        .insert([profilePayload]);

      if (dbError) {
        console.error("Failed to seed admin user profile:", dbError);
      } else {
        console.log("Seeded admin user profile successfully!", dbData);
      }
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

main();
