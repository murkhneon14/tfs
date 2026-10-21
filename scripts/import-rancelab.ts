import { runDryRun, runCatalogImport } from "../src/lib/products/rancelab-import";

async function main() {
  const isExecute = process.argv.includes("--execute");

  if (!isExecute) {
    console.log("=================================================");
    console.log("     RANCELAB CATALOG IMPORT — DRY RUN           ");
    console.log("=================================================");
    console.log("Evaluating source data against Supabase without writing...\n");

    const stats = await runDryRun();

    console.log("\n--- DRY-RUN SUMMARY RESULTS ---");
    console.log("Categories (ProductGroupMaster):");
    console.log(`  Total Source: ${stats.categories.totalSource}`);
    console.log(`  To Insert:    ${stats.categories.toInsert}`);
    console.log(`  To Update:    ${stats.categories.toUpdate}`);
    console.log(`  Skipped:      ${stats.categories.skipped}`);

    console.log("\nProducts (ProductMaster):");
    console.log(`  Total Source: ${stats.products.totalSource}`);
    console.log(`  To Insert:    ${stats.products.toInsert}`);
    console.log(`  To Update:    ${stats.products.toUpdate}`);
    console.log(`  Skipped:      ${stats.products.skipped}`);

    console.log("\nVariants (ProductChildMaster):");
    console.log(`  Total Source: ${stats.variants.totalSource}`);
    console.log(`  To Insert:    ${stats.variants.toInsert}`);
    console.log(`  To Update:    ${stats.variants.toUpdate}`);
    console.log(`  Skipped:      ${stats.variants.skipped}`);
    console.log(`  Zero Price:   ${stats.variants.flaggedZeroPrice}`);

    console.log("\nCatalog Breakdown:");
    console.log(`  Products with Variants:    ${stats.summary.productsWithVariants}`);
    console.log(`  Products without Variants: ${stats.summary.productsWithoutVariants}`);
    console.log(`  Leading Zeros Preserved:   ${stats.summary.leadingZerosPreserved}`);
    console.log("=================================================\n");
    console.log("To execute the live import, run: bun run scripts/import-rancelab.ts --execute");
    return;
  }

  console.log("=================================================");
  console.log("     RANCELAB CATALOG IMPORT — LIVE EXECUTION    ");
  console.log("=================================================");
  await runCatalogImport();
  console.log("Live execution finished successfully.");
}

main().catch((err) => {
  console.error("Fatal import error:", err);
  process.exit(1);
});
