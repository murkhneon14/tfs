import { getSupabaseAdmin } from "../src/lib/supabase/server";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  if (!email) {
    console.log("=================================================");
    console.log("               CURRENT USERS IN DB               ");
    console.log("=================================================");
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, role, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to query users:", error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log("No users found in database yet.");
      console.log("Register an account on http://localhost:3000/register first.");
    } else {
      console.table(
        users.map((u) => ({
          ID: u.id,
          Name: u.name,
          Email: u.email,
          Role: u.role,
          Status: u.status,
        }))
      );
    }

    console.log("\nUsage:");
    console.log("  bun run scripts/make-admin.ts <email>");
    console.log("Example:");
    console.log("  bun run scripts/make-admin.ts admin@example.com");
    return;
  }

  console.log(`Setting role to 'ADMIN' for: ${email}...`);

  const { data, error } = await supabase
    .from("users")
    .update({ role: "ADMIN" })
    .eq("email", email)
    .select("id, name, email, role, status")
    .single();

  if (error) {
    console.error("Failed to update role:", error.message);
    process.exit(1);
  }

  if (!data) {
    console.error(`User with email '${email}' not found.`);
    process.exit(1);
  }

  console.log(`\nSuccess! Account is now an ADMIN:`);
  console.log(`  Name:   ${data.name}`);
  console.log(`  Email:  ${data.email}`);
  console.log(`  Role:   ${data.role}`);
  console.log(`  Status: ${data.status}`);
  console.log(`\nYou can now log in and access:`);
  console.log(`  - Dashboard:  http://localhost:3000/admin`);
  console.log(`  - Products:   http://localhost:3000/admin/products`);
  console.log(`  - Categories: http://localhost:3000/admin/categories`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
